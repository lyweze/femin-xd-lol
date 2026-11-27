// ============================================================================
// Парсер и сериализатор LRC-текстов песен (`[mm:ss.xx] Строка`)
// Переиспользуется и в Admin Studio, и при чтении файлов из public/temp/.
// ============================================================================

const LRC_TAG_REGEX = /^\[(ar|ti|al|au|by|la|re|ve|length):(.*)\]$/i;
const LRC_OFFSET_REGEX = /^\[offset:\s*([+-]?\d+)\s*\]$/i;
const LRC_LINE_REGEX = /^\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]\s*(.*)$/;

/**
 * Парсит LRC или обычный текст в структурированный документ
 * `{ lines, synced, offsetMs, language }`.
 */
export function parseLrcDocument(raw) {
	const rows = String(raw || "").split(/\r?\n/);
	const lines = [];
	let offsetMs = 0;
	let language = null;

	for (const row of rows) {
		const trimmed = row.trim();
		if (!trimmed) continue;

		const offsetMatch = trimmed.match(LRC_OFFSET_REGEX);
		if (offsetMatch) {
			offsetMs = Number.parseInt(offsetMatch[1], 10) || 0;
			continue;
		}

		const metaMatch = trimmed.match(LRC_TAG_REGEX);
		if (metaMatch) {
			if (metaMatch[1].toLowerCase() === "la") {
				const langCode = metaMatch[2].trim().toLowerCase();
				if (langCode.length >= 2 && langCode.length <= 8) {
					language = langCode;
				}
			}
			continue;
		}

		const lineMatch = trimmed.match(LRC_LINE_REGEX);
		if (lineMatch) {
			const min = Number(lineMatch[1]);
			const sec = Number(lineMatch[2]);
			const frac = lineMatch[3] ? Number(lineMatch[3].padEnd(3, "0")) : 0;
			lines.push({
				start_ms: min * 60000 + sec * 1000 + frac,
				end_ms: null,
				text: lineMatch[4],
			});
		} else {
			lines.push({ start_ms: 0, end_ms: null, text: trimmed });
		}
	}

	const synced = lines.some((line) => line.start_ms > 0);
	return { lines, synced, offsetMs, language };
}

/**
 * Простой парсер строк для быстрого импорта в форму редактора текстов.
 */
export function parseLrcText(raw) {
	return parseLrcDocument(raw).lines;
}

/**
 * Форматирует время в миллисекундах в стандартный тег `[mm:ss.xx]`.
 */
function formatMsToLrcTag(ms) {
	const safeMs = Math.max(0, Math.floor(Number(ms) || 0));
	const minutes = Math.floor(safeMs / 60000);
	const seconds = Math.floor((safeMs % 60000) / 1000);
	const centis = Math.floor((safeMs % 1000) / 10);
	return `[${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centis).padStart(2, "0")}]`;
}

/**
 * Сериализует объект текста трека (`AdminLyrics`) в стандартный формат `.lrc`
 * для сохранения в файл `public/temp/<папка>/lyrics.lrc`.
 */
export function formatLyricsAsLrc({ language, synced, offset_ms: offsetMs = 0, lines = [] }) {
	const header = [];
	if (language) header.push(`[la:${language}]`);
	if (Number(offsetMs)) header.push(`[offset:${Math.trunc(Number(offsetMs))}]`);

	const body = lines.map((line) =>
		synced ? `${formatMsToLrcTag(line.start_ms)} ${line.text}` : line.text,
	);

	return [...header, ...body].join("\n");
}
