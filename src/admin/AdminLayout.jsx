import { Routes, Route, NavLink, Navigate, Link } from "react-router-dom";
import { IS_MOCK_ADMIN_MODE } from "../api/adminApi.js";
import { useAuth } from "../context/AuthContext.jsx";
import AlbumsListPage from "./pages/AlbumsListPage.jsx";
import AlbumEditorPage from "./pages/AlbumEditorPage.jsx";
import ArtistsPage from "./pages/ArtistsPage.jsx";
import TracksQueuePage from "./pages/TracksQueuePage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import "./styles/admin.css";

const ADMIN_NAV = [
	{ to: "/admin/albums", label: "Albums" },
	{ to: "/admin/artists", label: "Artists" },
	{ to: "/admin/tracks", label: "Tracks & Queue" },
	{ to: "/admin/users", label: "Users" },
];

function AdminLayout() {
	const { user } = useAuth();

	return (
		<div className="admin-shell">
			<aside className="admin-sidebar" aria-label="Admin navigation">
				<div className="admin-brand">
					<span className="admin-brand-kicker">FEMIN STUDIO</span>
					<strong className="admin-brand-title">Admin CMS</strong>
					<span
						className={`admin-mode-pill ${IS_MOCK_ADMIN_MODE ? "is-mock" : "is-live"}`}
					>
						{IS_MOCK_ADMIN_MODE ? "MOCK API" : "LIVE API"}
					</span>
				</div>

				<nav className="admin-nav">
					{ADMIN_NAV.map((item) => (
						<NavLink
							key={item.to}
							to={item.to}
							className="admin-nav-link"
						>
							<span>{item.label}</span>
						</NavLink>
					))}
				</nav>

				<div className="admin-sidebar-footer">
					<div className="admin-user-chip">
						<span className="admin-user-name">{user?.username || "Admin"}</span>
						<span className="admin-user-role">
							ROLE: {user?.role?.toUpperCase() || "ADMIN"}
						</span>
					</div>
					<Link to="/" className="admin-btn admin-btn-ghost admin-back-btn">
						← Back to Player
					</Link>
				</div>
			</aside>

			<main className="admin-main">
				<Routes>
					<Route index element={<Navigate to="albums" replace />} />
					<Route path="albums" element={<AlbumsListPage />} />
					<Route path="albums/:albumId" element={<AlbumEditorPage />} />
					<Route path="artists" element={<ArtistsPage />} />
					<Route path="tracks" element={<TracksQueuePage />} />
					<Route path="users" element={<UsersPage />} />
					<Route path="*" element={<Navigate to="albums" replace />} />
				</Routes>
			</main>
		</div>
	);
}

export default AdminLayout;
