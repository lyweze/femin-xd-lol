// ============================================================================
// Импорты: навигационные ссылки React Router и стили сайдбара
// ============================================================================
import { NavLink } from "react-router-dom";
import "./Sidebar.css";

// ============================================================================
// Конфигурация разделов навигации и пользовательских плейлистов
// ============================================================================
const MAIN_NAV_ITEMS = [
    { to: "/", label: "Home", end: true },
    { to: "/search", label: "Search" },
    { to: "/library", label: "Library" },
];

const PLAYLIST_NAV_ITEMS = [
    { to: "/playlist/favourites", label: "Favourites" },
    { to: "/playlist/1", label: "Playlist 1" },
    { to: "/playlist/2", label: "Playlist 2" },
];

/**
 * Боковая панель навигации (`Sidebar`).
 * Содержит кнопку сворачивания, основные разделы приложения,
 * список пользовательских плейлистов и карточку профиля внизу.
 */
function Sidebar({ isOpen = true, onToggle }) {
    // Исключаем интерактивные элементы из Tab-навигации, когда панель свёрнута
    const interactiveTabIndex = isOpen ? undefined : -1;

    return (
        <aside
            className={`sidebar ${!isOpen ? "is-collapsed" : ""}`}
            aria-label="Sidebar navigation"
            aria-hidden={!isOpen}
        >
            {/* ================================================================
                1. Верхняя панель с кнопкой сворачивания сайдбара
               ================================================================ */}
            <div className="sidebar-top">
                <button
                    type="button"
                    className="sidebar-toggle-btn"
                    onClick={onToggle}
                    tabIndex={interactiveTabIndex}
                    title="Hide sidebar (⌘\)"
                    aria-label="Hide sidebar"
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                    >
                        <rect
                            x="2"
                            y="2.5"
                            width="12"
                            height="11"
                            rx="2.5"
                            stroke="currentColor"
                            strokeWidth="1.4"
                        />
                        <path d="M6 2.5V13.5" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                </button>
            </div>

            {/* ================================================================
                2. Навигация: основные разделы и пользовательские плейлисты
               ================================================================ */}
            <ul className="sidebar-navigation">
                {/* Основные разделы приложения */}
                <li className="main-li">
                    <ul aria-label="Main sections">
                        {MAIN_NAV_ITEMS.map((item) => (
                            <li key={item.to}>
                                <NavLink
                                    to={item.to}
                                    end={item.end}
                                    className="sidebar-link"
                                    tabIndex={interactiveTabIndex}
                                >
                                    <span>{item.label}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </li>

                {/* Избранное и пользовательские плейлисты */}
                <li className="library-li">
                    <ul aria-label="User playlists">
                        {PLAYLIST_NAV_ITEMS.map((item) => (
                            <li key={item.to}>
                                <NavLink
                                    to={item.to}
                                    className="sidebar-link"
                                    tabIndex={interactiveTabIndex}
                                >
                                    <span>{item.label}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </li>
            </ul>

            {/* ================================================================
                3. Нижняя кнопка профиля / режима воспроизведения
               ================================================================ */}
            <button
                type="button"
                className="sidebar-account"
                tabIndex={interactiveTabIndex}
                aria-label="Account"
            >
                <div className="account-avatar" aria-hidden="true">
                    <span>D</span>
                </div>

                <div className="account-meta">
                    <span className="account-name">Denis</span>
                    <span className="account-sub">LOCAL</span>
                </div>
            </button>
        </aside>
    );
}

export default Sidebar;
