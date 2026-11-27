// ============================================================================
// Работа с обложками: фолбэки, матовый акцент (--accent-cover) и пре-блюр ambient
// ============================================================================
import { clamp } from "./format.js";

/** Базовый акцент темы Matte Obsidian по умолчанию */
export const DEFAULT_ACCENT = "#c56b4e";

const MATTE_GRAY_RGB = { r: 138, g: 134, b: 126 }; // Тёплый серый #8A867E для приглушения кричащих цветов
const MATTE_MIX_RATIO = 0.22;
const AMBIENT_SIZE = 64; // Размер пре-размытой текстуры фона (64x64 растягивается GPU бесплатно)
const BLUR_RADIUS = 6;
const BLUR_PASSES = 3; // 3 прохода box-blur математически близки к гауссовому размытию
const MAX_CACHE_ENTRIES = 24;

// 4x4 матрица Байера для микро-дизеринга: убирает "ступеньки" градиента на 8-битных дисплеях Safari
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
	return Math.round(clamp(value, 0, 255));
}

function rgbToHex(r, g, b) {
	return (
		"#" +
		[r, g, b]
			.map((channel) => clampByte(channel).toString(16).padStart(2, "0"))
			.join("")
	);
}

/**
 * Конвертирует `#rrggbb` в строку `"r, g, b"` для подстановки в CSS `rgba(var(--accent-cover-rgb), alpha)`.
 */
export function hexToRgbTuple(hex) {
	const clean = String(hex || DEFAULT_ACCENT).replace("#", "");
	if (clean.length !== 6) return "197, 107, 78";
	const r = Number.parseInt(clean.slice(0, 2), 16);
	const g = Number.parseInt(clean.slice(2, 4), 16);
	const b = Number.parseInt(clean.slice(4, 6), 16);
	if ([r, g, b].some(Number.isNaN)) return "197, 107, 78";
	return `${r}, ${g}, ${b}`;
}

/**
 * Обновляет корневые CSS-переменные `--accent-cover` и `--accent-cover-rgb` на `<html>`.
 * Повторное применение того же цвета пропускается, чтобы не вызывать лишний перерасчёт стилей.
 */
export function setRootAccent(hex) {
	const safeHex = hex || DEFAULT_ACCENT;
	if (lastAppliedAccent === safeHex || typeof document === "undefined") return;
	lastAppliedAccent = safeHex;

	const root = document.documentElement;
	root.style.setProperty("--accent-cover", safeHex);
	root.style.setProperty("--accent-cover-rgb", hexToRgbTuple(safeHex));
}

/**
 * Приводит извлечённый цвет обложки к палитре Matte Obsidian:
 * приподнимает слишком тёмные оттенки для контраста и примешивает 22% тёплого серого.
 */
function applyMatteClamping(r, g, b) {
	const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	const lift = luminance < 105 ? (105 - luminance) * 0.78 : 0;

	const liftedR = clampByte(r + lift);
	const liftedG = clampByte(g + lift);
	const liftedB = clampByte(b + lift);

	const mixedR = liftedR * (1 - MATTE_MIX_RATIO) + MATTE_GRAY_RGB.r * MATTE_MIX_RATIO;
	const mixedG = liftedG * (1 - MATTE_MIX_RATIO) + MATTE_GRAY_RGB.g * MATTE_MIX_RATIO;
	const mixedB = liftedB * (1 - MATTE_MIX_RATIO) + MATTE_GRAY_RGB.b * MATTE_MIX_RATIO;

	return rgbToHex(mixedR, mixedG, mixedB);
}

/**
 * Один проход 1D box-blur по квадратному RGB-буферу (горизонтальный или вертикальный).
 */
function runBoxBlurPass(src, dst, size, isHorizontal) {
	const windowSize = BLUR_RADIUS * 2 + 1;

	for (let y = 0; y < size; y += 1) {
		for (let x = 0; x < size; x += 1) {
			let sumR = 0;
			let sumG = 0;
			let sumB = 0;

			for (let k = -BLUR_RADIUS; k <= BLUR_RADIUS; k += 1) {
				const sx = isHorizontal ? Math.max(0, Math.min(size - 1, x + k)) : x;
				const sy = isHorizontal ? y : Math.max(0, Math.min(size - 1, y + k));
				const srcIdx = (sy * size + sx) * 3;
				sumR += src[srcIdx];
				sumG += src[srcIdx + 1];
				sumB += src[srcIdx + 2];
			}

			const outIdx = (y * size + x) * 3;
			dst[outIdx] = sumR / windowSize;
			dst[outIdx + 1] = sumG / windowSize;
			dst[outIdx + 2] = sumB / windowSize;
		}
	}
}

