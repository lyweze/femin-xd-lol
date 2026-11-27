// ============================================================================
// In-memory мок-адаптер для Femin. Admin API v1.0 (swagger-admin-v1.yaml)
// Полноценно эмулирует эндпоинты, коды ошибок (404, 409, 415, 422),
// курсорную пагинацию (limit, next_cursor) и фоновый воркер обработки аудио.
// ============================================================================
import {
	MOCK_ALBUMS,
	MOCK_ARTISTS,
	MOCK_LYRICS,
	MOCK_TRACKS,
	makeImageSet,
} from "../services/mockData.js";

const CURRENT_ADMIN_ID = "u0000000-0000-0000-0000-000000000001";
const ALLOWED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_AUDIO_EXTS = new Set(["flac", "mp3", "wav", "m4a"]);

function makeUuid() {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

function nowIso() {
	return new Date().toISOString();
}

function delay(ms = 120) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function clone(obj) {
	return JSON.parse(JSON.stringify(obj));
}

function paginate(items, limit = 20, cursor = null) {
	const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
	const start = cursor ? Math.max(0, Number.parseInt(cursor, 10) || 0) : 0;
	const slice = items.slice(start, start + safeLimit);
	const nextIndex = start + safeLimit;
	return {
		items: clone(slice),
		next_cursor: nextIndex < items.length ? String(nextIndex) : null,
	};
}

function fileToDataUrl(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(new Error("Failed to read file"));
		reader.readAsDataURL(file);
	});
}

function createInitialState() {
	const createdAt = "2026-09-10T10:00:00.000Z";

	const artists = MOCK_ARTISTS.map((a) => ({
		id: a.id,
		name: a.name,
		bio: a.bio,
		avatar: a.avatar,
		created_at: createdAt,
		updated_at: createdAt,
	}));

	const albums = MOCK_ALBUMS.slice(0, 4).map((al, idx) => ({
		id: al.id,
		title: al.title,
		type: al.type,
		release_date: al.release_date,
		cover: idx === 0 ? makeImageSet("#7d4231", "#1e1a18", "SMOKED GLASS") : al.cover,
		artists: al.artists,
		track_count: MOCK_TRACKS.filter((t) => t.album_id === al.id).length,
		published_at:
			idx === 0
				? "2026-09-14T00:00:00.000Z"
				: idx === 1
					? "2027-01-15T00:00:00.000Z"
					: null,
		created_at: createdAt,
		updated_at: createdAt,
	}));

	const tracks = MOCK_TRACKS.filter((t) =>
		albums.some((al) => al.id === t.album_id),
	).map((t, idx) => {
		const isFailedDemo = idx === 4;
		const isDraftDemo = idx === 6;
		return {
			id: t.id,
			album_id: t.album_id,
			title: t.title,
			disc_no: t.disc_no,
			track_no: t.track_no,
			duration_ms: isDraftDemo || isFailedDemo ? null : t.duration_ms,
			explicit: t.explicit,
			status: isFailedDemo ? "failed" : isDraftDemo ? "draft" : "ready",
			processing_error: isFailedDemo
				? "ffmpeg: invalid stream header (corrupted source frame at 00:12)"
				: null,
			artists: t.artists,
			files: isDraftDemo
				? []
				: isFailedDemo
					? [{ kind: "source", format: "flac", bitrate_kbps: null, size_bytes: 34_812_900 }]
					: [
							{ kind: "source", format: "flac", bitrate_kbps: 1024, size_bytes: 28_401_220 },
							{ kind: "stream", format: "opus", bitrate_kbps: 192, size_bytes: 4_620_410 },
						],
			lyrics_languages: [...t.lyrics_languages],
			created_at: createdAt,
			updated_at: createdAt,
		};
	});

	const lyricsByTrack = {};
	Object.entries(MOCK_LYRICS).forEach(([trackId, list]) => {
		lyricsByTrack[trackId] = clone(list);
	});

	const users = [
		{
			id: CURRENT_ADMIN_ID,
			email: "denis@femin.fm",
			username: "denis",
			role: "admin",
			created_at: "2026-08-01T09:00:00.000Z",
		},
		{
			id: "u0000000-0000-0000-0000-000000000002",
			email: "curator@femin.fm",
			username: "studio_curator",
			role: "admin",
			created_at: "2026-08-14T14:20:00.000Z",
		},
		{
			id: "u0000000-0000-0000-0000-000000000003",
			email: "listener@example.com",
			username: "ambient_fan",
			role: "user",
			created_at: "2026-09-02T19:45:00.000Z",
		},
	];

	return { artists, albums, tracks, lyricsByTrack, users };
}

