// ============================================================================
// Конфигурация Vite: корень `/` в dev-сервере и `/femin-xd-lol/` для gh-pages
// ============================================================================
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
	plugins: [react()],
	// В `vite dev` отдаём от `/` (чтобы обновление вложенных роутов работало без префикса),
	// а для `vite build` и `vite preview` сохраняем base под GitHub Pages.
	base: command === "serve" && !isPreview ? "/" : "/femin-xd-lol/",
}));
