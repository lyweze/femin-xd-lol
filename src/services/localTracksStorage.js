// ============================================================================
// Локальное хранилище пользовательских треков (`localTracksStorage`)
// - Лёгкие метаданные треков хранятся в `localStorage` для мгновенного старта UI.
// - Аудиофайлы (MP3/WAV/M4A/FLAC/OGG Blob) и загруженные обложки хранятся в IndexedDB,
//   чтобы не переполнять лимит localStorage (5 МБ).
// ============================================================================
import { makeImageSet } from "./mockData.js";
import { createUuid } from "../utils/id.js";
import { readStorageJson, writeStorageJson } from "../utils/storage.js";

export const LOCAL_TRACKS_STORAGE_KEY = "matte_obsidian_local_tracks";

const IDB_NAME = "matte_obsidian_local_media_db";
const IDB_VERSION = 1;
const IDB_STORE = "track_media";

const ACCENT_PALETTES = [
	{ primary: "#7d4231", secondary: "#1e1a18", accent: "#c56b4e" },
	{ primary: "#3b5263", secondary: "#181d22", accent: "#7ea1b8" },
	{ primary: "#4c5f4b", secondary: "#181d18", accent: "#8aa888" },
	{ primary: "#62475e", secondary: "#1c181d", accent: "#b182aa" },
	{ primary: "#785a3a", secondary: "#1e1a16", accent: "#c79b66" },
];

export const ACCEPTED_AUDIO_EXTS = new Set([
	"mp3",
	"wav",
	"flac",
	"m4a",
	"aac",
	"ogg",
	"opus",
	"webm",
]);

const mediaCache = new Map(); // trackId -> { audioUrl: string | null, cover: ImageSet | null }
const listeners = new Set();
let cachedSnapshot = null;
let hydrationPromise = null;

function pickPalette(seedText) {
	const text = String(seedText || "local");
	let hash = 0;
	for (let i = 0; i < text.length; i += 1) {
		hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
	}
	return ACCENT_PALETTES[hash % ACCENT_PALETTES.length];
}

function makeLocalArtistId(name) {
	const slug = String(name || "local-artist")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "-")
		.slice(0, 48);
	return `local-artist:${slug || "unknown"}`;
}

function isValidLocalTrackMeta(value) {
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

function readStoredMetaList() {
	return readStorageJson(LOCAL_TRACKS_STORAGE_KEY, [], isValidLocalTrackMeta);
}

function writeStoredMetaList(list) {
	writeStorageJson(LOCAL_TRACKS_STORAGE_KEY, list);
	cachedSnapshot = null;
}

function notifyLocalTracksChanged() {
	cachedSnapshot = null;
	listeners.forEach((listener) => listener());
}

/** Проверяет, подходит ли выбранный файл как поддерживаемое аудио */
export function isSupportedAudioFile(file) {
	if (!file) return false;
	const ext = file.name?.split(".").pop()?.toLowerCase() || "";
	return Boolean(file.type?.startsWith("audio/") || ACCEPTED_AUDIO_EXTS.has(ext));
}

/**
 * Извлекает подсказки названия трека и артиста из имени аудиофайла
 * (например, `"Artist - Song Title.mp3"` -> `{ artist: "Artist", title: "Song Title" }`).
 */
export function parseAudioFilename(fileName) {
	const raw = String(fileName || "").trim();
	const withoutExt = raw.replace(/\.[^/.]+$/, "").trim();
	const normalized = withoutExt.includes(" ")
		? withoutExt
		: withoutExt.replace(/_/g, " ");

	const dashParts = normalized.split(/\s+[—–-]\s+/);
	if (dashParts.length === 2 && dashParts[0] && dashParts[1]) {
		return {
			artist: dashParts[0].trim(),
			title: dashParts[1].trim(),
		};
	}

	return {
		artist: "",
		title: normalized,
	};
}

/**
 * Определяет длительность локального аудиофайла в миллисекундах через `<audio preload="metadata">`.
 */
export function probeAudioDurationMs(file) {
	if (!file || typeof document === "undefined" || typeof URL === "undefined") {
		return Promise.resolve(0);
	}

	return new Promise((resolve) => {
		const objectUrl = URL.createObjectURL(file);
		const audio = document.createElement("audio");
		audio.preload = "metadata";
		let settled = false;

		const cleanup = (ms) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeoutId);
			audio.removeAttribute("src");
			audio.load();
			URL.revokeObjectURL(objectUrl);
			resolve(ms);
		};

		const timeoutId = setTimeout(() => cleanup(0), 5000);

		audio.onloadedmetadata = () => {
			const ms =
				Number.isFinite(audio.duration) && audio.duration > 0
					? Math.floor(audio.duration * 1000)
					: 0;
			cleanup(ms);
		};

		audio.onerror = () => cleanup(0);
		audio.src = objectUrl;
	});
}