const state = createInitialState();

export function createAdminMockApi(AdminApiError) {
	function fail(status, code, message) {
		throw new AdminApiError(status, code, message);
	}

	function resolveArtistRefs(artistIds) {
		if (!Array.isArray(artistIds) || artistIds.length === 0) {
			fail(422, "VALIDATION_ERROR", "At least one artist is required.");
		}
		return artistIds.map((id) => {
			const artist = state.artists.find((a) => a.id === id);
			if (!artist) fail(422, "VALIDATION_ERROR", `Artist ${id} not found.`);
			return { id: artist.id, name: artist.name };
		});
	}

	function resolveTrackArtists(inputs) {
		if (!Array.isArray(inputs) || inputs.length === 0) {
			fail(422, "VALIDATION_ERROR", "At least one track artist is required.");
		}
		return inputs.map((item) => {
			const artist = state.artists.find((a) => a.id === item.artist_id);
			if (!artist) fail(422, "VALIDATION_ERROR", `Artist ${item.artist_id} not found.`);
			if (item.role !== "main" && item.role !== "feat") {
				fail(422, "VALIDATION_ERROR", "Track artist role must be 'main' or 'feat'.");
			}
			return { id: artist.id, name: artist.name, role: item.role };
		});
	}

	function getAlbumTracksSorted(albumId) {
		return state.tracks
			.filter((t) => t.album_id === albumId)
			.sort((a, b) => a.disc_no - b.disc_no || a.track_no - b.track_no);
	}

	function syncAlbumTrackCount(albumId) {
		const album = state.albums.find((a) => a.id === albumId);
		if (album) {
			album.track_count = state.tracks.filter((t) => t.album_id === albumId).length;
		}
	}

	function scheduleMockWorker(trackId, sourceFormat = "flac", sizeBytes = 24_000_000) {
		setTimeout(() => {
			const track = state.tracks.find((t) => t.id === trackId);
			if (!track || track.status !== "processing") return;
			track.status = "ready";
			track.processing_error = null;
			track.duration_ms = 185000 + Math.floor(Math.random() * 95000);
			track.files = [
				{ kind: "source", format: sourceFormat, bitrate_kbps: 1024, size_bytes: sizeBytes },
				{
					kind: "stream",
					format: "opus",
					bitrate_kbps: 192,
					size_bytes: Math.max(1_200_000, Math.round(sizeBytes * 0.16)),
				},
			];
			track.updated_at = nowIso();
		}, 2600);
	}

	return {
		// Artists
		async listArtists(params = {}) {
			await delay();
			let items = [...state.artists];
			if (params.q) {
				const q = params.q.trim().toLowerCase();
				items = items.filter((a) => a.name.toLowerCase().includes(q));
			}
			return paginate(items, params.limit, params.cursor);
		},

		async getArtist(artistId) {
			await delay();
			const artist = state.artists.find((a) => a.id === artistId);
			if (!artist) fail(404, "NOT_FOUND", "Artist not found.");
			return { artist: clone(artist) };
		},

		async createArtist(body) {
			await delay();
			const name = String(body?.name || "").trim();
			if (!name || name.length > 255) {
				fail(422, "VALIDATION_ERROR", "Artist name must be 1..255 characters.");
			}
			const ts = nowIso();
			const artist = {
				id: makeUuid(),
				name,
				bio: String(body?.bio || "").trim(),
				avatar: null,
				created_at: ts,
				updated_at: ts,
			};
			state.artists.unshift(artist);
			return { artist: clone(artist) };
		},

		async updateArtist(artistId, body) {
			await delay();
			const artist = state.artists.find((a) => a.id === artistId);
			if (!artist) fail(404, "NOT_FOUND", "Artist not found.");
			if (body?.name !== undefined) {
				const name = String(body.name).trim();
				if (!name || name.length > 255) {
					fail(422, "VALIDATION_ERROR", "Artist name must be 1..255 characters.");
				}
				artist.name = name;
				state.albums.forEach((al) => {
					al.artists.forEach((ref) => {
						if (ref.id === artistId) ref.name = name;
					});
				});
				state.tracks.forEach((t) => {
					t.artists.forEach((ref) => {
						if (ref.id === artistId) ref.name = name;
					});
				});
			}
			if (body?.bio !== undefined) artist.bio = String(body.bio);
			artist.updated_at = nowIso();
			return { artist: clone(artist) };
		},

		async deleteArtist(artistId) {
			await delay();
			const idx = state.artists.findIndex((a) => a.id === artistId);
			if (idx === -1) fail(404, "NOT_FOUND", "Artist not found.");
			const hasAlbums = state.albums.some((al) =>
				al.artists.some((a) => a.id === artistId),
			);
			if (hasAlbums) {
				fail(
					409,
					"CONFLICT",
					"Cannot delete artist while they still have albums. Delete or reassign albums first.",
				);
			}
			state.artists.splice(idx, 1);
			return null;
		},

		async uploadArtistAvatar(artistId, file) {
			await delay(240);
			const artist = state.artists.find((a) => a.id === artistId);
			if (!artist) fail(404, "NOT_FOUND", "Artist not found.");
			if (!(file instanceof Blob) || !ALLOWED_IMAGE_MIMES.has(file.type)) {
				fail(415, "UNSUPPORTED_MEDIA_TYPE", "Only JPEG, PNG, or WebP images are supported.");
			}
			const url = await fileToDataUrl(file);
			artist.avatar = { small_url: url, medium_url: url, large_url: url };
			artist.updated_at = nowIso();
			return { artist: clone(artist) };
		},

		// Albums
		async listAlbums(params = {}) {
			await delay();
			let items = [...state.albums];
			if (params.q) {
				const q = params.q.trim().toLowerCase();
				items = items.filter(
					(al) =>
						al.title.toLowerCase().includes(q) ||
						al.artists.some((a) => a.name.toLowerCase().includes(q)),
				);
			}
			if (params.artist_id) {
				items = items.filter((al) =>
					al.artists.some((a) => a.id === params.artist_id),
				);
			}
			return paginate(items, params.limit, params.cursor);
		},

		async getAlbum(albumId) {
			await delay();
			const album = state.albums.find((a) => a.id === albumId);
			if (!album) fail(404, "NOT_FOUND", "Album not found.");
			syncAlbumTrackCount(albumId);
			return {
				album: clone(album),
				tracks: clone(getAlbumTracksSorted(albumId)),
			};
		},

		async createAlbum(body) {
			await delay();
			const title = String(body?.title || "").trim();
			if (!title || title.length > 255) {
				fail(422, "VALIDATION_ERROR", "Album title must be 1..255 characters.");
			}
			const validTypes = new Set(["album", "ep", "single", "compilation"]);
			if (!validTypes.has(body?.type)) {
				fail(422, "VALIDATION_ERROR", "Invalid album type.");
			}
			const artists = resolveArtistRefs(body.artist_ids);
			const ts = nowIso();
			const album = {
				id: makeUuid(),
				title,
				type: body.type,
				release_date: body.release_date || undefined,
				cover: null,
				artists,
				track_count: 0,
				published_at: null,
				created_at: ts,
				updated_at: ts,
			};
			state.albums.unshift(album);
			return { album: clone(album) };
		},

		async updateAlbum(albumId, body) {
			await delay();
			const album = state.albums.find((a) => a.id === albumId);
			if (!album) fail(404, "NOT_FOUND", "Album not found.");
			if (body?.title !== undefined) {
				const title = String(body.title).trim();
				if (!title || title.length > 255) {
					fail(422, "VALIDATION_ERROR", "Album title must be 1..255 characters.");
				}
				album.title = title;
			}
			if (body?.type !== undefined) album.type = body.type;
			if (body?.release_date !== undefined) album.release_date = body.release_date || undefined;
			if (body?.artist_ids !== undefined) {
				album.artists = resolveArtistRefs(body.artist_ids);
			}
			album.updated_at = nowIso();
			return { album: clone(album) };
		},

		async deleteAlbum(albumId) {
			await delay();
			const idx = state.albums.findIndex((a) => a.id === albumId);
			if (idx === -1) fail(404, "NOT_FOUND", "Album not found.");
			state.albums.splice(idx, 1);
			for (let i = state.tracks.length - 1; i >= 0; i -= 1) {
				if (state.tracks[i].album_id === albumId) {
					state.tracks.splice(i, 1);
				}
			}
			return null;
		},

		async uploadAlbumCover(albumId, file) {
			await delay(240);
			const album = state.albums.find((a) => a.id === albumId);
			if (!album) fail(404, "NOT_FOUND", "Album not found.");
			if (!(file instanceof Blob) || !ALLOWED_IMAGE_MIMES.has(file.type)) {
				fail(415, "UNSUPPORTED_MEDIA_TYPE", "Only JPEG, PNG, or WebP images are supported.");
			}
			const url = await fileToDataUrl(file);
			album.cover = { small_url: url, medium_url: url, large_url: url };
			album.updated_at = nowIso();
			return { album: clone(album) };
		},

		async setAlbumTrackOrder(albumId, items) {
			await delay();
			const album = state.albums.find((a) => a.id === albumId);
			if (!album) fail(404, "NOT_FOUND", "Album not found.");
			const albumTracks = state.tracks.filter((t) => t.album_id === albumId);
			if (!Array.isArray(items) || items.length !== albumTracks.length) {
				fail(422, "VALIDATION_ERROR", "Track order payload must include all album tracks.");
			}
			const trackMap = new Map(albumTracks.map((t) => [t.id, t]));
			for (const pos of items) {
				const track = trackMap.get(pos.track_id);
				if (!track) {
					fail(422, "VALIDATION_ERROR", `Track ${pos.track_id} does not belong to album.`);
				}
				track.disc_no = Math.max(1, Number(pos.disc_no) || 1);
				track.track_no = Math.max(1, Number(pos.track_no) || 1);
				track.updated_at = nowIso();
			}
			album.updated_at = nowIso();
			return {
				album: clone(album),
				tracks: clone(getAlbumTracksSorted(albumId)),
			};
		},

		async publishAlbum(albumId, publishedAt = null) {
			await delay();
			const album = state.albums.find((a) => a.id === albumId);
			if (!album) fail(404, "NOT_FOUND", "Album not found.");
			const albumTracks = state.tracks.filter((t) => t.album_id === albumId);
			if (!album.cover) {
				fail(409, "CONFLICT", "Upload an album cover before publishing.");
			}
			if (albumTracks.length === 0) {
				fail(409, "CONFLICT", "Add at least one track before publishing.");
			}
			if (!albumTracks.every((t) => t.status === "ready")) {
				fail(409, "CONFLICT", "All tracks must be in 'ready' status before publishing.");
			}
			album.published_at = publishedAt ? new Date(publishedAt).toISOString() : nowIso();
			album.updated_at = nowIso();
			return { album: clone(album) };
		},

		async unpublishAlbum(albumId) {
			await delay();
			const album = state.albums.find((a) => a.id === albumId);
			if (!album) fail(404, "NOT_FOUND", "Album not found.");
			album.published_at = null;
			album.updated_at = nowIso();
			return { album: clone(album) };
		},

		// Tracks & Uploads
		async listTracks(params = {}) {
			await delay();
			let items = [...state.tracks];
			if (params.q) {
				const q = params.q.trim().toLowerCase();
				items = items.filter(
					(t) =>
						t.title.toLowerCase().includes(q) ||
						t.artists.some((a) => a.name.toLowerCase().includes(q)),
				);
			}
			if (params.album_id) {
				items = items.filter((t) => t.album_id === params.album_id);
			}
			if (params.status) {
				items = items.filter((t) => t.status === params.status);
			}
			return paginate(items, params.limit, params.cursor);
		},

		async getTrack(trackId) {
			await delay();
			const track = state.tracks.find((t) => t.id === trackId);
			if (!track) fail(404, "NOT_FOUND", "Track not found.");
			return { track: clone(track) };
		},

		async createTrack(body) {
			await delay();
			const album = state.albums.find((a) => a.id === body?.album_id);
			if (!album) fail(422, "VALIDATION_ERROR", "Target album does not exist.");
			const title = String(body?.title || "").trim();
			if (!title || title.length > 255) {
				fail(422, "VALIDATION_ERROR", "Track title must be 1..255 characters.");
			}
			const artists = resolveTrackArtists(body?.artists);
			const ts = nowIso();
			const track = {
				id: makeUuid(),
				album_id: album.id,
				title,
				disc_no: Math.max(1, Number(body?.disc_no) || 1),
				track_no: Math.max(1, Number(body?.track_no) || 1),
				duration_ms: null,
				explicit: Boolean(body?.explicit),
				status: "draft",
				processing_error: null,
				artists,
				files: [],
				lyrics_languages: [],
				created_at: ts,
				updated_at: ts,
			};
			state.tracks.push(track);
			syncAlbumTrackCount(album.id);
			return { track: clone(track) };
		},

		async updateTrack(trackId, body) {
			await delay();
			const track = state.tracks.find((t) => t.id === trackId);
			if (!track) fail(404, "NOT_FOUND", "Track not found.");
			if (body?.title !== undefined) {
				const title = String(body.title).trim();
				if (!title || title.length > 255) {
					fail(422, "VALIDATION_ERROR", "Track title must be 1..255 characters.");
				}
				track.title = title;
			}
			if (body?.explicit !== undefined) track.explicit = Boolean(body.explicit);
			if (body?.artists !== undefined) {
				track.artists = resolveTrackArtists(body.artists);
			}
			track.updated_at = nowIso();
			return { track: clone(track) };
		},

		async deleteTrack(trackId) {
			await delay();
			const idx = state.tracks.findIndex((t) => t.id === trackId);
			if (idx === -1) fail(404, "NOT_FOUND", "Track not found.");
			const albumId = state.tracks[idx].album_id;
			state.tracks.splice(idx, 1);
			delete state.lyricsByTrack[trackId];
			syncAlbumTrackCount(albumId);
			return null;
		},

		async uploadTrackAudio(trackId, file) {
			await delay(260);
			const track = state.tracks.find((t) => t.id === trackId);
			if (!track) fail(404, "NOT_FOUND", "Track not found.");
			const album = state.albums.find((a) => a.id === track.album_id);
			if (track.status === "processing") {
				fail(409, "CONFLICT", "Track is already being processed by worker.");
			}
			if (album?.published_at) {
				fail(409, "CONFLICT", "Cannot replace audio while the album is published. Unpublish it first.");
			}
			const ext = String(file?.name || "").split(".").pop()?.toLowerCase() || "";
			const mimeOk = file?.type?.startsWith("audio/");
			if (!(file instanceof Blob) || (!ALLOWED_AUDIO_EXTS.has(ext) && !mimeOk)) {
				fail(415, "UNSUPPORTED_MEDIA_TYPE", "Only FLAC, MP3, WAV, or M4A audio files are supported.");
			}
			const format = ALLOWED_AUDIO_EXTS.has(ext) ? ext : "mp3";
			track.status = "processing";
			track.processing_error = null;
			track.files = [
				{ kind: "source", format, bitrate_kbps: null, size_bytes: file.size || 18_400_000 },
			];
			track.updated_at = nowIso();
			scheduleMockWorker(track.id, format, file.size || 18_400_000);
			return { track: clone(track) };
		},

		async reprocessTrack(trackId) {
			await delay(200);
			const track = state.tracks.find((t) => t.id === trackId);
			if (!track) fail(404, "NOT_FOUND", "Track not found.");
			if (track.status === "processing") {
				fail(409, "CONFLICT", "Track is already processing.");
			}
			const source = track.files.find((f) => f.kind === "source");
			if (!source) {
				fail(409, "CONFLICT", "No source audio file uploaded yet.");
			}
			track.status = "processing";
			track.processing_error = null;
			track.updated_at = nowIso();
			scheduleMockWorker(track.id, source.format, source.size_bytes);
			return { track: clone(track) };
		},

		// Lyrics
		async listTrackLyrics(trackId) {
			await delay();
			const track = state.tracks.find((t) => t.id === trackId);
			if (!track) fail(404, "NOT_FOUND", "Track not found.");
			return { items: clone(state.lyricsByTrack[trackId] ?? []) };
		},

		async putTrackLyrics(trackId, language, body) {
			await delay();
			const track = state.tracks.find((t) => t.id === trackId);
			if (!track) fail(404, "NOT_FOUND", "Track not found.");
			const lang = String(language || "").trim().toLowerCase();
			if (lang.length < 2 || lang.length > 8) {
				fail(422, "VALIDATION_ERROR", "Language code must be 2..8 characters (e.g. 'ru', 'en').");
			}
			if (!Array.isArray(body?.lines) || body.lines.length === 0) {
				fail(422, "VALIDATION_ERROR", "Lyrics must contain at least one line.");
			}
			const lyrics = {
				language: lang,
				synced: Boolean(body.synced),
				offset_ms: Number.isFinite(Number(body.offset_ms)) ? Math.trunc(Number(body.offset_ms)) : 0,
				lines: body.lines.map((line) => ({
					start_ms: Math.max(0, Math.trunc(Number(line.start_ms) || 0)),
					end_ms:
						line.end_ms === null || line.end_ms === undefined || line.end_ms === ""
							? null
							: Math.max(0, Math.trunc(Number(line.end_ms))),
					text: String(line.text ?? ""),
					...(Array.isArray(line.words) ? { words: line.words } : {}),
				})),
				source: String(body.source || "manual").slice(0, 255),
				updated_at: nowIso(),
			};

			const existing = state.lyricsByTrack[trackId] ?? [];
			const idx = existing.findIndex((l) => l.language === lang);
			if (idx >= 0) existing[idx] = lyrics;
			else existing.push(lyrics);
			state.lyricsByTrack[trackId] = existing;
			track.lyrics_languages = existing.map((l) => l.language);
			track.updated_at = nowIso();
			return { lyrics: clone(lyrics) };
		},

		async deleteTrackLyrics(trackId, language) {
			await delay();
			const track = state.tracks.find((t) => t.id === trackId);
			if (!track) fail(404, "NOT_FOUND", "Track not found.");
			const existing = state.lyricsByTrack[trackId] ?? [];
			const next = existing.filter((l) => l.language !== language);
			if (next.length === existing.length) {
				fail(404, "NOT_FOUND", `Lyrics for '${language}' not found.`);
			}
			state.lyricsByTrack[trackId] = next;
			track.lyrics_languages = next.map((l) => l.language);
			track.updated_at = nowIso();
			return null;
		},

		// Users
		async listUsers(params = {}) {
			await delay();
			let items = [...state.users];
			if (params.q) {
				const q = params.q.trim().toLowerCase();
				items = items.filter(
					(u) =>
						u.email.toLowerCase().includes(q) ||
						u.username.toLowerCase().includes(q),
				);
			}
			if (params.role) {
				items = items.filter((u) => u.role === params.role);
			}
			return paginate(items, params.limit, params.cursor);
		},

		async createUser(body) {
			await delay();
			const email = String(body?.email || "").trim().toLowerCase();
			const username = String(body?.username || "").trim();
			const password = String(body?.password || "");
			const role = body?.role;

			if (!email || !email.includes("@") || email.length > 320) {
				fail(422, "VALIDATION_ERROR", "Enter a valid email address.");
			}
			if (username.length < 3 || username.length > 32) {
				fail(422, "VALIDATION_ERROR", "Username must be 3..32 characters.");
			}
			if (password.length < 8 || password.length > 128) {
				fail(422, "VALIDATION_ERROR", "Password must be 8..128 characters.");
			}
			if (role !== "user" && role !== "admin") {
				fail(422, "VALIDATION_ERROR", "Role must be 'user' or 'admin'.");
			}
			const duplicate = state.users.some(
				(u) =>
					u.email.toLowerCase() === email ||
					u.username.toLowerCase() === username.toLowerCase(),
			);
			if (duplicate) {
				fail(409, "CONFLICT", "A user with this email or username already exists.");
			}

			const user = {
				id: makeUuid(),
				email,
				username,
				role,
				created_at: nowIso(),
			};
			state.users.unshift(user);
			return { user: clone(user) };
		},

		async setUserRole(userId, role) {
			await delay();
			const user = state.users.find((u) => u.id === userId);
			if (!user) fail(404, "NOT_FOUND", "User not found.");
			if (role !== "user" && role !== "admin") {
				fail(422, "VALIDATION_ERROR", "Role must be 'user' or 'admin'.");
			}
			if (user.id === CURRENT_ADMIN_ID && role !== "admin") {
				fail(
					409,
					"CONFLICT",
					"You cannot revoke the admin role from your own account.",
				);
			}
			user.role = role;
			return { user: clone(user) };
		},
	};
}
