import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useVerticalScroll } from "../../../hooks/useVerticalScroll.js";
import { musicApi } from "../../../api/musicApi.js";
import { formatTotalDuration } from "../../../utils/format.js";
import { handleCoverError } from "../../../utils/cover.js";
import { usePlayerActions, usePlayerState } from "../../../context/playerContexts.js";
import ArtistLinks from "../../shared/artist-links/ArtistLinks.jsx";
import { PlayIcon } from "../../shared/icons/Icons.jsx";
import TrackRow from "../../shared/track-row/TrackRow.jsx";
import "./PlaylistPage.css";

function PlaylistPage({ kind = "playlist" }) {
	const { id } = useParams();
	const scrollRef = useVerticalScroll();

	const { currentTrack, isPlaying, likedIds, durationOverrides } =
		usePlayerState();
	const { playTrack, playQueue, toggleLike } = usePlayerActions();

	const collection = useMemo(
		() =>
			kind === "album"
				? musicApi.getAlbum(id)
				: musicApi.getPlaylist(id, likedIds),
		[kind, id, likedIds],
	);

	const tracks = useMemo(() => collection?.tracks ?? [], [collection]);
	const likedSet = useMemo(() => new Set(likedIds), [likedIds]);
	const hasMultipleDiscs = tracks.some((t) => (t.disc_no || 1) > 1);

	const discGroups = useMemo(() => {
		if (!hasMultipleDiscs) return [{ discNo: 1, tracks }];
		const map = new Map();
		tracks.forEach((t) => {
			const d = t.disc_no || 1;
			if (!map.has(d)) map.set(d, []);
			map.get(d).push(t);
		});
		return Array.from(map.entries())
			.sort((a, b) => a[0] - b[0])
			.map(([discNo, list]) => ({ discNo, tracks: list }));
	}, [hasMultipleDiscs, tracks]);

	if (!collection) {
		return (
			<div className="page-scroll playlist-page" ref={scrollRef}>
				<div className="collection-empty">
					<h2>Collection not found</h2>
					<Link to="/" className="btn-secondary-link">
						Back to Now Playing
					</Link>
				</div>
			</div>
		);
	}

	const totalMs = tracks.reduce(
		(acc, t) => acc + (durationOverrides[t.id] || t.duration_ms || 0),
		0,
	);
	const releaseYear = collection.release_date?.slice(0, 4);

	return (
		<div className="page-scroll playlist-page" ref={scrollRef}>
			<header className="collection-hero">
				<div className="collection-cover">
					{collection.cover?.medium_url && (
						<img
							src={collection.cover.medium_url}
							alt={collection.title}
							draggable={false}
							onError={(e) => handleCoverError(e, collection.cover, "medium")}
						/>
					)}
				</div>

				<div className="collection-meta">
					<span className="collection-badge">
						{(collection.type || kind).toUpperCase()}
					</span>
					<h1 className="collection-title">{collection.title}</h1>

					{collection.artists?.length > 0 && (
						<div className="collection-artists">
							<ArtistLinks
								artists={collection.artists}
								linkClassName="collection-artist-link"
							/>
						</div>
					)}

					{collection.description && (
						<p className="collection-description">{collection.description}</p>
					)}

					<span className="collection-stats">
						{releaseYear ? `${releaseYear} • ` : ""}
						{tracks.length} {tracks.length === 1 ? "TRACK" : "TRACKS"}
						{totalMs > 0 ? ` • ${formatTotalDuration(totalMs)}` : ""}
					</span>

					<div className="collection-actions">
						<button
							type="button"
							className="btn-primary"
							disabled={tracks.length === 0}
							onClick={() => playQueue(tracks, { shuffle: false })}
						>
							<PlayIcon />
							<span>Play</span>
						</button>
						<button
							type="button"
							className="btn-secondary"
							disabled={tracks.length === 0}
							onClick={() => playQueue(tracks, { shuffle: true })}
						>
							Shuffle
						</button>
					</div>
				</div>
			</header>

			{tracks.length === 0 ? (
				<p className="collection-empty-hint">
					{id === "favourites"
						? "No favourite tracks yet. Click ♥ on any track to save it here."
						: "This collection has no tracks yet."}
				</p>
			) : (
				discGroups.map((group) => (
					<div key={group.discNo} className="collection-disc-block">
						{hasMultipleDiscs && (
							<div className="collection-disc-label">DISC {group.discNo}</div>
						)}
						<ul className="Library is-embedded">
							{group.tracks.map((track, idx) => {
								const isCurrent = currentTrack?.id === track.id;
								return (
									<TrackRow
										key={track.id}
										track={track}
										trackList={tracks}
										index={kind === "album" ? track.track_no || idx + 1 : idx + 1}
										durationMsOverride={durationOverrides[track.id]}
										isCurrent={isCurrent}
										isPlaying={isCurrent && isPlaying}
										isLiked={likedSet.has(track.id)}
										onPlay={playTrack}
										onToggleLike={toggleLike}
									/>
								);
							})}
						</ul>
					</div>
				))
			)}
		</div>
	);
}

export default PlaylistPage;
