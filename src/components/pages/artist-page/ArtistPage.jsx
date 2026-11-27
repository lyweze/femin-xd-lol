// ============================================================================
// Страница исполнителя (`ArtistPage`): шапка, популярные треки и дискография
// ============================================================================
import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useVerticalScroll } from "../../../hooks/useVerticalScroll.js";
import { useHorizontalScroll } from "../../../hooks/useHorizontalScroll.js";
import { musicApi } from "../../../api/musicApi.js";
import { handleCoverError } from "../../../utils/cover.js";
import { usePlayerActions, usePlayerState } from "../../../context/playerContexts.js";
import CollectionActions from "../../shared/collection-actions/CollectionActions.jsx";
import MediaCard from "../../shared/media-card/MediaCard.jsx";
import TrackList from "../../shared/track-list/TrackList.jsx";
import "./ArtistPage.css";

const POPULAR_TRACKS_LIMIT = 5;

function ArtistPage() {
	const { id } = useParams();
	const scrollRef = useVerticalScroll();
	const discographyRef = useHorizontalScroll();
	const [isBioExpanded, setIsBioExpanded] = useState(false);

	const { catalogTracks } = usePlayerState();
	const { playQueue } = usePlayerActions();

	const artist = useMemo(
		() => musicApi.getArtist(id, catalogTracks),
		[id, catalogTracks],
	);
	const topTracks = useMemo(() => artist?.topTracks ?? [], [artist]);
	const albums = useMemo(() => artist?.albums ?? [], [artist]);

	if (!artist) {
		return (
			<div className="page-scroll artist-page" ref={scrollRef}>
				<div className="artist-not-found">
					<h2>Artist not found</h2>
					<Link to="/" className="artist-back-link">
						Back to Now Playing
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="page-scroll artist-page" ref={scrollRef}>
			<header className="artist-hero">
				<div className="artist-avatar">
					{artist.avatar?.medium_url ? (
						<img
							src={artist.avatar.medium_url}
							alt={artist.name}
							draggable={false}
							onError={(e) => handleCoverError(e, artist.avatar, "medium")}
						/>
					) : (
						<span>{artist.name[0]?.toUpperCase()}</span>
					)}
				</div>

				<div className="artist-meta">
					<span className="artist-badge">ARTIST</span>
					<h1 className="artist-name">{artist.name}</h1>

					{artist.bio && (
						<p
							className={`artist-bio ${isBioExpanded ? "is-expanded" : ""}`}
							onClick={() => setIsBioExpanded((prev) => !prev)}
							title="Click to expand bio"
						>
							{artist.bio}
						</p>
					)}

					<CollectionActions
						tracks={topTracks}
						onPlayQueue={playQueue}
						playLabel="Play Artist"
					/>
				</div>
			</header>

			{topTracks.length > 0 && (
				<section className="artist-section">
					<h2 className="section-title">Popular</h2>
					<TrackList
						tracks={topTracks.slice(0, POPULAR_TRACKS_LIMIT)}
						queueTracks={topTracks}
					/>
				</section>
			)}

			{albums.length > 0 && (
				<section className="artist-section">
					<h2 className="section-title">Discography</h2>
					<div className="Playlists" ref={discographyRef}>
						{albums.map((album) => (
							<MediaCard key={album.id} item={album} compact />
						))}
					</div>
				</section>
			)}
		</div>
	);
}

export default ArtistPage;
