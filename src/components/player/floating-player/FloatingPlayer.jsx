// ============================================================================
// Парящая стеклянная капсула нижнего плеера (`FloatingPlayer`)
// ============================================================================
import { usePlayerActions, usePlayerState } from "../../../context/playerContexts.js";
import { handleCoverError } from "../../../utils/cover.js";
import ArtistLinks from "../../shared/artist-links/ArtistLinks.jsx";
import { ExpandIcon, HeartIcon, LyricsIcon } from "../../shared/icons/Icons.jsx";
import VolumeControl from "../../shared/volume-control/VolumeControl.jsx";
import PlayerControls from "../player-controls/PlayerControls.jsx";
import ProgressBar from "../progress-bar/ProgressBar.jsx";
import "./FloatingPlayer.css";

function FloatingPlayer() {
	const { currentTrack, likedIds, isFullscreenOpen, volume, isMuted } =
		usePlayerState();
	const { toggleLike, openFullscreen, setVolume, toggleMute } =
		usePlayerActions();

	if (!currentTrack) return null;

	const isLiked = likedIds.includes(currentTrack.id);
	const hasLyrics = (currentTrack.lyrics_languages?.length ?? 0) > 0;

	return (
		<div className={`player-wrapper ${isFullscreenOpen ? "is-hidden" : ""}`}>
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
						<span className="player-cover-expand" aria-hidden="true">
							<ExpandIcon />
						</span>
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
							<ArtistLinks
								artists={currentTrack.artists}
								linkClassName="player-artist-link"
							/>
						</div>
					</div>
				</div>

				{/* 2. Центр: управление воспроизведением + полоса прогресса */}
				<div className="player-center">
					<PlayerControls />
					<ProgressBar />
				</div>

				{/* 3. Правый блок: лайк, текст песни и громкость */}
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
			</section>
		</div>
	);
}

export default FloatingPlayer;
