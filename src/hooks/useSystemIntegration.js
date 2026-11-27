import { useEffect } from "react";

/**
 * Интеграция с ОС и глобальными горячими клавишами:
 * 1. Navigator Media Session API (macOS Control Center, клавиши гарнитуры).
 * 2. `Space` — Play / Pause.
 * 3. `Escape` — закрытие полноэкранного плеера.
 * 4. `F` — переключение полноэкранного плеера, `L` — тексты, `M` — mute.
 * 5. `ArrowLeft` / `ArrowRight` — перемотка ±5с (`Shift` — пред/след трек).
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
	useEffect(() => {
		if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
			return;
		}

		const ms = navigator.mediaSession;
		if (currentTrack && typeof window.MediaMetadata !== "undefined") {
			const artistText = currentTrack.artists?.map((a) => a.name).join(", ") || "";
			const artwork = [];
			if (currentTrack.cover?.small_url) {
				artwork.push({ src: currentTrack.cover.small_url, sizes: "96x96" });
			}
			if (currentTrack.cover?.medium_url) {
				artwork.push({ src: currentTrack.cover.medium_url, sizes: "300x300" });
			}
			if (currentTrack.cover?.large_url) {
				artwork.push({ src: currentTrack.cover.large_url, sizes: "640x640" });
			}

			ms.metadata = new window.MediaMetadata({
				title: currentTrack.title,
				artist: artistText,
				artwork,
			});
		}

		ms.playbackState = isPlaying ? "playing" : "paused";
	}, [currentTrack, isPlaying]);

	useEffect(() => {
		if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
			return;
		}
		const ms = navigator.mediaSession;
		const safeSetHandler = (action, handler) => {
			try {
				ms.setActionHandler(action, handler);
			} catch {
				// ignore unsupported actions
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

			if (isEditable || e.metaKey || e.ctrlKey || e.altKey) {
				return;
			}

			const isInteractiveControl =
				tagName === "BUTTON" ||
				tagName === "A" ||
				target?.getAttribute?.("role") === "slider";

			if (e.code === "Space") {
				if (isInteractiveControl) return;
				e.preventDefault();
				togglePlay();
			} else if (e.code === "KeyF") {
				if (isInteractiveControl) return;
				e.preventDefault();
				toggleFullscreen();
			} else if (e.code === "KeyM") {
				if (isInteractiveControl) return;
				e.preventDefault();
				toggleMute();
			} else if (e.code === "KeyL" && isFullscreenOpen) {
				if (isInteractiveControl) return;
				e.preventDefault();
				toggleShowLyrics();
			} else if (e.code === "ArrowRight") {
				if (isInteractiveControl) return;
				e.preventDefault();
				if (e.shiftKey) nextTrack(false);
				else seekByMs(5000);
			} else if (e.code === "ArrowLeft") {
				if (isInteractiveControl) return;
				e.preventDefault();
				if (e.shiftKey) prevTrack();
				else seekByMs(-5000);
			}
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
