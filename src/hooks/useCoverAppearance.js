import { useCallback, useEffect, useState } from "react";
import {
	DEFAULT_ACCENT,
	getCachedCoverAppearance,
	hexToRgbTuple,
	loadCoverAppearance,
	setRootAccent,
} from "../utils/cover.js";

// Страховочный таймер очистки старых слоёв на случай prefers-reduced-motion (когда onAnimationEnd не сработает)
const CROSSFADE_SAFETY_MS = 1300;
let nextLayerUid = 1;

function makeLayerKey(coverUrl, accentHex) {
	return `${coverUrl || "no-cover"}::${accentHex}`;
}

/**
 * Управляет стеком слоёв ambient-фона для плавного кроссфейда при смене трека.
 *
 * После завершения CSS-анимации появления верхнего слоя (`promoteLayer`)
 * все предыдущие слои удаляются, чтобы не плодить лишние DOM-элементы и текстуры.
 */
export function useCoverAppearance(coverUrl, fallbackAccent = DEFAULT_ACCENT) {
	const [layers, setLayers] = useState(() => {
		const cached = getCachedCoverAppearance(coverUrl);
		if (!cached) return [];
		return [
			{
				uid: `init-${coverUrl}`,
				keyId: makeLayerKey(coverUrl, cached.accentHex),
				src: cached.ambientSrc,
				accentRgb: cached.accentRgb || hexToRgbTuple(cached.accentHex),
			},
		];
	});

	/** Оставляет только верхний завершивший анимацию слой */
	const promoteLayer = useCallback((uid) => {
		setLayers((prev) => {
			if (prev.length <= 1) return prev;
			const target = prev[prev.length - 1];
			if (!target || target.uid !== uid) return prev;
			return [target];
		});
	}, []);

	useEffect(() => {
		const safeFallback = fallbackAccent || DEFAULT_ACCENT;
		let cancelled = false;
		let fallbackPruneTimer = null;

		loadCoverAppearance(coverUrl, safeFallback).then(
			({ accentHex, accentRgb, ambientSrc }) => {
				if (cancelled) return;
				setRootAccent(accentHex);

				const keyId = makeLayerKey(coverUrl, accentHex);
				const uid = `layer-${nextLayerUid++}`;

				setLayers((prev) => {
					const latest = prev[prev.length - 1];
					if (latest?.keyId === keyId && latest?.src === ambientSrc) {
						return prev;
					}
					const nextLayer = { uid, keyId, src: ambientSrc, accentRgb };
					// Ограничиваем стек: базовый непрозрачный слой + до 2 свежих входящих при быстрых кликах
					if (prev.length <= 2) {
						return [...prev, nextLayer];
					}
					return [prev[0], prev[prev.length - 1], nextLayer];
				});

				fallbackPruneTimer = setTimeout(() => {
					if (!cancelled) {
						promoteLayer(uid);
					}
				}, CROSSFADE_SAFETY_MS);
			},
		);

		return () => {
			cancelled = true;
			if (fallbackPruneTimer) clearTimeout(fallbackPruneTimer);
		};
	}, [coverUrl, fallbackAccent, promoteLayer]);

	return { layers, promoteLayer };
}
