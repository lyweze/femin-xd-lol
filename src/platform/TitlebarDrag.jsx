// ============================================================================
// Прозрачная область перетаскивания окна в десктопном клиенте Tauri (macOS)
// ============================================================================
import { IS_DESKTOP } from "./env.js";

function TitlebarDrag() {
	if (!IS_DESKTOP) return null;
	return <div className="desktop-titlebar-drag" data-tauri-drag-region aria-hidden="true" />;
}

export default TitlebarDrag;
