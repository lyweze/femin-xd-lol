// ============================================================================
// Парящая стеклянная капсула нижнего плеера (`FloatingPlayer`)
// Клик по обложке открывает полноэкранный режим в стиле Apple Music
// ============================================================================
import { Link } from "react-router-dom";
import { usePlayerActions, usePlayerState } from "../../../context/PlayerContext.jsx";
import { handleCoverError } from "../../../services/mockData.js";
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
	const volumePercent = `${Math.round((isMuted ? 0 : volume) * 100)}%`;

	return (
		<div className={`player-wrapper ${isFullscreenOpen ? "is-hidden" : ""}`}>
			<section className="player-capsule" aria-label="Now playing bar">
				{/* 1. Обложка (клик открывает полноэкранный плеер) + метаданные */}
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
								className="player-cover"
								src={currentTrack.cover.small_url}
								alt={currentTrack.title}
								draggable={false}
								onError={(e) => handleCoverError(e, currentTrack.cover, "small")}
							/>
						)}
						<span className="player-cover-expand" aria-hidden="true">
							<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
								<path
									d="M10 2.5h3.5V6M6 13.5H2.5V10M13.5 2.5L9.2 6.8M2.5 13.5l4.3-4.3"
									stroke="currentColor"
									strokeWidth="1.4"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</span>
					</button>

					<div className="player-meta">
						<button
							type="button"
							className="player-title-btn"
							onClick={() => openFullscreen(true)}
							title={currentTrack.title}
						>
							{currentTrack.title}
						</button>
						<div className="player-artists">
							{currentTrack.artists?.map((artist, idx) => (
								<span key={artist.id}>
									{idx > 0 && ", "}
									<Link
										to={`/artist/${artist.id}`}
										className="player-artist-link"
									>
										{artist.name}
									</Link>
								</span>
							))}
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
						className={`player-icon-btn ${isLiked ? "is-active" : ""}`}
						onClick={() => toggleLike(currentTrack.id)}
						title={isLiked ? "Remove from Favourites" : "Add to Favourites"}
						aria-label={isLiked ? "Unlike track" : "Like track"}
						aria-pressed={isLiked}
					>
						♥
					</button>

					<button
						type="button"
						className="player-icon-btn"
						onClick={() => openFullscreen(true)}
						disabled={!hasLyrics}
						title={hasLyrics ? "Open lyrics" : "No lyrics for this track"}
						aria-label="Open lyrics"
					>
						<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path
								d="M2.5 4h11M2.5 8h8M2.5 12h5.5"
								stroke="currentColor"
								strokeWidth="1.4"
								strokeLinecap="round"
							/>
						</svg>
					</button>

					<div className="player-volume">
						<button
							type="button"
							className="player-icon-btn"
							onClick={toggleMute}
							title={isMuted ? "Unmute" : "Mute"}
							aria-label={isMuted ? "Unmute" : "Mute"}
						>
							{isMuted || volume === 0 ? (
								<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
									<path
										d="M2.5 6.2h2.4l3.3-2.8v9.2L4.9 9.8H2.5V6.2zm8.5.3l3 3m0-3l-3 3"
										stroke="currentColor"
										strokeWidth="1.3"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							) : (
								<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
									<path
										d="M2.5 6.2h2.4l3.3-2.8v9.2L4.9 9.8H2.5V6.2zm8.2-.2a3 3 0 010 4m2-5.8a5.5 5.5 0 010 7.6"
										stroke="currentColor"
										strokeWidth="1.3"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							)}
						</button>
						<input
							type="range"
							className="volume-slider"
							min="0"
							max="1"
							step="0.02"
							value={isMuted ? 0 : volume}
							style={{ "--vol": volumePercent }}
							onChange={(e) => setVolume(Number(e.target.value))}
							aria-label="Volume"
						/>
					</div>
				</div>
			</section>
		</div>
	);
}

export default FloatingPlayer;
