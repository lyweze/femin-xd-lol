// ============================================================================
// Хук очереди треков и мониторинга фонового аудио-воркера
// ============================================================================
import { useState, useCallback, useEffect, useMemo } from "react";
import { adminApi } from "../../api/adminApi.js";
import { useCursorList } from "./useCursorList.js";

const WORKER_POLL_INTERVAL_MS = 3500;

/**
 * Управляет списком треков, загрузкой аудио, перезапуском упавших задач и автополлингом,
 * пока в таблице есть треки со статусом `processing`.
 */
export function useTracks(initialFilters = {}) {
	const list = useCursorList(adminApi.listTracks, initialFilters);
	const { items, setItems, refresh } = list;
	const [uploadingIds, setUploadingIds] = useState({});

	const hasProcessing = useMemo(
		() => items.some((t) => t.status === "processing"),
		[items],
	);

	useEffect(() => {
		if (!hasProcessing) return;
		const timer = setInterval(refresh, WORKER_POLL_INTERVAL_MS);
		return () => clearInterval(timer);
	}, [hasProcessing, refresh]);

	const uploadAudio = useCallback(
		async (trackId, file) => {
			setUploadingIds((prev) => ({ ...prev, [trackId]: true }));
			try {
				const { track } = await adminApi.uploadTrackAudio(trackId, file);
				setItems((prev) => prev.map((t) => (t.id === trackId ? track : t)));
				return track;
			} finally {
				setUploadingIds((prev) => ({ ...prev, [trackId]: false }));
			}
		},
		[setItems],
	);

	const reprocessTrack = useCallback(
		async (trackId) => {
			const { track } = await adminApi.reprocessTrack(trackId);
			setItems((prev) => prev.map((t) => (t.id === trackId ? track : t)));
			return track;
		},
		[setItems],
	);

	const deleteTrack = useCallback(
		async (trackId) => {
			await adminApi.deleteTrack(trackId);
			setItems((prev) => prev.filter((t) => t.id !== trackId));
		},
		[setItems],
	);

	return {
		...list,
		uploadingIds,
		uploadAudio,
		reprocessTrack,
		deleteTrack,
	};
}
