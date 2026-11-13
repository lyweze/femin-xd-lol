import { useState, useCallback, useEffect } from "react";

// ============================================================================
// Константы настройки вертикального скролла и краевых затуханий (fades)
// ============================================================================
const SCROLL_IDLE_DELAY_MS = 700; // Задержка перед снятием `.is-scrolling` (скрытие скроллбара)
const SCROLL_EDGE_TOLERANCE_PX = 2; // Допуск в пикселях для определения краёв (учёт дробного зума)

const FADE_TOP_HEIGHT = "28px"; // Высота мягкого затухания сверху при прокрутке вниз
const FADE_BOTTOM_HEIGHT = "64px"; // Высота затухания снизу (с запасом под плавающий плеер)

/**
 * Хук для вертикально прокручиваемых областей (`.Library`, `.sidebar`).
 *
 * Что делает автоматически:
 * 1. Управляет классом `.is-scrolling` для плавного показа и автоскрытия скроллбара.
 * 2. Вычисляет и обновляет CSS-переменные `--fade-top` и `--fade-bottom` через `requestAnimationFrame`
 *    для динамического затухания верхнего и нижнего краёв списка.
 * 3. Реагирует на ресайз окна и динамическое изменение количества элементов внутри.
 */
export function useVerticalScroll() {
	const [container, setContainer] = useState(null);

	// Callback-ref гарантирует запуск эффекта, даже если список отрендерится после загрузки данных
	const containerRef = useCallback((node) => {
		setContainer(node);
	}, []);

	useEffect(() => {
		if (!container) return;

		let scrollTimeout = null;
		let rafId = null;

		// Кэш состояний краёв: записываем CSS-переменные только в момент реального перехода
		let prevHasTop = null;
		let prevHasBottom = null;

		// ====================================================================
		// 1. Расчёт краевых затуханий (--fade-top / --fade-bottom) через rAF
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
		// 2. Отслеживание прокрутки (обновление масок + класс .is-scrolling)
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
		// 3. Инициализация наблюдателей и подписка на события
		// ====================================================================
		updateFades();

		const resizeObserver = new ResizeObserver(scheduleFadeUpdate);
		resizeObserver.observe(container);

		const mutationObserver = new MutationObserver(scheduleFadeUpdate);
		mutationObserver.observe(container, { childList: true, subtree: true });

		container.addEventListener("scroll", onScroll, { passive: true });

		// Полная очистка при размонтировании или смене DOM-узла
		return () => {
			clearTimeout(scrollTimeout);
			if (rafId !== null) cancelAnimationFrame(rafId);
			resizeObserver.disconnect();
			mutationObserver.disconnect();
			container.removeEventListener("scroll", onScroll);
		};
	}, [container]);

	return containerRef;
}
