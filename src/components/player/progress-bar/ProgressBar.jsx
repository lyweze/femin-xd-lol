// ============================================================================
// Интерактивная полоса прогресса (`ProgressBar`)
// Подписана ТОЛЬКО на `usePlayerTime()` — изолирует тики от остального UI
// ============================================================================
import { useCallback, useRef } from "react";
import { usePlayerActions, usePlayerTime } from "../../../context/PlayerContext.jsx";
import { formatPlaybackTime } from "../../../services/mockData.js";
import "./ProgressBar.css";

function ProgressBar({ variant = "compact" }) {
	const { currentTimeMs, durationMs, progress } = usePlayerTime();
	const { seekToRatio } = usePlayerActions();
	const trackRef = useRef(null);

	const handleSeekFromEvent = useCallback(
		(clientX) => {
			const el = trackRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			if (rect.width <= 0) return;
			const ratio = (clientX - rect.left) / rect.width;
			seekToRatio(ratio);
		},
		[seekToRatio],
	);

	const handlePointerDown = (e) => {
		e.preventDefault();
		handleSeekFromEvent(e.clientX);

		const onMove = (moveEvent) => handleSeekFromEvent(moveEvent.clientX);
		const onUp = () => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
		};

		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	};

	const percent = `${(progress * 100).toFixed(2)}%`;

	if (variant === "fullscreen") {
		return (
			<div className="progress-bar-wrap is-fullscreen">
				<div
					ref={trackRef}
					className="progress-hit-area"
					role="slider"
					tabIndex={0}
					aria-label="Track progress"
					aria-valuemin={0}
					aria-valuemax={Math.floor(durationMs / 1000)}
					aria-valuenow={Math.floor(currentTimeMs / 1000)}
					onPointerDown={handlePointerDown}
					onKeyDown={(e) => {
						if (e.key === "ArrowRight") seekToRatio(progress + 0.05);
						if (e.key === "ArrowLeft") seekToRatio(progress - 0.05);
					}}
				>
					<div className="progress-rail">
						<div className="progress-fill" style={{ width: percent }}>
							<span className="progress-thumb" aria-hidden="true" />
						</div>
					</div>
				</div>

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

			<div
				ref={trackRef}
				className="progress-hit-area"
				role="slider"
				tabIndex={0}
				aria-label="Track progress"
				aria-valuemin={0}
				aria-valuemax={Math.floor(durationMs / 1000)}
				aria-valuenow={Math.floor(currentTimeMs / 1000)}
				onPointerDown={handlePointerDown}
				onKeyDown={(e) => {
					if (e.key === "ArrowRight") seekToRatio(progress + 0.05);
					if (e.key === "ArrowLeft") seekToRatio(progress - 0.05);
				}}
			>
				<div className="progress-rail">
					<div className="progress-fill" style={{ width: percent }}>
						<span className="progress-thumb" aria-hidden="true" />
					</div>
				</div>
			</div>

			<span className="progress-time">{formatPlaybackTime(durationMs)}</span>
		</div>
	);
}

export default ProgressBar;
