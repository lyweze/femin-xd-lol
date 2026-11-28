import { useEffect, useRef } from "react";
import {
	subscribeOsPlayerCommands,
	syncOsPlaybackMetadata,
} from "../platform/osBridge.js";
import { clampUnit } from "../utils/format.js";

/**
 * Подключает интеграцию плеера с нативными возможностями ОС:
 * - системную панель/центр управления (`MediaSession`, Apple Now Playing, Electron, RN)
 * - входящие команды от ОС/меню (`play`, `pause`, `togglePlay`, `next`, `prev`, `mute`, `volumeUp`, `volumeDown`, `queue`, `seekto`, `toggleFullscreen`, `toggleLyrics`, `uploadTrack`)
 * - глобальные горячие клавиши (`Space`, `F`, `M`, `L`, `Q`, `Escape`, `ArrowLeft/Right`).
 */
export function useSystemIntegration({
	currentTrack,
	isPlaying,
	volume = 0.85,
	isFullscreenOpen,
	togglePlay,
	nextTrack,
	prevTrack,
	seekToMs,
	seekByMs,
	setVolume,
	toggleMute,
	toggleShowLyrics,
	toggleQueuePane,
	onOpenQueue,
	onOpenLyrics,
	onOpenUploader,
	closeFullscreen,
	toggleFullscreen,
}) {
	const isPlayingRef = useRef(isPlaying);
	const isFullscreenOpenRef = useRef(isFullscreenOpen);
	const volumeRef = useRef(volume);
	const actionsRef = useRef({
		togglePlay,
		nextTrack,
		prevTrack,
		seekToMs,
		seekByMs,
		setVolume,
		toggleMute,
		toggleShowLyrics,
		toggleQueuePane,
		onOpenQueue,
		onOpenLyrics,
		onOpenUploader,
		closeFullscreen,
		toggleFullscreen,
	});

	useEffect(() => {
		isPlayingRef.current = isPlaying;
		isFullscreenOpenRef.current = isFullscreenOpen;
		volumeRef.current = volume;
		actionsRef.current = {
			togglePlay,
			nextTrack,
			prevTrack,
			seekToMs,
			seekByMs,
			setVolume,
			toggleMute,
			toggleShowLyrics,
			toggleQueuePane,
			onOpenQueue,
			onOpenLyrics,
			onOpenUploader,
			closeFullscreen,
			toggleFullscreen,
		};
	});

	// 1. Синхронизация метаданных и состояния воспроизведения во все подключённые SDK ОС
	useEffect(() => {
		syncOsPlaybackMetadata({
			track: currentTrack,
			isPlaying,
		});
	}, [currentTrack, isPlaying]);

	// 2. Регистрация обработчиков системных медиа-кнопок и команд от хост-оболочек
	useEffect(() => {
		const mediaSession =
			typeof navigator !== "undefined" ? navigator.mediaSession : null;
		const registeredActions = [];

		const registerMediaHandler = (action, handler) => {
			if (!mediaSession?.setActionHandler) return;
			try {
				mediaSession.setActionHandler(action, handler);
				registeredActions.push(action);
			} catch {
				// Отдельные браузеры/ОС поддерживают не все MediaSessionAction
			}
		};

		registerMediaHandler("play", () => {
			if (!isPlayingRef.current) {
				actionsRef.current.togglePlay?.();
			}
		});
		registerMediaHandler("pause", () => {
			if (isPlayingRef.current) {
				actionsRef.current.togglePlay?.();
			}
		});
		registerMediaHandler("previoustrack", () => {
			actionsRef.current.prevTrack?.();
		});
		registerMediaHandler("nexttrack", () => {
			actionsRef.current.nextTrack?.();
		});
		registerMediaHandler("seekto", (details) => {
			if (typeof details?.seekTime === "number") {
				actionsRef.current.seekToMs?.(details.seekTime * 1000);
			}
		});

		const unsubscribeOsCommands = subscribeOsPlayerCommands((command, payload) => {
			switch (command) {
				case "togglePlay":
					actionsRef.current.togglePlay?.();
					break;
				case "play":
					if (!isPlayingRef.current) {
						actionsRef.current.togglePlay?.();
					}
					break;
				case "pause":
					if (isPlayingRef.current) {
						actionsRef.current.togglePlay?.();
					}
					break;
				case "next":
					actionsRef.current.nextTrack?.();
					break;
				case "prev":
					actionsRef.current.prevTrack?.();
					break;
				case "mute":
					actionsRef.current.toggleMute?.();
					break;
				case "volumeUp":
					actionsRef.current.setVolume?.(clampUnit((volumeRef.current ?? 0.85) + 0.1));
					break;
				case "volumeDown":
					actionsRef.current.setVolume?.(clampUnit((volumeRef.current ?? 0.85) - 0.1));
					break;
				case "queue":
					actionsRef.current.onOpenQueue?.();
					break;
				case "toggleFullscreen":
					actionsRef.current.toggleFullscreen?.();
					break;
				case "toggleLyrics":
					actionsRef.current.onOpenLyrics?.();
					break;
				case "uploadTrack":
					actionsRef.current.onOpenUploader?.();
					break;
				case "seekto":
					if (typeof payload?.seekTimeMs === "number") {
						actionsRef.current.seekToMs?.(payload.seekTimeMs);
					}
					break;
				default:
					break;
			}
		});

		return () => {
			if (mediaSession?.setActionHandler) {
				for (const action of registeredActions) {
					try {
						mediaSession.setActionHandler(action, null);
					} catch {
						// Игнорируем ошибку очистки
					}
				}
			}
			unsubscribeOsCommands();
		};
	}, []);

	// 3. Глобальные клавиатурные хоткеи веб- и десктоп-версии
	useEffect(() => {
		const onKeyDown = (e) => {
			if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;

			const target = e.target;
			const tagName = target?.tagName;
			const isTextInput =
				tagName === "INPUT" ||
				tagName === "TEXTAREA" ||
				tagName === "SELECT" ||
				target?.isContentEditable;
			if (isTextInput) return;

			if (e.code === "Escape") {
				if (isFullscreenOpenRef.current) {
					e.preventDefault();
					actionsRef.current.closeFullscreen?.();
				}
				return;
			}

			if (e.code === "Space") {
				if (tagName === "BUTTON" || tagName === "A") return;
				e.preventDefault();
				actionsRef.current.togglePlay?.();
				return;
			}

			switch (e.code) {
				case "KeyF":
					e.preventDefault();
					actionsRef.current.toggleFullscreen?.();
					break;
				case "KeyM":
					e.preventDefault();
					actionsRef.current.toggleMute?.();
					break;
				case "KeyL":
					e.preventDefault();
					actionsRef.current.toggleShowLyrics?.();
					break;
				case "KeyQ":
					e.preventDefault();
					actionsRef.current.toggleQueuePane?.();
					break;
				case "ArrowLeft":
					if (tagName === "INPUT" || target?.getAttribute?.("role") === "slider") return;
					e.preventDefault();
					actionsRef.current.seekByMs?.(-5000);
					break;
				case "ArrowRight":
					if (tagName === "INPUT" || target?.getAttribute?.("role") === "slider") return;
					e.preventDefault();
					actionsRef.current.seekByMs?.(5000);
					break;
				default:
					break;
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);
}
