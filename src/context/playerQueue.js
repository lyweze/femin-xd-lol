// ============================================================================
// Движок очереди воспроизведения в духе Apple Music (`playerQueue`)
// Каждая позиция в очереди оборачивается в уникальный слот `{ uid, track, source }`,
// что позволяет добавлять один и тот же трек повторно, переставлять «Далее» и
// хранить историю без конфликтов индексов и ключей.
// ============================================================================

let nextQueueUid = 1;

/**
 * Создаёт уникальный элемент очереди (`source`: `"context"` | `"manual"`).
 */
export function createQueueEntry(track, source = "context") {
	return {
		uid: `q-${nextQueueUid++}`,
		track,
		source,
	};
}

/**
 * Преобразует массив треков каталога в список слотов очереди.
 */
export function buildQueueFromTracks(tracks = [], source = "context") {
	return tracks.filter(Boolean).map((track) => createQueueEntry(track, source));
}

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
 * Вставляет трек сразу после текущей композиции («Воспроизвести следующим»).
 * Если очередь пуста, запускает трек с индекса `0`.
 */
export function insertPlayNext(queue, currentIndex, track) {
	const entry = createQueueEntry(track, "manual");
	if (!queue.length || currentIndex < 0) {
		return { queue: [entry], currentIndex: 0, shouldPlay: true };
	}

	const nextQueue = [...queue];
	nextQueue.splice(currentIndex + 1, 0, entry);
	return { queue: nextQueue, currentIndex, shouldPlay: false };
}

/**
 * Добавляет трек в конец очереди («Добавить в очередь»).
 */
export function appendToQueue(queue, currentIndex, track) {
	const entry = createQueueEntry(track, "manual");
	if (!queue.length || currentIndex < 0) {
		return { queue: [entry], currentIndex: 0, shouldPlay: true };
	}

	return {
		queue: [...queue, entry],
		currentIndex,
		shouldPlay: false,
	};
}

/**
 * Перемещает элемент внутри предстоящей части очереди (`currentIndex + 1 .. end`).
 * Индексы передаются относительно списка предстоящих треков (`upcoming`).
 */
export function moveUpcomingItem(queue, currentIndex, fromUpcomingIdx, toUpcomingIdx) {
	const base = Math.max(0, currentIndex + 1);
	const fromIdx = base + fromUpcomingIdx;
	const toIdx = base + toUpcomingIdx;
	if (
		fromUpcomingIdx === toUpcomingIdx ||
		fromIdx < base ||
		toIdx < base ||
		fromIdx >= queue.length ||
		toIdx >= queue.length
	) {
		return queue;
	}

	const next = [...queue];
	const [moved] = next.splice(fromIdx, 1);
	next.splice(toIdx, 0, moved);
	return next;
}

/**
 * Удаляет конкретный слот по `uid`, корректно корректируя `currentIndex`.
 */
export function removeQueueEntry(queue, currentIndex, targetUid) {
	const targetIdx = queue.findIndex((item) => item.uid === targetUid);
	if (targetIdx === -1) return { queue, currentIndex };

	const nextQueue = queue.filter((item) => item.uid !== targetUid);
	if (!nextQueue.length) {
		return { queue: [], currentIndex: -1 };
	}

	let nextIndex = currentIndex;
	if (targetIdx < currentIndex) {
		nextIndex = currentIndex - 1;
	} else if (targetIdx === currentIndex) {
		nextIndex = Math.min(currentIndex, nextQueue.length - 1);
	}

	return { queue: nextQueue, currentIndex: nextIndex };
}

/**
 * Удаляет все предстоящие треки после текущего (`currentIndex + 1 .. end`).
 */
export function clearUpcomingEntries(queue, currentIndex) {
	if (currentIndex < 0) return [];
	return queue.slice(0, currentIndex + 1);
}

/**
 * Вычисляет исход перехода к следующему треку:
 * - `{ action: "none" }` — очередь пуста;
 * - `{ action: "restart" }` — повторить единственный трек с 00:00;
 * - `{ action: "select", index }` — переключиться на индекс `index`;
 * - `{ action: "stop" }` — дошли до конца очереди при выключенном `repeat`.
 */
export function pickNextQueueOutcome({
	queue,
	currentIndex,
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

	const safeIdx = currentIndex >= 0 && currentIndex < queue.length ? currentIndex : 0;

	// Если сразу после текущего трека стоит добавленный вручную («Play Next»), отдаём ему приоритет даже при Shuffle
	const immediateNext = queue[safeIdx + 1];
	if (isShuffle && immediateNext?.source !== "manual") {
		let randIdx = safeIdx;
		while (randIdx === safeIdx) {
			randIdx = Math.floor(Math.random() * queue.length);
		}
		return { action: "select", index: randIdx };
	}

	const nextIdx = safeIdx + 1;
	if (nextIdx < queue.length) {
		return { action: "select", index: nextIdx };
	}

	if (repeatMode === "all" || !autoAdvanced) {
		return { action: "select", index: 0 };
	}

	return { action: "stop" };
}

/**
 * Вычисляет исход перехода назад:
 * - если трек проигран дольше `restartThresholdMs` или он единственный — сброс на 00:00;
 * - иначе переход на `currentIndex - 1` по кольцу.
 */
export function pickPrevQueueOutcome({
	queue,
	currentIndex,
	currentTimeMs,
	restartThresholdMs,
}) {
	if (!queue.length) return { action: "none" };

	if (currentTimeMs > restartThresholdMs || queue.length === 1) {
		return { action: "restart" };
	}

	const safeIdx = currentIndex >= 0 && currentIndex < queue.length ? currentIndex : 0;
	const prevIdx = safeIdx > 0 ? safeIdx - 1 : queue.length - 1;
	return { action: "select", index: prevIdx };
}
