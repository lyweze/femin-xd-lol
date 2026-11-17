const BASE_URL = "/admin/v1";

export class AdminApiError extends Error {
	constructor(status, code, message) {
		super(message || code || `HTTP ${status}`);
		this.name = "AdminApiError";
		this.status = status;
		this.code = code;
	}
}

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

export const adminApi = {
	// Artists
	listArtists: (params) => request(`/artists${buildQuery(params)}`),
	getArtist: (artistId) => request(`/artists/${artistId}`),
	createArtist: (body) => request("/artists", { method: "POST", body }),
	updateArtist: (artistId, body) =>
		request(`/artists/${artistId}`, { method: "PATCH", body }),
	deleteArtist: (artistId) =>
		request(`/artists/${artistId}`, { method: "DELETE" }),
	uploadArtistAvatar: (artistId, file) =>
		request(`/artists/${artistId}/avatar`, { method: "PUT", body: file }),

	// Albums
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

	// Tracks & Uploads
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

	// Lyrics
	listTrackLyrics: (trackId) => request(`/tracks/${trackId}/lyrics`),
	putTrackLyrics: (trackId, language, body) =>
		request(`/tracks/${trackId}/lyrics/${language}`, { method: "PUT", body }),
	deleteTrackLyrics: (trackId, language) =>
		request(`/tracks/${trackId}/lyrics/${language}`, { method: "DELETE" }),

	// Users
	listUsers: (params) => request(`/users${buildQuery(params)}`),
	createUser: (body) => request("/users", { method: "POST", body }),
	setUserRole: (userId, role) =>
		request(`/users/${userId}/role`, { method: "PUT", body: { role } }),
};
