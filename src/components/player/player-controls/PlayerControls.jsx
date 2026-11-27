// ============================================================================
// Кнопки управления воспроизведением (`PlayerControls`: Shuffle / Prev / Play / Next / Repeat)
// ============================================================================
import { usePlayerActions, usePlayerState } from "../../../context/playerContexts.js";
import {
	NextIcon,
	PauseIcon,
	PlayIcon,
	PrevIcon,
	RepeatIcon,
	ShuffleIcon,
} from "../../shared/icons/Icons.jsx";
import "./PlayerControls.css";

const REPEAT_TITLES = {
	one: "Repeat One (track repeats)",
	all: "Repeat All",
	off: "Repeat Off",
};

/**
 * Рендерит 5 транспортных кнопок.
 * @param {{ size?: "compact" | "large" }} props - `"compact"` в нижней капсуле, `"large"` в FullscreenPlayer
 */
function PlayerControls({ size = "compact" }) {
	const { isPlaying, isShuffle, repeatMode } = usePlayerState();
	const { togglePlay, prevTrack, nextTrack, toggleShuffle, cycleRepeat } =
		usePlayerActions();

	const repeatTitle = REPEAT_TITLES[repeatMode] ?? REPEAT_TITLES.off;

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
				<ShuffleIcon />
			</button>

			<button
				type="button"
				className="ctrl-btn"
				onClick={prevTrack}
				title="Previous track"
				aria-label="Previous track"
			>
				<PrevIcon />
			</button>

			<button
				type="button"
				className="ctrl-btn ctrl-play"
				onClick={togglePlay}
				title={isPlaying ? "Pause (Space)" : "Play (Space)"}
				aria-label={isPlaying ? "Pause" : "Play"}
			>
				{isPlaying ? <PauseIcon /> : <PlayIcon />}
			</button>

			<button
				type="button"
				className="ctrl-btn"
				onClick={() => nextTrack(false)}
				title="Next track"
				aria-label="Next track"
			>
				<NextIcon />
			</button>

			<button
				type="button"
				className={`ctrl-btn ctrl-secondary ${repeatMode !== "off" ? "is-active" : ""}`}
				onClick={cycleRepeat}
				title={repeatTitle}
				aria-label={repeatTitle}
				aria-pressed={repeatMode !== "off"}
			>
				<RepeatIcon />
				{repeatMode === "one" && <span className="ctrl-repeat-one">1</span>}
			</button>
		</div>
	);
}

export default PlayerControls;
