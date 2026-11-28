// ============================================================================
// Конфигурация Vite: поддержка GitHub Pages, локальной разработки и client-сборок
// ============================================================================
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => {
	const customBase = process.env.VITE_BASE;
	const customOutDir = process.env.VITE_OUT_DIR;

	return {
		plugins: [react()],
		// Для `vite dev` корень `/`, для `gh-pages` префикс `/femin-xd-lol/`,
		// для портативных и клиентских сборок можно переопределить через `VITE_BASE`.
		base: customBase ?? (command === "serve" && !isPreview ? "/" : "/femin-xd-lol/"),
		build: {
			outDir: customOutDir || "dist",
			emptyOutDir: true,
		},
	};
});
