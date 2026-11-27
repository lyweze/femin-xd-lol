import { useDeferredValue, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useVerticalScroll } from "../../../hooks/useVerticalScroll.js";
import { useHorizontalScroll } from "../../../hooks/useHorizontalScroll.js";
import { musicApi } from "../../../api/musicApi.js";
import { MOCK_TRACKS } from "../../../services/mockData.js";
import { usePlayerActions, usePlayerState } from "../../../context/playerContexts.js";
import { SearchIcon } from "../../shared/icons/Icons.jsx";
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

const RECENT_TRACKS = MOCK_TRACKS.slice(0, 5);

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
	const likedSet = useMemo(() => new Set(likedIds), [likedIds]);

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
					<SearchIcon className="search-icon" />

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
								{RECENT_TRACKS.map((track, idx) => {
									const isCurrent = currentTrack?.id === track.id;
									return (
										<TrackRow
											key={track.id}
											track={track}
											trackList={MOCK_TRACKS}
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
									{results.tracks.map((track, idx) => {
										const isCurrent = currentTrack?.id === track.id;
										return (
											<TrackRow
												key={track.id}
												track={track}
												trackList={results.tracks}
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
