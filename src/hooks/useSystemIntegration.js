import { useEffect } from "react";
import { formatArtistNames } from "../utils/format.js";

const SEEK_STEP_MS = 5000;

/**
 * Формирует массив `MediaImage` доступных размеров обложки для Navigator MediaMetadata.
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
 * Интеграция плеера с ОС и глобальными горячими клавишами:
 * 1. `Navigator Media Session API` — отображение трека в macOS Control Center / шторке iOS и обработка клавиш гарнитуры.
 * 2. Горячие клавиши:
 *    - `Space` — Play / Pause;
 *    - `Escape` — закрытие полноэкранного плеера;
 *    - `F` — переключение полноэкранного плеера;
 *    - `L` — показать/скрыть текст песни (в полноэкранном режиме);
 *    - `M` — Mute / Unmute;
 *    - `ArrowLeft` / `ArrowRight` — перемотка ±5 с (`Shift` + стрелка — предыдущий/следующий трек).
 */
export function useSystemIntegration({
	currentTrack,
	isPlaying,
	isFullscreenOpen,
	togglePlay,
	nextTrack,
	prevTrack,
	seekToMs,
	seekByMs,
	toggleMute,
	toggleShowLyrics,
	closeFullscreen,
	toggleFullscreen,
}) {
	// 1. Обновление метаданных и статуса воспроизведения для ОС
	useEffect(() => {
		if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
			return;
		}

		const ms = navigator.mediaSession;
		if (currentTrack && typeof window.MediaMetadata !== "undefined") {
			ms.metadata = new window.MediaMetadata({
				title: currentTrack.title,
				artist: formatArtistNames(currentTrack.artists),
				artwork: buildMediaArtwork(currentTrack.cover),
			});
		}

		ms.playbackState = isPlaying ? "playing" : "paused";
	}, [currentTrack, isPlaying]);

	// 2. Подписка на медиа-кнопки клавиатуры и гарнитуры
	useEffect(() => {
		if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
			return;
		}
		const ms = navigator.mediaSession;
		const safeSetHandler = (action, handler) => {
			try {
				ms.setActionHandler(action, handler);
			} catch {
				// Отдельные браузеры могут не поддерживать конкретный action
			}
		};

		safeSetHandler("play", () => togglePlay());
		safeSetHandler("pause", () => togglePlay());
		safeSetHandler("previoustrack", () => prevTrack());
		safeSetHandler("nexttrack", () => nextTrack());
		safeSetHandler("seekto", (details) => {
			if (typeof details?.seekTime === "number") {
				seekToMs(details.seekTime * 1000);
			}
		});

		return () => {
			safeSetHandler("play", null);
			safeSetHandler("pause", null);
			safeSetHandler("previoustrack", null);
			safeSetHandler("nexttrack", null);
			safeSetHandler("seekto", null);
		};
	}, [togglePlay, prevTrack, nextTrack, seekToMs]);

	// 3. Глобальные шорткаты клавиатуры
	useEffect(() => {
		const onKeyDown = (e) => {
			const target = e.target;
			const tagName = target?.tagName;
			const isEditable =
				tagName === "INPUT" ||
				tagName === "TEXTAREA" ||
				tagName === "SELECT" ||
				target?.isContentEditable;

			if (e.key === "Escape" && isFullscreenOpen) {
				closeFullscreen();
				return;
			}

			// Не перехватываем клавиши во время ввода текста и при нажатых модификаторах ОС
			if (isEditable || e.metaKey || e.ctrlKey || e.altKey) {
				return;
			}

			// Не мешаем нативному взаимодействию с фокусируемыми контролами и ползунками
			const isInteractiveControl =
				tagName === "BUTTON" ||
				tagName === "A" ||
				target?.getAttribute?.("role") === "slider";
			if (isInteractiveControl) return;

			const keyHandlers = {
				Space: () => togglePlay(),
				KeyF: () => toggleFullscreen(),
				KeyM: () => toggleMute(),
				KeyL: isFullscreenOpen ? () => toggleShowLyrics() : null,
				ArrowRight: () => (e.shiftKey ? nextTrack(false) : seekByMs(SEEK_STEP_MS)),
				ArrowLeft: () => (e.shiftKey ? prevTrack() : seekByMs(-SEEK_STEP_MS)),
			};

			const action = keyHandlers[e.code];
			if (!action) return;

			e.preventDefault();
			action();
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [
		togglePlay,
		nextTrack,
		prevTrack,
		seekByMs,
		toggleMute,
		toggleShowLyrics,
		isFullscreenOpen,
		closeFullscreen,
		toggleFullscreen,
	]);
}
