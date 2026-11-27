import { useState, useMemo, useCallback } from "react";
import { readStorageJson, writeStorageJson } from "../utils/storage.js";
import { AuthContext } from "./authContext.js";

// ============================================================================
// Провайдер авторизации (локальный профиль по умолчанию «User» с правами admin)
// ============================================================================
export const ACCOUNT_STORAGE_KEY = "matte_obsidian_local_account";

const DEFAULT_USERNAME = "User";
const DEFAULT_EMAIL = "user@femin.fm";

const INITIAL_LOCAL_USER = {
	id: "u0000000-0000-0000-0000-000000000001",
	username: DEFAULT_USERNAME,
	email: DEFAULT_EMAIL,
	role: "admin",
	mode: "LOCAL",
};

function isValidStoredUser(value) {
	return (
		Boolean(value) &&
		typeof value === "object" &&
		typeof value.username === "string" &&
		value.username.trim().length > 0
	);
}

function readStoredUser() {
	const saved = readStorageJson(ACCOUNT_STORAGE_KEY, null, isValidStoredUser);
	if (!saved) return INITIAL_LOCAL_USER;
	return {
		...INITIAL_LOCAL_USER,
		...saved,
		username: saved.username.trim().slice(0, 40) || DEFAULT_USERNAME,
		// Пока оставляем права администратора всем локальным аккаунтам
		role: "admin",
		mode: "LOCAL",
	};
}

/**
 * Оборачивает приложение состоянием локального пользователя, правами доступа
 * и управлением модальным окном смены имени профиля.
 */
export function AuthProvider({ children }) {
	const [user, setUser] = useState(readStoredUser);
	const [isLoading] = useState(false);
	const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

	const updateUsername = useCallback((rawName) => {
		const cleanName = String(rawName || "").trim().slice(0, 40) || DEFAULT_USERNAME;
		setUser((prev) => {
			const nextUser = {
				...(prev || INITIAL_LOCAL_USER),
				username: cleanName,
				role: "admin",
				mode: "LOCAL",
			};
			writeStorageJson(ACCOUNT_STORAGE_KEY, nextUser);
			return nextUser;
		});
		return cleanName;
	}, []);

	const openAccountModal = useCallback(() => {
		setIsAccountModalOpen(true);
	}, []);

	const closeAccountModal = useCallback(() => {
		setIsAccountModalOpen(false);
	}, []);

	const login = useCallback(async ({ email, username } = {}) => {
		const nextUser = {
			id: INITIAL_LOCAL_USER.id,
			username: String(username || "").trim().slice(0, 40) || DEFAULT_USERNAME,
			email: email || DEFAULT_EMAIL,
			role: "admin",
			mode: "LOCAL",
		};
		writeStorageJson(ACCOUNT_STORAGE_KEY, nextUser);
		setUser(nextUser);
	}, []);

	const logout = useCallback(async () => {
		setUser(null);
	}, []);

	const value = useMemo(
		() => ({
			user,
			isLoading,
			isAuthenticated: Boolean(user),
			// Оставляем админ-права активными для локальных профилей
			isAdmin: Boolean(user),
			isAccountModalOpen,
			openAccountModal,
			closeAccountModal,
			updateUsername,
			login,
			logout,
		}),
		[
			user,
			isLoading,
			isAccountModalOpen,
			openAccountModal,
			closeAccountModal,
			updateUsername,
			login,
			logout,
		],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
