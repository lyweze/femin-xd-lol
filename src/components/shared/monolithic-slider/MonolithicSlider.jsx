// ============================================================================
// Монолитный слайдер в стиле macOS (без явного бегунка, GPU transform: scaleX)
// Используется для прогресса трека и громкости
// ============================================================================
import { useCallback, useEffect, useRef, useState } from "react";
import "./MonolithicSlider.css";

function clampRatio(value) {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(1, value));
}

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
			onChangeRatio?.(clampRatio((clientX - rect.left) / rect.width));
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
		const safeRatio = clampRatio(ratio);
		if (e.key === "ArrowRight" || e.key === "ArrowUp") {
			e.preventDefault();
			onChangeRatio?.(clampRatio(safeRatio + stepRatio));
		} else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
			e.preventDefault();
			onChangeRatio?.(clampRatio(safeRatio - stepRatio));
		} else if (e.key === "Home") {
			e.preventDefault();
			onChangeRatio?.(0);
		} else if (e.key === "End") {
			e.preventDefault();
			onChangeRatio?.(1);
		}
	};

	const safeRatio = clampRatio(ratio);

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
