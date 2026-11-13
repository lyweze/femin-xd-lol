import { useState, useCallback, useEffect } from "react";

// ============================================================================
// Константы скролла, краевых затуханий и физики пружинного отскока (Rubber-Band)
// ============================================================================
const SCROLL_IDLE_DELAY_MS = 700; // Задержка перед снятием `.is-scrolling` (скрытие скроллбара)
const WHEEL_RELEASE_DELAY_MS = 150; // Пауза после последнего тика колесика перед возвратом пружины
const SCROLL_EDGE_TOLERANCE_PX = 2; // Допуск в пикселях для определения краёв (учёт дробного зума)

const FADE_TOP_HEIGHT = "28px"; // Высота мягкого затухания сверху при прокрутке вниз
const FADE_BOTTOM_HEIGHT = "64px"; // Высота затухания снизу (с запасом под плавающий плеер)

const MAX_RUBBER_STRETCH_PX = 52; // Максимальный предел оттягивания списка на краях
const RUBBER_RESISTANCE = 0.0045; // Мягкий коэффициент сопротивления (без резких рывков на старте)

/**
 * Нелинейное «маковское» сопротивление (Rubber-Band):
 * чем дальше тянешь список за верхний или нижний край, тем сильнее он упирается,
 * асимптотически приближаясь к maxStretch.
 */
const applyRubberBand = (overscroll, maxStretch = MAX_RUBBER_STRETCH_PX) => {
	if (overscroll === 0) return 0;
	const sign = Math.sign(overscroll);
	const abs = Math.abs(overscroll);
	return sign * maxStretch * (1 - 1 / (abs * RUBBER_RESISTANCE + 1));
};

/**
 * Хук для вертикальной прокрутки с краевым затуханием и физикой отскока macOS.
 *
 * Управляемые CSS-переменные на контейнере:
 * - `--fade-top` / `--fade-bottom` — высота верхнего и нижнего градиентов затухания (`mask-image`)
 * - `--bounce-y` — текущее вертикальное смещение отскока на краях (применяется к строкам через `translate3d`)
 *
 * Управляемые классы состояния:
 * - `.is-scrolling` — активная прокрутка (проявление скроллбара)
 * - `.is-springing` — фаза плавного возврата списка из растянутого состояния (transition в CSS)
 */
export function useVerticalScroll() {
	const [container, setContainer] = useState(null);

	// Callback-ref гарантирует запуск эффекта, даже если список отрендерится после загрузки данных
	const containerRef = useCallback((node) => {
		setContainer(node);
	}, []);

	useEffect(() => {
		if (!container) return;

		// Локальное состояние пружины и таймеров (храним в замыкании без лишних ререндеров)
		let bounceOffset = 0;
		let wheelOverscroll = 0;
		let scrollTimeout = null;
		let wheelReleaseTimeout = null;
		let rafId = null;

		// Кэш состояний краёв: обновляем CSS-переменные только при реальном пересечении границы
		let prevHasTop = null;
		let prevHasBottom = null;

		// ====================================================================
		// 1. Управление пружинным отскоком (--bounce-y и класс .is-springing)
		// ====================================================================
		const setBounce = (px, animate = false) => {
			bounceOffset = px;
			container.classList.toggle("is-springing", animate);
			container.style.setProperty("--bounce-y", `${px.toFixed(1)}px`);
		};

		// Запускает плавный возврат списка в исходное положение (0px)
		const springBack = () => {
			wheelOverscroll = 0;
			if (bounceOffset !== 0) {
				setBounce(0, true);
			}
		};

		// ====================================================================
		// 2. Расчёт краевых затуханий (--fade-top / --fade-bottom) через rAF
		// ====================================================================
		const updateFades = () => {
			rafId = null;
			const maxScroll = Math.max(
				0,
				container.scrollHeight - container.clientHeight,
			);
			const isOverflowing = maxScroll > SCROLL_EDGE_TOLERANCE_PX;

			const hasTop =
				isOverflowing && container.scrollTop > SCROLL_EDGE_TOLERANCE_PX;
			const hasBottom =
				isOverflowing &&
				maxScroll - container.scrollTop > SCROLL_EDGE_TOLERANCE_PX;

			if (hasTop !== prevHasTop) {
				prevHasTop = hasTop;
				container.style.setProperty(
					"--fade-top",
					hasTop ? FADE_TOP_HEIGHT : "0px",
				);
			}

			if (hasBottom !== prevHasBottom) {
				prevHasBottom = hasBottom;
				container.style.setProperty(
					"--fade-bottom",
					hasBottom ? FADE_BOTTOM_HEIGHT : "0px",
				);
			}
		};

		// Группируем вызовы в один кадр отрисовки браузера (60–240 Гц)
		const scheduleFadeUpdate = () => {
			if (rafId === null) {
				rafId = requestAnimationFrame(updateFades);
			}
		};

		// ====================================================================
		// 3. Отслеживание скролла (обновление масок + показ скроллбара)
		// ====================================================================
		const onScroll = () => {
			scheduleFadeUpdate();

			if (!container.classList.contains("is-scrolling")) {
				container.classList.add("is-scrolling");
			}

			clearTimeout(scrollTimeout);
			scrollTimeout = setTimeout(() => {
				container.classList.remove("is-scrolling");
			}, SCROLL_IDLE_DELAY_MS);
		};

		// ====================================================================
		// 4. Колесико мыши и трекпад + упругий отскок при достижении краёв
		// ====================================================================
		const onWheel = (e) => {
			if (e.deltaY === 0) return;

			const maxScroll = Math.max(
				0,
				container.scrollHeight - container.clientHeight,
			);
			const nextScroll = container.scrollTop + e.deltaY;

			// Упёрлись в верхний край — накапливаем натяжение вниз (+bounceOffset)
			if (nextScroll < 0) {
				e.preventDefault();
				container.scrollTop = 0;
				wheelOverscroll += -nextScroll;
				setBounce(applyRubberBand(wheelOverscroll), false);
				// Упёрлись в нижний край — накапливаем натяжение вверх (-bounceOffset)
			} else if (nextScroll > maxScroll) {
				e.preventDefault();
				container.scrollTop = maxScroll;
				wheelOverscroll -= nextScroll - maxScroll;
				setBounce(applyRubberBand(wheelOverscroll), false);
				// Движение внутри рабочих границ списка
			} else if (wheelOverscroll !== 0) {
				springBack();
			}

			// Когда импульс колесика затихает — отпускаем пружину обратно
			clearTimeout(wheelReleaseTimeout);
			wheelReleaseTimeout = setTimeout(springBack, WHEEL_RELEASE_DELAY_MS);
		};

		// ====================================================================
		// 5. Инициализация наблюдателей и подписка на события
		// ====================================================================
		updateFades();

		const resizeObserver = new ResizeObserver(scheduleFadeUpdate);
		resizeObserver.observe(container);

		const mutationObserver = new MutationObserver(scheduleFadeUpdate);
		mutationObserver.observe(container, { childList: true, subtree: true });

		container.addEventListener("scroll", onScroll, { passive: true });
		container.addEventListener("wheel", onWheel, { passive: false });

		// Полная очистка таймеров, наблюдателей и слушателей при размонтировании
		return () => {
			clearTimeout(scrollTimeout);
			clearTimeout(wheelReleaseTimeout);
			if (rafId !== null) cancelAnimationFrame(rafId);
			resizeObserver.disconnect();
			mutationObserver.disconnect();
			container.removeEventListener("scroll", onScroll);
			container.removeEventListener("wheel", onWheel);
		};
	}, [container]);

	return containerRef;
}
