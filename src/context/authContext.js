// ============================================================================
// Контекст авторизации (единая сессия `femin_session` для плеера и админки)
// ============================================================================
import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

/**
 * Возвращает текущую сессию пользователя, флаги роли и методы входа/выхода.
 */
export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) {
		throw new Error("useAuth must be used inside <AuthProvider>");
	}
	return ctx;
}
