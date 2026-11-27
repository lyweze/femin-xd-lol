// ============================================================================
// Клиентская прослойка каталога плеера (сейчас моки, позже fetch /api/v1/*)
// ============================================================================
import {
	MOCK_ALBUMS,
	MOCK_ARTISTS,
	MOCK_PLAYLISTS,
	MOCK_TRACKS,
	getAlbumById,
	getArtistById,
	getLyricsByTrackId,
	getPlaylistById,
	getTracksByAlbumId,
	getTracksByPlaylist,
} from "../services/mockData.js";

export const musicApi = {
	getHomeData() {
		return {
			albums: MOCK_ALBUMS,
			playlists: MOCK_PLAYLISTS,
			tracks: MOCK_TRACKS,
		};
	},

	getAlbum(albumId) {
		const album = getAlbumById(albumId);
		if (!album) return null;
		return {
			...album,
			tracks: getTracksByAlbumId(album.id),
		};
	},

	getPlaylist(playlistId, likedIds = []) {
		if (playlistId === "favourites") {
			const likedSet = new Set(likedIds);
			const tracks = MOCK_TRACKS.filter((t) => likedSet.has(t.id));
			return {
				id: "favourites",
				title: "Favourites",
				type: "playlist",
				description: "Tracks you marked with a heart across the catalog.",
				cover: tracks[0]?.cover ?? MOCK_PLAYLISTS[0].cover,
				tracks,
			};
		}

		const playlist = getPlaylistById(playlistId);
		if (!playlist) return null;
		return {
			...playlist,
			tracks: getTracksByPlaylist(playlist),
		};
	},

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

	searchCatalog(rawQuery) {
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
			playlists: MOCK_PLAYLISTS.filter((pl) =>
				pl.title.toLowerCase().includes(q),
			),
		};
	},

	getTrackLyrics(trackId) {
		return getLyricsByTrackId(trackId);
	},
};
