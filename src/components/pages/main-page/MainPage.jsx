import { useMemo } from "react";
import { useHorizontalScroll } from "../../../hooks/useHorizontalScroll.js";
import { useVerticalScroll } from "../../../hooks/useVerticalScroll.js";
import { musicApi } from "../../../api/musicApi.js";
import { usePlayerActions, usePlayerState } from "../../../context/PlayerContext.jsx";
import MediaCard from "../../shared/media-card/MediaCard.jsx";
import TrackRow from "../../shared/track-row/TrackRow.jsx";
import "./MainPage.css";

function MainPage() {
	const playlistsRef = useHorizontalScroll();
	const libraryRef = useVerticalScroll();

	const { currentTrack, isPlaying, likedIds, durationOverrides } =
		usePlayerState();
	const { playTrack, toggleLike } = usePlayerActions();

	const { albums, playlists, tracks } = useMemo(() => musicApi.getHomeData(), []);
	const shelfItems = useMemo(() => [...albums, ...playlists], [albums, playlists]);

	return (
		<div className="main-page">
			<header className="main-header">
				<h1 className="main-title">Now Playing</h1>
				<p className="main-subtitle">Fresh releases & your rotation</p>
			</header>

			<div className="Playlists" ref={playlistsRef} aria-label="Albums and playlists">
				{shelfItems.map((item) => (
					<MediaCard key={`${item.type}-${item.id}`} item={item} />
				))}
			</div>

			<ul className="Library" ref={libraryRef} aria-label="Library">
				{tracks.map((track, idx) => (
					<TrackRow
						key={track.id}
						track={track}
						index={idx + 1}
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
	);
}

export default MainPage;
