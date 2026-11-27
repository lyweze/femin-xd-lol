// ============================================================================
// Адаптивный фон под обложку текущего трека (`AmbientBg`)
// ============================================================================
import { usePlayerState } from "../../../context/playerContexts.js";
import AmbientBackdrop from "../../shared/ambient-backdrop/AmbientBackdrop.jsx";

function AmbientBg() {
	const { currentTrack } = usePlayerState();

	return (
		<AmbientBackdrop
			coverUrl={currentTrack?.cover?.small_url ?? null}
			fallbackAccent={currentTrack?.accent}
			variant="main"
		/>
	);
}

export default AmbientBg;
