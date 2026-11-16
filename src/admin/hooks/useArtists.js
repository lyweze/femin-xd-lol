// src/admin/hooks/useArtists.js
import { useState, useCallback } from "react";
import { adminApi } from "../../api/adminApi.js";
import { useCursorList } from "./useCursorList.js";

export function useArtists(initialFilters = {}) {
	const list = useCursorList(adminApi.listArtists, initialFilters);
	const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

	const createArtist = useCallback(
		async (payload) => {
			const { artist } = await adminApi.createArtist(payload);
			list.setItems((prev) => [artist, ...prev]);
			return artist;
		},
		[list],
	);

	const updateArtist = useCallback(
		async (artistId, payload) => {
			const { artist } = await adminApi.updateArtist(artistId, payload);
			list.setItems((prev) =>
				prev.map((a) => (a.id === artistId ? artist : a)),
			);
			return artist;
		},
		[list],
	);

	const uploadAvatar = useCallback(
		async (artistId, file) => {
			setIsUploadingAvatar(true);
			try {
				const { artist } = await adminApi.uploadArtistAvatar(artistId, file);
				list.setItems((prev) =>
					prev.map((a) => (a.id === artistId ? artist : a)),
				);
				return artist;
			} finally {
				setIsUploadingAvatar(false);
			}
		},
		[list],
	);

	const deleteArtist = useCallback(
		async (artistId) => {
			await adminApi.deleteArtist(artistId);
			list.setItems((prev) => prev.filter((a) => a.id !== artistId));
		},
		[list],
	);

	return {
		...list,
		isUploadingAvatar,
		createArtist,
		updateArtist,
		uploadAvatar,
		deleteArtist,
	};
}
