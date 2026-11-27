import { useEffect, useRef, useState, useCallback } from "react";
import { clampUnit } from "../utils/format.js";

/**
 * Аудио-движок на базе единого экземпляра HTML5 `<audio>` в `useRef`.
 *
 * Оптимизации нагрузки:
 * - Когда вкладка скрыта (`document.hidden`), `timeupdate` не вызывает ререндеры React;
 *   при возвращении пользователя позиция мгновенно синхронизируется по `visibilitychange`.
 * - Все внешние коллбэки и текущие параметры синхронизированы через рефы, поэтому
 *   методы `seekToMs` и `restart` сохраняют стабильные ссылки навсегда.
 * - При отсутствии реального `audio_url` (или ошибке декодирования) автоматически
 *   включается лёгкий таймер-симулятор прогресса с шагом 500мс.
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

	// Значения привязываются к trackId, чтобы при переключении трека UI сразу видел 0 без лишнего setState
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

	/**
	 * Безопасно запускает `audio.play()`, помечая трек проблемным при `NotSupportedError`
	 * (чтобы переключиться на симулятор и не спамить необработанными режектами).
	 */
	const safePlay = useCallback((targetTrackId) => {
		const audio = audioRef.current;
		if (!audio) return;
		audio.play().catch((err) => {
			if (err?.name === "NotSupportedError") {
				setFailedTrackId(targetTrackId ?? trackIdRef.current);
			}
		});
	}, []);

	// 1. Инициализация единого экземпляра <audio> на весь жизненный цикл провайдера
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
			if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
			const detectedMs = Math.floor(audio.duration * 1000);
			const activeId = trackIdRef.current;
			if (!activeId) return;
			setDetectedDuration({ trackId: activeId, ms: detectedMs });
			onDurationRef.current?.(activeId, detectedMs);
		};

		const handleEnded = () => {
			if (repeatOneRef.current) {
				audio.currentTime = 0;
				setPlaybackTime({ trackId: trackIdRef.current, ms: 0 });
				safePlay(trackIdRef.current);
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
	}, [safePlay]);

	// 2. Нативный loop для бесшовного повтора текущего трека
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;
		audio.loop = Boolean(repeatOne);
	}, [repeatOne]);

	// 3. Синхронизация громкости и режима mute
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;
		audio.volume = clampUnit(volume);
		audio.muted = Boolean(isMuted);
	}, [volume, isMuted]);

	// 4. Смена источника при переключении трека
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		if (currentTrack?.audio_url) {
			audio.src = currentTrack.audio_url;
			audio.currentTime = 0;
			audio.loop = Boolean(repeatOneRef.current);
			if (isPlayingRef.current) {
				safePlay(currentTrack.id);
			}
		} else {
			audio.pause();
			audio.removeAttribute("src");
		}
	}, [currentTrack?.id, currentTrack?.audio_url, safePlay]);

	// 5. Управление Play / Pause для реального HTMLAudioElement
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio || !useRealAudio) return;

		if (isPlaying) {
			if (audio.ended) {
				audio.currentTime = 0;
				setPlaybackTime({ trackId: trackIdRef.current, ms: 0 });
			}
			safePlay(trackIdRef.current);
		} else {
			audio.pause();
		}
	}, [isPlaying, useRealAudio, safePlay]);

	// 6. Симуляция прогресса (активируется только для мок-треков без рабочего audio_url)
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
					// Выносим вызов onEnded из updater-функции setState
					setTimeout(() => onEndedRef.current?.(), 0);
					return { trackId: activeId, ms: total };
				}
				return { trackId: activeId, ms: next };
			});
		}, 500);

		return () => clearInterval(timerId);
	}, [useRealAudio, isPlaying, currentTrack]);

	/** Перемотка на указанную позицию в миллисекундах */
	const seekToMs = useCallback((targetMs) => {
		const safeTotal = durationMsRef.current || 0;
		const clamped = Math.max(0, Math.min(safeTotal, Math.floor(targetMs)));
		setPlaybackTime({ trackId: trackIdRef.current, ms: clamped });

		const audio = audioRef.current;
		if (audio && useRealAudioRef.current && Number.isFinite(audio.duration)) {
			audio.currentTime = clamped / 1000;
		}
	}, []);

	/** Перезапуск текущего трека с 00:00 */
	const restart = useCallback(
		(autoPlay = true) => {
			setPlaybackTime({ trackId: trackIdRef.current, ms: 0 });
			const audio = audioRef.current;
			if (audio && useRealAudioRef.current) {
				audio.currentTime = 0;
				if (autoPlay) {
					safePlay(trackIdRef.current);
				}
			}
		},
		[safePlay],
	);

	return {
		currentTimeMs,
		durationMs,
		seekToMs,
		restart,
	};
}
