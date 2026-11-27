// ============================================================================
// Общие константы и хелперы Admin Studio (типы релизов, статусы, парсер LRC)
// ============================================================================

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
 * Парсит текст в формате LRC (`[mm:ss.xx] Строка`) или обычный текст построчно
 * в массив структур `AdminLyricsLine`.
 */
export function parseLrcText(raw) {
	const rows = raw.split(/\r?\n/);
	const parsed = [];
	const regex = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/;

	for (const row of rows) {
		const trimmed = row.trim();
		if (!trimmed) continue;
		const match = trimmed.match(regex);
		if (match) {
			const min = Number(match[1]);
			const sec = Number(match[2]);
			const frac = match[3] ? Number(match[3].padEnd(3, "0")) : 0;
			parsed.push({
				start_ms: min * 60000 + sec * 1000 + frac,
				end_ms: null,
				text: match[4],
			});
		} else {
			parsed.push({ start_ms: 0, end_ms: null, text: trimmed });
		}
	}

	return parsed;
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
