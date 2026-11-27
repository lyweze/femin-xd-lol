// ============================================================================
// Хук закрытия диалогов и шторок по клавише Escape (`useEscapeKey`)
// ============================================================================
import { useEffect } from "react";

/**
 * Подписывается на `window.keydown` и вызывает `onEscape` при нажатии `Escape`,
 * пока флаг `enabled` равен `true`.
 */
export function useEscapeKey(enabled, onEscape) {
	useEffect(() => {
		if (!enabled) return undefined;
		const handleKeyDown = (event) => {
			if (event.key === "Escape") {
				onEscape?.();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [enabled, onEscape]);
}
