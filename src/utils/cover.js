// ============================================================================
// Работа с обложками: фолбэк, извлечение матового акцента и пре-блюр ambient
// ============================================================================

export const DEFAULT_ACCENT = "#c56b4e";

const MATTE_GRAY_RGB = { r: 138, g: 134, b: 126 }; // #8A867E
const MATTE_MIX_RATIO = 0.22;
const AMBIENT_SIZE = 64;
const BLUR_RADIUS = 6;
const BLUR_PASSES = 3;
const MAX_CACHE_ENTRIES = 24;

// 4x4 матрица Байера для мягкого дизеринга без 8-битного бандинга в Safari
const BAYER_4X4 = [
	-7.5, 0.5, -5.5, 2.5,
	4.5, -3.5, 6.5, -1.5,
	-4.5, 3.5, -6.5, 1.5,
	7.5, -0.5, 5.5, -2.5,
];

const appearanceCache = new Map();
const pendingCache = new Map();
let lastAppliedAccent = null;

function clampByte(value) {
	return Math.max(0, Math.min(255, Math.round(value)));
}

export function hexToRgbTuple(hex) {
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
			.map((ch) => clampByte(ch).toString(16).padStart(2, "0"))
			.join("")
	);
}

export function setRootAccent(hex) {
	const safeHex = hex || DEFAULT_ACCENT;
	if (lastAppliedAccent === safeHex || typeof document === "undefined") return;
	lastAppliedAccent = safeHex;
	const root = document.documentElement;
	root.style.setProperty("--accent-cover", safeHex);
	root.style.setProperty("--accent-cover-rgb", hexToRgbTuple(safeHex));
}

function applyMatteClamping(r, g, b) {
	const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	const lift = luminance < 105 ? (105 - luminance) * 0.78 : 0;

	const lr = clampByte(r + lift);
	const lg = clampByte(g + lift);
	const lb = clampByte(b + lift);

	const mixedR = lr * (1 - MATTE_MIX_RATIO) + MATTE_GRAY_RGB.r * MATTE_MIX_RATIO;
	const mixedG = lg * (1 - MATTE_MIX_RATIO) + MATTE_GRAY_RGB.g * MATTE_MIX_RATIO;
	const mixedB = lb * (1 - MATTE_MIX_RATIO) + MATTE_GRAY_RGB.b * MATTE_MIX_RATIO;

	return rgbToHex(mixedR, mixedG, mixedB);
}

/**
 * Извлекает акцентный цвет и подготавливает мягкую пре-размытую 64x64 текстуру
 * за один проход, чтобы исключить тяжёлый CSS filter: blur(78px) и SVG-шум в рантайме.
 */
function buildAmbientFromPixels(srcData, size) {
	const total = size * size;
	const bufA = new Float32Array(total * 3);
	const bufB = new Float32Array(total * 3);

	let rSum = 0;
	let gSum = 0;
	let bSum = 0;
	let weightSum = 0;

	for (let i = 0, p = 0; i < srcData.length; i += 4, p += 3) {
		const r = srcData[i];
		const g = srcData[i + 1];
		const b = srcData[i + 2];
		const a = srcData[i + 3];

		if (a >= 128) {
			const max = Math.max(r, g, b);
			const min = Math.min(r, g, b);
			const sat = max === 0 ? 0 : (max - min) / max;
			const weight = 0.25 + sat * 1.85;
			rSum += r * weight;
			gSum += g * weight;
			bSum += b * weight;
			weightSum += weight;
		}

		// Лёгкое усиление насыщенности и мягкое затемнение прямо в пикселях ambient-текстуры
		const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
		const satBoost = 1.38;
		const bright = 0.88;
		bufA[p] = Math.max(0, Math.min(255, (lum + (r - lum) * satBoost) * bright));
		bufA[p + 1] = Math.max(0, Math.min(255, (lum + (g - lum) * satBoost) * bright));
		bufA[p + 2] = Math.max(0, Math.min(255, (lum + (b - lum) * satBoost) * bright));
	}

	const accentHex =
		weightSum > 0
			? applyMatteClamping(rSum / weightSum, gSum / weightSum, bSum / weightSum)
			: null;

	// 3 прохода сепарабельного бокс-блюра (аппроксимирует гауссово размытие на GPU бесплатно)
	const windowSize = BLUR_RADIUS * 2 + 1;
	for (let pass = 0; pass < BLUR_PASSES; pass += 1) {
		// Горизонталь: bufA -> bufB
		for (let y = 0; y < size; y += 1) {
			const rowBase = y * size;
			for (let x = 0; x < size; x += 1) {
				let sr = 0;
				let sg = 0;
				let sb = 0;
				for (let k = -BLUR_RADIUS; k <= BLUR_RADIUS; k += 1) {
					const sx = Math.max(0, Math.min(size - 1, x + k));
					const idx = (rowBase + sx) * 3;
					sr += bufA[idx];
					sg += bufA[idx + 1];
					sb += bufA[idx + 2];
				}
				const outIdx = (rowBase + x) * 3;
				bufB[outIdx] = sr / windowSize;
				bufB[outIdx + 1] = sg / windowSize;
				bufB[outIdx + 2] = sb / windowSize;
			}
		}

		// Вертикаль: bufB -> bufA
		for (let y = 0; y < size; y += 1) {
			for (let x = 0; x < size; x += 1) {
				let sr = 0;
				let sg = 0;
				let sb = 0;
				for (let k = -BLUR_RADIUS; k <= BLUR_RADIUS; k += 1) {
					const sy = Math.max(0, Math.min(size - 1, y + k));
					const idx = (sy * size + x) * 3;
					sr += bufB[idx];
					sg += bufB[idx + 1];
					sb += bufB[idx + 2];
				}
				const outIdx = (y * size + x) * 3;
				bufA[outIdx] = sr / windowSize;
				bufA[outIdx + 1] = sg / windowSize;
				bufA[outIdx + 2] = sb / windowSize;
			}
		}
	}

	// Запись с микро-дизерингом
	for (let y = 0; y < size; y += 1) {
		for (let x = 0; x < size; x += 1) {
			const px = y * size + x;
			const p3 = px * 3;
			const p4 = px * 4;
			const dither = BAYER_4X4[(y & 3) * 4 + (x & 3)] * 0.25;
			srcData[p4] = clampByte(bufA[p3] + dither);
			srcData[p4 + 1] = clampByte(bufA[p3 + 1] + dither);
			srcData[p4 + 2] = clampByte(bufA[p3 + 2] + dither);
			srcData[p4 + 3] = 255;
		}
	}

	return accentHex;
}

