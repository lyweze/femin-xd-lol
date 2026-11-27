// ============================================================================
// Хранение и чистые мутации пользовательских плейлистов (`playerPlaylists`)
// ============================================================================
import { MOCK_PLAYLISTS } from "../services/mockData.js";
import { DEFAULT_ACCENT } from "../utils/cover.js";
import { readStorageJson, writeStorageJson } from "../utils/storage.js";

export const PLAYLISTS_STORAGE_KEY = "matte_obsidian_user_playlists";

function isValidPlaylistList(value) {
	return (
		Array.isArray(value) &&
		value.every(
			(item) =>
				item &&
				typeof item === "object" &&
				typeof item.id === "string" &&
				typeof item.title === "string",
		)
	);
}

/**
 * Читает сохранённые плейлисты из `localStorage`, либо клонирует стартовый `MOCK_PLAYLISTS`.
 */
export function readStoredPlaylists() {
	const fallback = MOCK_PLAYLISTS.map((pl) => ({
		...pl,
		track_ids: [...(pl.track_ids ?? [])],
	}));
	return readStorageJson(PLAYLISTS_STORAGE_KEY, fallback, isValidPlaylistList);
}

/**
 * Сохраняет актуальный список пользовательских плейлистов в `localStorage`.
 */
export function writeStoredPlaylists(playlists) {
	writeStorageJson(PLAYLISTS_STORAGE_KEY, playlists);
}

function generatePlaylistId() {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `pl-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * Создаёт объект нового пользовательского плейлиста.
 */
export function buildUserPlaylist({
	title,
	description = "",
	cover = null,
	trackIds = [],
}) {
	const safeTitle = String(title || "").trim() || "Untitled Playlist";
	return {
		id: generatePlaylistId(),
		title: safeTitle.slice(0, 120),
		type: "playlist",
		description: String(description || "").trim().slice(0, 300),
		cover: cover ?? null,
		accent: DEFAULT_ACCENT,
		track_ids: Array.isArray(trackIds) ? [...trackIds] : [],
	};
}

/**
 * Применяет патч полей (`title`, `description`, `cover`, `track_ids`) к нужному плейлисту.
 */
export function applyPlaylistPatch(playlists, playlistId, patch) {
	return playlists.map((pl) => {
		if (pl.id !== playlistId) return pl;
		const nextTitle =
			patch.title !== undefined
				? String(patch.title).trim().slice(0, 120) || pl.title
				: pl.title;
		const nextDescription =
			patch.description !== undefined
				? String(patch.description).trim().slice(0, 300)
				: pl.description;
		const nextCover = patch.cover !== undefined ? patch.cover : pl.cover;
		const nextTrackIds = Array.isArray(patch.track_ids)
			? [...patch.track_ids]
			: pl.track_ids;

		return {
			...pl,
			title: nextTitle,
			description: nextDescription,
			cover: nextCover,
			track_ids: nextTrackIds,
		};
	});
}
