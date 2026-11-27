// ============================================================================
// Медиатека пользователя (`LibraryPage`): альбомы/плейлисты, артисты и лайки
// ============================================================================
import { useMemo } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { useVerticalScroll } from "../../../hooks/useVerticalScroll.js";
import { musicApi } from "../../../api/musicApi.js";
import {
	MOCK_ALBUMS,
	MOCK_ARTISTS,
	MOCK_TRACKS,
} from "../../../services/mockData.js";
import { usePlayerState } from "../../../context/playerContexts.js";
import ArtistCard from "../../shared/artist-card/ArtistCard.jsx";
import { PlusIcon } from "../../shared/icons/Icons.jsx";
import MediaCard from "../../shared/media-card/MediaCard.jsx";
import TrackList from "../../shared/track-list/TrackList.jsx";
import "./LibraryPage.css";

const FILTER_TABS = [
	{ id: "collections", label: "Albums & Playlists" },
	{ id: "artists", label: "Artists" },
	{ id: "liked", label: "Liked Tracks" },
];

function LibraryPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const activeTab = searchParams.get("tab") || "collections";
	const scrollRef = useVerticalScroll();
	const outletCtx = useOutletContext();

	const { likedIds, playlists } = usePlayerState();

	const collections = useMemo(() => {
		const favourites = musicApi.getPlaylist("favourites", likedIds);
		return [favourites, ...MOCK_ALBUMS, ...playlists].filter(Boolean);
	}, [likedIds, playlists]);

	const likedTracks = useMemo(() => {
		const likedSet = new Set(likedIds);
		return MOCK_TRACKS.filter((t) => likedSet.has(t.id));
	}, [likedIds]);

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
							tab.id === "liked" ? ` (${likedTracks.length})` : "";

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
							{MOCK_ARTISTS.map((artist) => (
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
				</div>
			</div>
		</div>
	);
}

export default LibraryPage;
