// ============================================================================
// Основной макет плеера (адаптивный: Desktop Sidebar + Mobile Drawer & TabBar)
// ============================================================================
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";
import { useSidebar } from "../../hooks/useSidebar.js";
import TitlebarDrag from "../../platform/TitlebarDrag.jsx";
import { ChevronRightIcon } from "../shared/icons/Icons.jsx";
import AmbientBg from "./ambient-bg/AmbientBg.jsx";
import MobileTabBar from "./mobile-tab-bar/MobileTabBar.jsx";
import Sidebar from "./sidebar/Sidebar.jsx";
import FloatingPlayer from "../player/floating-player/FloatingPlayer.jsx";
import FullscreenPlayer from "../player/fullscreen-player/FullscreenPlayer.jsx";

function PlayerLayout() {
	const location = useLocation();
	const isMobile = useMediaQuery("(max-width: 768px)");
	const { isOpen: isSidebarOpen, toggle: toggleSidebar } = useSidebar(true);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	useEffect(() => {
		if (!isMobile || !isMobileMenuOpen) return;
		const onKeyDown = (e) => {
			if (e.key === "Escape") setIsMobileMenuOpen(false);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isMobile, isMobileMenuOpen]);

	const closeMobileMenu = () => setIsMobileMenuOpen(false);

	return (
		<>
			<TitlebarDrag />
			<AmbientBg />

			<div className="app">
				{!isMobile && !isSidebarOpen && (
					<button
						type="button"
						className="sidebar-reopen-strip"
						onClick={toggleSidebar}
						title="Show sidebar (⌘\)"
						aria-label="Show sidebar"
					>
						<ChevronRightIcon size={11} />
					</button>
				)}

				{isMobile && isMobileMenuOpen && (
					<div
						className="sidebar-mobile-backdrop"
						onClick={closeMobileMenu}
						aria-hidden="true"
					/>
				)}

				<Sidebar
					isOpen={isSidebarOpen}
					isMobile={isMobile}
					isMobileOpen={isMobileMenuOpen}
					onToggle={toggleSidebar}
					onCloseMobile={closeMobileMenu}
				/>

				<main className="main">
					<div className="page-transition" key={location.pathname}>
						<Outlet />
					</div>

					<FloatingPlayer isMobile={isMobile} />
				</main>
			</div>

			{isMobile && (
				<MobileTabBar
					isMenuOpen={isMobileMenuOpen}
					onToggleMenu={() => setIsMobileMenuOpen((v) => !v)}
					onNavigate={closeMobileMenu}
				/>
			)}

			<FullscreenPlayer />
		</>
	);
}

export default PlayerLayout;
