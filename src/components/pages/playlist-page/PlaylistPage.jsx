// ============================================================================
// Импорты: параметры маршрута, ссылки, хук скролла и стили коллекции
// ============================================================================
import { useParams, Link } from "react-router-dom";
import { useVerticalScroll } from "../../../hooks/useVerticalScroll.js";
import "./PlaylistPage.css";

// ============================================================================
// Временный треклист коллекции
// ============================================================================
const DUMMY_TRACKS = [
    {
        id: "1",
        title: "The Rint",
        artist: "Matte Obsidian",
        artistId: "1",
        duration: "03:12",
    },
    {
        id: "2",
        title: "The Skin",
        artist: "Kiasmos & Olafur",
        artistId: "4",
        duration: "04:05",
    },
    {
        id: "3",
        title: "Alabaster Echo",
        artist: "Nils Frahm",
        artistId: "2",
        duration: "03:38",
    },
    {
        id: "4",
        title: "Spatial Drift",
        artist: "Rival Consoles",
        artistId: "3",
        duration: "04:24",
    },
    {
        id: "5",
        title: "Subtle Grain",
        artist: "Christian Löffler",
        artistId: "5",
        duration: "03:51",
    },
    {
        id: "6",
        title: "Monolith II",
        artist: "Ben Böhmer",
        artistId: "6",
        duration: "05:10",
    },
];

/**
 * Страница плейлиста или альбома (`PlaylistPage`).
 * Отображает шапку с обложкой, статистикой и кнопками воспроизведения,
 * а также встраиваемый список композиций коллекции.
 */
function PlaylistPage({ kind = "playlist" }) {
    const { id } = useParams();
    const scrollRef = useVerticalScroll();

    const title =
        kind === "album"
            ? `Album #${id}`
            : id === "favourites"
              ? "Favourites"
              : `Playlist ${id}`;

    return (
        <div className="page-scroll playlist-page" ref={scrollRef}>
            {/* ================================================================
                1. Шапка коллекции (обложка + метаданные + кнопки запуска)
               ================================================================ */}
            <header className="collection-hero">
                <div className="collection-cover" aria-hidden="true" />

                <div className="collection-meta">
                    <span className="collection-badge">{kind.toUpperCase()}</span>
                    <h1 className="collection-title">{title}</h1>
                    <span className="collection-stats">6 TRACKS • 24:20</span>

                    <div className="collection-actions">
                        <button type="button" className="btn-primary">
                            <span className="btn-dot" aria-hidden="true" />
                            <span>Play</span>
                        </button>
                        <button type="button" className="btn-secondary">
                            Shuffle
                        </button>
                    </div>
                </div>
            </header>

            {/* ================================================================
                2. Треклист коллекции
               ================================================================ */}
            <ul className="Library is-embedded">
                {DUMMY_TRACKS.map((track, idx) => {
                    const isCurrent = idx === 0;

                    return (
                        <li
                            key={track.id}
                            className={`Library-item ${isCurrent ? "is-current" : ""}`}
                            aria-current={isCurrent ? "true" : undefined}
                        >
                            <div className="Library-left">
                                <div className="Library-index">
                                    {isCurrent && (
                                        <span className="Library-dot" aria-hidden="true" />
                                    )}
                                    <span>{idx + 1}</span>
                                </div>
                                <div className="Library-meta">
                                    <span className="Library-title">{track.title}</span>
                                    <Link
                                        to={`/artist/${track.artistId}`}
                                        className="Library-artist artist-inline-link"
                                    >
                                        {track.artist}
                                    </Link>
                                </div>
                            </div>
                            <span className="Library-duration">{track.duration}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default PlaylistPage;
