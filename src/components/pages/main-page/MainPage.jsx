// ============================================================================
// Импорты: кастомные хуки скролла и стили главной страницы
// ============================================================================
import { useHorizontalScroll } from "../../../hooks/useHorizontalScroll.js";
import { useVerticalScroll } from "../../../hooks/useVerticalScroll.js";
import "./MainPage.css";

// ============================================================================
// Временные данные для первичной отрисовки (до подключения API/стора)
// ============================================================================
const PLACEHOLDER_PLAYLISTS = [
    { id: "1", title: "My Playlist 1" },
    { id: "2", title: "My Playlist 2" },
    { id: "3", title: "My Playlist 3" },
    { id: "4", title: "Late Night Mix" },
    { id: "5", title: "Synthwave 2026" },
    { id: "6", title: "Ambient Focus" },
    { id: "7", title: "Mastering Reference" },
    { id: "8", title: "Lo-Fi Beats" },
    { id: "9", title: "Dark Techno" },
    { id: "10", title: "Chillhop Essentials" },
    { id: "11", title: "Gym Phonk" },
    { id: "12", title: "Coding Session" },
];

const PLACEHOLDER_TRACKS = [
    { id: "1", title: "The Rint", artist: "Matte Obsidian", duration: "03:12" },
    { id: "2", title: "The Skin", artist: "Kiasmos & Olafur", duration: "04:05" },
    { id: "3", title: "Alabaster Echo", artist: "Nils Frahm", duration: "03:38" },
    { id: "4", title: "Spatial Drift", artist: "Rival Consoles", duration: "04:24" },
    { id: "5", title: "Subtle Grain", artist: "Christian Löffler", duration: "03:51" },
    { id: "6", title: "Monolith II", artist: "Ben Böhmer", duration: "05:10" },
    { id: "7", title: "Nocturne Tape", artist: "Olafur Arnalds", duration: "02:58" },
    { id: "8", title: "Velvet Horizon", artist: "Moderat", duration: "04:47" },
];

/**
 * Главная страница приложения (`MainPage`).
 * Отображает зафиксированную шапку, горизонтальную ленту плейлистов
 * с поддержкой Drag-to-Scroll и независимо скроллящийся список библиотеки.
 */
function MainPage() {
    // Рефы для независимой прокрутки и динамического расчёта краёв затухания (mask-image)
    const playlistsRef = useHorizontalScroll();
    const libraryRef = useVerticalScroll();

    return (
        <div className="main-page">
            {/* ================================================================
                1. Шапка раздела (зафиксирована сверху)
               ================================================================ */}
            <header className="main-header">
                <h1 className="main-title">Now Playing</h1>
                <p className="main-subtitle">Your favorite tracks</p>
            </header>

            {/* ================================================================
                2. Горизонтальная лента плейлистов
               ================================================================ */}
            <ul className="Playlists" ref={playlistsRef} aria-label="Playlists">
                {PLACEHOLDER_PLAYLISTS.map((playlist) => (
                    <li key={playlist.id} className="Playlist-item">
                        <div className="Playlist-icon" aria-hidden="true" />
                        <span className="Playlist-name">{playlist.title}</span>
                    </li>
                ))}
            </ul>

            {/* ================================================================
                3. Секция библиотеки (вертикально скроллящийся список треков)
               ================================================================ */}
            <ul className="Library" ref={libraryRef} aria-label="Library">
                {PLACEHOLDER_TRACKS.map((track, idx) => {
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
                                    <span className="Library-artist">{track.artist}</span>
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

export default MainPage;
