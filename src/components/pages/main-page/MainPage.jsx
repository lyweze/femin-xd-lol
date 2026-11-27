// ============================================================================
// Главный экран плеера (`MainPage`): витрина релизов/плейлистов и список треков
// На мобильных (<= 768px) объединяет витрину и треки в единый скролл-поток.
// ============================================================================
import { useMemo } from "react";
import { useHorizontalScroll } from "../../../hooks/useHorizontalScroll.js";
import { useMediaQuery } from "../../../hooks/useMediaQuery.js";
import { useVerticalScroll } from "../../../hooks/useVerticalScroll.js";
import { MOCK_ALBUMS } from "../../../services/mockData.js";
import { usePlayerActions, usePlayerState } from "../../../context/playerContexts.js";
import { PlusIcon } from "../../shared/icons/Icons.jsx";
import MediaCard from "../../shared/media-card/MediaCard.jsx";
import TrackList from "../../shared/track-list/TrackList.jsx";
import "./MainPage.css";

function MainPage() {
	const isMobile = useMediaQuery("(max-width: 768px)");
	const playlistsRef = useHorizontalScroll();
	const libraryRef = useVerticalScroll();
	const mobileScrollRef = useVerticalScroll();

	const { playlists, catalogTracks } = usePlayerState();
	const { openTrackUploader } = usePlayerActions();
	const shelfItems = useMemo(
		() => [...MOCK_ALBUMS, ...playlists],
		[playlists],
	);

	const header = (
		<header className="page-header main-page-header">
			<div className="main-header-copy">
				<h1 className="page-title">Now Playing</h1>
				<p className="page-subtitle">Fresh releases & your rotation</p>
			</div>

			<button
				type="button"
				className="main-upload-btn"
				onClick={openTrackUploader}
				title="Upload local MP3 track"
			>
				<PlusIcon size={13} />
				<span>Add Track</span>
			</button>
		</header>
	);

	const shelf = (
		<div className="Playlists" ref={playlistsRef} aria-label="Albums and playlists">
			{shelfItems.map((item) => (
				<MediaCard key={`${item.type}-${item.id}`} item={item} />
			))}
		</div>
	);

	if (isMobile) {
		return (
			<div className="main-page">
				<div className="page-scroll" ref={mobileScrollRef}>
					{header}
					{shelf}
					<h2 className="section-title">Tracks</h2>
					<TrackList tracks={catalogTracks} embedded ariaLabel="Library" />
				</div>
			</div>
		);
	}

	return (
		<div className="main-page">
			{header}
			{shelf}
			<TrackList
				tracks={catalogTracks}
				embedded={false}
				listRef={libraryRef}
				ariaLabel="Library"
			/>
		</div>
	);
}

export default MainPage;
