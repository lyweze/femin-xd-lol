import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Аудио-движок на базе единого экземпляра HTML5 `<audio>` в `useRef`.
 *
 * Исправления и возможности:
 * - Нативный и фолбэк-повтор одного трека (`repeatOne`): `audio.loop = true` +
 *   явный сброс `audio.currentTime = 0` и вызов `audio.play()` в `ended`, чтобы
 *   повтор срабатывал мгновенно без зависания в паузе.
 * - Явный метод `restart()` для надёжного перезапуска текущего трека с 00:00.
 * - Передача реальной длительности из `loadedmetadata` в `onDurationDetected`.
 * - Автооткат на таймер симуляции, если `audio_url` отсутствует или не загрузился.
 */
export function useAudioEngine({
	currentTrack,
	isPlaying,
	repeatOne,
	volume,
	isMuted,
	onEnded,
	onDurationDetected,
}) {
	const audioRef = useRef(null);
	const onEndedRef = useRef(onEnded);
	onEndedRef.current = onEnded;

	const onDurationRef = useRef(onDurationDetected);
	onDurationRef.current = onDurationDetected;

	const repeatOneRef = useRef(repeatOne);
	repeatOneRef.current = repeatOne;

	const isPlayingRef = useRef(isPlaying);
	isPlayingRef.current = isPlaying;

	const currentTrackIdRef = useRef(currentTrack?.id ?? null);
	currentTrackIdRef.current = currentTrack?.id ?? null;

	const [currentTimeMs, setCurrentTimeMs] = useState(0);
	const [durationMs, setDurationMs] = useState(currentTrack?.duration_ms ?? 0);
	const [audioFailed, setAudioFailed] = useState(false);

	const useRealAudio = Boolean(currentTrack?.audio_url) && !audioFailed;

	// Инициализация единого <audio> на весь цикл жизни приложения
	useEffect(() => {
		const audio = new Audio();
		audio.preload = "metadata";
		audioRef.current = audio;

		const handleTimeUpdate = () => {
			setCurrentTimeMs(Math.floor(audio.currentTime * 1000));
		};

		const handleLoadedMetadata = () => {
			if (Number.isFinite(audio.duration) && audio.duration > 0) {
				const detectedMs = Math.floor(audio.duration * 1000);
				setDurationMs(detectedMs);
				if (currentTrackIdRef.current) {
					onDurationRef.current?.(currentTrackIdRef.current, detectedMs);
				}
			}
		};

		const handleEnded = () => {
			if (repeatOneRef.current) {
				audio.currentTime = 0;
				setCurrentTimeMs(0);
				audio.play().catch((err) => {
					if (err?.name === "NotSupportedError") {
						setAudioFailed(true);
					}
				});
				return;
			}
			onEndedRef.current?.();
		};

		const handleError = () => {
			setAudioFailed(true);
		};

		audio.addEventListener("timeupdate", handleTimeUpdate);
		audio.addEventListener("loadedmetadata", handleLoadedMetadata);
		audio.addEventListener("ended", handleEnded);
		audio.addEventListener("error", handleError);

		return () => {
			audio.pause();
			audio.removeAttribute("src");
			audio.load();
			audio.removeEventListener("timeupdate", handleTimeUpdate);
			audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
			audio.removeEventListener("ended", handleEnded);
			audio.removeEventListener("error", handleError);
		};
	}, []);

	// Нативный loop для бесшовного повтора одного трека
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;
		audio.loop = Boolean(repeatOne);
	}, [repeatOne]);

	// Синхронизация громкости и mute
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;
		audio.volume = Math.max(0, Math.min(1, volume));
		audio.muted = Boolean(isMuted);
	}, [volume, isMuted]);

	// Загрузка нового трека
	useEffect(() => {
		const audio = audioRef.current;
		setCurrentTimeMs(0);
		setDurationMs(currentTrack?.duration_ms ?? 0);
		setAudioFailed(false);

		if (!audio) return;

		if (currentTrack?.audio_url) {
			audio.src = currentTrack.audio_url;
			audio.currentTime = 0;
			audio.loop = Boolean(repeatOneRef.current);
			if (isPlayingRef.current) {
				audio.play().catch((err) => {
					if (err?.name === "NotSupportedError") {
						setAudioFailed(true);
					}
				});
			}
		} else {
			audio.pause();
			audio.removeAttribute("src");
		}
	}, [currentTrack?.id, currentTrack?.audio_url, currentTrack?.duration_ms]);

	// Play / Pause для реального <audio>
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio || !useRealAudio) return;

		if (isPlaying) {
			if (audio.ended) {
				audio.currentTime = 0;
				setCurrentTimeMs(0);
			}
			audio.play().catch((err) => {
				if (err?.name === "NotSupportedError") {
					setAudioFailed(true);
				}
			});
		} else {
			audio.pause();
		}
	}, [isPlaying, useRealAudio]);

	// Симуляция воспроизведения (когда у мок-трека нет реального файла)
	useEffect(() => {
		if (useRealAudio || !isPlaying || !currentTrack) return;

		const total = currentTrack.duration_ms || 180000;
		let lastTick = performance.now();

		const timerId = setInterval(() => {
			const now = performance.now();
			const delta = now - lastTick;
			lastTick = now;

			setCurrentTimeMs((prev) => {
				const next = prev + delta;
				if (next >= total) {
					if (repeatOneRef.current) {
						return 0;
					}
					setTimeout(() => onEndedRef.current?.(), 0);
					return total;
				}
				return next;
			});
		}, 200);

		return () => clearInterval(timerId);
	}, [useRealAudio, isPlaying, currentTrack]);

	const seekToMs = useCallback(
		(targetMs) => {
			const safeTotal = durationMs || currentTrack?.duration_ms || 0;
			const clamped = Math.max(0, Math.min(safeTotal, Math.floor(targetMs)));
			setCurrentTimeMs(clamped);

			const audio = audioRef.current;
			if (audio && useRealAudio && Number.isFinite(audio.duration)) {
				audio.currentTime = clamped / 1000;
			}
		},
		[durationMs, currentTrack?.duration_ms, useRealAudio],
	);

	const restart = useCallback(
		(autoPlay = true) => {
			setCurrentTimeMs(0);
			const audio = audioRef.current;
			if (audio && useRealAudio) {
				audio.currentTime = 0;
				if (autoPlay) {
					audio.play().catch(() => {});
				}
			}
		},
		[useRealAudio],
	);

	return {
		currentTimeMs,
		durationMs,
		seekToMs,
		restart,
		isSimulated: !useRealAudio,
	};
}
