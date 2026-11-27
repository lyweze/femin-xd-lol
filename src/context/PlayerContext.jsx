import {
	createContext,
	useContext,
	useState,
	useCallback,
	useMemo,
	useRef,
} from "react";
import { MOCK_TRACKS } from "../services/mockData.js";
import { useAudioEngine } from "../hooks/useAudioEngine.js";
import { useCoverAccent } from "../hooks/useCoverAccent.js";
import { useSystemIntegration } from "../hooks/useSystemIntegration.js";

// ============================================================================
// Split Context: изоляция тиков таймера (Time) от каталога (State) и методов
// ============================================================================
const PlayerStateContext = createContext(null);
const PlayerTimeContext = createContext(null);
const PlayerActionsContext = createContext(null);

const LIKED_STORAGE_KEY = "matte_obsidian_liked_tracks";
const VOLUME_STORAGE_KEY = "matte_obsidian_volume";
const RESTART_THRESHOLD_MS = 3000;

const DEFAULT_LIKED_IDS = ["d4000000-0000-0000-0000-000000000001"];

function readStoredLikes() {
	try {
		const raw = localStorage.getItem(LIKED_STORAGE_KEY);
		if (!raw) return DEFAULT_LIKED_IDS;
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : DEFAULT_LIKED_IDS;
	} catch {
		return DEFAULT_LIKED_IDS;
	}
}

function readStoredVolume() {
	try {
		const raw = localStorage.getItem(VOLUME_STORAGE_KEY);
		if (!raw) return 0.8;
		const num = Number(raw);
		return Number.isFinite(num) ? Math.max(0, Math.min(1, num)) : 0.8;
	} catch {
		return 0.8;
	}
}

