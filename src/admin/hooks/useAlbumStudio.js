import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { adminApi } from "../../api/adminApi.js";

export function useAlbumStudio(albumId) {
	const [refreshTick, setRefreshTick] = useState(0);
	const [state, setState] = useState(() => ({
		album: null,
		tracks: [],
		fetchedKey: null,
		loadedAtMs: Date.now(),
		error: null,
	}));
	const [isUploadingCover, setIsUploadingCover] = useState(false);
	const [uploadingTrackIds, setUploadingTrackIds] = useState({});
	const [isPublishing, setIsPublishing] = useState(false);

	const activeKey = albumId ? `${albumId}:${refreshTick}` : null;
	const tracksRef = useRef(state.tracks);

	useEffect(() => {
		tracksRef.current = state.tracks;
	}, [state.tracks]);

	const applyAlbumData = useCallback((key, data) => {
		setState({
			album: data.album,
			tracks: data.tracks,
			fetchedKey: key,
			loadedAtMs: Date.now(),
			error: null,
		});
	}, []);

	useEffect(() => {
		if (!albumId || !activeKey) return;
		let cancelled = false;

		adminApi
			.getAlbum(albumId)
			.then((data) => {
				if (!cancelled) applyAlbumData(activeKey, data);
			})
			.catch((err) => {
				if (!cancelled) {
					setState((prev) => ({
						...prev,
						fetchedKey: activeKey,
						error: err,
					}));
				}
			});

		return () => {
			cancelled = true;
		};
	}, [albumId, activeKey, applyAlbumData]);

	const hasProcessingTracks = useMemo(
		() => state.tracks.some((t) => t.status === "processing"),
		[state.tracks],
	);

	// Поллинг раз в 3 сек, пока хотя бы один трек обрабатывается воркером
	useEffect(() => {
		if (!albumId || !hasProcessingTracks) return;
		let cancelled = false;

		const timer = setInterval(() => {
			adminApi
				.getAlbum(albumId)
				.then((data) => {
					if (!cancelled) applyAlbumData(activeKey, data);
				})
				.catch(() => {
					// тихий поллинг не перезаписывает UI ошибкой
				});
		}, 3000);

		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, [albumId, hasProcessingTracks, activeKey, applyAlbumData]);

	const { album, tracks, loadedAtMs, error } = state;
	const isLoading = Boolean(albumId) && state.fetchedKey !== activeKey;
	const isPublished = Boolean(album?.published_at);
	const isScheduled =
		Boolean(album?.published_at) &&
		new Date(album.published_at).getTime() > loadedAtMs;

	const publishChecklist = useMemo(() => {
		const hasCover = Boolean(album?.cover);
		const hasTracks = tracks.length > 0;
		const allReady = hasTracks && tracks.every((t) => t.status === "ready");
		return {
			hasCover,
			hasTracks,
			allReady,
			canPublish: hasCover && hasTracks && allReady,
		};
	}, [album, tracks]);

	const setTracks = useCallback((updater) => {
		setState((prev) => ({
			...prev,
			tracks: typeof updater === "function" ? updater(prev.tracks) : updater,
		}));
	}, []);

	const setAlbum = useCallback((updater) => {
		setState((prev) => ({
			...prev,
			album: typeof updater === "function" ? updater(prev.album) : updater,
		}));
	}, []);

	const updateAlbum = useCallback(
		async (payload) => {
			const { album: updated } = await adminApi.updateAlbum(albumId, payload);
			setAlbum(updated);
			return updated;
		},
		[albumId, setAlbum],
	);

	const uploadCover = useCallback(
		async (file) => {
			setIsUploadingCover(true);
			try {
				const { album: updated } = await adminApi.uploadAlbumCover(
					albumId,
					file,
				);
				setAlbum(updated);
				return updated;
			} finally {
				setIsUploadingCover(false);
			}
		},
		[albumId, setAlbum],
	);

	const addTrack = useCallback(
		async (payload) => {
			const { track } = await adminApi.createTrack({
				album_id: albumId,
				disc_no: payload.disc_no || 1,
				track_no: payload.track_no || tracksRef.current.length + 1,
				...payload,
			});
			setState((prev) => ({
				...prev,
				tracks: [...prev.tracks, track],
				album: prev.album
					? { ...prev.album, track_count: prev.album.track_count + 1 }
					: prev.album,
			}));
			return track;
		},
		[albumId],
	);

	const updateTrack = useCallback(
		async (trackId, payload) => {
			const { track } = await adminApi.updateTrack(trackId, payload);
			setTracks((prev) => prev.map((t) => (t.id === trackId ? track : t)));
			return track;
		},
		[setTracks],
	);

	const removeTrack = useCallback(async (trackId) => {
		await adminApi.deleteTrack(trackId);
		setState((prev) => ({
			...prev,
			tracks: prev.tracks.filter((t) => t.id !== trackId),
			album: prev.album
				? { ...prev.album, track_count: Math.max(0, prev.album.track_count - 1) }
				: prev.album,
		}));
	}, []);

	const uploadTrackAudio = useCallback(
		async (trackId, file) => {
			setUploadingTrackIds((prev) => ({ ...prev, [trackId]: true }));
			try {
				const { track } = await adminApi.uploadTrackAudio(trackId, file);
				setTracks((prev) => prev.map((t) => (t.id === trackId ? track : t)));
				return track;
			} finally {
				setUploadingTrackIds((prev) => ({ ...prev, [trackId]: false }));
			}
		},
		[setTracks],
	);

	const reprocessTrack = useCallback(
		async (trackId) => {
			const { track } = await adminApi.reprocessTrack(trackId);
			setTracks((prev) => prev.map((t) => (t.id === trackId ? track : t)));
			return track;
		},
		[setTracks],
	);

	const reorderTracks = useCallback(
		async (orderedTracks) => {
			const previous = tracksRef.current;
			setTracks(orderedTracks);
			const items = orderedTracks.map((t, idx) => ({
				track_id: t.id,
				disc_no: t.disc_no || 1,
				track_no: idx + 1,
			}));
			try {
				const data = await adminApi.setAlbumTrackOrder(albumId, items);
				setTracks(data.tracks);
			} catch (err) {
				setTracks(previous);
				throw err;
			}
		},
		[albumId, setTracks],
	);

	const publish = useCallback(
		async (publishedAt = null) => {
			setIsPublishing(true);
			try {
				const { album: updated } = await adminApi.publishAlbum(
					albumId,
					publishedAt,
				);
				setState((prev) => ({
					...prev,
					album: updated,
					loadedAtMs: Date.now(),
				}));
			} finally {
				setIsPublishing(false);
			}
		},
		[albumId],
	);

	const unpublish = useCallback(async () => {
		setIsPublishing(true);
		try {
			const { album: updated } = await adminApi.unpublishAlbum(albumId);
			setAlbum(updated);
		} finally {
			setIsPublishing(false);
		}
	}, [albumId, setAlbum]);

	const refresh = useCallback(() => {
		setRefreshTick((t) => t + 1);
	}, []);

	return {
		album,
		tracks,
		isLoading,
		isUploadingCover,
		uploadingTrackIds,
		isPublishing,
		isPublished,
		isScheduled,
		error,
		publishChecklist,
		refresh,
		updateAlbum,
		uploadCover,
		addTrack,
		updateTrack,
		removeTrack,
		uploadTrackAudio,
		reprocessTrack,
		reorderTracks,
		publish,
		unpublish,
	};
}
