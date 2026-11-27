// ============================================================================
// Общий плавно кроссфейдящийся слой ambient-фона (для AmbientBg и Fullscreen)
// ============================================================================
import { useCoverAppearance } from "../../../hooks/useCoverAppearance.js";
import "./AmbientBackdrop.css";

/**
 * Рендерит стек слоёв пре-размытой обложки с радиальным акцентом и затемняющим scrim.
 * Новые слои плавно проявляются через GPU-композитинг `opacity` (1.15s).
 *
 * @param {Object} props
 * @param {string | null} props.coverUrl - URL маленькой обложки текущего трека
 * @param {string} [props.fallbackAccent] - Цвет по умолчанию при отсутствии/CORS-ошибке обложки
 * @param {"main" | "fullscreen"} [props.variant="main"] - Режим подложки
 */
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
