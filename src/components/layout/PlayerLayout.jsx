// ============================================================================
// Основной макет плеера: полоса возврата сайдбара + сайдбар + .main + фуллскрин
// ============================================================================
import { Outlet, useLocation } from "react-router-dom";
import { useSidebar } from "../../hooks/useSidebar.js";
import TitlebarDrag from "../../platform/TitlebarDrag.jsx";
import { ChevronRightIcon } from "../shared/icons/Icons.jsx";
import AmbientBg from "./ambient-bg/AmbientBg.jsx";
import Sidebar from "./sidebar/Sidebar.jsx";
import FloatingPlayer from "../player/floating-player/FloatingPlayer.jsx";
import FullscreenPlayer from "../player/fullscreen-player/FullscreenPlayer.jsx";

function PlayerLayout() {
	const location = useLocation();
	const { isOpen: isSidebarOpen, toggle: toggleSidebar } = useSidebar(true);

	return (
		<>
			<TitlebarDrag />
			<AmbientBg />

			<div className="app">
				{!isSidebarOpen && (
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

				<Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />

				<main className="main">
					<div className="page-transition" key={location.pathname}>
						<Outlet />
					</div>

					<FloatingPlayer />
				</main>
			</div>

			<FullscreenPlayer />
		</>
	);
}

export default PlayerLayout;