function shuffleArray(list) {
	const copy = [...list];
	for (let i = copy.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

export function PlayerProvider({ children }) {
	const [queue, setQueue] = useState(MOCK_TRACKS);
	const [currentTrack, setCurrentTrack] = useState(MOCK_TRACKS[0] ?? null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [isShuffle, setIsShuffle] = useState(false);
	const [repeatMode, setRepeatMode] = useState("off"); // 'off' | 'all' | 'one'
	const [volume, setVolumeState] = useState(readStoredVolume);
	const [isMuted, setIsMuted] = useState(false);
	const [likedIds, setLikedIds] = useState(readStoredLikes);
	const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
	const [showLyrics, setShowLyrics] = useState(true);
	const [durationOverrides, setDurationOverrides] = useState({});

	const queueRef = useRef(queue);
	queueRef.current = queue;
	const currentTrackRef = useRef(currentTrack);
	currentTrackRef.current = currentTrack;
	const isShuffleRef = useRef(isShuffle);
	isShuffleRef.current = isShuffle;
	const repeatModeRef = useRef(repeatMode);
	repeatModeRef.current = repeatMode;
	const currentTimeRef = useRef(0);
	const restartRef = useRef(() => {});

	useCoverAccent(currentTrack?.cover?.small_url, currentTrack?.accent);

	const handleDurationDetected = useCallback((trackId, detectedMs) => {
		setDurationOverrides((prev) =>
			prev[trackId] === detectedMs ? prev : { ...prev, [trackId]: detectedMs },
		);
	}, []);

	const playTrack = useCallback((track, nextQueue = null) => {
		if (!track) return;
		if (Array.isArray(nextQueue) && nextQueue.length > 0) {
			setQueue(nextQueue);
		}

		if (currentTrackRef.current?.id === track.id) {
			setIsPlaying((prev) => !prev);
			return;
		}

		setCurrentTrack(track);
		setIsPlaying(true);
	}, []);

	const playQueue = useCallback((tracks, { shuffle = false } = {}) => {
		if (!Array.isArray(tracks) || tracks.length === 0) return;
		const ordered = shuffle ? shuffleArray(tracks) : [...tracks];
		setIsShuffle(shuffle);
		setQueue(ordered);

		if (currentTrackRef.current?.id === ordered[0].id) {
			restartRef.current(true);
			setIsPlaying(true);
			return;
		}

		setCurrentTrack(ordered[0]);
		setIsPlaying(true);
	}, []);

	const togglePlay = useCallback(() => {
		if (!currentTrackRef.current && queueRef.current.length > 0) {
			setCurrentTrack(queueRef.current[0]);
			setIsPlaying(true);
			return;
		}
		setIsPlaying((prev) => !prev);
	}, []);

	const nextTrack = useCallback((autoAdvanced = false) => {
		const list = queueRef.current;
		const active = currentTrackRef.current;
		if (!list.length) return;

		// Один трек в очереди: при repeat all/one или ручном клике — перезапуск с 00:00
		if (list.length === 1) {
			if (!autoAdvanced || repeatModeRef.current !== "off") {
				restartRef.current(true);
				setIsPlaying(true);
			} else {
				setIsPlaying(false);
			}
			return;
		}

		const currentIdx = list.findIndex((t) => t.id === active?.id);
		if (isShuffleRef.current) {
			let randIdx = currentIdx;
			while (randIdx === currentIdx) {
				randIdx = Math.floor(Math.random() * list.length);
			}
			setCurrentTrack(list[randIdx]);
			setIsPlaying(true);
			return;
		}

		const nextIdx = currentIdx + 1;
		if (nextIdx < list.length) {
			setCurrentTrack(list[nextIdx]);
			setIsPlaying(true);
		} else if (repeatModeRef.current === "all" || !autoAdvanced) {
			setCurrentTrack(list[0]);
			setIsPlaying(true);
		} else {
			setIsPlaying(false);
		}
	}, []);

	const prevTrack = useCallback(() => {
		const list = queueRef.current;
		const active = currentTrackRef.current;
		if (!list.length) return;

		// Как в Apple Music: если прошло >3 сек или трек один — возвращаемся в начало
		if (currentTimeRef.current > RESTART_THRESHOLD_MS || list.length === 1) {
			restartRef.current(true);
			setIsPlaying(true);
			return;
		}

		const currentIdx = list.findIndex((t) => t.id === active?.id);
		const prevIdx = currentIdx > 0 ? currentIdx - 1 : list.length - 1;
		setCurrentTrack(list[prevIdx]);
		setIsPlaying(true);
	}, []);

	const { currentTimeMs, durationMs, seekToMs, restart } = useAudioEngine({
		currentTrack,
		isPlaying,
		repeatOne: repeatMode === "one",
		volume,
		isMuted,
		onEnded: () => nextTrack(true),
		onDurationDetected: handleDurationDetected,
	});

	currentTimeRef.current = currentTimeMs;
	restartRef.current = restart;

	const seekToRatio = useCallback(
		(ratio) => {
			const clamped = Math.max(0, Math.min(1, ratio));
			seekToMs(clamped * (durationMs || currentTrackRef.current?.duration_ms || 0));
		},
		[durationMs, seekToMs],
	);

	const setVolume = useCallback((value) => {
		const clamped = Math.max(0, Math.min(1, value));
		setVolumeState(clamped);
		if (clamped > 0) setIsMuted(false);
		try {
			localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped));
		} catch {
			// ignore
		}
	}, []);

	const toggleMute = useCallback(() => {
		setIsMuted((prev) => !prev);
	}, []);

	const toggleShuffle = useCallback(() => {
		setIsShuffle((prev) => !prev);
	}, []);

	const cycleRepeat = useCallback(() => {
		setRepeatMode((prev) =>
			prev === "off" ? "all" : prev === "all" ? "one" : "off",
		);
	}, []);

	const toggleLike = useCallback((trackId) => {
		setLikedIds((prev) => {
			const exists = prev.includes(trackId);
			const next = exists
				? prev.filter((id) => id !== trackId)
				: [trackId, ...prev];
			try {
				localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(next));
			} catch {
				// ignore
			}
			return next;
		});
	}, []);

	const openFullscreen = useCallback((withLyrics = true) => {
		if (withLyrics) setShowLyrics(true);
		setIsFullscreenOpen(true);
	}, []);

	const closeFullscreen = useCallback(() => {
		setIsFullscreenOpen(false);
	}, []);

	const toggleFullscreen = useCallback(() => {
		setIsFullscreenOpen((prev) => !prev);
	}, []);

	const toggleShowLyrics = useCallback(() => {
		setShowLyrics((prev) => !prev);
	}, []);

	useSystemIntegration({
		currentTrack,
		isPlaying,
		isFullscreenOpen,
		togglePlay,
		nextTrack,
		prevTrack,
		seekToMs,
		closeFullscreen,
		toggleFullscreen,
	});

	const stateValue = useMemo(
		() => ({
			currentTrack,
			queue,
			isPlaying,
			isShuffle,
			repeatMode,
			volume,
			isMuted,
			likedIds,
			isFullscreenOpen,
			showLyrics,
			durationOverrides,
		}),
		[
			currentTrack,
			queue,
			isPlaying,
			isShuffle,
			repeatMode,
			volume,
			isMuted,
			likedIds,
			isFullscreenOpen,
			showLyrics,
			durationOverrides,
		],
	);

	const timeValue = useMemo(
		() => ({
			currentTimeMs,
			durationMs,
			progress: durationMs > 0 ? Math.min(1, currentTimeMs / durationMs) : 0,
		}),
		[currentTimeMs, durationMs],
	);

	const actionsValue = useMemo(
		() => ({
			playTrack,
			playQueue,
			togglePlay,
			nextTrack,
			prevTrack,
			seekToMs,
			seekToRatio,
			setVolume,
			toggleMute,
			toggleShuffle,
			cycleRepeat,
			toggleLike,
			openFullscreen,
			closeFullscreen,
			toggleFullscreen,
			toggleShowLyrics,
		}),
		[
			playTrack,
			playQueue,
			togglePlay,
			nextTrack,
			prevTrack,
			seekToMs,
			seekToRatio,
			setVolume,
			toggleMute,
			toggleShuffle,
			cycleRepeat,
			toggleLike,
			openFullscreen,
			closeFullscreen,
			toggleFullscreen,
			toggleShowLyrics,
		],
	);

	return (
		<PlayerActionsContext.Provider value={actionsValue}>
			<PlayerStateContext.Provider value={stateValue}>
				<PlayerTimeContext.Provider value={timeValue}>
					{children}
				</PlayerTimeContext.Provider>
			</PlayerStateContext.Provider>
		</PlayerActionsContext.Provider>
	);
}

export function usePlayerState() {
	const ctx = useContext(PlayerStateContext);
	if (!ctx) throw new Error("usePlayerState must be used inside <PlayerProvider>");
	return ctx;
}

export function usePlayerTime() {
	const ctx = useContext(PlayerTimeContext);
	if (!ctx) throw new Error("usePlayerTime must be used inside <PlayerProvider>");
	return ctx;
}

export function usePlayerActions() {
	const ctx = useContext(PlayerActionsContext);
	if (!ctx) throw new Error("usePlayerActions must be used inside <PlayerProvider>");
	return ctx;
}
