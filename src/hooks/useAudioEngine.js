import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Аудио-движок на базе единого экземпляра HTML5 `<audio>` в `useRef`.
 * Оптимизирован под минимальную нагрузку на вкладку:
 * - Не обновляет React-состояние времени, пока вкладка скрыта (`document.hidden`),
 *   но мгновенно синхронизирует позицию при возврате.
 * - Стабильные ссылки на `seekToMs` и `restart` через рефы.
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
	const trackId = currentTrack?.id ?? null;
	const trackDurationFallback = currentTrack?.duration_ms ?? 0;

	const [playbackTime, setPlaybackTime] = useState({ trackId: null, ms: 0 });
	const [detectedDuration, setDetectedDuration] = useState({
		trackId: null,
		ms: 0,
	});
	const [failedTrackId, setFailedTrackId] = useState(null);

	const currentTimeMs = playbackTime.trackId === trackId ? playbackTime.ms : 0;
	const durationMs =
		detectedDuration.trackId === trackId
			? detectedDuration.ms
			: trackDurationFallback;
	const audioFailed = failedTrackId === trackId;
	const useRealAudio = Boolean(currentTrack?.audio_url) && !audioFailed;

	const audioRef = useRef(null);
	const onEndedRef = useRef(onEnded);
	const onDurationRef = useRef(onDurationDetected);
	const repeatOneRef = useRef(repeatOne);
	const isPlayingRef = useRef(isPlaying);
	const trackIdRef = useRef(trackId);
	const durationMsRef = useRef(durationMs);
	const useRealAudioRef = useRef(useRealAudio);

	useEffect(() => {
		onEndedRef.current = onEnded;
		onDurationRef.current = onDurationDetected;
		repeatOneRef.current = repeatOne;
		isPlayingRef.current = isPlaying;
		trackIdRef.current = trackId;
		durationMsRef.current = durationMs;
		useRealAudioRef.current = useRealAudio;
	});

	// Инициализация единого <audio> на весь цикл жизни приложения
	useEffect(() => {
		const audio = new Audio();
		audio.preload = "metadata";
		audioRef.current = audio;

		const syncTimeFromAudio = () => {
			if (!trackIdRef.current) return;
			setPlaybackTime({
				trackId: trackIdRef.current,
				ms: Math.floor(audio.currentTime * 1000),
			});
		};

		const handleTimeUpdate = () => {
			if (document.hidden) return;
			syncTimeFromAudio();
		};

		const handleVisibilityChange = () => {
			if (!document.hidden && useRealAudioRef.current) {
				syncTimeFromAudio();
			}
		};

		const handleLoadedMetadata = () => {
			if (Number.isFinite(audio.duration) && audio.duration > 0) {
				const detectedMs = Math.floor(audio.duration * 1000);
				const activeId = trackIdRef.current;
				if (activeId) {
					setDetectedDuration({ trackId: activeId, ms: detectedMs });
					onDurationRef.current?.(activeId, detectedMs);
				}
			}
		};

		const handleEnded = () => {
			if (repeatOneRef.current) {
				audio.currentTime = 0;
				setPlaybackTime({ trackId: trackIdRef.current, ms: 0 });
				audio.play().catch((err) => {
					if (err?.name === "NotSupportedError") {
						setFailedTrackId(trackIdRef.current);
					}
				});
				return;
			}
			onEndedRef.current?.();
		};

		const handleError = () => {
			setFailedTrackId(trackIdRef.current);
		};

		audio.addEventListener("timeupdate", handleTimeUpdate);
		audio.addEventListener("loadedmetadata", handleLoadedMetadata);
		audio.addEventListener("ended", handleEnded);
		audio.addEventListener("error", handleError);
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			audio.pause();
			audio.removeAttribute("src");
			audio.load();
			audio.removeEventListener("timeupdate", handleTimeUpdate);
			audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
			audio.removeEventListener("ended", handleEnded);
			audio.removeEventListener("error", handleError);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
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
		if (!audio) return;

		if (currentTrack?.audio_url) {
			audio.src = currentTrack.audio_url;
			audio.currentTime = 0;
			audio.loop = Boolean(repeatOneRef.current);
			if (isPlayingRef.current) {
				audio.play().catch((err) => {
					if (err?.name === "NotSupportedError") {
						setFailedTrackId(currentTrack.id);
					}
				});
			}
		} else {
			audio.pause();
			audio.removeAttribute("src");
		}
	}, [currentTrack?.id, currentTrack?.audio_url]);

	// Play / Pause для реального <audio>
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio || !useRealAudio) return;

		if (isPlaying) {
			if (audio.ended) {
				audio.currentTime = 0;
				setPlaybackTime({ trackId: trackIdRef.current, ms: 0 });
			}
			audio.play().catch((err) => {
				if (err?.name === "NotSupportedError") {
					setFailedTrackId(trackIdRef.current);
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
		const activeId = currentTrack.id;
		let lastTick = performance.now();

		const timerId = setInterval(() => {
			const now = performance.now();
			const delta = now - lastTick;
			lastTick = now;

			setPlaybackTime((prev) => {
				const base = prev.trackId === activeId ? prev.ms : 0;
				const next = base + delta;
				if (next >= total) {
					if (repeatOneRef.current) {
						return { trackId: activeId, ms: 0 };
					}
					setTimeout(() => onEndedRef.current?.(), 0);
					return { trackId: activeId, ms: total };
				}
				return { trackId: activeId, ms: next };
			});
		}, 500);

		return () => clearInterval(timerId);
	}, [useRealAudio, isPlaying, currentTrack]);

	const seekToMs = useCallback((targetMs) => {
		const safeTotal = durationMsRef.current || 0;
		const clamped = Math.max(0, Math.min(safeTotal, Math.floor(targetMs)));
		setPlaybackTime({ trackId: trackIdRef.current, ms: clamped });

		const audio = audioRef.current;
		if (audio && useRealAudioRef.current && Number.isFinite(audio.duration)) {
			audio.currentTime = clamped / 1000;
		}
	}, []);

	const restart = useCallback((autoPlay = true) => {
		setPlaybackTime({ trackId: trackIdRef.current, ms: 0 });
		const audio = audioRef.current;
		if (audio && useRealAudioRef.current) {
			audio.currentTime = 0;
			if (autoPlay) {
				audio.play().catch(() => {});
			}
		}
	}, []);

	return {
		currentTimeMs,
		durationMs,
		seekToMs,
		restart,
	};
}
