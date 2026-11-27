// ============================================================================
// Полноэкранный плеер (`FullscreenPlayer`)
// Полностью размонтирован, пока закрыт; на мобильных закрывается свайпом вниз.
// ============================================================================
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayerActions, usePlayerState } from "../../../context/playerContexts.js";
import { useSwipeToDismiss } from "../../../hooks/useSwipeToDismiss.js";
import { musicApi } from "../../../api/musicApi.js";
import { handleCoverError } from "../../../utils/cover.js";
import AmbientBackdrop from "../../shared/ambient-backdrop/AmbientBackdrop.jsx";
import ArtistLinks from "../../shared/artist-links/ArtistLinks.jsx";
import { ChevronDownIcon, HeartIcon } from "../../shared/icons/Icons.jsx";
import VolumeControl from "../../shared/volume-control/VolumeControl.jsx";
import PlayerControls from "../player-controls/PlayerControls.jsx";
import ProgressBar from "../progress-bar/ProgressBar.jsx";
import FullscreenLyricsPane from "./FullscreenLyricsPane.jsx";
import "./FullscreenPlayer.css";

const SWIPE_CLOSE_THRESHOLD_PX = 90;

/** Проверяет, находится ли касание внутри скролла текстов или слайдера */
const shouldIgnoreSwipeTarget = (target) =>
	Boolean(target?.closest?.(".fs-lyrics-scroll, [role='slider']"));

