// ============================================================================
// Корневой компонент приложения: провайдеры, роутер и разделение чанка админки
// ============================================================================
import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import { IS_DESKTOP } from "./platform/env.js";
import { AppRouter } from "./platform/AppRouter.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { PlayerProvider } from "./context/PlayerContext.jsx";
import AccountEditModal from "./components/auth/AccountEditModal.jsx";
import { RequireAdmin } from "./components/auth/RequireAdmin.jsx";

import PlayerLayout from "./components/layout/PlayerLayout.jsx";
import MainPage from "./components/pages/main-page/MainPage.jsx";
import SearchPage from "./components/pages/search-page/SearchPage.jsx";
import LibraryPage from "./components/pages/library-page/LibraryPage.jsx";
import PlaylistPage from "./components/pages/playlist-page/PlaylistPage.jsx";
import ArtistPage from "./components/pages/artist-page/ArtistPage.jsx";

// Админ-студия загружается ленивым чанком, чтобы не утяжелять основной бандл плеера
const AdminLayout = lazy(() => import("./admin/AdminLayout.jsx"));

function App() {
	return (
		<AuthProvider>
			<PlayerProvider>
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

						{/* В десктопном Tauri-приложении админка недоступна */}
						{!IS_DESKTOP && (
							<Route
								path="/admin/*"
								element={
									<RequireAdmin>
										<Suspense fallback={null}>
											<AdminLayout />
										</Suspense>
									</RequireAdmin>
								}
							/>
						)}

						<Route path="*" element={<Navigate to="/" replace />} />
					</Routes>
				</AppRouter>
				<AccountEditModal />
			</PlayerProvider>
		</AuthProvider>
	);
}

export default App;
