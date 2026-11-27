// ============================================================================
// Парящая стеклянная капсула нижнего плеера (`FloatingPlayer`)
// Адаптивна: 3-колоночная на десктопе и эргономичный мини-плеер на мобильных
// ============================================================================
import {
	usePlayerActions,
	usePlayerState,
	usePlayerTime,
} from "../../../context/playerContexts.js";
import { handleCoverError } from "../../../utils/cover.js";
import { formatArtistNames } from "../../../utils/format.js";
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

/**
 * Тонкая 2px-полоса прогресса на дне мобильной капсулы (изолирована по `usePlayerTime`).
 */
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

/** Мобильная раскладка мини-плеера: зона обложки открывает экран трека + Lyrics (если есть), Play/Pause и Next */
function MobileFloatingBar({
	currentTrack,
	isPlaying,
	hasLyrics,
	isFullscreenOpen,
	onOpenFullscreen,
	onTogglePlay,
	onNext,
}) {
	return (
		<div className={`player-wrapper is-mobile ${isFullscreenOpen ? "is-hidden" : ""}`}>
			<section className="player-capsule" aria-label="Now playing bar">
				<button
					type="button"
					className="player-mobile-open-btn"
					onClick={() => onOpenFullscreen(false)}
					aria-label={`Open fullscreen player for ${currentTrack.title}`}
				>
					<span className="player-mobile-cover-wrap">
						{currentTrack.cover?.small_url && (
							<img
								key={currentTrack.id}
								className="player-cover"
								src={currentTrack.cover.small_url}
								alt=""
								draggable={false}
								onError={(e) => handleCoverError(e, currentTrack.cover, "small")}
							/>
						)}
					</span>

					<span key={currentTrack.id} className="player-meta">
						<span className="player-title-text">{currentTrack.title}</span>
						<span className="player-artists">
							{formatArtistNames(currentTrack.artists)}
						</span>
					</span>
				</button>

				<div className="player-mobile-actions">
					{hasLyrics && (
						<button
							type="button"
							className="player-mobile-lyrics-btn"
							onClick={() => onOpenFullscreen(true)}
							aria-label="Open lyrics"
						>
							<LyricsIcon />
						</button>
					)}

					<button
						type="button"
						className="player-mobile-play-btn"
						onClick={onTogglePlay}
						aria-label={isPlaying ? "Pause" : "Play"}
					>
						{isPlaying ? <PauseIcon /> : <PlayIcon />}
					</button>

					<button
						type="button"
						className="player-mobile-next-btn"
						onClick={() => onNext(false)}
						aria-label="Next track"
					>
						<NextIcon />
					</button>
				</div>

				<MobileMiniProgress />
			</section>
		</div>
	);
}

/** Десктопная и планшетная 3-колоночная раскладка нижней капсулы */
function DesktopFloatingBar({
	currentTrack,
	isLiked,
	hasLyrics,
	isFullscreenOpen,
	volume,
	isMuted,
	onOpenFullscreen,
	onToggleLike,
	onSetVolume,
	onToggleMute,
}) {
	return (
		<div className={`player-wrapper ${isFullscreenOpen ? "is-hidden" : ""}`}>
			<section className="player-capsule" aria-label="Now playing bar">
				{/* 1. Обложка + название и кликабельные ссылки на артистов */}
				<div className="player-track">
					<button
						type="button"
						className="player-cover-btn"
						onClick={() => onOpenFullscreen(true)}
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
							onClick={() => onOpenFullscreen(true)}
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

				{/* 2. Центр: управление воспроизведением + монолитная полоса прогресса */}
				<div className="player-center">
					<PlayerControls />
					<ProgressBar />
				</div>

				{/* 3. Правый блок: лайк, текст песни и регулятор громкости */}
				<div className="player-extra">
					<button
						type="button"
						className={`player-icon-btn player-like-btn ${isLiked ? "is-active" : ""}`}
						onClick={() => onToggleLike(currentTrack.id)}
						title={isLiked ? "Remove from Favourites" : "Add to Favourites"}
						aria-label={isLiked ? "Unlike track" : "Like track"}
						aria-pressed={isLiked}
					>
						<HeartIcon filled={isLiked} size={15} />
					</button>

					<button
						type="button"
						className="player-icon-btn"
						onClick={() => onOpenFullscreen(true)}
						disabled={!hasLyrics}
						title={hasLyrics ? "Open lyrics" : "No lyrics for this track"}
						aria-label="Open lyrics"
					>
						<LyricsIcon />
					</button>

					<VolumeControl
						volume={volume}
						isMuted={isMuted}
						onToggleMute={onToggleMute}
						onChangeVolume={onSetVolume}
						containerClassName="player-volume"
						buttonClassName="player-icon-btn"
					/>
				</div>
			</section>
		</div>
	);
}

function FloatingPlayer({ isMobile = false }) {
	const {
		currentTrack,
		isPlaying,
		likedIds,
		lyricsByTrack,
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
	const hasLyrics =
		(lyricsByTrack?.[currentTrack.id]?.length ??
			currentTrack.lyrics_languages?.length ??
			0) > 0;

	if (isMobile) {
		return (
			<MobileFloatingBar
				currentTrack={currentTrack}
				isPlaying={isPlaying}
				hasLyrics={hasLyrics}
				isFullscreenOpen={isFullscreenOpen}
				onOpenFullscreen={openFullscreen}
				onTogglePlay={togglePlay}
				onNext={nextTrack}
			/>
		);
	}

	return (
		<DesktopFloatingBar
			currentTrack={currentTrack}
			isLiked={isLiked}
			hasLyrics={hasLyrics}
			isFullscreenOpen={isFullscreenOpen}
			volume={volume}
			isMuted={isMuted}
			onOpenFullscreen={openFullscreen}
			onToggleLike={toggleLike}
			onSetVolume={setVolume}
			onToggleMute={toggleMute}
		/>
	);
}

export default FloatingPlayer;
