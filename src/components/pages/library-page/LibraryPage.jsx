// ============================================================================
// Импорты: состояние, ссылки маршрутизатора, хук скролла и стили медиатеки
// ============================================================================
import { useState } from "react";
import { Link } from "react-router-dom";
import { useVerticalScroll } from "../../../hooks/useVerticalScroll.js";
import "./LibraryPage.css";

// ============================================================================
// Временные данные для вкладок медиатеки
// ============================================================================
const FILTER_TABS = [
    { id: "collections", label: "Albums & Playlists" },
    { id: "artists", label: "Artists" },
    { id: "liked", label: "Liked Tracks" },
];

const PLACEHOLDER_COLLECTIONS = [
    {
        id: "1",
        title: "Smoked Glass Vol. I",
        meta: "ALBUM • 2026",
        to: "/album/1",
    },
    {
        id: "2",
        title: "Alabaster Echoes",
        meta: "EP • 2026",
        to: "/album/2",
    },
    {
        id: "3",
        title: "Late Night Focus",
        meta: "PLAYLIST • 12 TRACKS",
        to: "/playlist/1",
    },
    {
        id: "4",
        title: "Mastering Reference",
        meta: "PLAYLIST • 9 TRACKS",
        to: "/playlist/2",
    },
];

const PLACEHOLDER_ARTISTS = [
    { id: "1", name: "Matte Obsidian" },
    { id: "2", name: "Nils Frahm" },
    { id: "3", name: "Rival Consoles" },
    { id: "4", name: "Kiasmos" },
];

const PLACEHOLDER_LIKED = [
    { id: "1", title: "The Rint", artist: "Matte Obsidian", duration: "03:12" },
    { id: "2", title: "The Skin", artist: "Kiasmos & Olafur", duration: "04:05" },
    { id: "3", title: "Monolith II", artist: "Ben Böhmer", duration: "05:10" },
];

/**
 * Страница медиатеки пользователя (`LibraryPage`).
 * Переключается между сеткой альбомов/плейлистов, списком исполнителей
 * и понравившимися треками.
 */
function LibraryPage() {
    const [activeTab, setActiveTab] = useState("collections");
    const scrollRef = useVerticalScroll();

    return (
        <div className="library-page">
            {/* ================================================================
                1. Шапка медиатеки с фильтр-табами
               ================================================================ */}
            <header className="page-header">
                <h1 className="page-title">Library</h1>

                <div className="filter-pills" role="tablist" aria-label="Library filters">
                    {FILTER_TABS.map((tab) => {
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                className={`pill-btn ${isActive ? "is-active" : ""}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </header>

            {/* ================================================================
                2. Прокручиваемая область выбранной вкладки
               ================================================================ */}
            <div className="page-scroll" ref={scrollRef}>
                {activeTab === "collections" && (
                    <div className="library-grid">
                        {PLACEHOLDER_COLLECTIONS.map((item) => (
                            <Link key={item.id} to={item.to} className="grid-media-card">
                                <div className="grid-media-cover" aria-hidden="true" />
                                <span className="grid-media-title">{item.title}</span>
                                <span className="grid-media-meta">{item.meta}</span>
                            </Link>
                        ))}
                    </div>
                )}

                {activeTab === "artists" && (
                    <div className="artists-grid">
                        {PLACEHOLDER_ARTISTS.map((artist) => (
                            <Link
                                key={artist.id}
                                to={`/artist/${artist.id}`}
                                className="grid-artist-card"
                            >
                                <div className="grid-artist-avatar" aria-hidden="true">
                                    <span>{artist.name[0]}</span>
                                </div>
                                <span className="grid-artist-name">{artist.name}</span>
                                <span className="grid-artist-role">ARTIST</span>
                            </Link>
                        ))}
                    </div>
                )}

                {activeTab === "liked" && (
                    <ul className="Library is-embedded">
                        {PLACEHOLDER_LIKED.map((track, idx) => (
                            <li key={track.id} className="Library-item">
                                <div className="Library-left">
                                    <div className="Library-index">
                                        <span>{idx + 1}</span>
                                    </div>
                                    <div className="Library-meta">
                                        <span className="Library-title">{track.title}</span>
                                        <span className="Library-artist">{track.artist}</span>
                                    </div>
                                </div>
                                <span className="Library-duration">{track.duration}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default LibraryPage;
