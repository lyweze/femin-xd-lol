// ============================================================================
// Интерактивная полоса прогресса (`ProgressBar`) на базе MonolithicSlider
// Подписана только на `usePlayerTime()`, не нагружая остальной UI при тиках таймера
// ============================================================================
import { usePlayerActions, usePlayerTime } from "../../../context/playerContexts.js";
import { formatPlaybackTime } from "../../../utils/format.js";
import MonolithicSlider from "../../shared/monolithic-slider/MonolithicSlider.jsx";
import "./ProgressBar.css";

function ProgressBar({ variant = "compact" }) {
	const { currentTimeMs, durationMs, progress } = usePlayerTime();
	const { seekToRatio } = usePlayerActions();

	const slider = (
		<MonolithicSlider
			ratio={progress}
			onChangeRatio={seekToRatio}
			ariaLabel="Track progress"
			ariaValueMin={0}
			ariaValueMax={Math.floor(durationMs / 1000)}
			ariaValueNow={Math.floor(currentTimeMs / 1000)}
			ariaValueText={`${formatPlaybackTime(currentTimeMs)} of ${formatPlaybackTime(durationMs)}`}
			variant={variant}
			tone={variant === "fullscreen" ? "neutral" : "accent"}
		/>
	);

	if (variant === "fullscreen") {
		return (
			<div className="progress-bar-wrap is-fullscreen">
				{slider}
				<div className="progress-times-row">
					<span className="progress-time">{formatPlaybackTime(currentTimeMs)}</span>
					<span className="progress-time">{formatPlaybackTime(durationMs)}</span>
				</div>
			</div>
		);
	}

	return (
		<div className="progress-bar-wrap">
			<span className="progress-time">{formatPlaybackTime(currentTimeMs)}</span>
			{slider}
			<span className="progress-time">{formatPlaybackTime(durationMs)}</span>
		</div>
	);
}

export default ProgressBar;
