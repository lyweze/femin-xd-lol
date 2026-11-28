// ============================================================================
// Клиентская прослойка каталога плеера (сейчас моки + локальные загрузки)
// Поддерживает динамический список пользовательских плейлистов и локальных треков.
// ============================================================================
import {
	MOCK_ALBUMS,
	MOCK_ARTISTS,
	MOCK_PLAYLISTS,
	MOCK_TRACKS,
	getAlbumById,
	getArtistById,
	getTracksByAlbumId,
	getTracksByPlaylist,
} from "../services/mockData.js";
import { getLocalTrackLyrics } from "../services/lyricsStorage.js";
import { getLocalTracksSnapshot } from "../services/localTracksStorage.js";

/** Объединяет загруженные пользователем треки и встроенный каталог */
function getMergedTracks(localTracks = getLocalTracksSnapshot()) {
	return localTracks.length > 0 ? [...localTracks, ...MOCK_TRACKS] : MOCK_TRACKS;
}

/** Собирает уникальных артистов из локальных треков (для поиска и страниц артистов) */
function collectLocalArtists(localTracks) {
	const map = new Map();
	for (const track of localTracks) {
		for (const artist of track.artists ?? []) {
			if (!artist?.id || map.has(artist.id)) continue;
			map.set(artist.id, {
				id: artist.id,
				name: artist.name,
				bio: "Local library artist uploaded on this device.",
				avatar: track.cover ?? null,
				accent: track.accent,
			});
		}
	}
	return Array.from(map.values());
}

function getMergedArtists(allTracks) {
	const localTracks = allTracks.filter((t) => t.is_local);
	return [...collectLocalArtists(localTracks), ...MOCK_ARTISTS];
}

/**
 * Публичный клиент каталога для пользовательской части плеера.
 */
export const musicApi = {
	/** Возвращает объединённый каталог (локальные загрузки + базовые треки) */
	getCatalogTracks() {
		return getMergedTracks();
	},

	/** Возвращает всех артистов каталога (базовых и из локальных загрузок) */
	getArtists(catalogTracks = null) {
		return getMergedArtists(catalogTracks ?? getMergedTracks());
	},

	/** Возвращает базовые витрины и актуальный список треков для главной страницы */
	getHomeData() {
		return {
			albums: MOCK_ALBUMS,
			playlists: MOCK_PLAYLISTS,
			tracks: getMergedTracks(),
		};
	},

	/** Возвращает альбом с отсортированным треклистом */
	getAlbum(albumId) {
		const album = getAlbumById(albumId);
		if (!album) return null;
		return {
			...album,
			tracks: getTracksByAlbumId(album.id),
		};
	},

	/**
	 * Возвращает плейлист из переданного списка (или динамический `favourites`
	 * на основе `likedIds`), разворачивая `track_ids` в массив объектов треков.
	 */
	getPlaylist(
		playlistId,
		likedIds = [],
		playlists = MOCK_PLAYLISTS,
		catalogTracks = null,
	) {
		const allTracks = catalogTracks ?? getMergedTracks();

		if (playlistId === "favourites") {
			const likedSet = new Set(likedIds);
			const tracks = allTracks.filter((t) => likedSet.has(t.id));
			return {
				id: "favourites",
				title: "Favourites",
				type: "playlist",
				description: "Tracks you marked with a heart across the catalog.",
				cover: null,
				track_count: tracks.length,
				tracks,
			};
		}

		const playlist = playlists.find((pl) => pl.id === playlistId) ?? null;
		if (!playlist) return null;
		const tracks = getTracksByPlaylist(playlist, allTracks);
		return {
			...playlist,
			track_count: tracks.length,
			tracks,
		};
	},

	/** Возвращает профиль артиста, его популярные треки и релизы */
	getArtist(artistId, catalogTracks = null) {
		const allTracks = catalogTracks ?? getMergedTracks();
		const artist =
			getArtistById(artistId) ??
			getMergedArtists(allTracks).find((a) => a.id === artistId) ??
			null;
		if (!artist) return null;

		const topTracks = allTracks.filter((t) =>
			t.artists.some((a) => a.id === artist.id),
		);
		const albums = MOCK_ALBUMS.filter((al) =>
			al.artists.some((a) => a.id === artist.id),
		);
		return {
			...artist,
			topTracks,
			albums,
		};
	},

	/** Выполняет регистронезависимый поиск по артистам, трекам, альбомам и плейлистам */
	searchCatalog(rawQuery, playlists = MOCK_PLAYLISTS, catalogTracks = null) {
		const q = String(rawQuery || "").trim().toLowerCase();
		if (!q) {
			return { artists: [], tracks: [], albums: [], playlists: [] };
		}

		const allTracks = catalogTracks ?? getMergedTracks();
		const allArtists = getMergedArtists(allTracks);

		return {
			artists: allArtists.filter((a) => a.name.toLowerCase().includes(q)),
			tracks: allTracks.filter(
				(t) =>
					t.title.toLowerCase().includes(q) ||
					t.artists.some((a) => a.name.toLowerCase().includes(q)),
			),
			albums: MOCK_ALBUMS.filter(
				(al) =>
					al.title.toLowerCase().includes(q) ||
					al.artists.some((a) => a.name.toLowerCase().includes(q)),
			),
			playlists: playlists.filter((pl) =>
				pl.title.toLowerCase().includes(q),
			),
		};
	},

	/** Возвращает тексты песни из локального хранилища или папки temp */
	getTrackLyrics(trackId) {
		return getLocalTrackLyrics(trackId);
	},
};
