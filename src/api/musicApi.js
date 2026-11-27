// ============================================================================
// Клиентская прослойка каталога плеера (сейчас моки, позже fetch /api/v1/*)
// Поддерживает динамический список пользовательских плейлистов из PlayerContext.
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

/**
 * Публичный клиент каталога для пользовательской части плеера.
 */
export const musicApi = {
	/** Возвращает базовые витрины и треки для главной страницы */
	getHomeData() {
		return {
			albums: MOCK_ALBUMS,
			playlists: MOCK_PLAYLISTS,
			tracks: MOCK_TRACKS,
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
	getPlaylist(playlistId, likedIds = [], playlists = MOCK_PLAYLISTS) {
		if (playlistId === "favourites") {
			const likedSet = new Set(likedIds);
			const tracks = MOCK_TRACKS.filter((t) => likedSet.has(t.id));
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
		const tracks = getTracksByPlaylist(playlist);
		return {
			...playlist,
			track_count: tracks.length,
			tracks,
		};
	},

	/** Возвращает профиль артиста, его популярные треки и релизы */
	getArtist(artistId) {
		const artist = getArtistById(artistId);
		if (!artist) return null;
		const topTracks = MOCK_TRACKS.filter((t) =>
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
	searchCatalog(rawQuery, playlists = MOCK_PLAYLISTS) {
		const q = String(rawQuery || "").trim().toLowerCase();
		if (!q) {
			return { artists: [], tracks: [], albums: [], playlists: [] };
		}

		return {
			artists: MOCK_ARTISTS.filter((a) => a.name.toLowerCase().includes(q)),
			tracks: MOCK_TRACKS.filter(
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
