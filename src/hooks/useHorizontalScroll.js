import { useState, useCallback, useEffect } from "react";
import { attachScrollBehavior } from "./scrollUtils.js";

const DRAG_THRESHOLD_PX = 5;
const DRAG_SPEED_MULTIPLIER = 1.4;
const FADE_LEFT_WIDTH = "44px";
const FADE_RIGHT_WIDTH = "56px";

/**
 * Хук горизонтальной прокрутки:
 * 1. Вертикальное колесико мыши переводит в горизонтальный скролл (не ломая трекпад).
 * 2. Drag-to-Scroll с временной подпиской на window (только на время перетаскивания).
 * 3. Показ/скрытие скроллбара (.is-scrolling) и мягкие краевые затухания.
 */
export function useHorizontalScroll() {
	const [slider, setSlider] = useState(null);

	const containerRef = useCallback((node) => {
		setSlider(node);
	}, []);

	useEffect(() => {
		if (!slider) return;

		const scrollTracker = attachScrollBehavior(slider, {
			axis: "x",
			fadeStartProp: "--fade-left",
			fadeEndProp: "--fade-right",
			fadeStartSize: FADE_LEFT_WIDTH,
			fadeEndSize: FADE_RIGHT_WIDTH,
			observeSubtree: false,
		});

		let isDown = false;
		let startX = 0;
		let startScrollLeft = 0;
		let moved = false;

		const onWheel = (e) => {
			if (e.deltaY === 0) return;
			if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
				e.preventDefault();
				slider.scrollLeft += e.deltaY;
			}
		};

		const onMouseMove = (e) => {
			if (!isDown) return;
			const delta = e.clientX - startX;

			if (!moved && Math.abs(delta) > DRAG_THRESHOLD_PX) {
				moved = true;
				slider.classList.add("is-dragging");
			}

			if (moved) {
				e.preventDefault();
				slider.scrollLeft = startScrollLeft - delta * DRAG_SPEED_MULTIPLIER;
			}
		};

		const detachWindowDrag = () => {
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
			window.removeEventListener("blur", onMouseUp);
		};

		function onMouseUp() {
			if (!isDown) return;
			isDown = false;
			slider.classList.remove("is-dragging");
			detachWindowDrag();

			if (moved) {
				setTimeout(() => {
					moved = false;
				}, 0);
			}
		}

		const onMouseDown = (e) => {
			if (e.button !== 0) return;
			isDown = true;
			moved = false;
			startX = e.clientX;
			startScrollLeft = slider.scrollLeft;

			window.addEventListener("mousemove", onMouseMove);
			window.addEventListener("mouseup", onMouseUp);
			window.addEventListener("blur", onMouseUp);
		};

		const onClickCapture = (e) => {
			if (moved) {
				e.stopPropagation();
				e.preventDefault();
				moved = false;
			}
		};

		slider.addEventListener("wheel", onWheel, { passive: false });
		slider.addEventListener("mousedown", onMouseDown);
		slider.addEventListener("click", onClickCapture, true);

		return () => {
			scrollTracker.cleanup();
			detachWindowDrag();
			slider.removeEventListener("wheel", onWheel);
			slider.removeEventListener("mousedown", onMouseDown);
			slider.removeEventListener("click", onClickCapture, true);
		};
	}, [slider]);

	return containerRef;
}
