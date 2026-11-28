// ============================================================================
// Хук управления локально загруженными треками и их редактором (`useLocalTrackManager`)
// Инкапсулирует подписку на IndexedDB-хранилище, создание, обновление и удаление треков.
// ============================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MOCK_TRACKS } from "../services/mockData.js";
import {
	deleteLocalTrack,
	getLocalTracksSnapshot,
	hydrateLocalTracksMedia,
	saveLocalTrack,
	subscribeLocalTracksChanges,
	updateLocalTrack,
} from "../services/localTracksStorage.js";
import {
	clearAllLocalTrackLyrics,
	syncTrackLyricsDraft,
} from "../services/lyricsStorage.js";

export function useLocalTrackManager({
	onLocalTracksSync,
	onPlayCreated,
	onRemoveReferences,
	onNotice,
}) {
	const [localTracks, setLocalTracks] = useState(getLocalTracksSnapshot);
	const [trackEditorState, setTrackEditorState] = useState(null);

	const onLocalTracksSyncRef = useRef(onLocalTracksSync);
	useEffect(() => {
		onLocalTracksSyncRef.current = onLocalTracksSync;
	});

	const catalogTracks = useMemo(
		() => (localTracks.length > 0 ? [...localTracks, ...MOCK_TRACKS] : MOCK_TRACKS),
		[localTracks],
	);

	useEffect(() => {
		const handleSync = () => {
			const nextLocal = getLocalTracksSnapshot();
			setLocalTracks(nextLocal);
			onLocalTracksSyncRef.current?.(nextLocal);
		};

		const unsubscribe = subscribeLocalTracksChanges(handleSync);
		void hydrateLocalTracksMedia();
		return unsubscribe;
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
				onPlayCreated?.(created, [
					created,
					...getLocalTracksSnapshot().filter((t) => t.id !== created.id),
					...MOCK_TRACKS,
				]);
			} else {
				onNotice?.(`Added track: ${created.title}`);
			}
			return created;
		},
		[onPlayCreated, onNotice],
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

			onNotice?.(`Updated track: ${updated.title}`);
			return updated;
		},
		[onNotice],
	);

	const removeLocalTrack = useCallback(
		async (trackId) => {
			const deleted = await deleteLocalTrack(trackId);
			if (!deleted) return false;

			clearAllLocalTrackLyrics(trackId);
			onRemoveReferences?.(trackId);
			onNotice?.("Removed local track");
			return true;
		},
		[onRemoveReferences, onNotice],
	);

	return {
		localTracks,
		catalogTracks,
		trackEditorState,
		openTrackUploader,
		openTrackEditor,
		closeTrackEditor,
		createLocalTrack,
		editLocalTrack,
		removeLocalTrack,
	};
}
