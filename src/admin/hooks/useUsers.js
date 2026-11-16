// src/admin/hooks/useUsers.js
import { useCallback } from "react";
import { adminApi } from "../../api/adminApi.js";
import { useCursorList } from "./useCursorList.js";

export function useUsers(initialFilters = {}) {
	const list = useCursorList(adminApi.listUsers, initialFilters);

	const createUser = useCallback(
		async (payload) => {
			const { user } = await adminApi.createUser(payload);
			list.setItems((prev) => [user, ...prev]);
			return user;
		},
		[list],
	);

	const setUserRole = useCallback(
		async (userId, role) => {
			const { user } = await adminApi.setUserRole(userId, role);
			list.setItems((prev) => prev.map((u) => (u.id === userId ? user : u)));
			return user;
		},
		[list],
	);

	return {
		...list,
		createUser,
		setUserRole,
	};
}
