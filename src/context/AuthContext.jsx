import { useState, useMemo, useCallback } from "react";
import { AuthContext } from "./authContext.js";

// ============================================================================
// Контекст авторизации (единая сессия `femin_session` для плеера и админки)
// ============================================================================
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
