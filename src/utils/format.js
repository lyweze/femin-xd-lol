// ============================================================================
// Утилиты форматирования времени и размеров файлов
// ============================================================================

export function formatDuration(ms) {
	if (!Number.isFinite(ms) || ms <= 0) return "--:--";
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatPlaybackTime(ms) {
	if (!Number.isFinite(ms) || ms < 0) return "00:00";
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatTotalDuration(ms) {
	if (!Number.isFinite(ms) || ms <= 0) return "0 min";
	const totalMinutes = Math.max(1, Math.round(ms / 60000));
	if (totalMinutes < 60) return `${totalMinutes} min`;
	const hours = Math.floor(totalMinutes / 60);
	const mins = totalMinutes % 60;
	return `${hours} hr ${mins} min`;
}

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
