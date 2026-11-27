// ============================================================================
// Полноэкранный плеер в стиле Apple Music (`FullscreenPlayer`)
// - Если у трека есть текст: 2 колонки (крупная обложка + контролы слева, текст справа)
// - Если текста нет: колонка текста не рендерится, обложка и плеер центрируются
// ============================================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	usePlayerActions,
	usePlayerState,
	usePlayerTime,
} from "../../../context/PlayerContext.jsx";
import { musicApi } from "../../../api/musicApi.js";
import { handleCoverError } from "../../../services/mockData.js";
import PlayerControls from "../player-controls/PlayerControls.jsx";
import ProgressBar from "../progress-bar/ProgressBar.jsx";
import "./FullscreenPlayer.css";

function FullscreenPlayer() {
	const navigate = useNavigate();
	const {
		currentTrack,
		isPlaying,
		likedIds,
		isFullscreenOpen,
		showLyrics,
		volume,
		isMuted,
	} = usePlayerState();
	const { currentTimeMs } = usePlayerTime();
	const {
		seekToMs,
		closeFullscreen,
		toggleShowLyrics,
		toggleLike,
		setVolume,
		toggleMute,
	} = usePlayerActions();

	const lyricsItems = useMemo(
		() => (currentTrack ? musicApi.getTrackLyrics(currentTrack.id) : []),
		[currentTrack],
	);

	const [activeLang, setActiveLang] = useState("");
	const activeLineRef = useRef(null);

	useEffect(() => {
		if (lyricsItems.length === 0) {
			setActiveLang("");
			return;
		}
		setActiveLang((prev) =>
			lyricsItems.some((item) => item.language === prev)
				? prev
				: lyricsItems[0].language,
		);
	}, [lyricsItems]);

	const activeLyrics =
		lyricsItems.find((item) => item.language === activeLang) ??
		lyricsItems[0] ??
		null;

	const hasLyrics = Boolean(activeLyrics && activeLyrics.lines?.length > 0);
	const displayLyricsPane = hasLyrics && showLyrics;

	const activeLineIndex = useMemo(() => {
		if (!activeLyrics?.synced || !activeLyrics.lines?.length) return -1;
		const adjustedMs = currentTimeMs + (activeLyrics.offset_ms || 0);
		let found = -1;
		for (let i = 0; i < activeLyrics.lines.length; i += 1) {
			if (adjustedMs >= activeLyrics.lines[i].start_ms) {
				found = i;
			} else {
				break;
			}
		}
		return found;
	}, [activeLyrics, currentTimeMs]);

	// Автоскролл к активной строке в синхронизированном тексте
	useEffect(() => {
		if (!isFullscreenOpen || !displayLyricsPane || activeLineIndex < 0) return;
		activeLineRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "center",
		});
	}, [activeLineIndex, isFullscreenOpen, displayLyricsPane]);

	if (!currentTrack) return null;

	const isLiked = likedIds.includes(currentTrack.id);
	const volumePercent = `${Math.round((isMuted ? 0 : volume) * 100)}%`;

	const navigateAndClose = (path) => {
		closeFullscreen();
		navigate(path);
	};

	return (
		<div
			className={`fs-player ${isFullscreenOpen ? "is-open" : ""}`}
			role="dialog"
			aria-modal="true"
			aria-label="Fullscreen player"
			aria-hidden={!isFullscreenOpen}
		>
			{/* Динамический размытый фон обложки в стиле Apple Music */}
			<div className="fs-backdrop" aria-hidden="true">
				{currentTrack.cover?.large_url && (
					<>
						<img
							key={`a-${currentTrack.cover.large_url}`}
							className="fs-backdrop-img is-primary"
							src={currentTrack.cover.large_url}
							alt=""
							draggable={false}
							onError={(e) => handleCoverError(e, currentTrack.cover, "large")}
						/>
						<img
							key={`b-${currentTrack.cover.large_url}`}
							className="fs-backdrop-img is-secondary"
							src={currentTrack.cover.large_url}
							alt=""
							draggable={false}
							onError={(e) => handleCoverError(e, currentTrack.cover, "large")}
						/>
					</>
				)}
				<div className="fs-backdrop-scrim" />
				<div className="fs-backdrop-grain" />
			</div>

			{/* Верхняя панель навигации полноэкранного режима */}
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
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
							<path
								d="M3.5 6L8 10.5L12.5 6"
								stroke="currentColor"
								strokeWidth="1.6"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</button>
				</div>
			</header>

			{/* Основная сетка: центрированная без текста или 2-колоночная с текстом */}
			<div
				className={`fs-stage ${displayLyricsPane ? "has-lyrics" : "is-centered"}`}
			>
				<section className="fs-deck">
					<div className={`fs-artwork-wrap ${isPlaying ? "is-playing" : "is-paused"}`}>
						{currentTrack.cover?.large_url && (
							<img
								className="fs-artwork"
								src={currentTrack.cover.large_url}
								alt={currentTrack.title}
								draggable={false}
								onError={(e) => handleCoverError(e, currentTrack.cover, "large")}
							/>
						)}
					</div>

					<div className="fs-track-head">
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
								{currentTrack.artists?.map((artist, idx) => (
									<span key={artist.id}>
										{idx > 0 && ", "}
										<button
											type="button"
											className="fs-artist-btn"
											onClick={() => navigateAndClose(`/artist/${artist.id}`)}
										>
											{artist.name}
										</button>
									</span>
								))}
							</div>
						</div>

						<button
							type="button"
							className={`fs-like-btn ${isLiked ? "is-active" : ""}`}
							onClick={() => toggleLike(currentTrack.id)}
							aria-label={isLiked ? "Unlike track" : "Like track"}
							aria-pressed={isLiked}
						>
							♥
						</button>
					</div>

					<div className="fs-progress">
						<ProgressBar variant="fullscreen" />
					</div>

					<div className="fs-controls-row">
						<PlayerControls size="large" />
					</div>

					<div className="fs-volume-row">
						<button
							type="button"
							className="fs-vol-icon"
							onClick={toggleMute}
							aria-label={isMuted ? "Unmute" : "Mute"}
						>
							{isMuted || volume === 0 ? (
								<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
									<path
										d="M2.5 6.2h2.4l3.3-2.8v9.2L4.9 9.8H2.5V6.2zm8.5.3l3 3m0-3l-3 3"
										stroke="currentColor"
										strokeWidth="1.35"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							) : (
								<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
									<path
										d="M2.5 6.2h2.4l3.3-2.8v9.2L4.9 9.8H2.5V6.2zm8.2-.2a3 3 0 010 4m2-5.8a5.5 5.5 0 010 7.6"
										stroke="currentColor"
										strokeWidth="1.35"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							)}
						</button>

						<input
							type="range"
							className="volume-slider is-wide"
							min="0"
							max="1"
							step="0.02"
							value={isMuted ? 0 : volume}
							style={{ "--vol": volumePercent }}
							onChange={(e) => setVolume(Number(e.target.value))}
							aria-label="Volume"
						/>
					</div>
				</section>

				{/* Колонка текста рендерится ТОЛЬКО если у трека реально есть текст */}
				{displayLyricsPane && (
					<section className="fs-lyrics-pane" aria-label="Track lyrics">
						{lyricsItems.length > 1 && (
							<div className="fs-lyrics-langs" role="tablist">
								{lyricsItems.map((item) => (
									<button
										key={item.language}
										type="button"
										className={`fs-pill-btn ${item.language === activeLyrics.language ? "is-active" : ""}`}
										onClick={() => setActiveLang(item.language)}
									>
										{item.language.toUpperCase()}
									</button>
								))}
							</div>
						)}

						<div className="fs-lyrics-scroll">
							{activeLyrics.lines.map((line, idx) => {
								const isActive = activeLyrics.synced && idx === activeLineIndex;
								const isPassed = activeLyrics.synced && idx < activeLineIndex;

								return (
									<p
										key={`${activeLyrics.language}-${idx}`}
										ref={isActive ? activeLineRef : undefined}
										className={`fs-lyrics-line ${!activeLyrics.synced ? "is-static" : ""} ${isActive ? "is-active" : ""} ${isPassed ? "is-passed" : ""}`}
										onClick={() => {
											if (!activeLyrics.synced) return;
											seekToMs(
												Math.max(0, line.start_ms - (activeLyrics.offset_ms || 0)),
											);
										}}
									>
										{Array.isArray(line.words) && line.words.length > 0
											? line.words.map((word, wIdx) => {
													const adjustedMs =
														currentTimeMs + (activeLyrics.offset_ms || 0);
													const wordActive =
														isActive &&
														adjustedMs >= word.start_ms &&
														adjustedMs <= word.end_ms;
													return (
														<span
															key={wIdx}
															className={wordActive ? "is-word-active" : ""}
														>
															{word.text}{" "}
														</span>
													);
												})
											: line.text}
									</p>
								);
							})}
						</div>
					</section>
				)}
			</div>
		</div>
	);
}

export default FullscreenPlayer;
