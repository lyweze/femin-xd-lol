// ============================================================================
// Общий движок отслеживания скролла, краевых затуханий (fades) и .is-scrolling
// ============================================================================

const SCROLL_IDLE_DELAY_MS = 700;
const SCROLL_EDGE_TOLERANCE_PX = 2;

/**
 * Подключает к DOM-элементу динамические CSS-переменные краевого затухания
 * и класс `.is-scrolling` (чтобы показывать скроллбар только при активной прокрутке).
 *
 * Геометрия обновляется в `requestAnimationFrame` с кэшированием edge-флагов,
 * поэтому `style.setProperty` вызывается только при реальном пересечении границ.
 *
 * @param {HTMLElement} element - Скролл-контейнер
 * @param {Object} options
 * @param {"x" | "y"} [options.axis="y"] - Ось прокрутки
 * @param {string} options.fadeStartProp - CSS-переменная начального фейда (`--fade-left` / `--fade-top`)
 * @param {string} options.fadeEndProp - CSS-переменная конечного фейда (`--fade-right` / `--fade-bottom`)
 * @param {string} options.fadeStartSize - Значение CSS-длины активного начального фейда
 * @param {string} options.fadeEndSize - Значение CSS-длины активного конечного фейда
 * @param {boolean} [options.observeSubtree=false] - Отслеживать ли глубокие мутации DOM внутри списка
 */
export function attachScrollBehavior(
	element,
	{
		axis = "y",
		fadeStartProp,
		fadeEndProp,
		fadeStartSize,
		fadeEndSize,
		observeSubtree = false,
	},
) {
	let scrollTimeout = null;
	let rafId = null;
	let prevHasStart = null;
	let prevHasEnd = null;

	const updateFades = () => {
		rafId = null;
		const scrollSize = axis === "x" ? element.scrollWidth : element.scrollHeight;
		const clientSize = axis === "x" ? element.clientWidth : element.clientHeight;
		const scrollPos = axis === "x" ? element.scrollLeft : element.scrollTop;

		const maxScroll = Math.max(0, scrollSize - clientSize);
		const isOverflowing = maxScroll > SCROLL_EDGE_TOLERANCE_PX;

		const hasStart = isOverflowing && scrollPos > SCROLL_EDGE_TOLERANCE_PX;
		const hasEnd = isOverflowing && maxScroll - scrollPos > SCROLL_EDGE_TOLERANCE_PX;

		if (hasStart !== prevHasStart) {
			prevHasStart = hasStart;
			element.style.setProperty(fadeStartProp, hasStart ? fadeStartSize : "0px");
		}

		if (hasEnd !== prevHasEnd) {
			prevHasEnd = hasEnd;
			element.style.setProperty(fadeEndProp, hasEnd ? fadeEndSize : "0px");
		}
	};

	const scheduleFadeUpdate = () => {
		if (rafId === null) {
			rafId = requestAnimationFrame(updateFades);
		}
	};

	const onScroll = () => {
		scheduleFadeUpdate();

		if (!element.classList.contains("is-scrolling")) {
			element.classList.add("is-scrolling");
		}

		clearTimeout(scrollTimeout);
		scrollTimeout = setTimeout(() => {
			element.classList.remove("is-scrolling");
		}, SCROLL_IDLE_DELAY_MS);
	};

	updateFades();

	const resizeObserver = new ResizeObserver(scheduleFadeUpdate);
	resizeObserver.observe(element);

	const mutationObserver = new MutationObserver(scheduleFadeUpdate);
	mutationObserver.observe(element, { childList: true, subtree: observeSubtree });

	element.addEventListener("scroll", onScroll, { passive: true });

	return {
		cleanup() {
			clearTimeout(scrollTimeout);
			if (rafId !== null) cancelAnimationFrame(rafId);
			resizeObserver.disconnect();
			mutationObserver.disconnect();
			element.removeEventListener("scroll", onScroll);
		},
	};
}
