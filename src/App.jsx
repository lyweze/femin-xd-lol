// ============================================================================
// Импорты: маршрутизатор, глобальные стили каркаса и страницы приложения
// ============================================================================
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import { AppRouter } from "./platform/AppRouter.jsx";
import PlayerLayout from "./components/layout/PlayerLayout.jsx";
import MainPage from "./components/pages/main-page/MainPage.jsx";
import SearchPage from "./components/pages/search-page/SearchPage.jsx";
import LibraryPage from "./components/pages/library-page/LibraryPage.jsx";
import PlaylistPage from "./components/pages/playlist-page/PlaylistPage.jsx";
import ArtistPage from "./components/pages/artist-page/ArtistPage.jsx";

/**
 * Корневой компонент приложения (`App`).
 * Описывает таблицу маршрутов внутри постоянного каркаса `PlayerLayout`.
 */
function App() {
    return (
        <AppRouter>
            <Routes>
                <Route element={<PlayerLayout />}>
                    <Route path="/" element={<MainPage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/library" element={<LibraryPage />} />
                    <Route
                        path="/playlist/:id"
                        element={<PlaylistPage kind="playlist" />}
                    />
                    <Route
                        path="/album/:id"
                        element={<PlaylistPage kind="album" />}
                    />
                    <Route path="/artist/:id" element={<ArtistPage />} />
                </Route>

                {/* Фолбэк для неизвестных маршрутов */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AppRouter>
    );
}

export default App;
