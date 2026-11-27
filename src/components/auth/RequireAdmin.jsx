// ============================================================================
// Ограничитель доступа к маршрутам Admin Studio (`RequireAdmin`)
// ============================================================================
import { Link } from "react-router-dom";
import { useAuth } from "../../context/authContext.js";

/**
 * Пропускает пользователей с ролью `admin`, иначе показывает заглушку 403.
 */
export function RequireAdmin({ children }) {
	const { isAdmin, isLoading } = useAuth();

	if (isLoading) return null;

	if (!isAdmin) {
		return (
			<div className="admin-forbidden">
				<span className="admin-forbidden-code">403 • FORBIDDEN</span>
				<h1>Admin access required</h1>
				<p>
					Эта область доступна только пользователям с ролью <code>admin</code>.
				</p>
				<Link to="/" className="admin-btn admin-btn-primary">
					Вернуться в плеер
				</Link>
			</div>
		);
	}

	return children;
}
