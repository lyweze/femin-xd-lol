// ============================================================================
// Детальная страница альбома, плейлиста или Избранного (`PlaylistPage`)
// Для пользовательских плейлистов поддерживает редактирование обложки, названия,
// описания, состава/порядка треков и удаление через `PlaylistEditModal`.
// ============================================================================
import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useVerticalScroll } from "../../../hooks/useVerticalScroll.js";
import { musicApi } from "../../../api/musicApi.js";
import { formatTotalDuration, formatTrackCount } from "../../../utils/format.js";
import { usePlayerActions, usePlayerState } from "../../../context/playerContexts.js";
import PlaylistEditModal from "../../playlist/playlist-edit-modal/PlaylistEditModal.jsx";
import ArtistLinks from "../../shared/artist-links/ArtistLinks.jsx";
import CollectionActions from "../../shared/collection-actions/CollectionActions.jsx";
import CollectionCover from "../../shared/collection-cover/CollectionCover.jsx";
import { CameraIcon } from "../../shared/icons/Icons.jsx";
import TrackList from "../../shared/track-list/TrackList.jsx";
import "./PlaylistPage.css";

/** Группирует треки многодискового альбома по `disc_no` в порядке возрастания */
function groupTracksByDisc(tracks, hasMultipleDiscs) {
	if (!hasMultipleDiscs) return [{ discNo: 1, tracks }];
	const map = new Map();
	tracks.forEach((t) => {
		const disc = t.disc_no || 1;
		if (!map.has(disc)) map.set(disc, []);
		map.get(disc).push(t);
	});
	return Array.from(map.entries())
		.sort((a, b) => a[0] - b[0])
		.map(([discNo, list]) => ({ discNo, tracks: list }));
}

function PlaylistPage({ kind = "playlist" }) {
	const { id } = useParams();
	const navigate = useNavigate();
	const scrollRef = useVerticalScroll();
	const [isEditing, setIsEditing] = useState(false);

	const { likedIds, playlists, catalogTracks, durationOverrides } = usePlayerState();
	const { playQueue, updatePlaylist, deletePlaylist } = usePlayerActions();

	const collection = useMemo(
		() =>
			kind === "album"
				? musicApi.getAlbum(id)
				: musicApi.getPlaylist(id, likedIds, playlists, catalogTracks),
		[kind, id, likedIds, playlists, catalogTracks],
	);

	const tracks = useMemo(() => collection?.tracks ?? [], [collection]);
	const hasMultipleDiscs = tracks.some((t) => (t.disc_no || 1) > 1);
	const discGroups = useMemo(
		() => groupTracksByDisc(tracks, hasMultipleDiscs),
		[hasMultipleDiscs, tracks],
	);

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

	const isEditablePlaylist = kind === "playlist" && id !== "favourites";
	const totalMs = tracks.reduce(
		(acc, t) => acc + (durationOverrides[t.id] || t.duration_ms || 0),
		0,
	);
	const releaseYear = collection.release_date?.slice(0, 4);

	return (
		<div className="page-scroll playlist-page" ref={scrollRef}>
			<header className="collection-hero">
				<div className="collection-cover">
					<CollectionCover item={collection} size="medium" className="is-hero" />

					{isEditablePlaylist && (
						<button
							type="button"
							className="collection-cover-edit-overlay"
							onClick={() => setIsEditing(true)}
							aria-label="Edit playlist details and cover"
						>
							<CameraIcon size={20} />
							<span>Edit cover</span>
						</button>
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
						{formatTrackCount(tracks.length, { uppercase: true })}
						{totalMs > 0 ? ` • ${formatTotalDuration(totalMs)}` : ""}
					</span>

					<CollectionActions
						tracks={tracks}
						onPlayQueue={playQueue}
						onEdit={isEditablePlaylist ? () => setIsEditing(true) : undefined}
					/>
				</div>
			</header>

			{tracks.length === 0 ? (
				<p className="collection-empty-hint">
					{id === "favourites"
						? "No favourite tracks yet. Click ♥ on any track to save it here."
						: isEditablePlaylist
							? "This playlist is empty. Click Edit to add tracks from the catalog."
							: "This collection has no tracks yet."}
				</p>
			) : (
				discGroups.map((group) => (
					<div key={group.discNo} className="collection-disc-block">
						{hasMultipleDiscs && (
							<div className="collection-disc-label">DISC {group.discNo}</div>
						)}
						<TrackList
							tracks={group.tracks}
							queueTracks={tracks}
							useTrackNumber={kind === "album"}
						/>
					</div>
				))
			)}

			{isEditablePlaylist && (
				<PlaylistEditModal
					isOpen={isEditing}
					mode="edit"
					playlist={collection}
					onSave={(payload) => updatePlaylist(collection.id, payload)}
					onDelete={() => {
						deletePlaylist(collection.id);
						navigate("/library");
					}}
					onClose={() => setIsEditing(false)}
				/>
			)}
		</div>
	);
}

export default PlaylistPage;
