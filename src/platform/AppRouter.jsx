// ============================================================================
// Адаптивный роутер для Web (BrowserRouter) и Desktop / Tauri (HashRouter)
// ============================================================================
import { useEffect } from "react";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { IS_DESKTOP } from "./env.js";

/**
 * Проставляет модификатор `.is-desktop` на корневой `<html>`
 * и выбирает подходящий маршрутизатор.
 */
export function AppRouter({ children }) {
	useEffect(() => {
		document.documentElement.classList.toggle("is-desktop", IS_DESKTOP);
	}, []);

	const Router = IS_DESKTOP ? HashRouter : BrowserRouter;
	return <Router>{children}</Router>;
}
