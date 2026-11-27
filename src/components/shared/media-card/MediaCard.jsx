// ============================================================================
// Универсальная карточка альбома / плейлиста (`MediaCard`)
// ============================================================================
import { memo } from "react";
import { Link } from "react-router-dom";
import { formatArtistNames, formatTrackCount } from "../../../utils/format.js";
import CollectionCover from "../collection-cover/CollectionCover.jsx";
import "./MediaCard.css";

/**
 * Карточка коллекции с адаптивным размером и переходом на страницу альбома/плейлиста.
 */
const MediaCard = memo(function MediaCard({ item, fluid = false, compact = false }) {
	const to = item.type === "playlist" ? `/playlist/${item.id}` : `/album/${item.id}`;
	const artistNames = formatArtistNames(item.artists);
	const year = item.release_date?.slice(0, 4);
	const trackCount =
		item.track_count ?? item.tracks?.length ?? item.track_ids?.length ?? 0;

	const playlistPrefix = item.id === "favourites" ? "FAVOURITES" : "PLAYLIST";
	const metaLine =
		item.type === "playlist"
			? `${playlistPrefix}${trackCount ? ` • ${formatTrackCount(trackCount, { uppercase: true })}` : ""}`
			: [item.type?.toUpperCase(), year, artistNames].filter(Boolean).join(" • ");

	return (
		<Link
			to={to}
			className={`media-card ${fluid ? "is-fluid" : ""} ${compact ? "is-compact" : ""}`}
		>
			<div className="media-card-cover-wrap">
				<CollectionCover
					item={item}
					size="medium"
					className="media-card-cover"
					lazy
				/>
			</div>

			<span className="media-card-title">{item.title}</span>
			{metaLine && <span className="media-card-subtitle">{metaLine}</span>}
		</Link>
	);
});

export default MediaCard;
