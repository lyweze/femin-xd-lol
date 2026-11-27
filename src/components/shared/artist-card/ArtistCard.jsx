// ============================================================================
// Универсальная карточка исполнителя (`ArtistCard`)
// ============================================================================
import { memo } from "react";
import { Link } from "react-router-dom";
import { handleCoverError } from "../../../utils/cover.js";
import "./ArtistCard.css";

const ArtistCard = memo(function ArtistCard({ artist, fluid = false }) {
	return (
		<Link
			to={`/artist/${artist.id}`}
			className={`artist-card ${fluid ? "is-fluid" : ""}`}
		>
			<div className="artist-card-avatar-wrap">
				{artist.avatar?.medium_url ? (
					<img
						className="artist-card-avatar"
						src={artist.avatar.medium_url}
						alt={artist.name}
						loading="lazy"
						draggable={false}
						onError={(e) => handleCoverError(e, artist.avatar, "medium")}
					/>
				) : (
					<span className="artist-card-initial" aria-hidden="true">
						{artist.name?.[0]?.toUpperCase() || "A"}
					</span>
				)}
			</div>

			<span className="artist-card-name">{artist.name}</span>
			<span className="artist-card-label">ARTIST</span>
		</Link>
	);
});

export default ArtistCard;
