import { useCallback } from "react";
import { adminApi } from "../../api/adminApi.js";
import { useCursorList } from "./useCursorList.js";

export function useUsers(initialFilters = {}) {
	const list = useCursorList(adminApi.listUsers, initialFilters);
	const { setItems } = list;

	const createUser = useCallback(
		async (payload) => {
			const { user } = await adminApi.createUser(payload);
			setItems((prev) => [user, ...prev]);
			return user;
		},
		[setItems],
	);

	const setUserRole = useCallback(
		async (userId, role) => {
			const { user } = await adminApi.setUserRole(userId, role);
			setItems((prev) => prev.map((u) => (u.id === userId ? user : u)));
			return user;
		},
		[setItems],
	);

	return {
		...list,
		createUser,
		setUserRole,
	};
}
