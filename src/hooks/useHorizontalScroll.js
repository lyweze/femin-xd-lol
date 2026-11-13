import { useState, useCallback, useEffect } from "react";

// ============================================================================
// Константы скролла, краевых затуханий и физики пружинного отскока (Rubber-Band)
// ============================================================================
const DRAG_THRESHOLD_PX = 5; // Минимальный сдвиг мыши, после которого клик считается перетаскиванием
const DRAG_SPEED_MULTIPLIER = 1.4; // Коэффициент скорости прокрутки при удержании ЛКМ
const SCROLL_IDLE_DELAY_MS = 700; // Задержка перед снятием `.is-scrolling` (скрытие скроллбара)
const WHEEL_RELEASE_DELAY_MS = 110; // Пауза после последнего тика колесика перед возвратом пружины
const SCROLL_EDGE_TOLERANCE_PX = 2; // Допуск в пикселях для определения краёв (учёт дробного зума)

const FADE_LEFT_WIDTH = "44px"; // Ширина мягкого затухания слева при наличии скрытого контента
const FADE_RIGHT_WIDTH = "56px"; // Ширина мягкого затухания справа при наличии скрытого контента

const MAX_RUBBER_STRETCH_PX = 72; // Максимальный предел оттягивания ленты на краях (как в macOS)
const RUBBER_RESISTANCE = 0.007; // Коэффициент прогрессивного сопротивления при натяжении

/**
 * Нелинейное «маковское» сопротивление (Rubber-Band):
 * чем дальше тянешь ленту за край, тем сильнее она упирается, асимптотически приближаясь к maxStretch.
 */
const applyRubberBand = (overscroll, maxStretch = MAX_RUBBER_STRETCH_PX) => {
	if (overscroll === 0) return 0;
	const sign = Math.sign(overscroll);
	const abs = Math.abs(overscroll);
	return sign * maxStretch * (1 - 1 / (abs * RUBBER_RESISTANCE + 1));
};

/**
 * Хук для горизонтальной прокрутки с физикой инерционного отскока macOS.
 *
 * Управляемые CSS-переменные на контейнере:
 * - `--fade-left` / `--fade-right` — ширина боковых градиентов затухания (`mask-image`)
 * - `--bounce-x` — текущее смещение отскока на краях (применяется к карточкам через `translate3d`)
 *
 * Управляемые классы состояния:
 * - `.is-scrolling` — активная прокрутка (проявление скроллбара)
 * - `.is-dragging` — активное перетаскивание зажатой кнопкой мыши
 * - `.is-springing` — фаза плавного возврата ленты из растянутого состояния (transition в CSS)
 */
