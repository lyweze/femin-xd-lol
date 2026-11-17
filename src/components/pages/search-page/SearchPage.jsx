// ============================================================================
// Импорты: состояние, ссылки маршрутизатора, хук скролла и стили поиска
// ============================================================================
import { useState } from "react";
import { Link } from "react-router-dom";
import { useVerticalScroll } from "../../../hooks/useVerticalScroll.js";
import "./SearchPage.css";

// ============================================================================
// Временные данные для карточек настроений и быстрого поиска
// ============================================================================
const PLACEHOLDER_MOODS = [
    "Late Night Ambient",
    "Minimal Techno",
    "Modern Classical",
    "Analog Synth",
    "Deep Focus",
    "Lo-Fi Tapes",
];

const PLACEHOLDER_RESULTS = [
    {
        id: "1",
        title: "The Rint",
        artist: "Matte Obsidian",
        artistId: "1",
        duration: "03:12",
    },
    {
        id: "2",
        title: "Alabaster Echo",
        artist: "Nils Frahm",
        artistId: "2",
        duration: "03:38",
    },
    {
        id: "3",
        title: "Spatial Drift",
        artist: "Rival Consoles",
        artistId: "3",
        duration: "04:24",
    },
    {
        id: "4",
        title: "Subtle Grain",
        artist: "Christian Löffler",
        artistId: "4",
        duration: "03:51",
    },
];

/**
 * Страница поиска (`SearchPage`).
 * Содержит строку фильтрации по трекам и исполнителям, быстрые теги настроений
 * при пустом запросе и список найденных композиций.
 */
function SearchPage() {
    const [query, setQuery] = useState("");
    const scrollRef = useVerticalScroll();

    const normalizedQuery = query.trim().toLowerCase();
    const filteredTracks = normalizedQuery
        ? PLACEHOLDER_RESULTS.filter(
              (track) =>
                  track.title.toLowerCase().includes(normalizedQuery) ||
                  track.artist.toLowerCase().includes(normalizedQuery),
          )
        : PLACEHOLDER_RESULTS;

    return (
        <div className="search-page">
            {/* ================================================================
                1. Шапка страницы с полем ввода поискового запроса
               ================================================================ */}
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
                        <circle
                            cx="7"
                            cy="7"
                            r="4.8"
                            stroke="currentColor"
                            strokeWidth="1.4"
                        />
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
                        placeholder="Artists, tracks, albums..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />

                    {query && (
                        <button
                            type="button"
                            className="search-clear"
                            onClick={() => setQuery("")}
                            aria-label="Clear search"
                        >
                            ×
                        </button>
                    )}
                </div>
            </header>

            {/* ================================================================
                2. Прокручиваемая область: подборки настроений и результаты
               ================================================================ */}
            <div className="page-scroll" ref={scrollRef}>
                {!normalizedQuery && (
                    <section className="search-section">
                        <h2 className="section-title">Browse Moods</h2>
                        <div className="moods-grid">
                            {PLACEHOLDER_MOODS.map((mood) => (
                                <button
                                    key={mood}
                                    type="button"
                                    className="mood-card"
                                    onClick={() => setQuery(mood)}
                                >
                                    <span>{mood}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                <section className="search-section">
                    <h2 className="section-title">
                        {normalizedQuery ? "Top Results" : "Recent Tracks"}
                    </h2>

                    {filteredTracks.length === 0 ? (
                        <p className="search-empty">Nothing found for «{query}»</p>
                    ) : (
                        <ul className="Library is-embedded">
                            {filteredTracks.map((track, idx) => (
                                <li key={track.id} className="Library-item">
                                    <div className="Library-left">
                                        <div className="Library-index">
                                            <span>{idx + 1}</span>
                                        </div>
                                        <div className="Library-meta">
                                            <span className="Library-title">{track.title}</span>
                                            <Link
                                                to={`/artist/${track.artistId}`}
                                                className="Library-artist artist-inline-link"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {track.artist}
                                            </Link>
                                        </div>
                                    </div>
                                    <span className="Library-duration">{track.duration}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}

export default SearchPage;
