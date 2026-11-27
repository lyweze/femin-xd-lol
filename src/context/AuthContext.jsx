import { createContext, useContext, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";

// ============================================================================
// Контекст авторизации (единая сессия `femin_session` для плеера и админки)
// ============================================================================
const AuthContext = createContext(null);

const INITIAL_LOCAL_USER = {
	id: "u0000000-0000-0000-0000-000000000001",
	username: "Denis",
	email: "denis@femin.fm",
	role: "admin",
	mode: "LOCAL",
};

export function AuthProvider({ children }) {
	const [user, setUser] = useState(INITIAL_LOCAL_USER);
	const [isLoading] = useState(false);

	const login = useCallback(async ({ email, username } = {}) => {
		setUser({
			id: INITIAL_LOCAL_USER.id,
			username: username || "Denis",
			email: email || "denis@femin.fm",
			role: "admin",
			mode: "LOCAL",
		});
	}, []);

	const logout = useCallback(async () => {
		setUser(null);
	}, []);

	const value = useMemo(
		() => ({
			user,
			isLoading,
			isAuthenticated: Boolean(user),
			isAdmin: user?.role === "admin",
			login,
			logout,
		}),
		[user, isLoading, login, logout],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) {
		throw new Error("useAuth must be used inside <AuthProvider>");
	}
	return ctx;
}

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
