// ============================================================================
// Импорты: хуки React и адаптивный роутер для Web / Desktop (Tauri)
// ============================================================================
import { useEffect } from "react";
import { BrowserRouter, HashRouter } from "react-router-dom";

/** Флаг запуска внутри десктопного контейнера Tauri */
export const IS_DESKTOP =
    typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);

/**
 * Платформенный маршрутизатор (`AppRouter`).
 * Использует `HashRouter` в десктопной сборке (Tauri) и `BrowserRouter` в вебе,
 * а также проставляет модификатор `.is-desktop` на корневой `<html>`.
 */
export function AppRouter({ children }) {
    useEffect(() => {
        document.documentElement.classList.toggle("is-desktop", IS_DESKTOP);
    }, []);

    const Router = IS_DESKTOP ? HashRouter : BrowserRouter;
    return <Router>{children}</Router>;
}
