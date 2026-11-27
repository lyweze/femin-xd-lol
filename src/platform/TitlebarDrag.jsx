// ============================================================================
// Прозрачная область перетаскивания окна в десктопном клиенте Tauri (macOS)
// ============================================================================
import { IS_DESKTOP } from "./env.js";

/**
 * Рисует невидимую полосу для перетаскивания окна за верхний край в Tauri.
 * В обычном браузере ничего не рендерит.
 */
function TitlebarDrag() {
	if (!IS_DESKTOP) return null;
	return <div className="desktop-titlebar-drag" data-tauri-drag-region aria-hidden="true" />;
}

export default TitlebarDrag;
