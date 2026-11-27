// ============================================================================
// Кнопки управления воспроизведением (`PlayerControls`)
// ============================================================================
import { usePlayerActions, usePlayerState } from "../../../context/PlayerContext.jsx";
import "./PlayerControls.css";

function PlayerControls({ size = "compact" }) {
	const { isPlaying, isShuffle, repeatMode } = usePlayerState();
	const { togglePlay, prevTrack, nextTrack, toggleShuffle, cycleRepeat } =
		usePlayerActions();

	const repeatTitle =
		repeatMode === "one"
			? "Repeat One (track repeats)"
			: repeatMode === "all"
				? "Repeat All"
				: "Repeat Off";

	return (
		<div
			className={`player-controls ${size === "large" ? "is-large" : ""}`}
			aria-label="Playback controls"
		>
			<button
				type="button"
				className={`ctrl-btn ctrl-secondary ${isShuffle ? "is-active" : ""}`}
				onClick={toggleShuffle}
				title={isShuffle ? "Shuffle On" : "Shuffle Off"}
				aria-label="Toggle shuffle"
				aria-pressed={isShuffle}
			>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path
						d="M2 4.5h2.4c1 0 1.9.5 2.4 1.3l2.4 4.4c.5.8 1.4 1.3 2.4 1.3H14M12 2.5L14 4.5L12 6.5M2 11.5h2.4c1 0 1.9-.5 2.4-1.3l.6-1.1M10.4 5.9l.4-.7c.5-.8 1.4-1.3 2.4-1.3H14M12 9.5L14 11.5L12 13.5"
						stroke="currentColor"
						strokeWidth="1.35"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</button>

			<button
				type="button"
				className="ctrl-btn"
				onClick={prevTrack}
				title="Previous track"
				aria-label="Previous track"
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
					<path d="M3.2 3.2h1.5v9.6H3.2V3.2zm2.8 4.8l6.8-4.5v9L6 8z" />
				</svg>
			</button>

			<button
				type="button"
				className="ctrl-btn ctrl-play"
				onClick={togglePlay}
				title={isPlaying ? "Pause (Space)" : "Play (Space)"}
				aria-label={isPlaying ? "Pause" : "Play"}
			>
				{isPlaying ? (
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
						<rect x="3.5" y="3" width="3.2" height="10" rx="1" />
						<rect x="9.3" y="3" width="3.2" height="10" rx="1" />
					</svg>
				) : (
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
						<path d="M4.6 3.1l8.4 4.9-8.4 4.9V3.1z" />
					</svg>
				)}
			</button>

			<button
				type="button"
				className="ctrl-btn"
				onClick={() => nextTrack(false)}
				title="Next track"
				aria-label="Next track"
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
					<path d="M11.3 3.2h1.5v9.6h-1.5V3.2zM10 8l-6.8 4.5v-9L10 8z" />
				</svg>
			</button>

			<button
				type="button"
				className={`ctrl-btn ctrl-secondary ${repeatMode !== "off" ? "is-active" : ""}`}
				onClick={cycleRepeat}
				title={repeatTitle}
				aria-label={repeatTitle}
				aria-pressed={repeatMode !== "off"}
			>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path
						d="M11.5 2.5L13.5 4.5L11.5 6.5M3 8V6.5C3 5.4 3.9 4.5 5 4.5h8.5M4.5 13.5L2.5 11.5L4.5 9.5M13 8v1.5c0 1.1-.9 2-2 2H2.5"
						stroke="currentColor"
						strokeWidth="1.35"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
				{repeatMode === "one" && <span className="ctrl-repeat-one">1</span>}
			</button>
		</div>
	);
}

export default PlayerControls;
