// ============================================================================
// Чистые функции выбора трека в очереди (shuffle / repeat / prev / next)
// ============================================================================

/**
 * Возвращает перемешанную копию массива (алгоритм Фишера — Йетса).
 */
export function shuffleList(list) {
	const copy = [...list];
	for (let i = copy.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

/**
 * Вычисляет действие при переходе к следующему треку:
 * - `{ action: "none" }` — очередь пуста;
 * - `{ action: "restart", isPlaying }` — начать текущий/единственный трек сначала;
 * - `{ action: "select", track }` — переключиться на новый трек;
 * - `{ action: "stop" }` — остановить воспроизведение в конце очереди (если выключен repeat).
 */
export function pickNextTrackOutcome({
	queue,
	currentTrackId,
	isShuffle,
	repeatMode,
	autoAdvanced,
}) {
	if (!queue.length) return { action: "none" };

	if (queue.length === 1) {
		return !autoAdvanced || repeatMode !== "off"
			? { action: "restart" }
			: { action: "stop" };
	}

	const currentIdx = queue.findIndex((t) => t.id === currentTrackId);

	if (isShuffle) {
		let randIdx = currentIdx;
		while (randIdx === currentIdx) {
			randIdx = Math.floor(Math.random() * queue.length);
		}
		return { action: "select", track: queue[randIdx] };
	}

	const nextIdx = currentIdx + 1;
	if (nextIdx < queue.length) {
		return { action: "select", track: queue[nextIdx] };
	}

	if (repeatMode === "all" || !autoAdvanced) {
		return { action: "select", track: queue[0] };
	}

	return { action: "stop" };
}

/**
 * Вычисляет действие при переходе назад:
 * - если трек проигран дольше порога `restartThresholdMs` (обычно 3 с) или он единственный,
 *   возвращаем его к 00:00;
 * - иначе переключаемся на предыдущий трек по кольцу очереди.
 */
export function pickPrevTrackOutcome({
	queue,
	currentTrackId,
	currentTimeMs,
	restartThresholdMs,
}) {
	if (!queue.length) return { action: "none" };

	if (currentTimeMs > restartThresholdMs || queue.length === 1) {
		return { action: "restart" };
	}

	const currentIdx = queue.findIndex((t) => t.id === currentTrackId);
	const prevIdx = currentIdx > 0 ? currentIdx - 1 : queue.length - 1;
	return { action: "select", track: queue[prevIdx] };
}
