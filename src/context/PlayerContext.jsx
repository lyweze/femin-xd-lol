import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { MOCK_TRACKS } from "../services/mockData.js";
import {
	getLyricsSnapshotForTracks,
	probeTempLyricsForTracks,
	subscribeLyricsChanges,
} from "../services/lyricsStorage.js";
import { getLocalTracksSnapshot } from "../services/localTracksStorage.js";
import { useAudioEngine } from "../hooks/useAudioEngine.js";
import { useSystemIntegration } from "../hooks/useSystemIntegration.js";
import { syncOsAppearance, triggerOsHaptic } from "../platform/osBridge.js";
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
	appendToQueue,
	buildQueueFromTracks,
	clearUpcomingEntries,
	insertPlayNext,
	moveUpcomingItem,
	pickNextQueueOutcome,
	pickPrevQueueOutcome,
	reconcileQueueWithLocalTracks,
	removeQueueEntry,
	shuffleList,
} from "./playerQueue.js";
import { useLocalTrackManager } from "./useLocalTrackManager.js";

// ============================================================================
// Провайдер состояния аудиоплеера (Split Context: Actions / State / Time)
// Управляет очередью воспроизведения (`Playing Next`), плейлистами,
// локальными текстами песен и полноэкранными режимами (`cover` | `lyrics` | `queue`).
// ============================================================================
const LIKED_STORAGE_KEY = "matte_obsidian_liked_tracks";
const VOLUME_STORAGE_KEY = "matte_obsidian_volume";
const RESTART_THRESHOLD_MS = 3000; // После 3 секунд кнопка «Назад» перезапускает трек с 00:00
const FULLSCREEN_EXIT_MS = 260; // Синхронизировано с CSS-анимацией fsModalExit (240ms)
const QUEUE_NOTICE_MS = 1800;
const DEFAULT_VOLUME = 0.8;
const DEFAULT_LIKED_IDS = ["d4000000-0000-0000-0000-000000000001"];

const REPEAT_CYCLE = { off: "all", all: "one", one: "off" };

/**
 * Центральный провайдер плеера.
 * Разделён на 3 контекста, чтобы тики `currentTimeMs` (2–4 раза/с) перерисовывали
 * только полосы прогресса и текст песни, а не таблицы каталога и сайдбар.
 */
