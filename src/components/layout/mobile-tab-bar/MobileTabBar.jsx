// ============================================================================
// Нижняя панель навигации для мобильных устройств (`MobileTabBar`)
// ============================================================================
import { NavLink } from "react-router-dom";
import { HomeIcon, LibraryIcon, MenuIcon, SearchIcon } from "../../shared/icons/Icons.jsx";
import "./MobileTabBar.css";

function MobileTabBar({ isMenuOpen = false, onToggleMenu, onNavigate }) {
	return (
		<nav className="mobile-tab-bar" aria-label="Mobile navigation">
			<NavLink
				to="/"
				end
				className={({ isActive }) =>
					`mobile-tab-item ${isActive && !isMenuOpen ? "is-active" : ""}`
				}
				onClick={onNavigate}
			>
				<HomeIcon size={18} />
				<span>Home</span>
			</NavLink>

			<NavLink
				to="/search"
				className={({ isActive }) =>
					`mobile-tab-item ${isActive && !isMenuOpen ? "is-active" : ""}`
				}
				onClick={onNavigate}
			>
				<SearchIcon />
				<span>Search</span>
			</NavLink>

			<NavLink
				to="/library"
				className={({ isActive }) =>
					`mobile-tab-item ${isActive && !isMenuOpen ? "is-active" : ""}`
				}
				onClick={onNavigate}
			>
				<LibraryIcon size={18} />
				<span>Library</span>
			</NavLink>

			<button
				type="button"
				className={`mobile-tab-item ${isMenuOpen ? "is-active" : ""}`}
				onClick={onToggleMenu}
				aria-expanded={isMenuOpen}
				aria-label="Open playlists and menu"
			>
				<MenuIcon size={18} />
				<span>Playlists</span>
			</button>
		</nav>
	);
}

export default MobileTabBar;
