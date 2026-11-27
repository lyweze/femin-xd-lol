import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { MOCK_TRACKS } from "../services/mockData.js";
import { useAudioEngine } from "../hooks/useAudioEngine.js";
import { useSystemIntegration } from "../hooks/useSystemIntegration.js";
import {
	DEFAULT_ACCENT,
	loadCoverAppearance,
	setRootAccent,
} from "../utils/cover.js";
import { clampUnit } from "../utils/format.js";
import {
	readStorageJson,
	readStorageNumber,
	writeStorageJson,
	writeStorageValue,
} from "../utils/storage.js";
import {
	PlayerActionsContext,
	PlayerStateContext,
	PlayerTimeContext,
} from "./playerContexts.js";
import {
	applyPlaylistPatch,
	buildUserPlaylist,
	readStoredPlaylists,
	writeStoredPlaylists,
} from "./playerPlaylists.js";
import {
	pickNextTrackOutcome,
	pickPrevTrackOutcome,
	shuffleList,
} from "./playerQueue.js";

// ============================================================================
// Провайдер состояния аудиоплеера (Split Context: Actions / State / Time)
// ============================================================================
const LIKED_STORAGE_KEY = "matte_obsidian_liked_tracks";
const VOLUME_STORAGE_KEY = "matte_obsidian_volume";
const RESTART_THRESHOLD_MS = 3000; // После 3 секунд кнопка «Назад» перезапускает трек с 00:00
const FULLSCREEN_EXIT_MS = 260; // Синхронизировано с CSS-анимацией fsModalExit (240ms)
const DEFAULT_VOLUME = 0.8;
const DEFAULT_LIKED_IDS = ["d4000000-0000-0000-0000-000000000001"];

const REPEAT_CYCLE = { off: "all", all: "one", one: "off" };

/**
 * Центральный провайдер плеера.
 * Разделён на 3 контекста, чтобы тики `currentTimeMs` (2–4 раза/с) перерисовывали
 * только полосы прогресса и текст песни, а не таблицы каталога и сайдбар.
 */
