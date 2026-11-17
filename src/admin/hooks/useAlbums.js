import { useCallback } from "react";
import { adminApi } from "../../api/adminApi.js";
import { useCursorList } from "./useCursorList.js";

export function useAlbums(initialFilters = {}) {
	const list = useCursorList(adminApi.listAlbums, initialFilters);

	const createAlbum = useCallback(
		async (payload) => {
			const { album } = await adminApi.createAlbum(payload);
			list.setItems((prev) => [album, ...prev]);
			return album;
		},
		[list],
	);

	const deleteAlbum = useCallback(
		async (albumId) => {
			await adminApi.deleteAlbum(albumId);
			list.setItems((prev) => prev.filter((a) => a.id !== albumId));
		},
		[list],
	);

	return {
		...list,
		createAlbum,
		deleteAlbum,
	};
}
