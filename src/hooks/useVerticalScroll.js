import { useState, useCallback, useEffect } from "react";
import { attachScrollBehavior } from "./scrollUtils.js";

const FADE_TOP_HEIGHT = "28px";
const FADE_BOTTOM_HEIGHT = "64px";

/**
 * Хук для вертикально прокручиваемых областей (`.Library`, `.page-scroll`).
 */
export function useVerticalScroll({ observeSubtree = true } = {}) {
	const [container, setContainer] = useState(null);

	const containerRef = useCallback((node) => {
		setContainer(node);
	}, []);

	useEffect(() => {
		if (!container) return;

		const scrollTracker = attachScrollBehavior(container, {
			axis: "y",
			fadeStartProp: "--fade-top",
			fadeEndProp: "--fade-bottom",
			fadeStartSize: FADE_TOP_HEIGHT,
			fadeEndSize: FADE_BOTTOM_HEIGHT,
			observeSubtree,
		});

		return () => scrollTracker.cleanup();
	}, [container, observeSubtree]);

	return containerRef;
}
