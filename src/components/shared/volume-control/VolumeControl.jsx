// ============================================================================
// Общий регулятор громкости в монолитном стиле macOS (`VolumeControl`)
// ============================================================================
import { VolumeIcon } from "../icons/Icons.jsx";
import MonolithicSlider from "../monolithic-slider/MonolithicSlider.jsx";

/**
 * Объединяет кнопку Mute/Unmute и монолитный слайдер громкости
 * для нижней капсулы плеера и полноэкранного режима.
 */
function VolumeControl({
	volume,
	isMuted,
	onToggleMute,
	onChangeVolume,
	containerClassName,
	buttonClassName,
	variant = "compact",
	iconSize = 14,
}) {
	const effectiveVolume = isMuted ? 0 : volume;
	const volumePercent = Math.round(effectiveVolume * 100);

	return (
		<div className={containerClassName}>
			<button
				type="button"
				className={`${buttonClassName} ${isMuted ? "is-muted" : ""}`}
				onClick={onToggleMute}
				title={isMuted ? "Unmute (M)" : "Mute (M)"}
				aria-label={isMuted ? "Unmute" : "Mute"}
				aria-pressed={isMuted}
			>
				<VolumeIcon muted={effectiveVolume === 0} size={iconSize} />
			</button>

			<MonolithicSlider
				className="volume-mono-slider"
				ratio={effectiveVolume}
				onChangeRatio={onChangeVolume}
				ariaLabel="Volume"
				ariaValueMin={0}
				ariaValueMax={100}
				ariaValueNow={volumePercent}
				ariaValueText={`${volumePercent}%`}
				stepRatio={0.04}
				variant={variant}
				tone="neutral"
			/>
		</div>
	);
}

export default VolumeControl;
