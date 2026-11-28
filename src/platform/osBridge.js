// ============================================================================
// Единый мост к нативным SDK ОС (`osBridge`)
// Связывает плеер с MediaSession (macOS/iOS/Android), Electron (Dock, Touch Bar,
// Windows Thumbar, Tray), Capacitor (Haptics, StatusBar) и React Native WebView.
// ============================================================================
import { formatArtistNames } from "../utils/format.js";

function postToReactNative(type, payload = {}) {
	if (typeof window === "undefined") return;
	const bridge = window.ReactNativeWebView;
	if (!bridge?.postMessage) return;
	try {
		bridge.postMessage(JSON.stringify({ type, ...payload }));
	} catch {
		// Игнорируем ошибку сериализации / недоступного моста
	}
}

function postToMacosNative(type, payload = {}) {
	if (typeof window === "undefined") return;
	const handler = window.webkit?.messageHandlers?.feminNative;
	if (!handler?.postMessage) return;
	try {
		handler.postMessage({ type, ...payload });
	} catch {
		// Игнорируем ошибку WebKit bridge
	}
}

/**
 * Вызывает лёгкий тактильный отклик ОС (iOS Taptic Engine, Android Vibrator, Mac Force Touch).
 */
export function triggerOsHaptic(style = "light") {
	if (typeof window === "undefined") return;

	// 1. Capacitor Haptics SDK (iOS / Android)
	const capHaptics = window.Capacitor?.Plugins?.Haptics;
	if (capHaptics) {
		try {
			if (style === "selection" && typeof capHaptics.selectionChanged === "function") {
				capHaptics.selectionChanged();
			} else if (typeof capHaptics.impact === "function") {
				capHaptics.impact({
					style: style === "medium" ? "MEDIUM" : "LIGHT",
				});
			}
			return;
		} catch {
			// Переходим к запасному способу
		}
	}

	// 2. React Native WebView -> expo-haptics
	if (window.ReactNativeWebView?.postMessage) {
		postToReactNative("FEMIN_HAPTIC", { style });
		return;
	}

	// 3. Нативное приложение macOS (Force Touch NSHapticFeedbackManager)
	if (window.webkit?.messageHandlers?.feminNative?.postMessage) {
		postToMacosNative("haptic", { style });
		return;
	}

	// 3. Браузерная вибрация (в основном Android Chrome)
	if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
		try {
			navigator.vibrate(style === "medium" ? 12 : 6);
		} catch {
			// Безопасно игнорируем
		}
	}
}

/**
 * Формирует массив доступных обложек для системного плеера ОС.
 */
function buildMediaArtwork(cover) {
	if (!cover) return [];
	const artwork = [];
	if (cover.small_url) artwork.push({ src: cover.small_url, sizes: "96x96" });
	if (cover.medium_url) artwork.push({ src: cover.medium_url, sizes: "300x300" });
	if (cover.large_url) artwork.push({ src: cover.large_url, sizes: "640x640" });
	return artwork;
}

/**
 * Синхронизирует текущий трек и состояние Play/Pause с ОС:
 * Navigator MediaSession, Electron (Dock / Touch Bar / Taskbar) и React Native.
 */
