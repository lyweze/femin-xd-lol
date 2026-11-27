// ============================================================================
// Парящая стеклянная капсула нижнего плеера (`FloatingPlayer`)
// Адаптивна: полноценная 3-колоночная на десктопе и компактная на мобильных
// ============================================================================
import {
	usePlayerActions,
	usePlayerState,
	usePlayerTime,
} from "../../../context/playerContexts.js";
import { handleCoverError } from "../../../utils/cover.js";
import ArtistLinks from "../../shared/artist-links/ArtistLinks.jsx";
import {
	ExpandIcon,
	HeartIcon,
	LyricsIcon,
	NextIcon,
	PauseIcon,
	PlayIcon,
} from "../../shared/icons/Icons.jsx";
import VolumeControl from "../../shared/volume-control/VolumeControl.jsx";
import PlayerControls from "../player-controls/PlayerControls.jsx";
import ProgressBar from "../progress-bar/ProgressBar.jsx";
import "./FloatingPlayer.css";

function MobileMiniProgress() {
	const { progress } = usePlayerTime();
	return (
		<div className="player-mobile-progress" aria-hidden="true">
			<div
				className="player-mobile-progress-fill"
				style={{ transform: `scaleX(${progress})` }}
			/>
		</div>
	);
}

function FloatingPlayer({ isMobile = false }) {
	const {
		currentTrack,
		isPlaying,
		likedIds,
		isFullscreenOpen,
		volume,
		isMuted,
	} = usePlayerState();
	const {
		toggleLike,
		togglePlay,
		nextTrack,
		openFullscreen,
		setVolume,
		toggleMute,
	} = usePlayerActions();

	if (!currentTrack) return null;

	const isLiked = likedIds.includes(currentTrack.id);
	const hasLyrics = (currentTrack.lyrics_languages?.length ?? 0) > 0;

	return (
		<div
			className={`player-wrapper ${isMobile ? "is-mobile" : ""} ${isFullscreenOpen ? "is-hidden" : ""}`}
		>
			<section className="player-capsule" aria-label="Now playing bar">
				{/* 1. Обложка + метаданные */}
				<div className="player-track">
					<button
						type="button"
						className="player-cover-btn"
						onClick={() => openFullscreen(true)}
						title="Open fullscreen player (F)"
						aria-label="Open fullscreen player"
					>
						{currentTrack.cover?.small_url && (
							<img
								key={currentTrack.id}
								className="player-cover"
								src={currentTrack.cover.small_url}
								alt={currentTrack.title}
								draggable={false}
								onError={(e) => handleCoverError(e, currentTrack.cover, "small")}
							/>
						)}
						{!isMobile && (
							<span className="player-cover-expand" aria-hidden="true">
								<ExpandIcon />
							</span>
						)}
					</button>

					<div key={currentTrack.id} className="player-meta">
						<button
							type="button"
							className="player-title-btn"
							onClick={() => openFullscreen(true)}
							title={currentTrack.title}
						>
							{currentTrack.title}
						</button>
						<div className="player-artists">
							{isMobile ? (
								<button
									type="button"
									className="player-mobile-artist-btn"
									onClick={() => openFullscreen(true)}
								>
									{currentTrack.artists?.map((a) => a.name).join(", ")}
								</button>
							) : (
								<ArtistLinks
									artists={currentTrack.artists}
									linkClassName="player-artist-link"
								/>
							)}
						</div>
					</div>
				</div>

				{/* 2. На десктопе: центр с контролами и прогрессом + правый блок */}
				{!isMobile ? (
					<>
						<div className="player-center">
							<PlayerControls />
							<ProgressBar />
						</div>

						<div className="player-extra">
							<button
								type="button"
								className={`player-icon-btn player-like-btn ${isLiked ? "is-active" : ""}`}
								onClick={() => toggleLike(currentTrack.id)}
								title={isLiked ? "Remove from Favourites" : "Add to Favourites"}
								aria-label={isLiked ? "Unlike track" : "Like track"}
								aria-pressed={isLiked}
							>
								<HeartIcon filled={isLiked} size={15} />
							</button>

							<button
								type="button"
								className="player-icon-btn"
								onClick={() => openFullscreen(true)}
								disabled={!hasLyrics}
								title={hasLyrics ? "Open lyrics" : "No lyrics for this track"}
								aria-label="Open lyrics"
							>
								<LyricsIcon />
							</button>

							<VolumeControl
								volume={volume}
								isMuted={isMuted}
								onToggleMute={toggleMute}
								onChangeVolume={setVolume}
								containerClassName="player-volume"
								buttonClassName="player-icon-btn"
							/>
						</div>
					</>
				) : (
					<>
						<div className="player-mobile-actions">
							<button
								type="button"
								className={`player-icon-btn player-like-btn ${isLiked ? "is-active" : ""}`}
								onClick={() => toggleLike(currentTrack.id)}
								aria-label={isLiked ? "Unlike track" : "Like track"}
								aria-pressed={isLiked}
							>
								<HeartIcon filled={isLiked} size={16} />
							</button>

							<button
								type="button"
								className="player-mobile-play-btn"
								onClick={togglePlay}
								aria-label={isPlaying ? "Pause" : "Play"}
							>
								{isPlaying ? <PauseIcon /> : <PlayIcon />}
							</button>

							<button
								type="button"
								className="player-icon-btn"
								onClick={() => nextTrack(false)}
								aria-label="Next track"
							>
								<NextIcon />
							</button>
						</div>

						<MobileMiniProgress />
					</>
				)}
			</section>
		</div>
	);
}

export default FloatingPlayer;