export function PlayerProvider({ children }) {
	const [queue, setQueue] = useState(MOCK_TRACKS);
	const [currentTrack, setCurrentTrack] = useState(MOCK_TRACKS[0] ?? null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [isShuffle, setIsShuffle] = useState(false);
	const [repeatMode, setRepeatMode] = useState("off"); // 'off' | 'all' | 'one'
	const [volume, setVolumeState] = useState(() =>
		readStorageNumber(VOLUME_STORAGE_KEY, DEFAULT_VOLUME, 0, 1),
	);
	const [isMuted, setIsMuted] = useState(false);
	const [likedIds, setLikedIds] = useState(() =>
		readStorageJson(LIKED_STORAGE_KEY, DEFAULT_LIKED_IDS, Array.isArray),
	);
	const [playlists, setPlaylists] = useState(readStoredPlaylists);
	const [fullscreenPhase, setFullscreenPhase] = useState("closed"); // 'closed' | 'open' | 'closing'
	const [showLyrics, setShowLyrics] = useState(true);
	const [durationOverrides, setDurationOverrides] = useState({});

	// Рефы дублируют состояние, чтобы экшены (playTrack, nextTrack, prevTrack...) оставались стабильными
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

	// Обновляем глобальный --accent-cover даже если компонент AmbientBg временно не смонтирован
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

	// Сохраняем пользовательские плейлисты в localStorage при каждом изменении
	useEffect(() => {
		writeStoredPlaylists(playlists);
	}, [playlists]);

	const handleDurationDetected = useCallback((trackId, detectedMs) => {
		setDurationOverrides((prev) =>
			prev[trackId] === detectedMs ? prev : { ...prev, [trackId]: detectedMs },
		);
	}, []);

	/** Запускает указанный трек (или ставит на паузу, если кликнули по уже активному) */
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

	/** Заменяет очередь коллекцией (альбомом или плейлистом) и сразу запускает воспроизведение */
	const playQueue = useCallback((tracks, { shuffle = false } = {}) => {
		if (!Array.isArray(tracks) || tracks.length === 0) return;
		const ordered = shuffle ? shuffleList(tracks) : [...tracks];
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

	/** Переключает Play / Pause, подхватывая первый трек очереди при первом запуске */
	const togglePlay = useCallback(() => {
		if (!currentTrackRef.current && queueRef.current.length > 0) {
			setCurrentTrack(queueRef.current[0]);
			setIsPlaying(true);
			return;
		}
		setIsPlaying((prev) => !prev);
	}, []);

	/** Переход к следующему треку (ручной клик или авто-переключение в конце трека) */
	const nextTrack = useCallback((autoAdvanced = false) => {
		const outcome = pickNextTrackOutcome({
			queue: queueRef.current,
			currentTrackId: currentTrackRef.current?.id,
			isShuffle: isShuffleRef.current,
			repeatMode: repeatModeRef.current,
			autoAdvanced,
		});

		if (outcome.action === "restart") {
			restartRef.current(true);
			setIsPlaying(true);
		} else if (outcome.action === "select") {
			setCurrentTrack(outcome.track);
			setIsPlaying(true);
		} else if (outcome.action === "stop") {
			setIsPlaying(false);
		}
	}, []);

	/** Возврат к началу трека (> 3 с) или переход к предыдущему в очереди */
	const prevTrack = useCallback(() => {
		const outcome = pickPrevTrackOutcome({
			queue: queueRef.current,
			currentTrackId: currentTrackRef.current?.id,
			currentTimeMs: currentTimeRef.current,
			restartThresholdMs: RESTART_THRESHOLD_MS,
		});

		if (outcome.action === "restart") {
			restartRef.current(true);
			setIsPlaying(true);
		} else if (outcome.action === "select") {
			setCurrentTrack(outcome.track);
			setIsPlaying(true);
		}
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

	// Поддерживаем актуальность рефов после каждого рендера
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
			const clamped = clampUnit(ratio);
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
		const clamped = clampUnit(value);
		setVolumeState(clamped);
		if (clamped > 0) setIsMuted(false);
		writeStorageValue(VOLUME_STORAGE_KEY, clamped);
	}, []);

	const toggleMute = useCallback(() => {
		setIsMuted((prev) => !prev);
	}, []);

	const toggleShuffle = useCallback(() => {
		setIsShuffle((prev) => !prev);
	}, []);

	const cycleRepeat = useCallback(() => {
		setRepeatMode((prev) => REPEAT_CYCLE[prev] ?? "off");
	}, []);

	const toggleLike = useCallback((trackId) => {
		setLikedIds((prev) => {
			const exists = prev.includes(trackId);
			const next = exists
				? prev.filter((id) => id !== trackId)
				: [trackId, ...prev];
			writeStorageJson(LIKED_STORAGE_KEY, next);
			return next;
		});
	}, []);

	/** Создаёт новый пользовательский плейлист и возвращает его объект */
	const createPlaylist = useCallback((payload) => {
		const created = buildUserPlaylist(payload);
		setPlaylists((prev) => [...prev, created]);
		return created;
	}, []);

	/** Обновляет поля плейлиста (`title`, `description`, `cover`, `track_ids`) */
	const updatePlaylist = useCallback((playlistId, patch) => {
		setPlaylists((prev) => applyPlaylistPatch(prev, playlistId, patch));
	}, []);

	/** Удаляет пользовательский плейлист по ID */
	const deletePlaylist = useCallback((playlistId) => {
		setPlaylists((prev) => prev.filter((pl) => pl.id !== playlistId));
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
		// Размонтируем FullscreenPlayer только после завершения анимации ухода
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
			playlists,
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
			playlists,
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
			createPlaylist,
			updatePlaylist,
			deletePlaylist,
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
			createPlaylist,
			updatePlaylist,
			deletePlaylist,
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
