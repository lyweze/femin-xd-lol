// ============================================================================
// Импорты: параметры маршрута, ссылки, хуки скролла и стили профиля артиста
// ============================================================================
import { useParams, Link } from "react-router-dom";
import { useVerticalScroll } from "../../../hooks/useVerticalScroll.js";
import { useHorizontalScroll } from "../../../hooks/useHorizontalScroll.js";
import "./ArtistPage.css";

// ============================================================================
// Временные данные популярных треков и дискографии артиста
// ============================================================================
const TOP_TRACKS = [
    { id: "1", title: "The Rint", duration: "03:12" },
    { id: "2", title: "Obsidian Grain", duration: "04:18" },
    { id: "3", title: "Smoked Glass", duration: "02:54" },
    { id: "4", title: "Velvet Tape", duration: "03:45" },
];

const DISCOGRAPHY = [
    { id: "1", title: "Smoked Glass Vol. I" },
    { id: "2", title: "Alabaster Echoes" },
    { id: "3", title: "Nocturne Tapes" },
    { id: "4", title: "Spatial Drift" },
];

/**
 * Страница профиля исполнителя (`ArtistPage`).
 * Отображает карточку артиста, список популярных композиций
 * и горизонтальную ленту релизов дискографии.
 */
function ArtistPage() {
    const { id } = useParams();
    const scrollRef = useVerticalScroll();
    const discographyRef = useHorizontalScroll();

    return (
        <div className="page-scroll artist-page" ref={scrollRef}>
            {/* ================================================================
                1. Шапка профиля артиста
               ================================================================ */}
            <header className="artist-hero">
                <div className="artist-avatar" aria-hidden="true">
                    <span>A</span>
                </div>

                <div className="artist-meta">
                    <span className="artist-badge">ARTIST</span>
                    <h1 className="artist-name">Artist #{id}</h1>
                    <p className="artist-bio">
                        Minimalist electronic and ambient textures recorded on analog tape.
                    </p>

                    <div className="collection-actions">
                        <button type="button" className="btn-primary">
                            <span className="btn-dot" aria-hidden="true" />
                            <span>Play Artist</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* ================================================================
                2. Популярные треки исполнителя
               ================================================================ */}
            <section className="artist-section">
                <h2 className="section-title">Popular</h2>
                <ul className="Library is-embedded">
                    {TOP_TRACKS.map((track, idx) => (
                        <li key={track.id} className="Library-item">
                            <div className="Library-left">
                                <div className="Library-index">
                                    <span>{idx + 1}</span>
                                </div>
                                <div className="Library-meta">
                                    <span className="Library-title">{track.title}</span>
                                    <span className="Library-artist">Artist #{id}</span>
                                </div>
                            </div>
                            <span className="Library-duration">{track.duration}</span>
                        </li>
                    ))}
                </ul>
            </section>

            {/* ================================================================
                3. Горизонтальная лента релизов дискографии
               ================================================================ */}
            <section className="artist-section">
                <h2 className="section-title">Discography</h2>
                <div className="Playlists" ref={discographyRef}>
                    {DISCOGRAPHY.map((album) => (
                        <Link
                            key={album.id}
                            to={`/album/${album.id}`}
                            className="Playlist-item album-link"
                        >
                            <div className="Playlist-icon" aria-hidden="true" />
                            <span className="Playlist-name">{album.title}</span>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}

export default ArtistPage;
