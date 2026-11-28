// ============================================================================
// Точка входа приложения: подключение глобальных токенов, PWA SW и монтирование React
// ============================================================================
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import App from "./App.jsx";
import { IS_DESKTOP } from "./platform/env.js";

if (
	import.meta.env?.PROD &&
	!IS_DESKTOP &&
	typeof window !== "undefined" &&
	(window.location.protocol === "https:" || window.location.protocol === "http:") &&
	"serviceWorker" in navigator
) {
	window.addEventListener("load", () => {
		const swUrl = `${import.meta.env?.BASE_URL ?? "/"}sw.js`;
		navigator.serviceWorker.register(swUrl).catch(() => {
			// Тихо игнорируем, если WebView или приватный режим запрещает Service Worker
		});
	});
}

createRoot(document.getElementById("root")).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