// ============================================================================
// IndexedDB для хранения бинарных аудиофайлов и обложек
// ============================================================================

function openMediaDb() {
	if (typeof indexedDB === "undefined") {
		return Promise.resolve(null);
	}

	return new Promise((resolve) => {
		try {
			const request = indexedDB.open(IDB_NAME, IDB_VERSION);
			request.onupgradeneeded = () => {
				const db = request.result;
				if (!db.objectStoreNames.contains(IDB_STORE)) {
					db.createObjectStore(IDB_STORE, { keyPath: "id" });
				}
			};
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => resolve(null);
		} catch {
			resolve(null);
		}
	});
}

/**
 * Единая обёртка транзакций IndexedDB: гарантирует закрытие БД и безопасный фолбэк.
 */
async function withMediaStore(mode, runRequest, fallback = null) {
	const db = await openMediaDb();
	if (!db) return fallback;

	return new Promise((resolve) => {
		let settled = false;
		const finish = (value) => {
			if (settled) return;
			settled = true;
			try {
				db.close();
			} catch {
				// Игнорируем ошибку повторного закрытия
			}
			resolve(value);
		};

		try {
			const tx = db.transaction(IDB_STORE, mode);
			const store = tx.objectStore(IDB_STORE);
			runRequest(store, tx, finish, fallback);
			tx.onabort = () => finish(fallback);
			tx.onerror = () => finish(fallback);
		} catch {
			finish(fallback);
		}
	});
}

function readAllMediaFromIdb() {
	return withMediaStore(
		"readonly",
		(store, _tx, finish, fallback) => {
			const req = store.getAll();
			req.onsuccess = () => finish(Array.isArray(req.result) ? req.result : fallback);
			req.onerror = () => finish(fallback);
		},
		[],
	);
}

function readMediaByIdFromIdb(id) {
	return withMediaStore(
		"readonly",
		(store, _tx, finish, fallback) => {
			const req = store.get(id);
			req.onsuccess = () => finish(req.result ?? fallback);
			req.onerror = () => finish(fallback);
		},
		null,
	);
}

function putMediaInIdb(record) {
	return withMediaStore(
		"readwrite",
		(store, tx, finish) => {
			store.put(record);
			tx.oncomplete = () => finish(true);
		},
		false,
	);
}

function deleteMediaFromIdb(id) {
	return withMediaStore(
		"readwrite",
		(store, tx, finish) => {
			store.delete(id);
			tx.oncomplete = () => finish(true);
		},
		false,
	);
}

function revokeCachedAudioUrl(trackId) {
	const cached = mediaCache.get(trackId);
	if (cached?.audioUrl && typeof URL !== "undefined") {
		URL.revokeObjectURL(cached.audioUrl);
	}
	mediaCache.delete(trackId);
}

// ============================================================================
// Публичный API хранилища локальных треков
// ============================================================================

/** Подписка на добавление, редактирование, удаление и гидратацию локальных треков */
export function subscribeLocalTracksChanges(listener) {
	listeners.add(listener);
	const onStorage = (e) => {
		if (e.key === LOCAL_TRACKS_STORAGE_KEY) {
			hydrationPromise = null;
			void hydrateLocalTracksMedia();
			notifyLocalTracksChanged();
		}
	};
	if (typeof window !== "undefined") {
		window.addEventListener("storage", onStorage);
	}
	return () => {
		listeners.delete(listener);
		if (typeof window !== "undefined") {
			window.removeEventListener("storage", onStorage);
		}
	};
}

