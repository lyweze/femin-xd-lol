// ============================================================================
// Адаптивный роутер для Web (`BrowserRouter`) и Desktop / Tauri (`HashRouter`)
// ============================================================================
import { useEffect } from "react";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { IS_DESKTOP } from "./env.js";

/**
 * Проставляет модификатор `.is-desktop` на корневой `<html>` (резервирует место под titlebar macOS)
 * и выбирает маршрутизатор под среду исполнения.
 * `basename={import.meta.env.BASE_URL}` удерживает базовый префикс Vite (например `/femin-xd-lol/`)
 * в адресной строке при переходах, не ломая обновление страницы.
 */
export function AppRouter({ children }) {
	useEffect(() => {
		document.documentElement.classList.toggle("is-desktop", IS_DESKTOP);
	}, []);

	if (IS_DESKTOP) {
		return <HashRouter>{children}</HashRouter>;
	}

	return (
		<BrowserRouter basename={import.meta.env.BASE_URL}>
			{children}
		</BrowserRouter>
	);
}
