// ============================================================================
// Медиатека пользователя (`LibraryPage`): альбомы/плейлисты, артисты и лайки
// ============================================================================
import { useMemo } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { useVerticalScroll } from "../../../hooks/useVerticalScroll.js";
import { musicApi } from "../../../api/musicApi.js";
import { MOCK_ALBUMS } from "../../../services/mockData.js";
import { usePlayerActions, usePlayerState } from "../../../context/playerContexts.js";
import ArtistCard from "../../shared/artist-card/ArtistCard.jsx";
import { PlusIcon } from "../../shared/icons/Icons.jsx";
import MediaCard from "../../shared/media-card/MediaCard.jsx";
import TrackList from "../../shared/track-list/TrackList.jsx";
import "./LibraryPage.css";

const FILTER_TABS = [
	{ id: "collections", label: "Albums & Playlists" },
	{ id: "artists", label: "Artists" },
	{ id: "liked", label: "Liked Tracks" },
	{ id: "uploads", label: "Uploads" },
];

function LibraryPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const activeTab = searchParams.get("tab") || "collections";
	const scrollRef = useVerticalScroll();
	const outletCtx = useOutletContext();

	const { likedIds, playlists, localTracks, catalogTracks } = usePlayerState();
	const { openTrackUploader } = usePlayerActions();

	const collections = useMemo(() => {
		const favourites = musicApi.getPlaylist(
			"favourites",
			likedIds,
			playlists,
			catalogTracks,
		);
		return [favourites, ...MOCK_ALBUMS, ...playlists].filter(Boolean);
	}, [likedIds, playlists, catalogTracks]);

	const likedTracks = useMemo(() => {
		const likedSet = new Set(likedIds);
		return catalogTracks.filter((t) => likedSet.has(t.id));
	}, [likedIds, catalogTracks]);

	const artists = useMemo(
		() => musicApi.getArtists(catalogTracks),
		[catalogTracks],
	);

	const setTab = (tabId) => {
		setSearchParams(tabId === "collections" ? {} : { tab: tabId }, { replace: true });
	};

	return (
		<div className="library-page">
			<header className="page-header">
				<h1 className="page-title">Library</h1>

				<div className="filter-pills" role="tablist" aria-label="Library filters">
					{FILTER_TABS.map((tab) => {
						const isActive = activeTab === tab.id;
						const countSuffix =
							tab.id === "liked"
								? ` (${likedTracks.length})`
								: tab.id === "uploads"
									? ` (${localTracks.length})`
									: "";

						return (
							<button
								key={tab.id}
								type="button"
								role="tab"
								aria-selected={isActive}
								className={`pill-btn ${isActive ? "is-active" : ""}`}
								onClick={() => setTab(tab.id)}
							>
								{tab.label}
								{countSuffix}
							</button>
						);
					})}

					<div className="library-header-actions">
						<button
							type="button"
							className="pill-btn is-create"
							onClick={openTrackUploader}
						>
							<PlusIcon size={12} />
							<span>Add Track</span>
						</button>

						{activeTab === "collections" && outletCtx?.openCreatePlaylist && (
							<button
								type="button"
								className="pill-btn is-create"
								onClick={outletCtx.openCreatePlaylist}
							>
								<PlusIcon size={12} />
								<span>New Playlist</span>
							</button>
						)}
					</div>
				</div>
			</header>

			<div className="page-scroll" ref={scrollRef}>
				{/* Ключ по вкладке запускает плавное переключение содержимого */}
				<div key={activeTab} className="library-tab-panel">
					{activeTab === "collections" && (
						<div className="library-grid">
							{collections.map((item) => (
								<MediaCard
									key={`${item.type}-${item.id}`}
									item={item}
									fluid
								/>
							))}
						</div>
					)}

					{activeTab === "artists" && (
						<div className="artists-grid">
							{artists.map((artist) => (
								<ArtistCard key={artist.id} artist={artist} fluid />
							))}
						</div>
					)}

					{activeTab === "liked" &&
						(likedTracks.length === 0 ? (
							<p className="library-empty-hint">
								No liked tracks yet. Press ♥ next to any track to save it.
							</p>
						) : (
							<TrackList tracks={likedTracks} />
						))}

					{activeTab === "uploads" &&
						(localTracks.length === 0 ? (
							<div className="library-uploads-empty">
								<p className="library-empty-hint">
									No local tracks yet. Upload an MP3, WAV, M4A or FLAC with custom
									cover and optional lyrics.
								</p>
								<button
									type="button"
									className="library-upload-cta"
									onClick={openTrackUploader}
								>
									<PlusIcon size={13} />
									<span>Upload Track</span>
								</button>
							</div>
						) : (
							<TrackList tracks={localTracks} />
						))}
				</div>
			</div>
		</div>
	);
}

export default LibraryPage;
