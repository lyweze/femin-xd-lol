// ============================================================================
// Боковая панель навигации и плейлистов (`Sidebar`)
// ============================================================================
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/authContext.js";
import { usePlayerState } from "../../../context/playerContexts.js";
import { IS_DESKTOP } from "../../../platform/env.js";
import { MOCK_PLAYLISTS } from "../../../services/mockData.js";
import { SidebarIcon } from "../../shared/icons/Icons.jsx";
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
					<SidebarIcon />
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
