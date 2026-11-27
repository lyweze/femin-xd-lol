// ============================================================================
// Универсальная карточка альбома / плейлиста (`MediaCard`)
// ============================================================================
import { memo } from "react";
import { Link } from "react-router-dom";
import { handleCoverError } from "../../../utils/cover.js";
import "./MediaCard.css";

const MediaCard = memo(function MediaCard({ item, fluid = false, compact = false }) {
	const to =
		item.type === "playlist" ? `/playlist/${item.id}` : `/album/${item.id}`;
	const artistNames = item.artists?.map((a) => a.name).join(", ");
	const year = item.release_date?.slice(0, 4);
	const metaLine =
		item.type === "playlist"
			? `PLAYLIST${item.track_count ? ` • ${item.track_count} TRACKS` : ""}`
			: [item.type?.toUpperCase(), year, artistNames].filter(Boolean).join(" • ");

	return (
		<Link
			to={to}
			className={`media-card ${fluid ? "is-fluid" : ""} ${compact ? "is-compact" : ""}`}
		>
			<div className="media-card-cover-wrap">
				{item.cover?.medium_url && (
					<img
						className="media-card-cover"
						src={item.cover.medium_url}
						alt={item.title}
						loading="lazy"
						draggable={false}
						onError={(e) => handleCoverError(e, item.cover, "medium")}
					/>
				)}
			</div>

			<span className="media-card-title">{item.title}</span>
			{metaLine && <span className="media-card-subtitle">{metaLine}</span>}
		</Link>
	);
});

export default MediaCard;
