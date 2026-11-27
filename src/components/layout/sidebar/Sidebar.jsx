// ============================================================================
// Импорты: навигационные ссылки React Router, контексты и стили сайдбара
// ============================================================================
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext.jsx";
import { usePlayerState } from "../../../context/PlayerContext.jsx";
import { IS_DESKTOP } from "../../../platform/AppRouter.jsx";
import { MOCK_PLAYLISTS } from "../../../services/mockData.js";
import "./Sidebar.css";

const MAIN_NAV_ITEMS = [
	{ to: "/", label: "Home", end: true },
	{ to: "/search", label: "Search" },
	{ to: "/library", label: "Library" },
];

function Sidebar({ isOpen = true, onToggle }) {
	const navigate = useNavigate();
	const { user, isAdmin } = useAuth();
	const { likedIds } = usePlayerState();

	const interactiveTabIndex = isOpen ? undefined : -1;

	const initialLetter = user?.username?.[0]?.toUpperCase() || "D";
	const accountSub = isAdmin
		? `ADMIN • ${user?.mode || "LOCAL"}`
		: user?.mode || "LOCAL";

	return (
		<aside
			className={`sidebar ${!isOpen ? "is-collapsed" : ""}`}
			aria-label="Sidebar navigation"
			aria-hidden={!isOpen}
		>
			<div className="sidebar-top">
				<button
					type="button"
					className="sidebar-toggle-btn"
					onClick={onToggle}
					tabIndex={interactiveTabIndex}
					title="Hide sidebar (⌘\)"
					aria-label="Hide sidebar"
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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

			<ul className="sidebar-navigation">
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

				<li className="library-li">
					<ul aria-label="User playlists">
						<li>
							<NavLink
								to="/playlist/favourites"
								className="sidebar-link"
								tabIndex={interactiveTabIndex}
							>
								<span>Favourites</span>
								{likedIds.length > 0 && (
									<em className="sidebar-count">{likedIds.length}</em>
								)}
							</NavLink>
						</li>

						{MOCK_PLAYLISTS.map((playlist) => (
							<li key={playlist.id}>
								<NavLink
									to={`/playlist/${playlist.id}`}
									className="sidebar-link"
									tabIndex={interactiveTabIndex}
								>
									<span>{playlist.title}</span>
								</NavLink>
							</li>
						))}
					</ul>
				</li>
			</ul>

			{isAdmin && !IS_DESKTOP && (
				<NavLink
					to="/admin/albums"
					className="sidebar-admin-link"
					tabIndex={interactiveTabIndex}
				>
					<span>Admin Studio</span>
					<span className="sidebar-admin-badge">CMS</span>
				</NavLink>
			)}

			<button
				type="button"
				className="sidebar-account"
				tabIndex={interactiveTabIndex}
				aria-label="Account"
				onClick={() => {
					if (isAdmin && !IS_DESKTOP) navigate("/admin/albums");
				}}
			>
				<div className="account-avatar" aria-hidden="true">
					<span>{initialLetter}</span>
				</div>

				<div className="account-meta">
					<span className="account-name">{user?.username || "Guest"}</span>
					<span className="account-sub">{accountSub}</span>
				</div>
			</button>
		</aside>
	);
}

export default Sidebar;
