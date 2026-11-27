// ============================================================================
// Хук перехвата ошибок асинхронных действий в формах и таблицах админ-студии
// ============================================================================
import { useCallback, useState } from "react";

/**
 * Предоставляет состояние `actionError` и обёртку `runAction(fn, fallbackMessage)`,
 * которая автоматически очищает прошлую ошибку и записывает новую при исключении.
 */
export function useActionError() {
	const [actionError, setActionError] = useState(null);

	const runAction = useCallback(async (actionFn, fallbackMessage) => {
		setActionError(null);
		try {
			return await actionFn();
		} catch (err) {
			setActionError(err?.message || fallbackMessage);
			return undefined;
		}
	}, []);

	return { actionError, setActionError, runAction };
}
