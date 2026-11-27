// ============================================================================
// Безопасная работа с localStorage (защита от квот, приватного режима и битого JSON)
// ============================================================================

/**
 * Читает и парсит JSON-значение из `localStorage`.
 * При ошибке чтения, невалидном JSON или провале `validate` возвращает `fallback`.
 *
 * @template T
 * @param {string} key - Ключ в localStorage
 * @param {T} fallback - Значение по умолчанию
 * @param {(value: unknown) => boolean} [validate] - Опциональная проверка типа
 * @returns {T}
 */
export function readStorageJson(key, fallback, validate) {
	try {
		const raw = localStorage.getItem(key);
		if (raw === null) return fallback;
		const parsed = JSON.parse(raw);
		if (validate && !validate(parsed)) return fallback;
		return parsed;
	} catch {
		return fallback;
	}
}

/**
 * Сериализует значение в JSON и сохраняет в `localStorage`.
 * Игнорирует ошибки хранилища (например, переполненную квоту в Safari).
 *
 * @param {string} key - Ключ в localStorage
 * @param {unknown} value - Сохраняемое значение
 */
export function writeStorageJson(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Хранилище может быть недоступно в приватном режиме или при переполнении квоты
	}
}

/**
 * Читает число из `localStorage` и ограничивает его диапазоном `[min, max]`.
 *
 * @param {string} key - Ключ в localStorage
 * @param {number} fallback - Значение по умолчанию
 * @param {number} min - Нижняя граница
 * @param {number} max - Верхняя граница
 * @returns {number}
 */
export function readStorageNumber(key, fallback, min, max) {
	try {
		const raw = localStorage.getItem(key);
		if (raw === null) return fallback;
		const num = Number(raw);
		if (!Number.isFinite(num)) return fallback;
		return Math.max(min, Math.min(max, num));
	} catch {
		return fallback;
	}
}

/**
 * Сохраняет строковое представление примитива в `localStorage`.
 *
 * @param {string} key - Ключ в localStorage
 * @param {string | number | boolean} value - Значение
 */
export function writeStorageValue(key, value) {
	try {
		localStorage.setItem(key, String(value));
	} catch {
		// Игнорируем ошибку, если localStorage недоступен
	}
}
