// ============================================================================
// Основной макет плеера (`PlayerLayout`)
// Десктоп/планшет (> 768px): боковой Sidebar + плавающий нижний плеер
// Мобильные (<= 768px): нижний MobileTabBar + MobileMenuSheet + компактный мини-плеер
// ============================================================================
import { useCallback, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { usePlayerActions } from "../../context/playerContexts.js";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";
import { useSidebar } from "../../hooks/useSidebar.js";
import TitlebarDrag from "../../platform/TitlebarDrag.jsx";
import PlaylistEditModal from "../playlist/playlist-edit-modal/PlaylistEditModal.jsx";
import { ChevronRightIcon } from "../shared/icons/Icons.jsx";
import AmbientBg from "./ambient-bg/AmbientBg.jsx";
import MobileMenuSheet from "./mobile-menu-sheet/MobileMenuSheet.jsx";
import MobileTabBar from "./mobile-tab-bar/MobileTabBar.jsx";
import Sidebar from "./sidebar/Sidebar.jsx";
import FloatingPlayer from "../player/floating-player/FloatingPlayer.jsx";
import FullscreenPlayer from "../player/fullscreen-player/FullscreenPlayer.jsx";

function PlayerLayout() {
	const location = useLocation();
	const navigate = useNavigate();
	const isMobile = useMediaQuery("(max-width: 768px)");
	const { isOpen: isSidebarOpen, toggle: toggleSidebar } = useSidebar(true);
	const { createPlaylist } = usePlayerActions();

	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);

	const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
	const openCreatePlaylist = useCallback(() => setIsCreatePlaylistOpen(true), []);

	const outletContext = useMemo(
		() => ({ openCreatePlaylist }),
		[openCreatePlaylist],
	);

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

				{!isMobile && (
					<Sidebar
						isOpen={isSidebarOpen}
						onToggle={toggleSidebar}
						onCreatePlaylist={openCreatePlaylist}
					/>
				)}

				<main className="main">
					{/* Ключ по pathname перезапускает лёгкий вход страницы при навигации */}
					<div className="page-transition" key={location.pathname}>
						<Outlet context={outletContext} />
					</div>

					<FloatingPlayer isMobile={isMobile} />
				</main>
			</div>

			{isMobile && (
				<>
					<MobileTabBar
						isMenuOpen={isMobileMenuOpen}
						onToggleMenu={() => setIsMobileMenuOpen((v) => !v)}
						onNavigate={closeMobileMenu}
					/>
					<MobileMenuSheet
						isOpen={isMobileMenuOpen}
						onClose={closeMobileMenu}
						onCreatePlaylist={openCreatePlaylist}
					/>
				</>
			)}

			<FullscreenPlayer isMobile={isMobile} />

			<PlaylistEditModal
				isOpen={isCreatePlaylistOpen}
				mode="create"
				onSave={(payload) => {
					const created = createPlaylist(payload);
					navigate(`/playlist/${created.id}`);
				}}
				onClose={() => setIsCreatePlaylistOpen(false)}
			/>
		</>
	);
}

export default PlayerLayout;
