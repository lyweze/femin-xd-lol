// ============================================================================
// Импорты: состояние, стили каркаса и базовые компоненты интерфейса
// ============================================================================
import { useState } from "react";
import "./App.css";

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
	// Активный раздел интерфейса: "home" | "library" | { type: "playlist", id: string }
	const [activeView, setActiveView] = useState("home");

	return (
		<div className="app">
			{/* Постоянная боковая навигация */}
			<Sidebar activeView={activeView} onNavigate={setActiveView} />

			{/* Сменяемая правая рабочая область */}
			{activeView === "home" && <MainPage />}
			{/* {activeView === "library" && <LibraryPage />} */}
			{/* {typeof activeView === "object" && <PlaylistPage playlistId={activeView.id} />} */}

			{/* Парящая капсула плеера — живёт на уровне App,
                чтобы не размонтироваться при переключении страниц */}
			{/* <Player /> */}
		</div>
	);
}

export default App;