export function useHorizontalScroll() {
	const [slider, setSlider] = useState(null);

	// Callback-ref гарантирует запуск эффекта, даже если список отрендерится после загрузки данных
	const containerRef = useCallback((node) => {
		setSlider(node);
	}, []);

	useEffect(() => {
		if (!slider) return;

		// Состояние перетаскивания и пружины (храним в замыкании без лишних ререндеров)
		let isDown = false;
		let startX = 0;
		let startScrollLeft = 0;
		let moved = false;

		let bounceOffset = 0;
		let wheelOverscroll = 0;
		let scrollTimeout = null;
		let wheelReleaseTimeout = null;
		let rafId = null;

		// Кэш состояний краёв: записываем CSS-переменные только при реальном пересечении границы
		let prevHasLeft = null;
		let prevHasRight = null;

		// ====================================================================
		// 1. Управление пружинным отскоком (--bounce-x и класс .is-springing)
		// ====================================================================
		const setBounce = (px, animate = false) => {
			bounceOffset = px;
			slider.classList.toggle("is-springing", animate);
			slider.style.setProperty("--bounce-x", `${px.toFixed(1)}px`);
		};

		// Запускает плавный возврат ленты в исходное положение (0px)
		const springBack = () => {
			wheelOverscroll = 0;
			if (bounceOffset !== 0) {
				setBounce(0, true);
			}
		};

		// ====================================================================
		// 2. Расчёт краевых затуханий (--fade-left / --fade-right) через rAF
		// ====================================================================
		const updateFades = () => {
			rafId = null;
			const maxScroll = Math.max(0, slider.scrollWidth - slider.clientWidth);
			const isOverflowing = maxScroll > SCROLL_EDGE_TOLERANCE_PX;

			const hasLeft =
				isOverflowing && slider.scrollLeft > SCROLL_EDGE_TOLERANCE_PX;
			const hasRight =
				isOverflowing &&
				maxScroll - slider.scrollLeft > SCROLL_EDGE_TOLERANCE_PX;

			if (hasLeft !== prevHasLeft) {
				prevHasLeft = hasLeft;
				slider.style.setProperty(
					"--fade-left",
					hasLeft ? FADE_LEFT_WIDTH : "0px",
				);
			}

			if (hasRight !== prevHasRight) {
				prevHasRight = hasRight;
				slider.style.setProperty(
					"--fade-right",
					hasRight ? FADE_RIGHT_WIDTH : "0px",
				);
			}
		};

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

			if (!slider.classList.contains("is-scrolling")) {
				slider.classList.add("is-scrolling");
			}

			clearTimeout(scrollTimeout);
			scrollTimeout = setTimeout(() => {
				slider.classList.remove("is-scrolling");
			}, SCROLL_IDLE_DELAY_MS);
		};

		// ====================================================================
		// 4. Колесико мыши и трекпад + упругий отскок при достижении краёв
		// ====================================================================
		const onWheel = (e) => {
			const isVerticalWheel = Math.abs(e.deltaY) > Math.abs(e.deltaX);
			const delta = isVerticalWheel ? e.deltaY : e.deltaX;
			if (delta === 0) return;

			if (isVerticalWheel) {
				e.preventDefault();
			}

			const maxScroll = Math.max(0, slider.scrollWidth - slider.clientWidth);
			const nextScroll = slider.scrollLeft + delta;

			// Упёрлись в левый край — накапливаем натяжение вправо (+bounceOffset)
			if (nextScroll < 0) {
				e.preventDefault();
				slider.scrollLeft = 0;
				wheelOverscroll += -nextScroll;
				setBounce(applyRubberBand(wheelOverscroll), false);
				// Упёрлись в правый край — накапливаем натяжение влево (-bounceOffset)
			} else if (nextScroll > maxScroll) {
				e.preventDefault();
				slider.scrollLeft = maxScroll;
				wheelOverscroll -= nextScroll - maxScroll;
				setBounce(applyRubberBand(wheelOverscroll), false);
				// Движение внутри рабочих границ списка
			} else {
				if (wheelOverscroll !== 0) springBack();
				if (isVerticalWheel) {
					slider.scrollLeft = nextScroll;
				}
			}

			// Когда импульс колесика затихает — отпускаем пружину обратно
			clearTimeout(wheelReleaseTimeout);
			wheelReleaseTimeout = setTimeout(springBack, WHEEL_RELEASE_DELAY_MS);
		};

		// ====================================================================
		// 5. Перетаскивание мышью (Drag-to-Scroll + натяжение на границах)
		// ====================================================================
		const onMouseDown = (e) => {
			if (e.button !== 0) return; // Реагируем только на левую кнопку мыши
			isDown = true;
			moved = false;
			startX = e.clientX;
			startScrollLeft = slider.scrollLeft;
			setBounce(0, false); // Останавливаем текущую анимацию отскока при перехвате
		};

		const onMouseMove = (e) => {
			if (!isDown) return;

			const delta = e.clientX - startX;

			// Включаем режим перетаскивания только после порога в 5px
			if (!moved && Math.abs(delta) > DRAG_THRESHOLD_PX) {
				moved = true;
				slider.classList.add("is-dragging");
			}

			if (moved) {
				e.preventDefault();
				const maxScroll = Math.max(0, slider.scrollWidth - slider.clientWidth);
				const targetScroll = startScrollLeft - delta * DRAG_SPEED_MULTIPLIER;

				if (targetScroll < 0) {
					slider.scrollLeft = 0;
					setBounce(applyRubberBand(-targetScroll), false);
				} else if (targetScroll > maxScroll) {
					slider.scrollLeft = maxScroll;
					setBounce(applyRubberBand(-(targetScroll - maxScroll)), false);
				} else {
					slider.scrollLeft = targetScroll;
					if (bounceOffset !== 0) setBounce(0, false);
				}
			}
		};

		const onMouseUp = () => {
			if (!isDown) return;
			isDown = false;
			slider.classList.remove("is-dragging");
			springBack();

			// Страховка: если кнопку отпустили за пределами списка, click не сработает.
			// Сбрасываем moved в следующем тике, чтобы следующий обычный клик не заблокировался.
			if (moved) {
				setTimeout(() => {
					moved = false;
				}, 0);
			}
		};

		// ====================================================================
		// 6. Блокировка случайного клика по карточке сразу после перетаскивания
		// ====================================================================
		const onClickCapture = (e) => {
			if (moved) {
				e.stopPropagation();
				e.preventDefault();
				moved = false;
			}
		};

		// ====================================================================
		// 7. Инициализация наблюдателей и подписка на события
		// ====================================================================
		updateFades();

		const resizeObserver = new ResizeObserver(scheduleFadeUpdate);
		resizeObserver.observe(slider);

		const mutationObserver = new MutationObserver(scheduleFadeUpdate);
		mutationObserver.observe(slider, { childList: true });

		slider.addEventListener("scroll", onScroll, { passive: true });
		slider.addEventListener("wheel", onWheel, { passive: false });
		slider.addEventListener("mousedown", onMouseDown);
		slider.addEventListener("click", onClickCapture, true);
		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);
		window.addEventListener("blur", onMouseUp);

		return () => {
			clearTimeout(scrollTimeout);
			clearTimeout(wheelReleaseTimeout);
			if (rafId !== null) cancelAnimationFrame(rafId);
			resizeObserver.disconnect();
			mutationObserver.disconnect();
			slider.removeEventListener("scroll", onScroll);
			slider.removeEventListener("wheel", onWheel);
			slider.removeEventListener("mousedown", onMouseDown);
			slider.removeEventListener("click", onClickCapture, true);
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
			window.removeEventListener("blur", onMouseUp);
		};
	}, [slider]);

	return containerRef;
}
