// ============================================================================
// Страница поиска по каталогу (`SearchPage`)
// Использует useDeferredValue, чтобы ввод текста не тормозил на больших списках.
// ============================================================================
import { useDeferredValue, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useVerticalScroll } from "../../../hooks/useVerticalScroll.js";
import { useHorizontalScroll } from "../../../hooks/useHorizontalScroll.js";
import { useMediaQuery } from "../../../hooks/useMediaQuery.js";
import { musicApi } from "../../../api/musicApi.js";
import { usePlayerState } from "../../../context/playerContexts.js";
import { MOCK_TRACKS } from "../../../services/mockData.js";
import ArtistCard from "../../shared/artist-card/ArtistCard.jsx";
import MediaCard from "../../shared/media-card/MediaCard.jsx";
import TrackList from "../../shared/track-list/TrackList.jsx";
import { SearchIcon } from "../../shared/icons/Icons.jsx";
import "./SearchPage.css";

const BROWSE_MOODS = [
	{ label: "Matte Obsidian", query: "Obsidian" },
	{ label: "Smoked Glass", query: "Smoked" },
	{ label: "Late Night Focus", query: "Late Night" },
	{ label: "Mastering Reference", query: "Reference" },
];

const RECENT_TRACKS = MOCK_TRACKS.slice(0, 5);

function SearchPage() {
	const isMobile = useMediaQuery("(max-width: 768px)");
	const [searchParams, setSearchParams] = useSearchParams();
	const query = searchParams.get("q") ?? "";
	const deferredQuery = useDeferredValue(query.trim());

	const scrollRef = useVerticalScroll();
	const artistsRef = useHorizontalScroll();
	const releasesRef = useHorizontalScroll();
	const { playlists } = usePlayerState();

	const results = useMemo(
		() => musicApi.searchCatalog(deferredQuery, playlists),
		[deferredQuery, playlists],
	);
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
					<SearchIcon className="search-icon" />

					{/* На мобильных отключаем autoFocus, чтобы не вызывать клавиатуру при открытии вкладки */}
					<input
						type="text"
						className="search-input"
						placeholder="Artists, tracks, albums, playlists..."
						value={query}
						onChange={(e) => updateQuery(e.target.value)}
						autoFocus={!isMobile}
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
							<TrackList tracks={RECENT_TRACKS} queueTracks={MOCK_TRACKS} />
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
								<TrackList tracks={results.tracks} />
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
