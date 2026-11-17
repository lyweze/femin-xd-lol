import { useState, useCallback } from "react";
import { adminApi } from "../../api/adminApi.js";
import { useCursorList } from "./useCursorList.js";

export function useTracks(initialFilters = {}) {
	const list = useCursorList(adminApi.listTracks, initialFilters);
	const [uploadingIds, setUploadingIds] = useState({});

	const uploadAudio = useCallback(
		async (trackId, file) => {
			setUploadingIds((prev) => ({ ...prev, [trackId]: true }));
			try {
				const { track } = await adminApi.uploadTrackAudio(trackId, file);
				list.setItems((prev) =>
					prev.map((t) => (t.id === trackId ? track : t)),
				);
				return track;
			} finally {
				setUploadingIds((prev) => ({ ...prev, [trackId]: false }));
			}
		},
		[list],
	);

	const reprocessTrack = useCallback(
		async (trackId) => {
			const { track } = await adminApi.reprocessTrack(trackId);
			list.setItems((prev) => prev.map((t) => (t.id === trackId ? track : t)));
			return track;
		},
		[list],
	);

	const deleteTrack = useCallback(
		async (trackId) => {
			await adminApi.deleteTrack(trackId);
			list.setItems((prev) => prev.filter((t) => t.id !== trackId));
		},
		[list],
	);

	return {
		...list,
		uploadingIds,
		uploadAudio,
		reprocessTrack,
		deleteTrack,
	};
}
