// ============================================================================
// Монолитный слайдер в стиле macOS (без явного бегунка, GPU transform: scaleX)
// Используется для перемотки трека и регулировки громкости
// ============================================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { clampUnit } from "../../../utils/format.js";
import "./MonolithicSlider.css";

/**
 * Доступный слайдер с перетаскиванием указателем (Pointer Events) и управлением
 * с клавиатуры (`Arrow*`, `Home`, `End`).
 *
 * @param {Object} props
 * @param {number} [props.ratio=0] - Заполнение от `0` до `1`
 * @param {(ratio: number) => void} props.onChangeRatio - Коллбэк изменения значения
 * @param {string} props.ariaLabel - Подпись для скринридера
 * @param {number} [props.stepRatio=0.05] - Шаг изменения стрелками клавиатуры
 * @param {"compact" | "fullscreen"} [props.variant="compact"] - Вариант высоты трека
 * @param {"neutral" | "accent"} [props.tone="neutral"] - Цвет заполнения
 */
function MonolithicSlider({
	ratio = 0,
	onChangeRatio,
	ariaLabel,
	ariaValueMin = 0,
	ariaValueMax = 100,
	ariaValueNow = 0,
	ariaValueText,
	stepRatio = 0.05,
	variant = "compact",
	tone = "neutral",
	className = "",
}) {
	const sliderRef = useRef(null);
	const dragCleanupRef = useRef(null);
	const [isDragging, setIsDragging] = useState(false);

	// Снимаем глобальные слушатели, если компонент размонтирован прямо во время драга
	useEffect(() => {
		return () => {
			dragCleanupRef.current?.();
		};
	}, []);

	const updateFromClientX = useCallback(
		(clientX) => {
			const el = sliderRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			if (rect.width <= 0) return;
			onChangeRatio?.(clampUnit((clientX - rect.left) / rect.width));
		},
		[onChangeRatio],
	);

	const handlePointerDown = (e) => {
		if (e.button !== 0) return;
		e.preventDefault();
		dragCleanupRef.current?.();
		setIsDragging(true);
		updateFromClientX(e.clientX);

		const onMove = (moveEvent) => updateFromClientX(moveEvent.clientX);
		const onUp = () => {
			setIsDragging(false);
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
			window.removeEventListener("pointercancel", onUp);
			dragCleanupRef.current = null;
		};

		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
		window.addEventListener("pointercancel", onUp);
		dragCleanupRef.current = onUp;
	};

	const handleKeyDown = (e) => {
		const safeRatio = clampUnit(ratio);
		const nextMap = {
			ArrowRight: clampUnit(safeRatio + stepRatio),
			ArrowUp: clampUnit(safeRatio + stepRatio),
			ArrowLeft: clampUnit(safeRatio - stepRatio),
			ArrowDown: clampUnit(safeRatio - stepRatio),
			Home: 0,
			End: 1,
		};

		if (!(e.key in nextMap)) return;
		e.preventDefault();
		onChangeRatio?.(nextMap[e.key]);
	};

	const safeRatio = clampUnit(ratio);

	return (
		<div
			ref={sliderRef}
			className={[
				"mono-slider",
				variant === "fullscreen" ? "is-fullscreen" : "",
				tone === "accent" ? "is-accent" : "",
				isDragging ? "is-dragging" : "",
				className,
			]
				.filter(Boolean)
				.join(" ")}
			role="slider"
			tabIndex={0}
			aria-label={ariaLabel}
			aria-valuemin={ariaValueMin}
			aria-valuemax={ariaValueMax}
			aria-valuenow={ariaValueNow}
			aria-valuetext={ariaValueText}
			onPointerDown={handlePointerDown}
			onKeyDown={handleKeyDown}
		>
			<div className="mono-slider-track" style={{ "--slider-ratio": safeRatio }}>
				<div className="mono-slider-fill" />
			</div>
		</div>
	);
}

export default MonolithicSlider;
