// ============================================================================
// Боковая панель навигации и плейлистов (`Sidebar` / Mobile Slide-Over Drawer)
// ============================================================================
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/authContext.js";
import { usePlayerState } from "../../../context/playerContexts.js";
import { IS_DESKTOP } from "../../../platform/env.js";
import { MOCK_PLAYLISTS } from "../../../services/mockData.js";
import { CloseIcon, SidebarIcon } from "../../shared/icons/Icons.jsx";
import "./Sidebar.css";

const MAIN_NAV_ITEMS = [
	{ to: "/", label: "Home", end: true },
	{ to: "/search", label: "Search" },
	{ to: "/library", label: "Library" },
];

function Sidebar({
	isOpen = true,
	isMobile = false,
	isMobileOpen = false,
	onToggle,
	onCloseMobile,
}) {
	const navigate = useNavigate();
	const { user, isAdmin } = useAuth();
	const { likedIds } = usePlayerState();

	const effectiveOpen = isMobile ? isMobileOpen : isOpen;
	const interactiveTabIndex = effectiveOpen ? undefined : -1;
	const handleNavClick = () => {
		if (isMobile) onCloseMobile?.();
	};

	const initialLetter = user?.username?.[0]?.toUpperCase() || "D";
	const accountSub = isAdmin
		? `ADMIN • ${user?.mode || "LOCAL"}`
		: user?.mode || "LOCAL";

	return (
		<aside
			className={`sidebar ${!isOpen ? "is-collapsed" : ""} ${isMobileOpen ? "is-mobile-open" : ""}`}
			aria-label="Sidebar navigation"
			aria-hidden={!effectiveOpen}
		>
			<div className="sidebar-top">
				{isMobile && <span className="sidebar-mobile-title">Library & Playlists</span>}

				<button
					type="button"
					className="sidebar-toggle-btn"
					onClick={isMobile ? onCloseMobile : onToggle}
					tabIndex={interactiveTabIndex}
					title={isMobile ? "Close menu" : "Hide sidebar (⌘\\)"}
					aria-label={isMobile ? "Close menu" : "Hide sidebar"}
				>
					{isMobile ? <CloseIcon size={15} /> : <SidebarIcon />}
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
									onClick={handleNavClick}
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
								onClick={handleNavClick}
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
									onClick={handleNavClick}
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
					onClick={handleNavClick}
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
					if (isAdmin && !IS_DESKTOP) {
						handleNavClick();
						navigate("/admin/albums");
					}
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
