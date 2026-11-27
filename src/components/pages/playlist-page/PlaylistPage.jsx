import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useVerticalScroll } from "../../../hooks/useVerticalScroll.js";
import { musicApi } from "../../../api/musicApi.js";
import { formatTotalDuration, handleCoverError } from "../../../services/mockData.js";
import { usePlayerActions, usePlayerState } from "../../../context/PlayerContext.jsx";
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

	const tracks = collection?.tracks ?? [];
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
							{collection.artists.map((artist, idx) => (
								<span key={artist.id}>
									{idx > 0 && ", "}
									<Link
										to={`/artist/${artist.id}`}
										className="collection-artist-link"
									>
										{artist.name}
									</Link>
								</span>
							))}
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
							<span className="btn-dot" aria-hidden="true" />
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
							{group.tracks.map((track, idx) => (
								<TrackRow
									key={track.id}
									track={track}
									index={kind === "album" ? track.track_no || idx + 1 : idx + 1}
									durationMsOverride={durationOverrides[track.id]}
									isCurrent={currentTrack?.id === track.id}
									isPlaying={isPlaying}
									isLiked={likedIds.includes(track.id)}
									onPlay={(t) => playTrack(t, tracks)}
									onToggleLike={toggleLike}
								/>
							))}
						</ul>
					</div>
				))
			)}
		</div>
	);
}

export default PlaylistPage;