function FullscreenPlayerContent({ isMobile }) {
	const navigate = useNavigate();
	const {
		currentTrack,
		isPlaying,
		likedIds,
		lyricsByTrack,
		fullscreenPhase,
		isFullscreenOpen,
		showLyrics,
		volume,
		isMuted,
	} = usePlayerState();
	const {
		seekToMs,
		closeFullscreen,
		toggleShowLyrics,
		toggleLike,
		setVolume,
		toggleMute,
	} = usePlayerActions();

	const lyricsItems = useMemo(() => {
		if (!currentTrack) return [];
		return lyricsByTrack?.[currentTrack.id] ?? musicApi.getTrackLyrics(currentTrack.id);
	}, [currentTrack, lyricsByTrack]);

	// Запоминаем выбор языка вместе с trackId, чтобы при смене трека выбор сбрасывался сам
	const [langSelection, setLangSelection] = useState(null);

	const handleSwipeDismiss = useCallback(() => {
		closeFullscreen();
	}, [closeFullscreen]);

	const { dragOffsetY, isSwiping, touchHandlers } = useSwipeToDismiss({
		enabled: isMobile,
		thresholdPx: SWIPE_CLOSE_THRESHOLD_PX,
		onDismiss: handleSwipeDismiss,
		shouldIgnoreTarget: shouldIgnoreSwipeTarget,
	});

	const activeLang = useMemo(() => {
		if (lyricsItems.length === 0) return "";
		if (
			langSelection?.trackId === currentTrack?.id &&
			lyricsItems.some((item) => item.language === langSelection.lang)
		) {
			return langSelection.lang;
		}
		return lyricsItems[0].language;
	}, [lyricsItems, langSelection, currentTrack?.id]);

	const activeLyrics =
		lyricsItems.find((item) => item.language === activeLang) ??
		lyricsItems[0] ??
		null;

	const hasLyrics = Boolean(activeLyrics && activeLyrics.lines?.length > 0);
	const displayLyricsPane = hasLyrics && showLyrics;

	if (!currentTrack) return null;

	const isLiked = likedIds.includes(currentTrack.id);

	const navigateAndClose = (path) => {
		closeFullscreen();
		navigate(path);
	};

	const swipeInlineStyle = isSwiping
		? {
				transform: `translate3d(0, ${dragOffsetY}px, 0)`,
				opacity: Math.max(0.45, 1 - dragOffsetY / 520),
			}
		: undefined;

	return (
		<div
			className={`fs-player ${fullscreenPhase === "closing" ? "is-closing" : "is-open"} ${isSwiping ? "is-swiping" : ""}`}
			role="dialog"
			aria-modal="true"
			aria-label="Fullscreen player"
			style={swipeInlineStyle}
			{...touchHandlers}
		>
			<AmbientBackdrop
				coverUrl={currentTrack?.cover?.small_url ?? null}
				fallbackAccent={currentTrack?.accent}
				variant="fullscreen"
			/>

			<header className="fs-topbar">
				<div className="fs-topbar-left">
					{currentTrack.album_id && (
						<button
							type="button"
							className="fs-pill-btn"
							onClick={() => navigateAndClose(`/album/${currentTrack.album_id}`)}
						>
							Open Album
						</button>
					)}
				</div>

				<button
					type="button"
					className="fs-grab-handle"
					onClick={closeFullscreen}
					title="Close fullscreen (Esc)"
					aria-label="Close fullscreen"
				/>

				<div className="fs-topbar-right">
					{hasLyrics && (
						<button
							type="button"
							className={`fs-pill-btn ${displayLyricsPane ? "is-active" : ""}`}
							onClick={toggleShowLyrics}
							title="Toggle lyrics (L)"
							aria-pressed={displayLyricsPane}
						>
							Lyrics
						</button>
					)}

					<button
						type="button"
						className="fs-close-btn"
						onClick={closeFullscreen}
						title="Close (Esc)"
						aria-label="Close fullscreen player"
					>
						<ChevronDownIcon />
					</button>
				</div>
			</header>

			<div
				className={`fs-stage ${displayLyricsPane ? "has-lyrics" : "is-centered"}`}
			>
				<section className="fs-deck">
					<div className={`fs-artwork-wrap ${isPlaying ? "is-playing" : "is-paused"}`}>
						{currentTrack.cover?.large_url && (
							<img
								key={currentTrack.id}
								className="fs-artwork"
								src={currentTrack.cover.large_url}
								alt={currentTrack.title}
								draggable={false}
								onError={(e) => handleCoverError(e, currentTrack.cover, "large")}
							/>
						)}
					</div>

					<div key={currentTrack.id} className="fs-track-head">
						<div className="fs-track-titles">
							<div className="fs-title-row">
								<h2 className="fs-track-title">{currentTrack.title}</h2>
								{currentTrack.explicit && (
									<span className="fs-explicit-badge" title="Explicit">
										E
									</span>
								)}
							</div>

							<div className="fs-track-artists">
								<ArtistLinks
									artists={currentTrack.artists}
									linkClassName="fs-artist-link"
									onArtistClick={closeFullscreen}
								/>
							</div>
						</div>

						<button
							type="button"
							className={`fs-like-btn ${isLiked ? "is-active" : ""}`}
							onClick={() => toggleLike(currentTrack.id)}
							aria-label={isLiked ? "Unlike track" : "Like track"}
							aria-pressed={isLiked}
						>
							<HeartIcon filled={isLiked} size={17} />
						</button>
					</div>

					<div className="fs-progress">
						<ProgressBar variant="fullscreen" />
					</div>

					<div className="fs-controls-row">
						<PlayerControls size="large" />
					</div>

					{/* На мобильных громкость регулируется аппаратными кнопками устройства */}
					{!isMobile && (
						<VolumeControl
							volume={volume}
							isMuted={isMuted}
							onToggleMute={toggleMute}
							onChangeVolume={setVolume}
							containerClassName="fs-volume-row"
							buttonClassName="fs-vol-icon"
							variant="fullscreen"
							iconSize={15}
						/>
					)}
				</section>

				{displayLyricsPane && activeLyrics && (
					<FullscreenLyricsPane
						lyricsItems={lyricsItems}
						activeLyrics={activeLyrics}
						onSelectLang={(lang) =>
							setLangSelection({ trackId: currentTrack.id, lang })
						}
						isFullscreenOpen={isFullscreenOpen}
						onSeekToMs={seekToMs}
					/>
				)}
			</div>
		</div>
	);
}

/**
 * Обёртка-предохранитель: держит тяжёлое дерево полноэкранного плеера
 * размонтированным, пока модалка полностью закрыта.
 */
function FullscreenPlayer({ isMobile = false }) {
	const { currentTrack, isFullscreenMounted } = usePlayerState();
	if (!currentTrack || !isFullscreenMounted) return null;
	return <FullscreenPlayerContent isMobile={isMobile} />;
}

export default FullscreenPlayer;
