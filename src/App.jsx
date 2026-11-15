// ============================================================================
// Импорты: состояние, стили каркаса и базовые компоненты интерфейса
// ============================================================================
import { useState } from "react";
import "./App.css";

import { useSidebar } from "./hooks/useSidebar.js";
import Sidebar from "./components/layout/sidebar/Sidebar.jsx";
import MainPage from "./components/pages/main-page/MainPage.jsx";
// В будущем сюда подключаются остальные экраны и постоянный плеер:
// import LibraryPage from "./components/pages/library-page/LibraryPage.jsx";
// import PlaylistPage from "./components/pages/playlist-page/PlaylistPage.jsx";
// import Player from "./components/layout/player/Player.jsx";

/**
 * Корневой компонент приложения (`App`).
 * Управляет навигацией между разделами и удерживает постоянный каркас
 * (боковую панель и парящий плеер) поверх сменяемых страниц.
 */
function App() {
	const [activeView, setActiveView] = useState("home");
	const { isOpen: isSidebarOpen, toggle: toggleSidebar } = useSidebar(true);

	return (
		<div className="app">
			{/* Постоянная боковая панель навигации */}
			<Sidebar
				isOpen={isSidebarOpen}
				onToggle={toggleSidebar}
				activeView={activeView}
				onNavigate={setActiveView}
			/>

			{/* Активный экран рабочей области */}
			{activeView === "home" && (
				<MainPage
					isSidebarOpen={isSidebarOpen}
					onToggleSidebar={toggleSidebar}
				/>
			)}
		</div>
	);
}

export default App;
