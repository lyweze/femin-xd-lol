import { useMemo } from "react";
import { useHorizontalScroll } from "../../../hooks/useHorizontalScroll.js";
import { useVerticalScroll } from "../../../hooks/useVerticalScroll.js";
import { musicApi } from "../../../api/musicApi.js";
import { usePlayerActions, usePlayerState } from "../../../context/playerContexts.js";
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
	const likedSet = useMemo(() => new Set(likedIds), [likedIds]);

	return (
		<div className="main-page">
			<header className="page-header">
				<h1 className="page-title">Now Playing</h1>
				<p className="page-subtitle">Fresh releases & your rotation</p>
			</header>

			<div className="Playlists" ref={playlistsRef} aria-label="Albums and playlists">
				{shelfItems.map((item) => (
					<MediaCard key={`${item.type}-${item.id}`} item={item} />
				))}
			</div>

			<ul className="Library" ref={libraryRef} aria-label="Library">
				{tracks.map((track, idx) => {
					const isCurrent = currentTrack?.id === track.id;
					return (
						<TrackRow
							key={track.id}
							track={track}
							trackList={tracks}
							index={idx + 1}
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
	);
}

export default MainPage;
