import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useVerticalScroll } from "../../../hooks/useVerticalScroll.js";
import {
	MOCK_ALBUMS,
	MOCK_ARTISTS,
	MOCK_PLAYLISTS,
	MOCK_TRACKS,
} from "../../../services/mockData.js";
import { usePlayerActions, usePlayerState } from "../../../context/playerContexts.js";
import MediaCard from "../../shared/media-card/MediaCard.jsx";
import ArtistCard from "../../shared/artist-card/ArtistCard.jsx";
import TrackRow from "../../shared/track-row/TrackRow.jsx";
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

	const { currentTrack, isPlaying, likedIds, durationOverrides } =
		usePlayerState();
	const { playTrack, toggleLike } = usePlayerActions();

	const collections = useMemo(() => [...MOCK_ALBUMS, ...MOCK_PLAYLISTS], []);
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
				</div>
			</header>

			<div className="page-scroll" ref={scrollRef}>
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
							<ul className="Library is-embedded">
								{likedTracks.map((track, idx) => {
									const isCurrent = currentTrack?.id === track.id;
									return (
										<TrackRow
											key={track.id}
											track={track}
											trackList={likedTracks}
											index={idx + 1}
											durationMsOverride={durationOverrides[track.id]}
											isCurrent={isCurrent}
											isPlaying={isCurrent && isPlaying}
											isLiked
											onPlay={playTrack}
											onToggleLike={toggleLike}
										/>
									);
								})}
							</ul>
						))}
				</div>
			</div>
		</div>
	);
}

export default LibraryPage;
