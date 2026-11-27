// ============================================================================
// Общий плавно кроссфейдящийся слой ambient-фона (для AmbientBg и Fullscreen)
// ============================================================================
import { useCoverAppearance } from "../../../hooks/useCoverAppearance.js";
import "./AmbientBackdrop.css";

function AmbientBackdrop({ coverUrl, fallbackAccent, variant = "main" }) {
	const { layers, promoteLayer } = useCoverAppearance(coverUrl, fallbackAccent);

	return (
		<div
			className={`ambient-backdrop ${variant === "fullscreen" ? "is-fullscreen" : ""}`}
			aria-hidden="true"
		>
			{layers.map((layer) => (
				<div
					key={layer.uid}
					className="ambient-layer"
					style={{ "--layer-accent-rgb": layer.accentRgb }}
					onAnimationEnd={(e) => {
						if (e.target === e.currentTarget) {
							promoteLayer(layer.uid);
						}
					}}
				>
					{layer.src && (
						<img
							className="ambient-layer-img"
							src={layer.src}
							alt=""
							draggable={false}
						/>
					)}
					<div className="ambient-layer-tint" />
					<div className="ambient-layer-scrim" />
				</div>
			))}
		</div>
	);
}

export default AmbientBackdrop;
