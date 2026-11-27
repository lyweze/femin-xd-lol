import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useVerticalScroll } from "../../../hooks/useVerticalScroll.js";
import { useHorizontalScroll } from "../../../hooks/useHorizontalScroll.js";
import { musicApi } from "../../../api/musicApi.js";
import { handleCoverError } from "../../../services/mockData.js";
import { usePlayerActions, usePlayerState } from "../../../context/PlayerContext.jsx";
import TrackRow from "../../shared/track-row/TrackRow.jsx";
import MediaCard from "../../shared/media-card/MediaCard.jsx";
import "./ArtistPage.css";

function ArtistPage() {
	const { id } = useParams();
	const scrollRef = useVerticalScroll();
	const discographyRef = useHorizontalScroll();
	const [isBioExpanded, setIsBioExpanded] = useState(false);

	const { currentTrack, isPlaying, likedIds, durationOverrides } =
		usePlayerState();
	const { playTrack, playQueue, toggleLike } = usePlayerActions();

	const artist = useMemo(() => musicApi.getArtist(id), [id]);

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

	const topTracks = artist.topTracks ?? [];
	const albums = artist.albums ?? [];

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

					<div className="collection-actions">
						<button
							type="button"
							className="btn-primary"
							disabled={topTracks.length === 0}
							onClick={() => playQueue(topTracks, { shuffle: false })}
						>
							<span className="btn-dot" aria-hidden="true" />
							<span>Play Artist</span>
						</button>
						<button
							type="button"
							className="btn-secondary"
							disabled={topTracks.length === 0}
							onClick={() => playQueue(topTracks, { shuffle: true })}
						>
							Shuffle
						</button>
					</div>
				</div>
			</header>

			{topTracks.length > 0 && (
				<section className="artist-section">
					<h2 className="section-title">Popular</h2>
					<ul className="Library is-embedded">
						{topTracks.slice(0, 5).map((track, idx) => (
							<TrackRow
								key={track.id}
								track={track}
								index={idx + 1}
								durationMsOverride={durationOverrides[track.id]}
								isCurrent={currentTrack?.id === track.id}
								isPlaying={isPlaying}
								isLiked={likedIds.includes(track.id)}
								onPlay={(t) => playTrack(t, topTracks)}
								onToggleLike={toggleLike}
							/>
						))}
					</ul>
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
