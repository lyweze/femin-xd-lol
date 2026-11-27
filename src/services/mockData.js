// ============================================================================
// Мок-данные каталога в строгом соответствии со схемами OpenAPI (Image, UUID, ms)
// Структура: public/temp/<папка_трека>/{cover.jpg, test.mp3}
// ============================================================================

const BASE_URL = import.meta.env.BASE_URL ?? "/";

/**
 * Кодирует сегменты пути (безопасно для кириллицы вроде "8юля" и "дающие"
 * в Safari, Vite и Tauri WebView).
 */
function buildTempUrl(relativePath) {
	const encoded = String(relativePath)
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/");
	return `${BASE_URL}temp/${encoded}`;
}

/**
 * Генерирует минималистичную обложку в эстетике Matte Obsidian & Smoked Glass
 * в виде data-URI, гарантируя мгновенную загрузку и корректный расчёт акцента.
 */
export function makeArtworkDataUrl(primary, secondary, label = "", size = 300) {
	const safeLabel = String(label || "")
		.replace(/[<>&"']/g, "")
		.slice(0, 18);
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 300 300">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primary}"/>
      <stop offset="100%" stop-color="${secondary}"/>
    </linearGradient>
    <radialGradient id="glow" cx="30%" cy="25%" r="70%">
      <stop offset="0%" stop-color="#e6e3dd" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#161615" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="300" height="300" fill="url(#bg)"/>
  <rect width="300" height="300" fill="url(#glow)"/>
  <circle cx="150" cy="142" r="78" fill="none" stroke="#e6e3dd" stroke-opacity="0.14" stroke-width="1.5"/>
  <circle cx="150" cy="142" r="46" fill="none" stroke="#e6e3dd" stroke-opacity="0.2" stroke-width="1"/>
  <circle cx="150" cy="142" r="8" fill="#e6e3dd" fill-opacity="0.35"/>
  <text x="150" y="264" text-anchor="middle" fill="#e6e3dd" fill-opacity="0.55" font-family="sans-serif" font-size="11" letter-spacing="3">${safeLabel.toUpperCase()}</text>
</svg>`;
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Возвращает объект Image (96 / 300 / 640 px) в формате бэкенда.
 */
export function makeImageSet(primary, secondary, label = "") {
	return {
		small_url: makeArtworkDataUrl(primary, secondary, "", 96),
		medium_url: makeArtworkDataUrl(primary, secondary, label, 300),
		large_url: makeArtworkDataUrl(primary, secondary, label, 640),
	};
}

/**
 * Хелпер под структуру public/temp/<folder>/{cover.jpg, test.mp3}.
 * Возвращает сразу { audio_url, cover } с автофолбэком на SVG-обложку.
 */
export function makeLocalFolderMedia(
	folder,
	{
		audioFile = "test.mp3",
		coverFile = "cover.jpg",
		primary = "#7d4231",
		secondary = "#1e1a18",
		label = folder,
	} = {},
) {
	const coverUrl = buildTempUrl(`${folder}/${coverFile}`);
	const fallback = makeImageSet(primary, secondary, label);

	return {
		audio_url: buildTempUrl(`${folder}/${audioFile}`),
		cover: {
			small_url: coverUrl,
			medium_url: coverUrl,
			large_url: coverUrl,
			fallback_small_url: fallback.small_url,
			fallback_medium_url: fallback.medium_url,
			fallback_large_url: fallback.large_url,
		},
	};
}

const LOCAL_MEDIA = {
	"8юля": makeLocalFolderMedia("8юля", {
		primary: "#7d4231",
		secondary: "#1e1a18",
	}),
	дающие: makeLocalFolderMedia("дающие", {
		primary: "#3b5263",
		secondary: "#181d22",
	}),
};

// ============================================================================
// Исполнители
// ============================================================================
export const MOCK_ARTISTS = [
	{
		id: "a1000000-0000-0000-0000-000000000001",
		name: "test",
		bio: "Minimalist electronic and ambient textures recorded on analog tape.",
		avatar: LOCAL_MEDIA["8юля"].cover,
		accent: "#c56b4e",
	},
];

// ============================================================================
// Альбомы и релизы
// ============================================================================
export const MOCK_ALBUMS = [
	{
		id: "b2000000-0000-0000-0000-000000000001",
		title: "test",
		type: "album",
		release_date: "2026-09-14",
		cover: LOCAL_MEDIA["8юля"].cover,
		accent: "#c56b4e",
		artists: [{ id: "a1000000-0000-0000-0000-000000000001", name: "test" }],
		track_count: 2,
	},
];

// ============================================================================
// Треки каталога (UUID, duration_ms, disc_no, track_no, explicit, artists[])
// ============================================================================
export const MOCK_TRACKS = [
	{
		id: "d4000000-0000-0000-0000-000000000001",
		album_id: "b2000000-0000-0000-0000-000000000001",
		title: "8юля (Local MP3 Test)",
		disc_no: 1,
		track_no: 1,
		duration_ms: 0,
		explicit: true,
		cover: LOCAL_MEDIA["8юля"].cover,
		accent: "#c56b4e",
		audio_url: LOCAL_MEDIA["8юля"].audio_url,
		artists: [
			{
				id: "a1000000-0000-0000-0000-000000000001",
				name: "test",
				role: "main",
			},
		],
		lyrics_languages: [],
	},
	{
		id: "d4000000-0000-0000-0000-000000000002",
		album_id: "b2000000-0000-0000-0000-000000000001",
		title: "дающие (Local MP3 Test)",
		disc_no: 1,
		track_no: 2,
		duration_ms: 0,
		explicit: true,
		cover: LOCAL_MEDIA["дающие"].cover,
		accent: "#7298b3",
		audio_url: LOCAL_MEDIA["дающие"].audio_url,
		artists: [
			{
				id: "a1000000-0000-0000-0000-000000000001",
				name: "test",
				role: "main",
			},
		],
		lyrics_languages: [],
	},
];

// ============================================================================
// Пользовательские плейлисты (соответствуют пунктам сайдбара)
// ============================================================================
export const MOCK_PLAYLISTS = [
	{
		id: "1",
		title: "playlist",
		type: "playlist",
		description: "",
		cover: makeImageSet("#4a423c", "#1a1918", "LATE NIGHT"),
		accent: "#b89074",
		track_ids: [
			"d4000000-0000-0000-0000-000000000001",
			"d4000000-0000-0000-0000-000000000002",
		],
	},
];

// ============================================================================
// Синхронизированные и статичные тексты песен (схема AdminLyrics)
// ============================================================================
export const MOCK_LYRICS = {};

// ============================================================================
// Поисковые хелперы по мок-каталогу
// ============================================================================
export function getArtistById(id) {
	return MOCK_ARTISTS.find((a) => a.id === id) ?? null;
}

export function getAlbumById(id) {
	return MOCK_ALBUMS.find((al) => al.id === id) ?? null;
}

export function getPlaylistById(id) {
	return MOCK_PLAYLISTS.find((pl) => pl.id === id) ?? null;
}

export function getTracksByAlbumId(albumId) {
	return MOCK_TRACKS.filter((t) => t.album_id === albumId).sort(
		(a, b) => a.disc_no - b.disc_no || a.track_no - b.track_no,
	);
}

export function getTracksByPlaylist(playlist) {
	if (!playlist) return [];
	return playlist.track_ids
		.map((id) => MOCK_TRACKS.find((t) => t.id === id))
		.filter(Boolean);
}

export function getLyricsByTrackId(trackId) {
	return MOCK_LYRICS[trackId] ?? [];
}
