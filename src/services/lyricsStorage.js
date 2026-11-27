// ============================================================================
// Временное локальное хранилище текстов песен (`lyricsStorage`)
// Объединяет:
// 1. Сохранения из Admin Studio (персистентно в `localStorage` для плеера и админки).
// 2. Статические `.lrc`-файлы, положенные в `public/temp/<папка>/lyrics.lrc`.
// ============================================================================
import { MOCK_LYRICS } from "./mockData.js";
import { parseLrcDocument } from "../utils/lrc.js";
import { readStorageJson, writeStorageJson } from "../utils/storage.js";

export const LYRICS_STORAGE_KEY = "matte_obsidian_track_lyrics";

const tempLyricsCache = new Map(); // trackId -> AdminLyrics[] | null
const pendingTempProbes = new Map();
const listeners = new Set();

function cloneList(list) {
	return JSON.parse(JSON.stringify(list ?? []));
}

function isValidLyricsStore(value) {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Читает карту пользовательских правок из localStorage (`{ [trackId]: AdminLyrics[] }`) */
function readStoredOverridesMap() {
	return readStorageJson(LYRICS_STORAGE_KEY, {}, isValidLyricsStore);
}

function writeStoredOverridesMap(map) {
	writeStorageJson(LYRICS_STORAGE_KEY, map);
}

function notifyLyricsChanged() {
	listeners.forEach((listener) => listener());
}

/** Подписка на любые обновления текстов (из админки, temp-файлов или другой вкладки) */
export function subscribeLyricsChanges(listener) {
	listeners.add(listener);
	const onStorage = (e) => {
		if (e.key === LYRICS_STORAGE_KEY) listener();
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
 * Возвращает тексты трека с приоритетом:
 * 1) локальная сохранённая версия из Admin Studio (`localStorage`),
 * 2) загруженный файл `public/temp/<папка>/lyrics.lrc`,
 * 3) встроенный `MOCK_LYRICS`.
 */
export function getLocalTrackLyrics(trackId) {
	if (!trackId) return [];
	const overrides = readStoredOverridesMap();
	if (Object.hasOwn(overrides, trackId)) {
		return cloneList(overrides[trackId]);
	}
	const fromTemp = tempLyricsCache.get(trackId);
	if (Array.isArray(fromTemp) && fromTemp.length > 0) {
		return cloneList(fromTemp);
	}
	return cloneList(MOCK_LYRICS[trackId] ?? []);
}

/**
 * Возвращает актуальный снимок `{ [trackId]: AdminLyrics[] }` для всех переданных треков.
 */
export function getLyricsSnapshotForTracks(tracks = []) {
	const overrides = readStoredOverridesMap();
	const result = {};

	for (const track of tracks) {
		if (!track?.id) continue;
		const items = getLocalTrackLyrics(track.id);
		if (items.length > 0) {
			result[track.id] = items;
		}
	}

	// Сохраняем также треки, добавленные вручную в localStorage вне MOCK_TRACKS
	for (const [trackId, list] of Object.entries(overrides)) {
		if (!result[trackId] && Array.isArray(list) && list.length > 0) {
			result[trackId] = cloneList(list);
		}
	}

	return result;
}

/**
 * Сохраняет или обновляет языковую дорожку текста в `localStorage`
 * и мгновенно уведомляет все компоненты плеера.
 */
export function saveLocalTrackLyrics(trackId, lyrics) {
	const overrides = readStoredOverridesMap();
	const existing = Object.hasOwn(overrides, trackId)
		? overrides[trackId]
		: getLocalTrackLyrics(trackId);

	const idx = existing.findIndex((item) => item.language === lyrics.language);
	const nextList = [...existing];
	if (idx >= 0) {
		nextList[idx] = cloneList(lyrics);
	} else {
		nextList.push(cloneList(lyrics));
	}

	overrides[trackId] = nextList;
	writeStoredOverridesMap(overrides);
	notifyLyricsChanged();
	return cloneList(lyrics);
}

/**
 * Удаляет языковую дорожку текста из локального хранилища и уведомляет плеер.
 */