/**
 * Загружает аудиофайлы и обложки из IndexedDB в память (создаёт `blob:` URL для `<audio>`).
 * Безопасен при повторных вызовах (идемпотентен).
 */
export function hydrateLocalTracksMedia() {
	if (hydrationPromise) return hydrationPromise;

	hydrationPromise = (async () => {
		const metaList = readStoredMetaList();
		const activeIds = new Set(metaList.map((m) => m.id));
		let didChange = false;

		// Освобождаем blob-URL треков, удалённых в другой вкладке
		for (const cachedId of Array.from(mediaCache.keys())) {
			if (!activeIds.has(cachedId)) {
				revokeCachedAudioUrl(cachedId);
				didChange = true;
			}
		}

		if (metaList.length === 0) {
			if (didChange) notifyLocalTracksChanged();
			return;
		}

		const records = await readAllMediaFromIdb();

		for (const record of records) {
			if (!record?.id || !activeIds.has(record.id)) continue;
			const prev = mediaCache.get(record.id);
			if (prev?.audioUrl && prev?.cover === (record.cover ?? null)) continue;

			const audioUrl =
				prev?.audioUrl ||
				(record.audioBlob && typeof URL !== "undefined"
					? URL.createObjectURL(record.audioBlob)
					: null);

			mediaCache.set(record.id, {
				audioUrl,
				cover: record.cover ?? null,
			});
			didChange = true;
		}

		if (didChange) {
			notifyLocalTracksChanged();
		}
	})();

	return hydrationPromise;
}

/**
 * Возвращает актуальный массив локальных треков с подключёнными `audio_url` и `cover`.
 */
export function getLocalTracksSnapshot() {
	if (cachedSnapshot) return cachedSnapshot;

	const metaList = readStoredMetaList();
	cachedSnapshot = metaList.map((meta) => {
		const media = mediaCache.get(meta.id);
		const fallbackCover =
			meta.fallback_cover || makeImageSet("#4c5f4b", "#181d18", meta.title);

		return {
			...meta,
			audio_url: media?.audioUrl ?? null,
			cover: media?.cover ?? fallbackCover,
		};
	});

	return cachedSnapshot;
}

/**
 * Сохраняет новый локальный трек с MP3/аудиофайлом и опциональной обложкой.
 */
export async function saveLocalTrack({
	title,
	artistName = "",
	albumTitle = "",
	explicit = false,
	durationMs = 0,
	audioFile,
	cover = null,
}) {
	if (!audioFile) {
		throw new Error("Не выбран аудиофайл трека.");
	}

	const cleanTitle = String(title || "").trim() || "Untitled Track";
	const cleanArtist = String(artistName || "").trim() || "Local Artist";
	const cleanAlbum = String(albumTitle || "").trim();
	const palette = pickPalette(`${cleanTitle}:${cleanArtist}`);
	const id = createUuid();
	const detectedMs =
		Number(durationMs) > 0 ? Math.floor(durationMs) : await probeAudioDurationMs(audioFile);

	const fallbackCover = makeImageSet(palette.primary, palette.secondary, cleanTitle);
	const audioUrl = typeof URL !== "undefined" ? URL.createObjectURL(audioFile) : null;

	mediaCache.set(id, {
		audioUrl,
		cover: cover ?? null,
	});

	const meta = {
		id,
		title: cleanTitle.slice(0, 140),
		album_id: null,
		album_title: cleanAlbum.slice(0, 140) || null,
		disc_no: 1,
		track_no: 1,
		duration_ms: detectedMs,
		explicit: Boolean(explicit),
		accent: palette.accent,
		fallback_cover: fallbackCover,
		has_cover: Boolean(cover),
		audio_file_name: audioFile.name || "audio.mp3",
		audio_size_bytes: Number(audioFile.size) || 0,
		artists: [
			{
				id: makeLocalArtistId(cleanArtist),
				name: cleanArtist.slice(0, 120),
				role: "main",
			},
		],
		lyrics_languages: [],
		is_local: true,
		created_at: new Date().toISOString(),
	};

	const existing = readStoredMetaList();
	writeStoredMetaList([meta, ...existing]);
	await putMediaInIdb({
		id,
		audioBlob: audioFile,
		cover: cover ?? null,
	});
	notifyLocalTracksChanged();

	return {
		...meta,
		audio_url: audioUrl,
		cover: cover ?? fallbackCover,
	};
}

