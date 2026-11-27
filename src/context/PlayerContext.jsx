import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { MOCK_TRACKS } from "../services/mockData.js";
import { useAudioEngine } from "../hooks/useAudioEngine.js";
import { useSystemIntegration } from "../hooks/useSystemIntegration.js";
import {
	DEFAULT_ACCENT,
	loadCoverAppearance,
	setRootAccent,
} from "../utils/cover.js";
import {
	PlayerActionsContext,
	PlayerStateContext,
	PlayerTimeContext,
} from "./playerContexts.js";

const LIKED_STORAGE_KEY = "matte_obsidian_liked_tracks";
const VOLUME_STORAGE_KEY = "matte_obsidian_volume";
const RESTART_THRESHOLD_MS = 3000;
const FULLSCREEN_EXIT_MS = 260;

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
	const [fullscreenPhase, setFullscreenPhase] = useState("closed"); // 'closed' | 'open' | 'closing'
	const [showLyrics, setShowLyrics] = useState(true);
	const [durationOverrides, setDurationOverrides] = useState({});

	const queueRef = useRef(queue);
	const currentTrackRef = useRef(currentTrack);
	const isShuffleRef = useRef(isShuffle);
	const repeatModeRef = useRef(repeatMode);
	const fullscreenPhaseRef = useRef(fullscreenPhase);
	const fullscreenCloseTimerRef = useRef(null);
	const currentTimeRef = useRef(0);
	const durationRef = useRef(0);
	const restartRef = useRef(() => {});

	const coverUrl = currentTrack?.cover?.small_url ?? null;
	const fallbackAccent = currentTrack?.accent || DEFAULT_ACCENT;

	useEffect(() => {
		let cancelled = false;
		if (!coverUrl) {
			setRootAccent(fallbackAccent);
			return;
		}
		loadCoverAppearance(coverUrl, fallbackAccent).then(({ accentHex }) => {
			if (!cancelled) setRootAccent(accentHex);
		});
		return () => {
			cancelled = true;
		};
	}, [coverUrl, fallbackAccent]);

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

	const handleTrackEnded = useCallback(() => {
		nextTrack(true);
	}, [nextTrack]);

	const { currentTimeMs, durationMs, seekToMs, restart } = useAudioEngine({
		currentTrack,
		isPlaying,
		repeatOne: repeatMode === "one",
		volume,
		isMuted,
		onEnded: handleTrackEnded,
		onDurationDetected: handleDurationDetected,
	});

	useEffect(() => {
		queueRef.current = queue;
		currentTrackRef.current = currentTrack;
		isShuffleRef.current = isShuffle;
		repeatModeRef.current = repeatMode;
		fullscreenPhaseRef.current = fullscreenPhase;
		currentTimeRef.current = currentTimeMs;
		durationRef.current = durationMs;
		restartRef.current = restart;
	});

	useEffect(() => {
		return () => {
			if (fullscreenCloseTimerRef.current) {
				clearTimeout(fullscreenCloseTimerRef.current);
			}
		};
	}, []);

	const seekToRatio = useCallback(
		(ratio) => {
			const clamped = Math.max(0, Math.min(1, ratio));
			const total = durationRef.current || currentTrackRef.current?.duration_ms || 0;
			seekToMs(clamped * total);
		},
		[seekToMs],
	);

	const seekByMs = useCallback(
		(deltaMs) => {
			seekToMs(currentTimeRef.current + deltaMs);
		},
		[seekToMs],
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
		if (fullscreenCloseTimerRef.current) {
			clearTimeout(fullscreenCloseTimerRef.current);
			fullscreenCloseTimerRef.current = null;
		}
		if (withLyrics) setShowLyrics(true);
		setFullscreenPhase("open");
	}, []);

	const closeFullscreen = useCallback(() => {
		if (fullscreenPhaseRef.current !== "open") return;
		setFullscreenPhase("closing");
		if (fullscreenCloseTimerRef.current) {
			clearTimeout(fullscreenCloseTimerRef.current);
		}
		fullscreenCloseTimerRef.current = setTimeout(() => {
			fullscreenCloseTimerRef.current = null;
			setFullscreenPhase("closed");
		}, FULLSCREEN_EXIT_MS);
	}, []);

	const toggleFullscreen = useCallback(() => {
		if (fullscreenPhaseRef.current === "open") {
			closeFullscreen();
		} else {
			openFullscreen(false);
		}
	}, [closeFullscreen, openFullscreen]);

	const toggleShowLyrics = useCallback(() => {
		setShowLyrics((prev) => !prev);
	}, []);

	const isFullscreenOpen = fullscreenPhase === "open";
	const isFullscreenMounted = fullscreenPhase !== "closed";

	useSystemIntegration({
		currentTrack,
		isPlaying,
		isFullscreenOpen,
		togglePlay,
		nextTrack,
		prevTrack,
		seekToMs,
		seekByMs,
		toggleMute,
		toggleShowLyrics,
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
			fullscreenPhase,
			isFullscreenOpen,
			isFullscreenMounted,
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
			fullscreenPhase,
			isFullscreenOpen,
			isFullscreenMounted,
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
