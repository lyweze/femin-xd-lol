// ============================================================================
// Универсальная строка трека (`TrackRow`) с мемоизацией
// ============================================================================
import { memo } from "react";
import { Link } from "react-router-dom";
import { formatDuration } from "../../../services/mockData.js";
import "./TrackRow.css";

const TrackRow = memo(function TrackRow({
	track,
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
			onClick={() => onPlay?.(track)}
		>
			<div className="track-row-left">
				<div className="track-row-index">
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
						{mainArtists.map((artist, idx) => (
							<span key={artist.id}>
								{idx > 0 && ", "}
								<Link
									to={`/artist/${artist.id}`}
									className="track-row-artist-link"
								>
									{artist.name}
								</Link>
							</span>
						))}

						{featArtists.length > 0 && (
							<span className="track-row-feat">
								{" feat. "}
								{featArtists.map((artist, idx) => (
									<span key={artist.id}>
										{idx > 0 && ", "}
										<Link
											to={`/artist/${artist.id}`}
											className="track-row-artist-link"
										>
											{artist.name}
										</Link>
									</span>
								))}
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
					♥
				</button>
				<span className="track-row-duration">
					{formatDuration(effectiveDuration)}
				</span>
			</div>
		</li>
	);
});

export default TrackRow;