export function PlayerProvider({ children }) {
	const [queueState, setQueueState] = useState(() => {
		const initialTracks = [...getLocalTracksSnapshot(), ...MOCK_TRACKS];
		return {
			items: buildQueueFromTracks(initialTracks, "context"),
			currentIndex: initialTracks.length > 0 ? 0 : -1,
		};
	});
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
	const [lyricsByTrack, setLyricsByTrack] = useState(() =>
		getLyricsSnapshotForTracks([...getLocalTracksSnapshot(), ...MOCK_TRACKS]),
	);
	const [fullscreenPhase, setFullscreenPhase] = useState("closed"); // 'closed' | 'open' | 'closing'
	const [fullscreenPane, setFullscreenPane] = useState("lyrics"); // 'cover' | 'lyrics' | 'queue'
	const [trackMenuState, setTrackMenuState] = useState(null); // { track, queueTracks, anchorRect }
	const [queueNotice, setQueueNotice] = useState(null); // { uid, message }
	const [durationOverrides, setDurationOverrides] = useState({});

	const queue = queueState.items;
	const currentQueueIndex = queueState.currentIndex;
	const currentTrack =
		currentQueueIndex >= 0 && currentQueueIndex < queue.length
			? queue[currentQueueIndex].track
			: null;

	// Рефы дублируют актуальное состояние, чтобы экшены сохраняли стабильные ссылки
	const queueStateRef = useRef(queueState);
	const currentTrackRef = useRef(currentTrack);
	const isShuffleRef = useRef(isShuffle);
	const repeatModeRef = useRef(repeatMode);
	const fullscreenPhaseRef = useRef(fullscreenPhase);
	const fullscreenCloseTimerRef = useRef(null);
	const queueNoticeTimerRef = useRef(null);
	const currentTimeRef = useRef(0);
	const durationRef = useRef(0);
	const restartRef = useRef(() => {});

	const coverUrl = currentTrack?.cover?.small_url ?? null;
	const fallbackAccent = currentTrack?.accent || DEFAULT_ACCENT;

	useEffect(() => {
		let cancelled = false;
		if (!coverUrl) {
			setRootAccent(fallbackAccent);
			syncOsAppearance({ accentHex: fallbackAccent });
			return;
		}
		loadCoverAppearance(coverUrl, fallbackAccent).then(({ accentHex }) => {
			if (!cancelled) {
				setRootAccent(accentHex);
				syncOsAppearance({ accentHex });
			}
		});
		return () => {
			cancelled = true;
		};
	}, [coverUrl, fallbackAccent]);

	useEffect(() => {
		writeStoredPlaylists(playlists);
	}, [playlists]);

	useEffect(() => {
		const refreshLyrics = () => {
			setLyricsByTrack(
				getLyricsSnapshotForTracks([...getLocalTracksSnapshot(), ...MOCK_TRACKS]),
			);
		};
		const unsubscribe = subscribeLyricsChanges(refreshLyrics);
		void probeTempLyricsForTracks(MOCK_TRACKS);
		return unsubscribe;
	}, []);

	/** Короткое уведомление о добавлении трека в очередь («Playing Next» / «Added to Queue») */
	const showQueueNotice = useCallback((message) => {
		if (queueNoticeTimerRef.current) {
			clearTimeout(queueNoticeTimerRef.current);
		}
		setQueueNotice({ id: Date.now(), message });
		queueNoticeTimerRef.current = setTimeout(() => {
			queueNoticeTimerRef.current = null;
			setQueueNotice(null);
		}, QUEUE_NOTICE_MS);
	}, []);

	const handleDurationDetected = useCallback((trackId, detectedMs) => {
		setDurationOverrides((prev) =>
			prev[trackId] === detectedMs ? prev : { ...prev, [trackId]: detectedMs },
		);
	}, []);

	/** Запускает трек в контексте переданного списка (или ставит на паузу активный) */
	const playTrack = useCallback((track, nextQueue = null) => {
		if (!track) return;

		if (Array.isArray(nextQueue) && nextQueue.length > 0) {
			if (currentTrackRef.current?.id === track.id) {
				setIsPlaying((prev) => !prev);
				return;
			}
			const items = buildQueueFromTracks(nextQueue, "context");
			const foundIdx = items.findIndex((item) => item.track.id === track.id);
			setQueueState({
				items,
				currentIndex: foundIdx >= 0 ? foundIdx : 0,
			});
			setIsPlaying(true);
			return;
		}

		if (currentTrackRef.current?.id === track.id) {
			setIsPlaying((prev) => !prev);
			return;
		}

		const items = queueStateRef.current.items;
		const existingIdx = items.findIndex((item) => item.track.id === track.id);
		if (existingIdx >= 0) {
			setQueueState((prev) => ({ ...prev, currentIndex: existingIdx }));
		} else {
			setQueueState((prev) => ({
				items: [...prev.items, ...buildQueueFromTracks([track], "context")],
				currentIndex: prev.items.length,
			}));
		}
		setIsPlaying(true);
	}, []);

	/** Заменяет очередь коллекцией и запускает воспроизведение с первой позиции */
	const playQueue = useCallback((tracks, { shuffle = false } = {}) => {
		if (!Array.isArray(tracks) || tracks.length === 0) return;
		const ordered = shuffle ? shuffleList(tracks) : [...tracks];
		setIsShuffle(shuffle);

		const items = buildQueueFromTracks(ordered, "context");
		const restartingSame = currentTrackRef.current?.id === ordered[0].id;
		setQueueState({ items, currentIndex: 0 });
		if (restartingSame) {
			restartRef.current(true);
		}
		setIsPlaying(true);
	}, []);

	/** Мгновенный переход к конкретной позиции в очереди по индексу */
	const playQueueIndex = useCallback((targetIndex) => {
		const { items, currentIndex } = queueStateRef.current;
		if (targetIndex < 0 || targetIndex >= items.length) return;
		if (targetIndex === currentIndex) {
			setIsPlaying((prev) => !prev);
			return;
		}
		setQueueState((prev) => ({ ...prev, currentIndex: targetIndex }));
		setIsPlaying(true);
	}, []);

	/** Вставляет трек следующим сразу после текущего (`Play Next`) */
	const playTrackNext = useCallback(
		(track) => {
			if (!track) return;
			triggerOsHaptic("light");
			const result = insertPlayNext(
				queueStateRef.current.items,
				queueStateRef.current.currentIndex,
				track,
			);
			setQueueState({ items: result.queue, currentIndex: result.currentIndex });
			if (result.shouldPlay) {
				setIsPlaying(true);
			}
			showQueueNotice(`Playing next: ${track.title}`);
		},
		[showQueueNotice],
	);

	/** Добавляет трек в конец очереди (`Add to Queue`) */
	const enqueueTrack = useCallback(
		(track) => {
			if (!track) return;
			triggerOsHaptic("light");
			const result = appendToQueue(
				queueStateRef.current.items,
				queueStateRef.current.currentIndex,
				track,
			);
			setQueueState({ items: result.queue, currentIndex: result.currentIndex });
			if (result.shouldPlay) {
				setIsPlaying(true);
			}
			showQueueNotice(`Added to queue: ${track.title}`);
		},
		[showQueueNotice],
	);

	/** Меняет порядок предстоящих треков в блоке «Далее» */
	const moveQueueItem = useCallback((fromUpcomingIdx, toUpcomingIdx) => {
		setQueueState((prev) => ({
			...prev,
			items: moveUpcomingItem(
				prev.items,
				prev.currentIndex,
				fromUpcomingIdx,
				toUpcomingIdx,
			),
		}));
	}, []);

	/** Удаляет слот очереди по его уникальному `uid` */
	const removeFromQueue = useCallback((targetUid) => {
		setQueueState((prev) => {
			const res = removeQueueEntry(prev.items, prev.currentIndex, targetUid);
			if (res.currentIndex < 0) setIsPlaying(false);
			return { items: res.queue, currentIndex: res.currentIndex };
		});
	}, []);

	/** Очищает все предстоящие треки, оставляя текущий и историю */
	const clearUpcomingQueue = useCallback(() => {
		setQueueState((prev) => ({
			...prev,
			items: clearUpcomingEntries(prev.items, prev.currentIndex),
		}));
	}, []);

	/** Переключает Play / Pause */
	const togglePlay = useCallback(() => {
		const { items, currentIndex } = queueStateRef.current;
		if (currentIndex < 0 && items.length > 0) {
			triggerOsHaptic("medium");
			setQueueState((prev) => ({ ...prev, currentIndex: 0 }));
			setIsPlaying(true);
			return;
		}
		if (!items.length) return;
		triggerOsHaptic("medium");
		setIsPlaying((prev) => !prev);
	}, []);

	/** Переход к следующему треку по очереди */
	const nextTrack = useCallback((autoAdvanced = false) => {
		if (!autoAdvanced) {
			triggerOsHaptic("light");
		}
		const outcome = pickNextQueueOutcome({
			queue: queueStateRef.current.items,
			currentIndex: queueStateRef.current.currentIndex,
			isShuffle: isShuffleRef.current,
			repeatMode: repeatModeRef.current,
			autoAdvanced,
		});

		if (outcome.action === "restart") {
			restartRef.current(true);
			setIsPlaying(true);
		} else if (outcome.action === "select") {
			setQueueState((prev) => ({ ...prev, currentIndex: outcome.index }));
			setIsPlaying(true);
		} else if (outcome.action === "stop") {
			setIsPlaying(false);
		}
	}, []);

	/** Возврат к 00:00 (> 3 с) или переход к предыдущему слоту очереди */
	const prevTrack = useCallback(() => {
		triggerOsHaptic("light");
		const outcome = pickPrevQueueOutcome({
			queue: queueStateRef.current.items,
			currentIndex: queueStateRef.current.currentIndex,
			currentTimeMs: currentTimeRef.current,
			restartThresholdMs: RESTART_THRESHOLD_MS,
		});

		if (outcome.action === "restart") {
			restartRef.current(true);
			setIsPlaying(true);
		} else if (outcome.action === "select") {
			setQueueState((prev) => ({ ...prev, currentIndex: outcome.index }));
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

	useEffect(() => {
		queueStateRef.current = queueState;
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
			if (queueNoticeTimerRef.current) {
				clearTimeout(queueNoticeTimerRef.current);
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
		triggerOsHaptic("light");
		setLikedIds((prev) => {
			const exists = prev.includes(trackId);
			const next = exists
				? prev.filter((id) => id !== trackId)
				: [trackId, ...prev];
			writeStorageJson(LIKED_STORAGE_KEY, next);
			return next;
		});
	}, []);

	const createPlaylist = useCallback((payload) => {
		const created = buildUserPlaylist(payload);
		setPlaylists((prev) => [...prev, created]);
		return created;
	}, []);

	const updatePlaylist = useCallback((playlistId, patch) => {
		setPlaylists((prev) => applyPlaylistPatch(prev, playlistId, patch));
	}, []);

	const deletePlaylist = useCallback((playlistId) => {
		setPlaylists((prev) => prev.filter((pl) => pl.id !== playlistId));
	}, []);

	const syncLocalQueue = useCallback((nextLocal) => {
		setQueueState((prev) => reconcileQueueWithLocalTracks(prev, nextLocal));
	}, []);

	const removeLocalTrackReferences = useCallback((trackId) => {
		setLikedIds((prev) => {
			if (!prev.includes(trackId)) return prev;
			const next = prev.filter((id) => id !== trackId);
			writeStorageJson(LIKED_STORAGE_KEY, next);
			return next;
		});

		setPlaylists((prev) => {
			let modified = false;
			const next = prev.map((pl) => {
				if (!pl.track_ids?.includes(trackId)) return pl;
				modified = true;
				return { ...pl, track_ids: pl.track_ids.filter((id) => id !== trackId) };
			});
			return modified ? next : prev;
		});

		if (
			currentTrackRef.current?.id === trackId &&
			queueStateRef.current.items.length <= 1
		) {
			setIsPlaying(false);
		}
	}, []);

	const {
		localTracks,
		catalogTracks,
		trackEditorState,
		openTrackUploader,
		openTrackEditor,
		closeTrackEditor,
		createLocalTrack,
		editLocalTrack,
		removeLocalTrack,
	} = useLocalTrackManager({
		onLocalTracksSync: syncLocalQueue,
		onPlayCreated: playTrack,
		onRemoveReferences: removeLocalTrackReferences,
		onNotice: showQueueNotice,
	});

	/** Открывает полноэкранный плеер в заданном режиме (`"cover" | "lyrics" | "queue"` или boolean для совместимости) */
	const openFullscreen = useCallback((targetPane = null) => {
		if (fullscreenCloseTimerRef.current) {
			clearTimeout(fullscreenCloseTimerRef.current);
			fullscreenCloseTimerRef.current = null;
		}
		if (targetPane === true || targetPane === "lyrics") {
			setFullscreenPane("lyrics");
		} else if (targetPane === "queue" || targetPane === "cover") {
			setFullscreenPane(targetPane);
		} else if (targetPane === false) {
			// Если до этого оставалась очередь, возвращаемся к привычному виду трека
			setFullscreenPane((prev) => (prev === "queue" ? "cover" : prev));
		}
		setFullscreenPhase("open");
	}, []);

	/** Открывает контекстное меню / шторку действий над треком */
	const openTrackMenu = useCallback((track, queueTracks = null, anchorRect = null) => {
		if (!track) return;
		setTrackMenuState({ track, queueTracks, anchorRect });
	}, []);

	const closeTrackMenu = useCallback(() => {
		setTrackMenuState(null);
	}, []);

	/** Включает указанный трек (если ещё не активен) и сразу открывает экран текста */
	const openTrackLyrics = useCallback(
		(track, nextQueue = null) => {
			if (!track) return;
			if (currentTrackRef.current?.id !== track.id) {
				playTrack(track, nextQueue);
			}
			openFullscreen("lyrics");
		},
		[openFullscreen, playTrack],
	);

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
			openFullscreen("cover");
		}
	}, [closeFullscreen, openFullscreen]);

	const toggleShowLyrics = useCallback(() => {
		setFullscreenPane((prev) => (prev === "lyrics" ? "cover" : "lyrics"));
	}, []);

	const toggleQueuePane = useCallback(() => {
		setFullscreenPane((prev) => (prev === "queue" ? "cover" : "queue"));
	}, []);

	const openQueueFromOs = useCallback(() => {
		openFullscreen("queue");
	}, [openFullscreen]);

	const openLyricsFromOs = useCallback(() => {
		if (fullscreenPhaseRef.current !== "open") {
			openFullscreen("lyrics");
			return;
		}
		toggleShowLyrics();
	}, [openFullscreen, toggleShowLyrics]);

	const isFullscreenOpen = fullscreenPhase === "open";
	const isFullscreenMounted = fullscreenPhase !== "closed";

	useSystemIntegration({
		currentTrack,
		isPlaying,
		volume,
		isFullscreenOpen,
		togglePlay,
		nextTrack,
		prevTrack,
		seekToMs,
		seekByMs,
		setVolume,
		toggleMute,
		toggleShowLyrics,
		toggleQueuePane,
		onOpenQueue: openQueueFromOs,
		onOpenLyrics: openLyricsFromOs,
		onOpenUploader: openTrackUploader,
		closeFullscreen,
		toggleFullscreen,
	});

	const stateValue = useMemo(
		() => ({
			currentTrack,
			localTracks,
			catalogTracks,
			queue,
			currentQueueIndex,
			isPlaying,
			isShuffle,
			repeatMode,
			volume,
			isMuted,
			likedIds,
			playlists,
			lyricsByTrack,
			fullscreenPhase,
			fullscreenPane,
			isFullscreenOpen,
			isFullscreenMounted,
			showLyrics: fullscreenPane === "lyrics",
			trackMenuState,
			trackEditorState,
			queueNotice,
			durationOverrides,
		}),
		[
			currentTrack,
			localTracks,
			catalogTracks,
			queue,
			currentQueueIndex,
			isPlaying,
			isShuffle,
			repeatMode,
			volume,
			isMuted,
			likedIds,
			playlists,
			lyricsByTrack,
			fullscreenPhase,
			fullscreenPane,
			isFullscreenOpen,
			isFullscreenMounted,
			trackMenuState,
			trackEditorState,
			queueNotice,
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
			playQueueIndex,
			playTrackNext,
			enqueueTrack,
			moveQueueItem,
			removeFromQueue,
			clearUpcomingQueue,
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
			openTrackUploader,
			openTrackEditor,
			closeTrackEditor,
			createLocalTrack,
			editLocalTrack,
			removeLocalTrack,
			openFullscreen,
			openTrackLyrics,
			openTrackMenu,
			closeTrackMenu,
			closeFullscreen,
			toggleFullscreen,
			toggleShowLyrics,
			toggleQueuePane,
			setFullscreenPane,
		}),
		[
			playTrack,
			playQueue,
			playQueueIndex,
			playTrackNext,
			enqueueTrack,
			moveQueueItem,
			removeFromQueue,
			clearUpcomingQueue,
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
			openTrackUploader,
			openTrackEditor,
			closeTrackEditor,
			createLocalTrack,
			editLocalTrack,
			removeLocalTrack,
			openFullscreen,
			openTrackLyrics,
			openTrackMenu,
			closeTrackMenu,
			closeFullscreen,
			toggleFullscreen,
			toggleShowLyrics,
			toggleQueuePane,
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
