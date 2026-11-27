// ============================================================================
// Главный экран плеера (`MainPage`): витрина релизов/плейлистов и список треков
// На мобильных (<= 768px) объединяет витрину и треки в единый скролл-поток.
// ============================================================================
import { useMemo } from "react";
import { useHorizontalScroll } from "../../../hooks/useHorizontalScroll.js";
import { useMediaQuery } from "../../../hooks/useMediaQuery.js";
import { useVerticalScroll } from "../../../hooks/useVerticalScroll.js";
import { musicApi } from "../../../api/musicApi.js";
import { usePlayerState } from "../../../context/playerContexts.js";
import MediaCard from "../../shared/media-card/MediaCard.jsx";
import TrackList from "../../shared/track-list/TrackList.jsx";
import "./MainPage.css";

function MainPage() {
	const isMobile = useMediaQuery("(max-width: 768px)");
	const playlistsRef = useHorizontalScroll();
	const libraryRef = useVerticalScroll();
	const mobileScrollRef = useVerticalScroll();

	const { playlists } = usePlayerState();
	const { albums, tracks } = useMemo(() => musicApi.getHomeData(), []);
	const shelfItems = useMemo(() => [...albums, ...playlists], [albums, playlists]);

	const header = (
		<header className="page-header">
			<h1 className="page-title">Now Playing</h1>
			<p className="page-subtitle">Fresh releases & your rotation</p>
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
					<TrackList tracks={tracks} embedded ariaLabel="Library" />
				</div>
			</div>
		);
	}

	return (
		<div className="main-page">
			{header}
			{shelf}
			<TrackList
				tracks={tracks}
				embedded={false}
				listRef={libraryRef}
				ariaLabel="Library"
			/>
		</div>
	);
}

export default MainPage;
