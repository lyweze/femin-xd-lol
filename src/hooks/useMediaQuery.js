import { useSyncExternalStore } from "react";

/**
 * Реактивный медиа-запрос на базе `useSyncExternalStore` (без `useEffect` и лишних ререндеров).
 * Корректно работает при SSR и изменении ширины окна/ориентации экрана.
 */
export function useMediaQuery(query) {
	return useSyncExternalStore(
		(onStoreChange) => {
			if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
				return () => {};
			}
			const mql = window.matchMedia(query);
			mql.addEventListener("change", onStoreChange);
			return () => mql.removeEventListener("change", onStoreChange);
		},
		() => {
			if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
				return false;
			}
			return window.matchMedia(query).matches;
		},
		() => false,
	);
}
