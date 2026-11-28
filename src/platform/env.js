// ============================================================================
// Определение среды и операционной системы (Web / Desktop / Mobile WebView)
// ============================================================================

const hasTauri =
	typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
const hasElectron =
	typeof window !== "undefined" &&
	Boolean(window.__ELECTRON_APP__ || window.__ELECTRON_BRIDGE__);
const hasMacosNative =
	typeof window !== "undefined" && Boolean(window.__MACOS_NATIVE_APP__);
const hasCapacitor =
	typeof window !== "undefined" && Boolean(window.Capacitor?.isNativePlatform?.());
const hasReactNativeWebView =
	typeof window !== "undefined" && Boolean(window.__RN_WEBVIEW__ || window.ReactNativeWebView);
const isFileProtocol =
	typeof window !== "undefined" && window.location?.protocol === "file:";

/** Определяет текущую ОС: `'macos' | 'windows' | 'linux' | 'ios' | 'android' | 'web'` */
export function detectClientOs() {
	if (typeof window === "undefined") return "web";

	const electronPlatform = window.__ELECTRON_BRIDGE__?.platform;
	if (electronPlatform === "darwin") return "macos";
	if (electronPlatform === "win32") return "windows";
	if (electronPlatform === "linux") return "linux";

	const capPlatform = window.Capacitor?.getPlatform?.();
	if (capPlatform === "ios") return "ios";
	if (capPlatform === "android") return "android";

	if (typeof navigator === "undefined") return "web";
	const ua = navigator.userAgent || "";
	const platform = navigator.platform || "";

	if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) {
		return "ios";
	}
	if (/Android/i.test(ua)) return "android";
	if (/Win/i.test(platform) || /Windows/i.test(ua)) return "windows";
	if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return "macos";
	if (/Linux/i.test(platform) || /Linux/i.test(ua)) return "linux";

	return "web";
}

export const CLIENT_OS = detectClientOs();

/** Флаг запуска внутри десктопного контейнера (macOS Native AppKit, Tauri или Electron) */
export const IS_MACOS_NATIVE = hasMacosNative;

export const IS_DESKTOP =
	hasTauri ||
	hasElectron ||
	hasMacosNative ||
	import.meta.env?.VITE_CLIENT_TARGET === "desktop";

/** Флаг запуска внутри нативного мобильного контейнера (Capacitor или React Native) */
export const IS_NATIVE_MOBILE = hasCapacitor || hasReactNativeWebView;

/** Использовать HashRouter для десктопа, file:// или мобильных WebView-контейнеров */
export const USE_HASH_ROUTER =
	IS_DESKTOP ||
	IS_NATIVE_MOBILE ||
	isFileProtocol ||
	import.meta.env?.VITE_ROUTER_MODE === "hash";
