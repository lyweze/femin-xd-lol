import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { MOCK_TRACKS } from "../services/mockData.js";
import {
	clearAllLocalTrackLyrics,
	getLyricsSnapshotForTracks,
	probeTempLyricsForTracks,
	subscribeLyricsChanges,
	syncTrackLyricsDraft,
} from "../services/lyricsStorage.js";
import {
	deleteLocalTrack,
	getLocalTracksSnapshot,
	hydrateLocalTracksMedia,
	saveLocalTrack,
	subscribeLocalTracksChanges,
	updateLocalTrack,
} from "../services/localTracksStorage.js";
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
	appendToQueue,
	buildQueueFromTracks,
	clearUpcomingEntries,
	insertPlayNext,
	moveUpcomingItem,
	pickNextQueueOutcome,
	pickPrevQueueOutcome,
	removeQueueEntry,
	shuffleList,
} from "./playerQueue.js";

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
	const [localTracks, setLocalTracks] = useState(getLocalTracksSnapshot);
	const catalogTracks = useMemo(
		() => (localTracks.length > 0 ? [...localTracks, ...MOCK_TRACKS] : MOCK_TRACKS),
		[localTracks],
	);

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
	const [trackEditorState, setTrackEditorState] = useState(null); // { mode: 'create' } | { mode: 'edit', track }
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
			return;
		}
		loadCoverAppearance(coverUrl, fallbackAccent).then(({ accentHex }) => {
			if (!cancelled) setRootAccent(accentHex);
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

	useEffect(() => {
		const syncLocalCatalog = () => {
			const nextLocal = getLocalTracksSnapshot();
			setLocalTracks(nextLocal);
			const byId = new Map(nextLocal.map((t) => [t.id, t]));

			setQueueState((prev) => {
				let changed = false;
				const nextItems = [];
				let nextIndex = prev.currentIndex;

				prev.items.forEach((entry, idx) => {
					if (!entry.track?.is_local) {
						nextItems.push(entry);
						return;
					}
					const latest = byId.get(entry.track.id);
					if (!latest) {
						changed = true;
						if (idx < prev.currentIndex) nextIndex -= 1;
						return;
					}
					if (
						entry.track.audio_url !== latest.audio_url ||
						entry.track.cover !== latest.cover ||
						entry.track.title !== latest.title ||
						entry.track.duration_ms !== latest.duration_ms
					) {
						changed = true;
						nextItems.push({ ...entry, track: latest });
					} else {
						nextItems.push(entry);
					}
				});

				if (!changed) return prev;
				if (nextItems.length === 0) {
					nextIndex = -1;
				} else if (nextIndex >= nextItems.length) {
					nextIndex = nextItems.length - 1;
				} else if (nextIndex < 0) {
					nextIndex = 0;
				}
				return { items: nextItems, currentIndex: nextIndex };
			});
		};

		const unsubscribe = subscribeLocalTracksChanges(syncLocalCatalog);
		void hydrateLocalTracksMedia();
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
			setQueueState((prev) => ({ ...prev, currentIndex: 0 }));
			setIsPlaying(true);
			return;
		}
		if (!items.length) return;
		setIsPlaying((prev) => !prev);
	}, []);

	/** Переход к следующему треку по очереди */
	const nextTrack = useCallback((autoAdvanced = false) => {
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

	const openTrackUploader = useCallback(() => {
		setTrackEditorState({ mode: "create" });
	}, []);

	const openTrackEditor = useCallback((track) => {
		if (!track?.is_local) return;
		setTrackEditorState({ mode: "edit", track });
	}, []);

	const closeTrackEditor = useCallback(() => {
		setTrackEditorState(null);
	}, []);

	const createLocalTrack = useCallback(
		async ({
			title,
			artistName,
			albumTitle,
			explicit,
			durationMs,
			audioFile,
			cover,
			lyricsText,
			lyricsLanguage = "ru",
			playImmediately = false,
		}) => {
			const created = await saveLocalTrack({
				title,
				artistName,
				albumTitle,
				explicit,
				durationMs,
				audioFile,
				cover,
			});

			syncTrackLyricsDraft(created.id, lyricsText, lyricsLanguage, false);

			if (playImmediately) {
				playTrack(created, [
					created,
					...getLocalTracksSnapshot().filter((t) => t.id !== created.id),
					...MOCK_TRACKS,
				]);
			} else {
				showQueueNotice(`Added track: ${created.title}`);
			}
			return created;
		},
		[playTrack, showQueueNotice],
	);

	const editLocalTrack = useCallback(
		async (
			trackId,
			{
				title,
				artistName,
				albumTitle,
				explicit,
				durationMs,
				audioFile,
				cover,
				clearCover,
				lyricsText,
				lyricsLanguage = "ru",
			},
		) => {
			const updated = await updateLocalTrack(trackId, {
				title,
				artistName,
				albumTitle,
				explicit,
				durationMs,
				audioFile,
				cover,
				clearCover,
			});
			if (!updated) return null;

			if (lyricsText !== undefined) {
				syncTrackLyricsDraft(trackId, lyricsText, lyricsLanguage, true);
			}

			showQueueNotice(`Updated track: ${updated.title}`);
			return updated;
		},
		[showQueueNotice],
	);

	const removeLocalTrack = useCallback(
		async (trackId) => {
			const deleted = await deleteLocalTrack(trackId);
			if (!deleted) return false;

			clearAllLocalTrackLyrics(trackId);

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

			showQueueNotice("Removed local track");
			return true;
		},
		[showQueueNotice],
	);

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
		toggleQueuePane,
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
