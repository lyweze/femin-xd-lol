import { useCallback } from "react";
import { adminApi } from "../../api/adminApi.js";
import { useCursorList } from "./useCursorList.js";

export function useAlbums(initialFilters = {}) {
	const list = useCursorList(adminApi.listAlbums, initialFilters);
	const { setItems } = list;

	const createAlbum = useCallback(
		async (payload) => {
			const { album } = await adminApi.createAlbum(payload);
			setItems((prev) => [album, ...prev]);
			return album;
		},
		[setItems],
	);

	const deleteAlbum = useCallback(
		async (albumId) => {
			await adminApi.deleteAlbum(albumId);
			setItems((prev) => prev.filter((a) => a.id !== albumId));
		},
		[setItems],
	);

	return {
		...list,
		createAlbum,
		deleteAlbum,
	};
}