/**
 * За один проход по уменьшенной обложке 64×64:
 * 1) вычисляет доминирующий матовый акцент с весом по насыщенности пикселей;
 * 2) формирует пре-размытую текстуру с дизерингом вместо тяжёлого CSS `filter: blur(78px)`.
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

		// Учитываем только непрозрачные пиксели; более насыщенные дают больший вклад
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

		// Умеренно усиливаем цветность и слегка затемняем фон до размытия
		const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
		const satBoost = 1.38;
		const bright = 0.88;
		bufA[p] = clamp((lum + (r - lum) * satBoost) * bright, 0, 255);
		bufA[p + 1] = clamp((lum + (g - lum) * satBoost) * bright, 0, 255);
		bufA[p + 2] = clamp((lum + (b - lum) * satBoost) * bright, 0, 255);
	}

	const accentHex =
		weightSum > 0
			? applyMatteClamping(rSum / weightSum, gSum / weightSum, bSum / weightSum)
			: null;

	for (let pass = 0; pass < BLUR_PASSES; pass += 1) {
		runBoxBlurPass(bufA, bufB, size, true);
		runBoxBlurPass(bufB, bufA, size, false);
	}

	// Переносим результат обратно в RGBA ImageData с микро-дизерингом
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

function makeFallbackAppearance(fallbackAccent) {
	const safeFallback = fallbackAccent || DEFAULT_ACCENT;
	return {
		accentHex: safeFallback,
		accentRgb: hexToRgbTuple(safeFallback),
		ambientSrc: null,
	};
}

/**
 * Возвращает заранее вычисленный внешний вид обложки из LRU-кэша (или `null`).
 */
export function getCachedCoverAppearance(coverUrl) {
	return coverUrl ? (appearanceCache.get(coverUrl) ?? null) : null;
}

/**
 * Дожидается декодирования сгенерированной data-URI текстуры до старта CSS-анимации,
 * чтобы браузер не мигал пустым слоем на первом кадре кроссфейда.
 */
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

/**
 * Асинхронно загружает обложку, вычисляет её матовый акцент и пре-размытый ambient-фон.
 * Параллельные вызовы для одного URL дедуплицируются через `pendingCache`.
 */
export function loadCoverAppearance(coverUrl, fallbackAccent = DEFAULT_ACCENT) {
	const fallback = makeFallbackAppearance(fallbackAccent);

	if (!coverUrl) {
		return Promise.resolve(fallback);
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
					resolve(fallback);
					return;
				}

				ctx.drawImage(img, 0, 0, AMBIENT_SIZE, AMBIENT_SIZE);
				const imageData = ctx.getImageData(0, 0, AMBIENT_SIZE, AMBIENT_SIZE);
				const computedAccent = buildAmbientFromPixels(imageData.data, AMBIENT_SIZE);
				ctx.putImageData(imageData, 0, 0);

				const accentHex = computedAccent || fallback.accentHex;
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
				// На случай tainted-canvas (CORS) безопасно откатываемся к fallback-акценту
				resolve(fallback);
			} finally {
				pendingCache.delete(coverUrl);
			}
		};

		img.onerror = () => {
			pendingCache.delete(coverUrl);
			resolve(fallback);
		};

		img.src = coverUrl;
	});

	pendingCache.set(coverUrl, promise);
	return promise;
}

/**
 * Безопасный обработчик `onError` для `<img>`: подменяет отсутствующий локальный файл
 * на встроенную SVG-заглушку соответствующего размера (с защитой от зацикливания).
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

const ALLOWED_COVER_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PLAYLIST_COVER_MAX_SIZE = 640;

/**
 * Проверяет, декодирует, кадрирует по центру в квадрат (до 640×640) и сжимает
 * загруженный файл обложки плейлиста в компактный `data:`-URI для сохранения
 * в состоянии и `localStorage` без переполнения квоты.
 *
 * @param {File} file - Файл изображения (JPEG, PNG или WebP)
 * @returns {Promise<{ small_url: string, medium_url: string, large_url: string }>}
 */
export async function processPlaylistCoverFile(file) {
	if (!file || !ALLOWED_COVER_MIMES.has(file.type)) {
		throw new Error("Поддерживаются только изображения JPEG, PNG или WebP.");
	}

	const objectUrl = URL.createObjectURL(file);
	try {
		const img = await new Promise((resolve, reject) => {
			const el = new Image();
			el.onload = () => resolve(el);
			el.onerror = () => reject(new Error("Не удалось прочитать изображение."));
			el.src = objectUrl;
		});

		const srcWidth = img.naturalWidth || img.width;
		const srcHeight = img.naturalHeight || img.height;
		const cropSide = Math.min(srcWidth, srcHeight);
		const targetSize = Math.max(1, Math.min(PLAYLIST_COVER_MAX_SIZE, cropSide));

		const sx = Math.floor((srcWidth - cropSide) / 2);
		const sy = Math.floor((srcHeight - cropSide) / 2);

		const canvas = document.createElement("canvas");
		canvas.width = targetSize;
		canvas.height = targetSize;
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			throw new Error("Браузер не смог подготовить холст для обложки.");
		}

		ctx.drawImage(img, sx, sy, cropSide, cropSide, 0, 0, targetSize, targetSize);

		// WebP даёт наименьший размер при отличном качестве; для старых движков — JPEG
		let dataUrl = canvas.toDataURL("image/webp", 0.86);
		if (!dataUrl.startsWith("data:image/webp")) {
			dataUrl = canvas.toDataURL("image/jpeg", 0.86);
		}

		return {
			small_url: dataUrl,
			medium_url: dataUrl,
			large_url: dataUrl,
		};
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}
