// ============================================================================
// Адаптивный GPU-фон под обложку текущего трека (`AmbientBg`)
// Двухслойный кроссфейд, мягкое затемнение и дизеринг без полос в Safari
// ============================================================================
import { useEffect, useState } from "react";
import { usePlayerState } from "../../../context/PlayerContext.jsx";
import { handleCoverError } from "../../../services/mockData.js";
import "./AmbientBg.css";

function AmbientBg() {
	const { currentTrack } = usePlayerState();
	const activeCover = currentTrack?.cover ?? null;
	const activeUrl = activeCover?.large_url ?? null;

	const [layers, setLayers] = useState(() =>
		activeUrl ? [{ id: activeUrl, cover: activeCover }] : [],
	);

	useEffect(() => {
		if (!activeUrl) return;

		setLayers((prev) => {
			if (prev[prev.length - 1]?.id === activeUrl) return prev;
			// Храним не более 2 слоёв (предыдущий + новый) для плавного кроссфейда
			const previous = prev[prev.length - 1];
			return previous
				? [previous, { id: activeUrl, cover: activeCover }]
				: [{ id: activeUrl, cover: activeCover }];
		});
	}, [activeUrl, activeCover]);

	return (
		<div className="ambient-bg" aria-hidden="true">
			{layers.map((layer) => (
				<img
					key={layer.id}
					className="ambient-bg-image"
					src={layer.cover.large_url}
					alt=""
					draggable={false}
					onError={(e) => handleCoverError(e, layer.cover, "large")}
				/>
			))}

			<div className="ambient-bg-tint" />
			<div className="ambient-bg-darken" />
			<div className="ambient-bg-grain" />
		</div>
	);
}

export default AmbientBg;
