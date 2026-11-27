/** Флаг запуска внутри десктопного контейнера Tauri */
export const IS_DESKTOP =
	typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
