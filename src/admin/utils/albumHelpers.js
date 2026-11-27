// ============================================================================
// Общие константы и хелперы Admin Studio (типы релизов, статусы, тексты)
// ============================================================================
export { parseLrcText } from "../../utils/lrc.js";

/** Поддерживаемые типы релизов в каталоге */
export const ALBUM_TYPES = [
	{ value: "album", label: "Album" },
	{ value: "ep", label: "EP" },
	{ value: "single", label: "Single" },
	{ value: "compilation", label: "Compilation" },
];

/**
 * Определяет статус публикации альбома (`draft` / `scheduled` / `published`)
 * и возвращает ключ для CSS-бейджа + текст.
 *
 * @param {Object} album - Объект альбома
 * @param {number} [referenceMs] - Опорный timestamp (из state, чтобы не вызывать Date.now() при каждом рендере)
 */
export function getAlbumPublicationStatus(album, referenceMs) {
	if (!album?.published_at) {
		return { key: "draft", label: "DRAFT", isPublished: false, isScheduled: false };
	}

	const nowMs = referenceMs ?? Date.now();
	const isScheduled = new Date(album.published_at).getTime() > nowMs;

	return isScheduled
		? {
				key: "scheduled",
				label: `SCHEDULED • ${album.published_at.slice(0, 10)}`,
				shortLabel: "SCHEDULED",
				isPublished: true,
				isScheduled: true,
			}
		: {
				key: "published",
				label: "PUBLISHED",
				shortLabel: "PUBLISHED",
				isPublished: true,
				isScheduled: false,
			};
}

/**
 * Инициализирует черновик строк для формы редактирования текста песни.
 */
export function buildInitialLyricsLines(currentLyrics) {
	if (!currentLyrics?.lines?.length) {
		return [{ start_ms: 0, end_ms: "", text: "" }];
	}
	return currentLyrics.lines.map((line) => ({
		start_ms: line.start_ms ?? 0,
		end_ms: line.end_ms ?? "",
		text: line.text ?? "",
	}));
}