export function deleteLocalTrackLyrics(trackId, language) {
	const overrides = readStoredOverridesMap();
	const existing = Object.hasOwn(overrides, trackId)
		? overrides[trackId]
		: getLocalTrackLyrics(trackId);

	const next = existing.filter((item) => item.language !== language);
	if (next.length === existing.length) {
		return { deleted: false, list: existing };
	}

	overrides[trackId] = next;
	writeStoredOverridesMap(overrides);
	notifyLyricsChanged();
	return { deleted: true, list: cloneList(next) };
}

/**
 * Удаляет все сохранённые тексты указанного трека (используется при удалении локального трека).
 */
export function clearAllLocalTrackLyrics(trackId) {
	if (!trackId) return false;
	const overrides = readStoredOverridesMap();
	if (!Object.hasOwn(overrides, trackId)) return false;
	delete overrides[trackId];
	writeStoredOverridesMap(overrides);
	notifyLyricsChanged();
	return true;
}

/**
 * Разбирает LRC или обычный текст из формы трека и сохраняет (либо очищает) дорожку.
 */
export function syncTrackLyricsDraft(
	trackId,
	lyricsText,
	lyricsLanguage = "ru",
	clearWhenEmpty = false,
) {
	if (!trackId) return;
	const trimmed = String(lyricsText || "").trim();
	if (!trimmed) {
		if (clearWhenEmpty) {
			clearAllLocalTrackLyrics(trackId);
		}
		return;
	}

	const parsed = parseLrcDocument(trimmed);
	if (parsed.lines.length > 0) {
		saveLocalTrackLyrics(trackId, {
			language: parsed.language || lyricsLanguage || "ru",
			synced: parsed.synced,
			offset_ms: parsed.offsetMs || 0,
			lines: parsed.lines,
		});
	}
}

/**
 * Пытается загрузить статический файл `lyrics.lrc` из папки `public/temp/<folder>/`.
 * Защищено от SPA-фолбэка Vite (`<!doctype html>` при отсутствии файла).
 */
async function probeSingleTempLyrics(track) {
	if (!track?.id || !track?.lyrics_lrc_url) return null;
	if (tempLyricsCache.has(track.id)) return tempLyricsCache.get(track.id);
	if (pendingTempProbes.has(track.id)) return pendingTempProbes.get(track.id);

	const promise = (async () => {
		try {
			const response = await fetch(track.lyrics_lrc_url, { cache: "no-cache" });
			const contentType = response.headers.get("content-type") || "";
			if (!response.ok || contentType.includes("text/html")) {
				tempLyricsCache.set(track.id, null);
				return null;
			}

			const raw = await response.text();
			// Защита на случай если dev/статический сервер отдал HTML 200 OK
			if (!raw.trim() || raw.trimStart().startsWith("<")) {
				tempLyricsCache.set(track.id, null);
				return null;
			}

			const doc = parseLrcDocument(raw);
			if (doc.lines.length === 0) {
				tempLyricsCache.set(track.id, null);
				return null;
			}

			const entry = [
				{
					language: doc.language || "ru",
					synced: doc.synced,
					offset_ms: doc.offsetMs,
					lines: doc.lines,
					source: "temp-lrc",
					updated_at: new Date().toISOString(),
				},
			];
			tempLyricsCache.set(track.id, entry);
			notifyLyricsChanged();
			return entry;
		} catch {
			tempLyricsCache.set(track.id, null);
			return null;
		} finally {
			pendingTempProbes.delete(track.id);
		}
	})();

	pendingTempProbes.set(track.id, promise);
	return promise;
}

/**
 * Прогревает локальные `.lrc`-файлы из `public/temp/` для переданного списка треков.
 */
export function probeTempLyricsForTracks(tracks = []) {
	return Promise.all(
		tracks
			.filter((track) => track?.lyrics_lrc_url && !tempLyricsCache.has(track.id))
			.map((track) => probeSingleTempLyrics(track)),
	);
}

/**
 * Дожидается проверки `.lrc`-файла в `public/temp/` для конкретного трека (если он ещё не проверялся).
 */
export async function ensureTempLyricsLoaded(track) {
	if (track?.lyrics_lrc_url && !tempLyricsCache.has(track.id)) {
		await probeSingleTempLyrics(track);
	}
}
