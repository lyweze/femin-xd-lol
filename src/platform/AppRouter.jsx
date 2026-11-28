// ============================================================================
// Адаптивный роутер для Web (`BrowserRouter`), Desktop и мобильных оболочек (`HashRouter`)
// Устанавливает OS-модификаторы (`is-desktop`, `is-native-mobile`, `is-macos-native`, `os-*`) на `<html>`.
// ============================================================================
import { useEffect } from "react";
import { BrowserRouter, HashRouter, useNavigate } from "react-router-dom";
import {
	CLIENT_OS,
	IS_DESKTOP,
	IS_MACOS_NATIVE,
	IS_NATIVE_MOBILE,
	USE_HASH_ROUTER,
} from "./env.js";
import { subscribeOsPlayerCommands, syncOsAppearance } from "./osBridge.js";

/** Внутрироутерный слушатель команд навигации из нативного меню ОС */
function OsCommandRouterBridge() {
	const navigate = useNavigate();

	useEffect(() => {
		return subscribeOsPlayerCommands((command, payload) => {
			if (command === "navigate" && typeof payload?.path === "string") {
				navigate(payload.path);
				if (typeof payload.focusSelector === "string") {
					setTimeout(() => {
						document.querySelector(payload.focusSelector)?.focus?.();
					}, 60);
				}
				return;
			}
			if (command === "newPlaylist") {
				window.dispatchEvent(new CustomEvent("femin:ui-new-playlist"));
			}
		});
	}, [navigate]);

	return null;
}

/**
 * Настраивает классы ОС на корневом `<html>` и выбирает маршрутизатор.
 */
export function AppRouter({ children }) {
	useEffect(() => {
		const root = document.documentElement;
		root.classList.toggle("is-desktop", IS_DESKTOP);
		root.classList.toggle("is-native-mobile", IS_NATIVE_MOBILE);
		root.classList.toggle("is-macos-native", IS_MACOS_NATIVE);
		root.classList.add(`os-${CLIENT_OS}`);
		syncOsAppearance();
	}, []);

	if (USE_HASH_ROUTER) {
		return (
			<HashRouter>
				<OsCommandRouterBridge />
				{children}
			</HashRouter>
		);
	}

	const rawBase = import.meta.env?.BASE_URL;
	const routerBase = rawBase && rawBase.startsWith("/") ? rawBase : undefined;

	return (
		<BrowserRouter basename={routerBase}>
			<OsCommandRouterBridge />
			{children}
		</BrowserRouter>
	);
}
