// ============================================================================
// Универсальная строка трека (`TrackRow`) с мемоизацией
// ============================================================================
import { memo } from "react";
import { formatDuration } from "../../../utils/format.js";
import ArtistLinks from "../artist-links/ArtistLinks.jsx";
import { HeartIcon, PauseIcon, PlayIcon } from "../icons/Icons.jsx";
import "./TrackRow.css";

const TrackRow = memo(function TrackRow({
	track,
	trackList = null,
	index,
	durationMsOverride = null,
	isCurrent = false,
	isPlaying = false,
	isLiked = false,
	onPlay,
	onToggleLike,
}) {
	const artists = track.artists ?? [];
	const mainArtists = artists.filter((a) => a.role !== "feat");
	const featArtists = artists.filter((a) => a.role === "feat");
	const effectiveDuration = durationMsOverride || track.duration_ms;

	return (
		<li
			className={`track-row ${isCurrent ? "is-current" : ""} ${isCurrent && isPlaying ? "is-playing" : ""}`}
			aria-current={isCurrent ? "true" : undefined}
			onClick={() => onPlay?.(track, trackList)}
		>
			<div className="track-row-left">
				<div className="track-row-index">
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

				<div className="track-row-meta">
					<div className="track-row-title-line">
						<span className="track-row-title">{track.title}</span>
						{track.explicit && (
							<span className="track-row-explicit" title="Explicit">
								E
							</span>
						)}
					</div>

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
