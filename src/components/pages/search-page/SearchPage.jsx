import { useDeferredValue, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useVerticalScroll } from "../../../hooks/useVerticalScroll.js";
import { useHorizontalScroll } from "../../../hooks/useHorizontalScroll.js";
import { musicApi } from "../../../api/musicApi.js";
import { MOCK_TRACKS } from "../../../services/mockData.js";
import { usePlayerActions, usePlayerState } from "../../../context/PlayerContext.jsx";
import ArtistCard from "../../shared/artist-card/ArtistCard.jsx";
import MediaCard from "../../shared/media-card/MediaCard.jsx";
import TrackRow from "../../shared/track-row/TrackRow.jsx";
import "./SearchPage.css";

const BROWSE_MOODS = [
	{ label: "Matte Obsidian", query: "Obsidian" },
	{ label: "Smoked Glass", query: "Smoked" },
	{ label: "Late Night Focus", query: "Late Night" },
	{ label: "Mastering Reference", query: "Reference" },
];

function SearchPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const query = searchParams.get("q") ?? "";
	const deferredQuery = useDeferredValue(query.trim());

	const scrollRef = useVerticalScroll();
	const artistsRef = useHorizontalScroll();
	const releasesRef = useHorizontalScroll();

	const { currentTrack, isPlaying, likedIds, durationOverrides } =
		usePlayerState();
	const { playTrack, toggleLike } = usePlayerActions();

	const results = useMemo(() => musicApi.searchCatalog(deferredQuery), [deferredQuery]);
	const collections = useMemo(
		() => [...results.albums, ...results.playlists],
		[results.albums, results.playlists],
	);

	const hasAnyResult =
		results.artists.length > 0 ||
		results.tracks.length > 0 ||
		collections.length > 0;

	const updateQuery = (next) => {
		setSearchParams(next ? { q: next } : {}, { replace: true });
	};

	return (
		<div className="search-page">
			<header className="page-header">
				<h1 className="page-title">Search</h1>

				<div className="search-bar">
					<svg
						className="search-icon"
						width="15"
						height="15"
						viewBox="0 0 16 16"
						fill="none"
						aria-hidden="true"
					>
						<circle cx="7" cy="7" r="4.8" stroke="currentColor" strokeWidth="1.4" />
						<path
							d="M10.8 10.8L14 14"
							stroke="currentColor"
							strokeWidth="1.4"
							strokeLinecap="round"
						/>
					</svg>

					<input
						type="text"
						className="search-input"
						placeholder="Artists, tracks, albums, playlists..."
						value={query}
						onChange={(e) => updateQuery(e.target.value)}
						autoFocus
					/>

					{query && (
						<button
							type="button"
							className="search-clear"
							onClick={() => updateQuery("")}
							aria-label="Clear search"
						>
							×
						</button>
					)}
				</div>
			</header>

			<div className="page-scroll" ref={scrollRef}>
				{!deferredQuery ? (
					<>
						<section className="search-section">
							<h2 className="section-title">Quick Filters</h2>
							<div className="moods-grid">
								{BROWSE_MOODS.map((mood) => (
									<button
										key={mood.label}
										type="button"
										className="mood-card"
										onClick={() => updateQuery(mood.query)}
									>
										<span>{mood.label}</span>
									</button>
								))}
							</div>
						</section>

						<section className="search-section">
							<h2 className="section-title">Recent Tracks</h2>
							<ul className="Library is-embedded">
								{MOCK_TRACKS.slice(0, 5).map((track, idx) => (
									<TrackRow
										key={track.id}
										track={track}
										index={idx + 1}
										durationMsOverride={durationOverrides[track.id]}
										isCurrent={currentTrack?.id === track.id}
										isPlaying={isPlaying}
										isLiked={likedIds.includes(track.id)}
										onPlay={(t) => playTrack(t, MOCK_TRACKS)}
										onToggleLike={toggleLike}
									/>
								))}
							</ul>
						</section>
					</>
				) : !hasAnyResult ? (
					<p className="search-empty">Nothing found for «{deferredQuery}»</p>
				) : (
					<>
						{results.artists.length > 0 && (
							<section className="search-section">
								<h2 className="section-title">Artists</h2>
								<div className="Playlists" ref={artistsRef}>
									{results.artists.map((artist) => (
										<ArtistCard key={artist.id} artist={artist} />
									))}
								</div>
							</section>
						)}

						{results.tracks.length > 0 && (
							<section className="search-section">
								<h2 className="section-title">Tracks</h2>
								<ul className="Library is-embedded">
									{results.tracks.map((track, idx) => (
										<TrackRow
											key={track.id}
											track={track}
											index={idx + 1}
											durationMsOverride={durationOverrides[track.id]}
											isCurrent={currentTrack?.id === track.id}
											isPlaying={isPlaying}
											isLiked={likedIds.includes(track.id)}
											onPlay={(t) => playTrack(t, results.tracks)}
											onToggleLike={toggleLike}
										/>
									))}
								</ul>
							</section>
						)}

						{collections.length > 0 && (
							<section className="search-section">
								<h2 className="section-title">Albums & Playlists</h2>
								<div className="Playlists" ref={releasesRef}>
									{collections.map((item) => (
										<MediaCard
											key={`${item.type}-${item.id}`}
											item={item}
											compact
										/>
									))}
								</div>
							</section>
						)}
					</>
				)}
			</div>
		</div>
	);
}

export default SearchPage;