/**
 * Обновляет метаданные, обложку или аудиофайл существующего локального трека.
 */
export async function updateLocalTrack(
	trackId,
	{
		title,
		artistName,
		albumTitle,
		explicit,
		durationMs,
		audioFile = null,
		cover,
		clearCover = false,
	},
) {
	const list = readStoredMetaList();
	const existingMeta = list.find((item) => item.id === trackId);
	if (!existingMeta) return null;

	const idbRecord = (await readMediaByIdFromIdb(trackId)) ?? { id: trackId };
	const cached = mediaCache.get(trackId) ?? {
		audioUrl: null,
		cover: idbRecord.cover ?? null,
	};

	let nextAudioBlob = idbRecord.audioBlob ?? null;
	let nextAudioUrl = cached.audioUrl;
	let nextAudioName = existingMeta.audio_file_name;
	let nextAudioSize = existingMeta.audio_size_bytes;
	let nextDurationMs = existingMeta.duration_ms;

	if (audioFile) {
		if (nextAudioUrl && typeof URL !== "undefined") {
			URL.revokeObjectURL(nextAudioUrl);
		}
		nextAudioBlob = audioFile;
		nextAudioUrl = typeof URL !== "undefined" ? URL.createObjectURL(audioFile) : null;
		nextAudioName = audioFile.name || nextAudioName;
		nextAudioSize = Number(audioFile.size) || nextAudioSize;
		nextDurationMs =
			Number(durationMs) > 0
				? Math.floor(durationMs)
				: await probeAudioDurationMs(audioFile);
	} else if (Number(durationMs) > 0) {
		nextDurationMs = Math.floor(durationMs);
	}

	let nextCover = cached.cover ?? idbRecord.cover ?? null;
	if (clearCover) {
		nextCover = null;
	} else if (cover !== undefined) {
		nextCover = cover;
	}

	const cleanTitle =
		title !== undefined ? String(title).trim().slice(0, 140) || existingMeta.title : existingMeta.title;
	const cleanArtist =
		artistName !== undefined
			? String(artistName).trim().slice(0, 120) || "Local Artist"
			: existingMeta.artists?.[0]?.name || "Local Artist";
	const cleanAlbum =
		albumTitle !== undefined ? String(albumTitle).trim().slice(0, 140) || null : existingMeta.album_title;

	const updatedMeta = {
		...existingMeta,
		title: cleanTitle,
		album_title: cleanAlbum,
		explicit: explicit !== undefined ? Boolean(explicit) : existingMeta.explicit,
		duration_ms: nextDurationMs,
		has_cover: Boolean(nextCover),
		audio_file_name: nextAudioName,
		audio_size_bytes: nextAudioSize,
		artists: [
			{
				id: makeLocalArtistId(cleanArtist),
				name: cleanArtist,
				role: "main",
			},
		],
	};

	mediaCache.set(trackId, {
		audioUrl: nextAudioUrl,
		cover: nextCover,
	});

	writeStoredMetaList(
		list.map((item) => (item.id === trackId ? updatedMeta : item)),
	);
	await putMediaInIdb({
		id: trackId,
		audioBlob: nextAudioBlob,
		cover: nextCover,
	});
	notifyLocalTracksChanged();

	return {
		...updatedMeta,
		audio_url: nextAudioUrl,
		cover: nextCover ?? updatedMeta.fallback_cover,
	};
}

/**
 * Удаляет локальный трек из `localStorage`, кэша ObjectURL и IndexedDB.
 */
export async function deleteLocalTrack(trackId) {
	const list = readStoredMetaList();
	const exists = list.some((item) => item.id === trackId);
	if (!exists) return false;

	revokeCachedAudioUrl(trackId);

	writeStoredMetaList(list.filter((item) => item.id !== trackId));
	await deleteMediaFromIdb(trackId);
	notifyLocalTracksChanged();
	return true;
}
