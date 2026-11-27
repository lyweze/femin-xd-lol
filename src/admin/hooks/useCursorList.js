import { useState, useCallback, useEffect } from "react";

export function useCursorList(fetcher, initialParams = {}) {
	const [params, setParams] = useState(initialParams);
	const [refreshTick, setRefreshTick] = useState(0);
	const [isLoadingMore, setIsLoadingMore] = useState(false);

	const activeKey = JSON.stringify({ params, refreshTick });
	const [state, setState] = useState({
		items: [],
		nextCursor: null,
		fetchedKey: null,
		error: null,
	});

	useEffect(() => {
		let cancelled = false;

		fetcher({ ...params, cursor: null })
			.then((data) => {
				if (cancelled) return;
				setState({
					items: data.items ?? [],
					nextCursor: data.next_cursor ?? null,
					fetchedKey: activeKey,
					error: null,
				});
			})
			.catch((err) => {
				if (cancelled) return;
				setState((prev) => ({
					...prev,
					fetchedKey: activeKey,
					error: err,
				}));
			});

		return () => {
			cancelled = true;
		};
	}, [fetcher, params, activeKey]);

	const setItems = useCallback((updater) => {
		setState((prev) => ({
			...prev,
			items: typeof updater === "function" ? updater(prev.items) : updater,
		}));
	}, []);

	const loadMore = useCallback(async () => {
		if (!state.nextCursor || isLoadingMore) return;
		setIsLoadingMore(true);
		try {
			const data = await fetcher({ ...params, cursor: state.nextCursor });
			setState((prev) => ({
				...prev,
				items: [...prev.items, ...(data.items ?? [])],
				nextCursor: data.next_cursor ?? null,
				error: null,
			}));
		} catch (err) {
			setState((prev) => ({ ...prev, error: err }));
		} finally {
			setIsLoadingMore(false);
		}
	}, [fetcher, params, state.nextCursor, isLoadingMore]);

	const updateFilters = useCallback((patch) => {
		setParams((prev) => ({ ...prev, ...patch }));
	}, []);

	const refresh = useCallback(() => {
		setRefreshTick((t) => t + 1);
	}, []);

	return {
		items: state.items,
		setItems,
		params,
		hasMore: Boolean(state.nextCursor),
		isLoading: isLoadingMore || state.fetchedKey !== activeKey,
		error: state.error,
		loadMore,
		updateFilters,
		refresh,
	};
}
