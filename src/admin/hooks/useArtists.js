// ============================================================================
// Хук управления справочником артистов и загрузкой аватаров
// ============================================================================
import { useState, useCallback } from "react";
import { adminApi } from "../../api/adminApi.js";
import { useCursorList } from "./useCursorList.js";

/** Подключает CRUD-операции над артистами и индикатор загрузки аватара по ID */
export function useArtists(initialFilters = {}) {
	const list = useCursorList(adminApi.listArtists, initialFilters);
	const { setItems } = list;
	const [uploadingAvatarId, setUploadingAvatarId] = useState(null);

	const createArtist = useCallback(
		async (payload) => {
			const { artist } = await adminApi.createArtist(payload);
			setItems((prev) => [artist, ...prev]);
			return artist;
		},
		[setItems],
	);

	const updateArtist = useCallback(
		async (artistId, payload) => {
			const { artist } = await adminApi.updateArtist(artistId, payload);
			setItems((prev) => prev.map((a) => (a.id === artistId ? artist : a)));
			return artist;
		},
		[setItems],
	);

	const uploadAvatar = useCallback(
		async (artistId, file) => {
			setUploadingAvatarId(artistId);
			try {
				const { artist } = await adminApi.uploadArtistAvatar(artistId, file);
				setItems((prev) => prev.map((a) => (a.id === artistId ? artist : a)));
				return artist;
			} finally {
				setUploadingAvatarId(null);
			}
		},
		[setItems],
	);

	const deleteArtist = useCallback(
		async (artistId) => {
			await adminApi.deleteArtist(artistId);
			setItems((prev) => prev.filter((a) => a.id !== artistId));
		},
		[setItems],
	);

	return {
		...list,
		uploadingAvatarId,
		isUploadingAvatar: Boolean(uploadingAvatarId),
		createArtist,
		updateArtist,
		uploadAvatar,
		deleteArtist,
	};
}
