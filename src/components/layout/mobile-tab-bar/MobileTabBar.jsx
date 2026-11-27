// ============================================================================
// Нижняя панель навигации для мобильных устройств (`MobileTabBar`)
// Содержит 4 основные цели под большой палец: Home, Search, Library, Playlists
// ============================================================================
import { NavLink } from "react-router-dom";
import { HomeIcon, LibraryIcon, MenuIcon, SearchIcon } from "../../shared/icons/Icons.jsx";
import "./MobileTabBar.css";

const TAB_ROUTES = [
	{ to: "/", label: "Home", end: true, Icon: HomeIcon },
	{ to: "/search", label: "Search", end: false, Icon: SearchIcon },
	{ to: "/library", label: "Library", end: false, Icon: LibraryIcon },
];

function MobileTabBar({ isMenuOpen = false, onToggleMenu, onNavigate }) {
	return (
		<nav className="mobile-tab-bar" aria-label="Mobile navigation">
			{TAB_ROUTES.map(({ to, label, end, Icon }) => (
				<NavLink
					key={to}
					to={to}
					end={end}
					className={({ isActive }) =>
						`mobile-tab-item ${isActive && !isMenuOpen ? "is-active" : ""}`
					}
					onClick={onNavigate}
				>
					<Icon size={18} />
					<span>{label}</span>
				</NavLink>
			))}

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
