import { useEffect } from "react";

// ============================================================================
// Расчёт матового акцента обложки через Canvas 16×16 + Matte Color Clamping
// Записывает `--accent-cover` (HEX) и `--accent-cover-rgb` (R, G, B) на `:root`
// ============================================================================
const DEFAULT_ACCENT = "#c56b4e";
const MATTE_GRAY_RGB = { r: 138, g: 134, b: 126 }; // #8A867E
const MATTE_MIX_RATIO = 0.22;
const SAMPLE_SIZE = 16;

function clampChannel(value) {
	return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgbTuple(hex) {
	const clean = String(hex || DEFAULT_ACCENT).replace("#", "");
	if (clean.length !== 6) return "197, 107, 78";
	const r = Number.parseInt(clean.slice(0, 2), 16);
	const g = Number.parseInt(clean.slice(2, 4), 16);
	const b = Number.parseInt(clean.slice(4, 6), 16);
	if ([r, g, b].some(Number.isNaN)) return "197, 107, 78";
	return `${r}, ${g}, ${b}`;
}

function rgbToHex(r, g, b) {
	return (
		"#" +
		[r, g, b]
			.map((ch) => clampChannel(ch).toString(16).padStart(2, "0"))
			.join("")
	);
}

function setRootAccent(hex) {
	const root = document.documentElement;
	root.style.setProperty("--accent-cover", hex);
	root.style.setProperty("--accent-cover-rgb", hexToRgbTuple(hex));
}

function applyMatteClamping(r, g, b) {
	const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	const lift = luminance < 105 ? (105 - luminance) * 0.78 : 0;

	const lr = clampChannel(r + lift);
	const lg = clampChannel(g + lift);
	const lb = clampChannel(b + lift);

	const mixedR = lr * (1 - MATTE_MIX_RATIO) + MATTE_GRAY_RGB.r * MATTE_MIX_RATIO;
	const mixedG = lg * (1 - MATTE_MIX_RATIO) + MATTE_GRAY_RGB.g * MATTE_MIX_RATIO;
	const mixedB = lb * (1 - MATTE_MIX_RATIO) + MATTE_GRAY_RGB.b * MATTE_MIX_RATIO;

	return rgbToHex(mixedR, mixedG, mixedB);
}

export function useCoverAccent(coverUrl, fallbackAccent = DEFAULT_ACCENT) {
	useEffect(() => {
		const safeFallback = fallbackAccent || DEFAULT_ACCENT;

		if (!coverUrl) {
			setRootAccent(safeFallback);
			return;
		}

		let cancelled = false;
		const img = new Image();
		img.crossOrigin = "anonymous";

		img.onload = () => {
			if (cancelled) return;
			try {
				const canvas = document.createElement("canvas");
				canvas.width = SAMPLE_SIZE;
				canvas.height = SAMPLE_SIZE;
				const ctx = canvas.getContext("2d", { willReadFrequently: true });
				if (!ctx) {
					setRootAccent(safeFallback);
					return;
				}

				ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
				const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

				let rSum = 0;
				let gSum = 0;
				let bSum = 0;
				let weightSum = 0;

				for (let i = 0; i < data.length; i += 4) {
					const r = data[i];
					const g = data[i + 1];
					const b = data[i + 2];
					const a = data[i + 3];
					if (a < 128) continue;

					const max = Math.max(r, g, b);
					const min = Math.min(r, g, b);
					const sat = max === 0 ? 0 : (max - min) / max;
					const weight = 0.25 + sat * 1.85;

					rSum += r * weight;
					gSum += g * weight;
					bSum += b * weight;
					weightSum += weight;
				}

				if (weightSum === 0) {
					setRootAccent(safeFallback);
					return;
				}

				const color = applyMatteClamping(
					rSum / weightSum,
					gSum / weightSum,
					bSum / weightSum,
				);
				setRootAccent(color);
			} catch {
				setRootAccent(safeFallback);
			}
		};

		img.onerror = () => {
			if (!cancelled) {
				setRootAccent(safeFallback);
			}
		};

		img.src = coverUrl;

		return () => {
			cancelled = true;
		};
	}, [coverUrl, fallbackAccent]);
}
