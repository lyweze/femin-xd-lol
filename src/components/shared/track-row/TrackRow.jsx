// ============================================================================
// Универсальная строка трека (`TrackRow`) с мемоизацией
// Поддерживает два режима левой колонки: обложка трека (по умолчанию) или номер.
// ============================================================================
import { memo } from "react";
import { formatDuration } from "../../../utils/format.js";
import ArtistLinks from "../artist-links/ArtistLinks.jsx";
import CollectionCover from "../collection-cover/CollectionCover.jsx";
import { HeartIcon, LyricsIcon, PauseIcon, PlayIcon } from "../icons/Icons.jsx";
import "./TrackRow.css";

/**
 * Рендерит одну строку трека: обложку (или порядковый номер для альбомов),
 * название + бейдж E, ссылки на основных/приглашённых артистов, кнопку текста (если есть),
 * лайк и длительность.
 */
const TrackRow = memo(function TrackRow({
	track,
	trackList = null,
	index,
	showCover = true,
	durationMsOverride = null,
	isCurrent = false,
	isPlaying = false,
	isLiked = false,
	hasLyrics = false,
	onPlay,
	onToggleLike,
	onOpenLyrics,
}) {
	const artists = track.artists ?? [];
	const mainArtists = artists.filter((a) => a.role !== "feat");
	const featArtists = artists.filter((a) => a.role === "feat");
	const effectiveDuration = durationMsOverride || track.duration_ms;

	return (
		<li
			className={[
				"track-row",
				showCover ? "has-cover" : "",
				isCurrent ? "is-current" : "",
				isCurrent && isPlaying ? "is-playing" : "",
			]
				.filter(Boolean)
				.join(" ")}
			aria-current={isCurrent ? "true" : undefined}
			onClick={() => onPlay?.(track, trackList)}
		>
			<div className="track-row-left">
				{showCover ? (
					<div className="track-row-cover">
						<CollectionCover
							item={track}
							size="small"
							className="track-row-cover-img"
							lazy
						/>

						{/* Слой состояния: эквалайзер / пауза / иконка запуска при наведении */}
						<div className="track-row-cover-overlay" aria-hidden="true">
							<span className="track-row-indicator">
								{isCurrent && isPlaying ? (
									<span className="track-row-eq">
										<i />
										<i />
										<i />
									</span>
								) : isCurrent ? (
									<span className="track-row-dot" />
								) : null}
							</span>

							<span className="track-row-hover-icon">
								{isCurrent && isPlaying ? <PauseIcon /> : <PlayIcon />}
							</span>
						</div>
					</div>
				) : (
					<div className="track-row-index">
						{/* Индикатор номера (на десктопе при hover сменяется иконкой Play/Pause) */}
						<span className="track-row-indicator">
							{isCurrent && isPlaying ? (
								<span className="track-row-eq" aria-hidden="true">
									<i />
									<i />
									<i />
								</span>
							) : isCurrent ? (
								<span className="track-row-dot" aria-hidden="true" />
							) : (
								<span>{index}</span>
							)}
						</span>

						<span className="track-row-hover-icon" aria-hidden="true">
							{isCurrent && isPlaying ? <PauseIcon /> : <PlayIcon />}
						</span>
					</div>
				)}

				<div className="track-row-meta">
					<div className="track-row-title-line">
						<span className="track-row-title">{track.title}</span>
						{track.explicit && (
							<span className="track-row-explicit" title="Explicit">
								E
							</span>
						)}
					</div>

					{/* Останавливаем всплытие клика, чтобы переход на артиста не запускал трек */}
					<div
						className="track-row-artists"
						onClick={(e) => e.stopPropagation()}
					>
						<ArtistLinks
							artists={mainArtists}
							linkClassName="track-row-artist-link"
						/>

						{featArtists.length > 0 && (
							<span className="track-row-feat">
								{" feat. "}
								<ArtistLinks
									artists={featArtists}
									linkClassName="track-row-artist-link"
								/>
							</span>
						)}
					</div>
				</div>
			</div>

			<div className="track-row-right">
				{hasLyrics && (
					<button
						type="button"
						className="track-row-lyrics-btn"
						onClick={(e) => {
							e.stopPropagation();
							onOpenLyrics?.(track, trackList);
						}}
						title="Lyrics"
						aria-label={`Open lyrics for ${track.title}`}
					>
						<LyricsIcon />
					</button>
				)}

				<button
					type="button"
					className={`track-row-like ${isLiked ? "is-liked" : ""}`}
					onClick={(e) => {
						e.stopPropagation();
						onToggleLike?.(track.id);
					}}
					aria-label={isLiked ? "Remove from liked" : "Add to liked"}
					aria-pressed={isLiked}
				>
					<HeartIcon filled={isLiked} size={13.5} />
				</button>
				<span className="track-row-duration">
					{formatDuration(effectiveDuration)}
				</span>
			</div>
		</li>
	);
});

export default TrackRow;
