import { useState, useCallback, useEffect, useRef } from "react";

export function useCursorList(fetcher, initialParams = {}) {
	const [items, setItems] = useState([]);
	const [nextCursor, setNextCursor] = useState(null);
	const [params, setParams] = useState(initialParams);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);
	const requestIdRef = useRef(0);

	const load = useCallback(
		async (cursor = null, activeParams = params) => {
			const currentId = ++requestIdRef.current;
			setIsLoading(true);
			setError(null);

			try {
				const data = await fetcher({ ...activeParams, cursor });
				if (currentId !== requestIdRef.current) return;

				setItems((prev) => (cursor ? [...prev, ...data.items] : data.items));
				setNextCursor(data.next_cursor ?? null);
			} catch (err) {
				if (currentId === requestIdRef.current) setError(err);
			} finally {
				if (currentId === requestIdRef.current) setIsLoading(false);
			}
		},
		[fetcher, params],
	);

	useEffect(() => {
		load(null, params);
	}, [params, load]);

	const loadMore = useCallback(() => {
		if (nextCursor && !isLoading) {
			load(nextCursor, params);
		}
	}, [nextCursor, isLoading, load, params]);

	const updateFilters = useCallback((patch) => {
		setParams((prev) => ({ ...prev, ...patch }));
	}, []);

	const refresh = useCallback(() => load(null, params), [load, params]);

	return {
		items,
		setItems,
		params,
		hasMore: Boolean(nextCursor),
		isLoading,
		error,
		loadMore,
		updateFilters,
		refresh,
	};
}
