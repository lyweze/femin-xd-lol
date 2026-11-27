import { useCallback, useRef, useState } from "react";

const DEFAULT_THRESHOLD_PX = 84;

/**
 * Хук жеста закрытия свайпом вниз (Swipe-to-Dismiss) для мобильных модалок и шторок.
 *
 * Возвращает текущее вертикальное смещение `dragOffsetY` и набор тач-обработчиков `touchHandlers`.
 * При превышении `thresholdPx` вызывает `onDismiss`.
 *
 * @param {Object} options
 * @param {boolean} [options.enabled=true] - Включает обработку касаний
 * @param {number} [options.thresholdPx=84] - Порог свайпа вниз для закрытия (в px)
 * @param {() => void} options.onDismiss - Коллбэк закрытия
 * @param {(target: EventTarget | null) => boolean} [options.shouldIgnoreTarget] - Фильтр зон, где свайп игнорируется (например, скролл или слайдер)
 */
export function useSwipeToDismiss({
	enabled = true,
	thresholdPx = DEFAULT_THRESHOLD_PX,
	onDismiss,
	shouldIgnoreTarget,
}) {
	const startYRef = useRef(null);
	const [dragOffsetY, setDragOffsetY] = useState(0);

	const onTouchStart = useCallback(
		(e) => {
			if (!enabled) return;
			if (shouldIgnoreTarget?.(e.target)) {
				startYRef.current = null;
				return;
			}
			startYRef.current = e.touches[0]?.clientY ?? null;
		},
		[enabled, shouldIgnoreTarget],
	);

	const onTouchMove = useCallback((e) => {
		if (startYRef.current === null) return;
		const deltaY = (e.touches[0]?.clientY ?? 0) - startYRef.current;
		if (deltaY > 0) {
			setDragOffsetY(deltaY);
		}
	}, []);

	const onTouchEnd = useCallback(() => {
		if (startYRef.current === null) return;
		startYRef.current = null;

		const shouldClose = dragOffsetY > thresholdPx;
		setDragOffsetY(0);
		if (shouldClose) {
			onDismiss?.();
		}
	}, [dragOffsetY, thresholdPx, onDismiss]);

	return {
		dragOffsetY,
		isSwiping: dragOffsetY > 0,
		touchHandlers: {
			onTouchStart,
			onTouchMove,
			onTouchEnd,
		},
	};
}