function storeInCache(key, value) {
	if (appearanceCache.size >= MAX_CACHE_ENTRIES) {
		const oldestKey = appearanceCache.keys().next().value;
		appearanceCache.delete(oldestKey);
	}
	appearanceCache.set(key, value);
}

export function getCachedCoverAppearance(coverUrl) {
	return coverUrl ? (appearanceCache.get(coverUrl) ?? null) : null;
}

function preDecodeImage(src) {
	if (!src || typeof Image === "undefined") return Promise.resolve();
	return new Promise((resolve) => {
		const img = new Image();
		img.src = src;
		if (typeof img.decode === "function") {
			img.decode().then(resolve, resolve);
		} else {
			img.onload = resolve;
			img.onerror = resolve;
		}
	});
}

export function loadCoverAppearance(coverUrl, fallbackAccent = DEFAULT_ACCENT) {
	const safeFallback = fallbackAccent || DEFAULT_ACCENT;
	const fallbackRgb = hexToRgbTuple(safeFallback);

	if (!coverUrl) {
		return Promise.resolve({
			accentHex: safeFallback,
			accentRgb: fallbackRgb,
			ambientSrc: null,
		});
	}

	const cached = appearanceCache.get(coverUrl);
	if (cached) {
		return Promise.resolve(cached);
	}

	const inflight = pendingCache.get(coverUrl);
	if (inflight) {
		return inflight;
	}

	const promise = new Promise((resolve) => {
		const img = new Image();
		if (!coverUrl.startsWith("data:")) {
			img.crossOrigin = "anonymous";
		}

		img.onload = async () => {
			try {
				const canvas = document.createElement("canvas");
				canvas.width = AMBIENT_SIZE;
				canvas.height = AMBIENT_SIZE;
				const ctx = canvas.getContext("2d", { willReadFrequently: true });
				if (!ctx) {
					resolve({
						accentHex: safeFallback,
						accentRgb: fallbackRgb,
						ambientSrc: null,
					});
					return;
				}

				ctx.drawImage(img, 0, 0, AMBIENT_SIZE, AMBIENT_SIZE);
				const imageData = ctx.getImageData(0, 0, AMBIENT_SIZE, AMBIENT_SIZE);
				const computedAccent = buildAmbientFromPixels(
					imageData.data,
					AMBIENT_SIZE,
				);
				ctx.putImageData(imageData, 0, 0);

				const accentHex = computedAccent || safeFallback;
				const ambientSrc = canvas.toDataURL("image/png");
				await preDecodeImage(ambientSrc);

				const result = {
					accentHex,
					accentRgb: hexToRgbTuple(accentHex),
					ambientSrc,
				};
				storeInCache(coverUrl, result);
				resolve(result);
			} catch {
				resolve({
					accentHex: safeFallback,
					accentRgb: fallbackRgb,
					ambientSrc: null,
				});
			} finally {
				pendingCache.delete(coverUrl);
			}
		};

		img.onerror = () => {
			pendingCache.delete(coverUrl);
			resolve({
				accentHex: safeFallback,
				accentRgb: fallbackRgb,
				ambientSrc: null,
			});
		};

		img.src = coverUrl;
	});

	pendingCache.set(coverUrl, promise);
	return promise;
}

/**
 * Безопасный обработчик onError для <img>: подменяет отсутствующий локальный файл
 * на встроенную SVG-заглушку (без зацикливания).
 */
export function handleCoverError(e, image, size = "medium") {
	const img = e.currentTarget;
	if (img.dataset.fallbackApplied) return;
	const fallback =
		size === "small"
			? image?.fallback_small_url
			: size === "large"
				? image?.fallback_large_url
				: image?.fallback_medium_url;
	if (fallback) {
		img.dataset.fallbackApplied = "1";
		img.src = fallback;
	}
}
