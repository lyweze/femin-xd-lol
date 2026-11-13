import { useState, useCallback, useEffect } from "react";

// ============================================================================
// Константы настройки скролла, перетаскивания и краевых градиентов (fades)
// ============================================================================
const DRAG_THRESHOLD_PX = 5; // Минимальный сдвиг мыши, после которого клик считается перетаскиванием
const DRAG_SPEED_MULTIPLIER = 1.4; // Коэффициент скорости прокрутки при зажатии ЛКМ
const SCROLL_IDLE_DELAY_MS = 700; // Задержка перед снятием класса `.is-scrolling` (скрытие скроллбара)
const SCROLL_EDGE_TOLERANCE_PX = 2; // Допуск в пикселях для определения краёв ленты (учёт дробного зума)
const FADE_LEFT_WIDTH = "44px"; // Ширина мягкого затухания слева при наличии скрытого контента
const FADE_RIGHT_WIDTH = "56px"; // Ширина мягкого затухания справа при наличии скрытого контента

/**
 * Хук для горизонтальной прокрутки контейнера колесиком мыши и перетаскиванием (Drag-to-Scroll).
 *
 * Что делает автоматически:
 * 1. Переводит вертикальное колесико мыши в горизонтальный скролл (не ломая свайпы трекпада).
 * 2. Позволяет перетаскивать ленту зажатой левой кнопкой мыши и блокирует случайный клик после скролла.
 * 3. Управляет классами `.is-scrolling` и `.is-dragging` для плавного показа/скрытия скроллбара.
 * 4. Обновляет CSS-переменные `--fade-left` и `--fade-right` через `requestAnimationFrame`
 *    для динамического затухания краёв списка при ресайзе или подгрузке карточек.
 */
export function useHorizontalScroll() {
	const [slider, setSlider] = useState(null);

	// Callback-ref вместо обычного useRef: эффект гарантированно запустится,
	// даже если список отрендерится позже (например, после асинхронной загрузки плейлистов)
	const containerRef = useCallback((node) => {
		setSlider(node);
	}, []);

	useEffect(() => {
		if (!slider) return;

		// Локальное состояние перетаскивания (в замыкании, чтобы не вызывать лишние ререндеры)
		let isDown = false;
		let startX = 0;
		let scrollLeft = 0;
		let moved = false;
		let scrollTimeout = null;
		let rafId = null;

		// Кэш состояний краёв: записываем CSS-переменные только в момент реального перехода
		let prevHasLeft = null;
		let prevHasRight = null;

		// ====================================================================
		// 1. Расчёт краевых затуханий (--fade-left / --fade-right) через rAF
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

		// Группируем вызовы в один кадр отрисовки браузера (60–240 Гц)
		const scheduleFadeUpdate = () => {
			if (rafId === null) {
				rafId = requestAnimationFrame(updateFades);
			}
		};

		// ====================================================================
		// 2. Отслеживание прокрутки (обновление масок + класс .is-scrolling)
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
		// 3. Перевод вертикального колесика мыши в горизонтальный скролл
		// ====================================================================
		const onWheel = (e) => {
			if (e.deltaY === 0) return;

			// Пропускаем горизонтальные жесты трекпада (где deltaX доминирует над deltaY)
			if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
				e.preventDefault();
				slider.scrollLeft += e.deltaY;
			}
		};

		// ====================================================================
		// 4. Механика перетаскивания мышью (Drag-to-Scroll)
		// ====================================================================
		const onMouseDown = (e) => {
			if (e.button !== 0) return; // Игнорируем правую и среднюю кнопки мыши
			isDown = true;
			moved = false;
			startX = e.clientX;
			scrollLeft = slider.scrollLeft;
		};

		const onMouseMove = (e) => {
			if (!isDown) return;

			const delta = e.clientX - startX;

			// Активируем режим перетаскивания только после преодоления порога в 5px
			if (!moved && Math.abs(delta) > DRAG_THRESHOLD_PX) {
				moved = true;
				slider.classList.add("is-dragging");
			}

			if (moved) {
				e.preventDefault();
				slider.scrollLeft = scrollLeft - delta * DRAG_SPEED_MULTIPLIER;
			}
		};

		const onMouseUp = () => {
			if (!isDown) return;
			isDown = false;
			slider.classList.remove("is-dragging");

			// Страховка: если кнопку отпустили за пределами ленты, событие click не сработает.
			// Сбрасываем moved в следующем тике (после фазы click), чтобы не заблокировать следующий клик.
			if (moved) {
				setTimeout(() => {
					moved = false;
				}, 0);
			}
		};

		// ====================================================================
		// 5. Блокировка ложного клика по карточке сразу после перетаскивания
		// ====================================================================
		const onClickCapture = (e) => {
			if (moved) {
				e.stopPropagation();
				e.preventDefault();
				moved = false;
			}
		};

		// Первичный расчёт градиентов при монтировании
		updateFades();

		// Наблюдатели за изменением ширины контейнера и количества карточек внутри
		const resizeObserver = new ResizeObserver(scheduleFadeUpdate);
		resizeObserver.observe(slider);

		const mutationObserver = new MutationObserver(scheduleFadeUpdate);
		mutationObserver.observe(slider, { childList: true });

		// Подписка на события
		slider.addEventListener("scroll", onScroll, { passive: true });
		slider.addEventListener("wheel", onWheel, { passive: false });
		slider.addEventListener("mousedown", onMouseDown);
		slider.addEventListener("click", onClickCapture, true);
		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);
		window.addEventListener("blur", onMouseUp); // Сброс, если пользователь переключился в другое окно во время драга

		// Полная очистка при размонтировании или смене DOM-узла
		return () => {
			clearTimeout(scrollTimeout);
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