export function syncOsPlaybackMetadata({
	track,
	isPlaying,
	canGoNext = true,
	canGoPrev = true,
}) {
	const title = track?.title || "FEMIN";
	const artist = formatArtistNames(track?.artists) || "";

	if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
		const ms = navigator.mediaSession;
		if (track && typeof window !== "undefined" && typeof window.MediaMetadata !== "undefined") {
			ms.metadata = new window.MediaMetadata({
				title,
				artist,
				album: track.album_title || "",
				artwork: buildMediaArtwork(track.cover),
			});
		}
		ms.playbackState = isPlaying ? "playing" : "paused";
	}

	if (typeof window !== "undefined" && window.__ELECTRON_BRIDGE__?.syncPlayback) {
		try {
			window.__ELECTRON_BRIDGE__.syncPlayback({
				title,
				artist,
				isPlaying: Boolean(isPlaying),
				canGoNext: Boolean(canGoNext),
				canGoPrev: Boolean(canGoPrev),
			});
		} catch {
			// Игнорируем ошибку IPC
		}
	}

	postToReactNative("FEMIN_PLAYBACK_STATE", {
		title,
		artist,
		isPlaying: Boolean(isPlaying),
	});

	postToMacosNative("playbackMetadata", {
		title,
		artist,
		album: track?.album_title || "",
		coverUrl:
			track?.cover?.large_url ||
			track?.cover?.medium_url ||
			track?.cover?.small_url ||
			"",
		durationMs: Number(track?.duration_ms) || 0,
		isPlaying: Boolean(isPlaying),
		canGoNext: Boolean(canGoNext),
		canGoPrev: Boolean(canGoPrev),
	});
}

/**
 * Обновляет прогресс трека на системном экране блокировки iOS/Android и macOS Control Center.
 */
export function syncOsPlaybackPosition({ durationMs, positionMs, isPlaying }) {
	const duration = Number(durationMs) / 1000;
	if (!Number.isFinite(duration) || duration <= 0) return;

	const position = Math.max(0, Math.min(duration, (Number(positionMs) || 0) / 1000));

	postToMacosNative("playbackPosition", {
		durationMs: Number(durationMs),
		positionMs: Math.round(position * 1000),
		isPlaying: Boolean(isPlaying),
	});

	if (
		typeof navigator === "undefined" ||
		!("mediaSession" in navigator) ||
		typeof navigator.mediaSession.setPositionState !== "function"
	) {
		return;
	}

	try {
		navigator.mediaSession.setPositionState({
			duration,
			playbackRate: isPlaying ? 1 : 0,
			position,
		});
	} catch {
		// В некоторых версиях WebKit setPositionState может отклонить дробные граничные значения
	}
}

/**
 * Настраивает системный статус-бар iOS/Android (Capacitor / Expo) и акцент macOS-оболочки под тёмную тему Obsidian.
 */
export function syncOsAppearance({ accentHex } = {}) {
	if (typeof window === "undefined") return;

	const capStatusBar = window.Capacitor?.Plugins?.StatusBar;
	if (capStatusBar) {
		try {
			capStatusBar.setStyle?.({ style: "DARK" });
			capStatusBar.setBackgroundColor?.({ color: "#161615" });
		} catch {
			// Плагин может быть недоступен в браузере
		}
	}

	if (accentHex) {
		postToReactNative("FEMIN_ACCENT_COLOR", { accentHex });
		postToMacosNative("appearance", { accentHex });
	}
}

/**
 * Подписывается на команды управления плеером от нативной оболочки
 * (Electron Dock/TouchBar/Thumbar или React Native / Capacitor).
 */
export function subscribeOsPlayerCommands(onCommand) {
	if (typeof window === "undefined" || typeof onCommand !== "function") {
		return () => {};
	}

	const cleanups = [];

	if (typeof window.__ELECTRON_BRIDGE__?.onPlayerCommand === "function") {
		const unsubIpc = window.__ELECTRON_BRIDGE__.onPlayerCommand((cmd, payload) => {
			onCommand(cmd, payload);
		});
		if (typeof unsubIpc === "function") cleanups.push(unsubIpc);
	}

	const onCustomEvent = (event) => {
		const detail = event?.detail;
		if (!detail) return;
		if (typeof detail === "string") {
			onCommand(detail, {});
			return;
		}
		if (typeof detail === "object" && typeof detail.command === "string") {
			onCommand(detail.command, detail);
		}
	};
	window.addEventListener("femin:native-command", onCustomEvent);
	cleanups.push(() => window.removeEventListener("femin:native-command", onCustomEvent));

	return () => {
		for (const fn of cleanups) fn();
	};
}
