// ============================================================================
// Утилиты форматирования времени, размеров, метаданных и числовых границ
// ============================================================================

/**
 * Ограничивает число заданными границами `[min, max]`.
 * Невалидные значения (`NaN`, `Infinity`) приводятся к `min`.
 */
export function clamp(value, min, max) {
	if (!Number.isFinite(value)) return min;
	return Math.max(min, Math.min(max, value));
}

/**
 * Ограничивает нормализованный коэффициент диапазоном `[0, 1]`.
 */
export function clampUnit(value) {
	return clamp(value, 0, 1);
}

/**
 * Форматирует длительность трека (в мс) для таблиц (`mm:ss`).
 * Для неизвестной или нулевой длительности возвращает `"--:--"`.
 */
export function formatDuration(ms) {
	if (!Number.isFinite(ms) || ms <= 0) return "--:--";
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Форматирует текущее время воспроизведения (в мс) в `mm:ss`.
 * В отличие от `formatDuration`, на нулевой отметке всегда показывает `"00:00"`.
 */
export function formatPlaybackTime(ms) {
	if (!Number.isFinite(ms) || ms < 0) return "00:00";
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Форматирует суммарную длительность альбома или плейлиста (`N min` / `H hr M min`).
 */
export function formatTotalDuration(ms) {
	if (!Number.isFinite(ms) || ms <= 0) return "0 min";
	const totalMinutes = Math.max(1, Math.round(ms / 60000));
	if (totalMinutes < 60) return `${totalMinutes} min`;
	const hours = Math.floor(totalMinutes / 60);
	const mins = totalMinutes % 60;
	return `${hours} hr ${mins} min`;
}

/**
 * Форматирует размер аудиофайла в человекочитаемый вид (`B`, `KB`, `MB`, `GB`).
 */
export function formatBytes(bytes) {
	if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	let idx = 0;
	let value = bytes;
	while (value >= 1024 && idx < units.length - 1) {
		value /= 1024;
		idx += 1;
	}
	return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

/**
 * Склеивает имена артистов через запятую.
 */
export function formatArtistNames(artists) {
	if (!Array.isArray(artists) || artists.length === 0) return "";
	return artists.map((artist) => artist.name).join(", ");
}

/**
 * Форматирует подпись количества треков (`"1 track"` / `"2 tracks"` или в верхнем регистре).
 */
export function formatTrackCount(count, { uppercase = false } = {}) {
	const safeCount = Number.isFinite(count) ? count : 0;
	const noun = safeCount === 1 ? "track" : "tracks";
	const text = `${safeCount} ${noun}`;
	return uppercase ? text.toUpperCase() : text;
}

/**
 * Формирует инициалы и подпись режима для виджета профиля в навигации.
 */
export function getAccountSummary(user, isAdmin) {
	const initialLetter = user?.username?.[0]?.toUpperCase() || "D";
	const mode = user?.mode || "LOCAL";
	const subtitle = isAdmin ? `ADMIN • ${mode}` : mode;
	return { initialLetter, subtitle };
}
