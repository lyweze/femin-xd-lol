import { useState, useCallback, useEffect, useMemo } from "react";
import { adminApi } from "../../api/adminApi.js";
import { useCursorList } from "./useCursorList.js";

export function useTracks(initialFilters = {}) {
	const list = useCursorList(adminApi.listTracks, initialFilters);
	const { items, setItems, refresh } = list;
	const [uploadingIds, setUploadingIds] = useState({});

	// Автообновление очереди, пока есть треки в статусе processing
	const hasProcessing = useMemo(
		() => items.some((t) => t.status === "processing"),
		[items],
	);

	useEffect(() => {
		if (!hasProcessing) return;
		const timer = setInterval(() => {
			refresh();
		}, 3500);
		return () => clearInterval(timer);
	}, [hasProcessing, refresh]);

	const uploadAudio = useCallback(
		async (trackId, file) => {
			setUploadingIds((prev) => ({ ...prev, [trackId]: true }));
			try {
				const { track } = await adminApi.uploadTrackAudio(trackId, file);
				setItems((prev) =>
					prev.map((t) => (t.id === trackId ? track : t)),
				);
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
