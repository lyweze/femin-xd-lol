// ============================================================================
// Клиент Femin. Admin API v1.0 (/admin/v1/*)
// До подключения бэкенда работает OpenAPI-мок (`VITE_USE_MOCK_ADMIN !== "false"`).
// Для переключения на реальный сервер достаточно задать VITE_USE_MOCK_ADMIN=false.
// ============================================================================
import { createAdminMockApi } from "./adminMockAdapter.js";

const API_ORIGIN = import.meta.env?.VITE_API_ORIGIN ?? "";
const BASE_URL = `${API_ORIGIN}/admin/v1`;

/** Флаг активности встроенного OpenAPI-мока вместо реального HTTP-сервера */
export const IS_MOCK_ADMIN_MODE = import.meta.env?.VITE_USE_MOCK_ADMIN !== "false";

/**
 * Типизированная ошибка Admin API с HTTP-статусом и машинным кодом (например `CONFLICT`, `VALIDATION_ERROR`).
 */
export class AdminApiError extends Error {
	constructor(status, code, message) {
		super(message || code || `HTTP ${status}`);
		this.name = "AdminApiError";
		this.status = status;
		this.code = code;
	}
}

/** Сериализует объект фильтров в query-строку, отбрасывая пустые значения */
function buildQuery(params = {}) {
	const search = new URLSearchParams();
	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== "") {
			search.set(key, String(value));
		}
	});
	const qs = search.toString();
	return qs ? `?${qs}` : "";
}

/**
 * Универсальный HTTP-транспорт для `/admin/v1/*` с поддержкой JSON и бинарных `Blob`/`File` загрузок.
 * Отправляет cookie-сессию через `credentials: "include"`.
 */
async function request(path, { method = "GET", body, headers = {} } = {}) {
	const isBinary = body instanceof Blob || body instanceof File;
	const requestHeaders = { ...headers };

	if (isBinary) {
		if (body.type) requestHeaders["Content-Type"] = body.type;
	} else if (body !== undefined) {
		requestHeaders["Content-Type"] = "application/json";
	}

	const response = await fetch(`${BASE_URL}${path}`, {
		method,
		credentials: "include",
		headers: requestHeaders,
		body: isBinary
			? body
			: body !== undefined
				? JSON.stringify(body)
				: undefined,
	});

	if (response.status === 204) {
		return null;
	}

	const data = await response.json().catch(() => ({}));

	if (!response.ok) {
		throw new AdminApiError(response.status, data.code, data.message);
	}

	return data;
}

const liveAdminApi = {
	// --- Артисты ---
	listArtists: (params) => request(`/artists${buildQuery(params)}`),
	getArtist: (artistId) => request(`/artists/${artistId}`),
	createArtist: (body) => request("/artists", { method: "POST", body }),
	updateArtist: (artistId, body) =>
		request(`/artists/${artistId}`, { method: "PATCH", body }),
	deleteArtist: (artistId) =>
		request(`/artists/${artistId}`, { method: "DELETE" }),
	uploadArtistAvatar: (artistId, file) =>
		request(`/artists/${artistId}/avatar`, { method: "PUT", body: file }),

	// --- Альбомы и публикация ---
	listAlbums: (params) => request(`/albums${buildQuery(params)}`),
	getAlbum: (albumId) => request(`/albums/${albumId}`),
	createAlbum: (body) => request("/albums", { method: "POST", body }),
	updateAlbum: (albumId, body) =>
		request(`/albums/${albumId}`, { method: "PATCH", body }),
	deleteAlbum: (albumId) => request(`/albums/${albumId}`, { method: "DELETE" }),
	uploadAlbumCover: (albumId, file) =>
		request(`/albums/${albumId}/cover`, { method: "PUT", body: file }),
	setAlbumTrackOrder: (albumId, items) =>
		request(`/albums/${albumId}/track-order`, {
			method: "PUT",
			body: { items },
		}),
	publishAlbum: (albumId, publishedAt) =>
		request(`/albums/${albumId}/publish`, {
			method: "POST",
			body: publishedAt ? { published_at: publishedAt } : undefined,
		}),
	unpublishAlbum: (albumId) =>
		request(`/albums/${albumId}/unpublish`, { method: "POST" }),

	// --- Треки и аудио-загрузка ---
	listTracks: (params) => request(`/tracks${buildQuery(params)}`),
	getTrack: (trackId) => request(`/tracks/${trackId}`),
	createTrack: (body) => request("/tracks", { method: "POST", body }),
	updateTrack: (trackId, body) =>
		request(`/tracks/${trackId}`, { method: "PATCH", body }),
	deleteTrack: (trackId) => request(`/tracks/${trackId}`, { method: "DELETE" }),
	uploadTrackAudio: (trackId, file) =>
		request(`/tracks/${trackId}/audio`, { method: "PUT", body: file }),
	reprocessTrack: (trackId) =>
		request(`/tracks/${trackId}/reprocess`, { method: "POST" }),

	// --- Тексты песен ---
	listTrackLyrics: (trackId) => request(`/tracks/${trackId}/lyrics`),
	putTrackLyrics: (trackId, language, body) =>
		request(`/tracks/${trackId}/lyrics/${language}`, { method: "PUT", body }),
	deleteTrackLyrics: (trackId, language) =>
		request(`/tracks/${trackId}/lyrics/${language}`, { method: "DELETE" }),

	// --- Пользователи и роли ---
	listUsers: (params) => request(`/users${buildQuery(params)}`),
	createUser: (body) => request("/users", { method: "POST", body }),
	setUserRole: (userId, role) =>
		request(`/users/${userId}/role`, { method: "PUT", body: { role } }),
};

/** Активный экземпляр Admin API (мок или боевой HTTP-клиент) */
export const adminApi = IS_MOCK_ADMIN_MODE
	? createAdminMockApi(AdminApiError)
	: liveAdminApi;
