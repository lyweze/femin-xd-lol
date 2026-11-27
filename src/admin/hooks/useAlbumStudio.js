import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { adminApi } from "../../api/adminApi.js";

export function useAlbumStudio(albumId) {
	const [album, setAlbum] = useState(null);
	const [tracks, setTracks] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isUploadingCover, setIsUploadingCover] = useState(false);
	const [uploadingTrackIds, setUploadingTrackIds] = useState({});
	const [isPublishing, setIsPublishing] = useState(false);
	const [error, setError] = useState(null);

	const tracksRef = useRef(tracks);
	tracksRef.current = tracks;

	const fetchAlbum = useCallback(
		async (silent = false) => {
			if (!albumId) return;
			if (!silent) setIsLoading(true);
			setError(null);

			try {
				const data = await adminApi.getAlbum(albumId);
				setAlbum(data.album);
				setTracks(data.tracks);
			} catch (err) {
				setError(err);
			} finally {
				if (!silent) setIsLoading(false);
			}
		},
		[albumId],
	);

	useEffect(() => {
		fetchAlbum(false);
	}, [fetchAlbum]);

	// Поллинг раз в 3 сек, пока хотя бы один трек обрабатывается воркером
	const hasProcessingTracks = useMemo(
		() => tracks.some((t) => t.status === "processing"),
		[tracks],
	);

	useEffect(() => {
		if (!hasProcessingTracks) return;
		const timer = setInterval(() => fetchAlbum(true), 3000);
		return () => clearInterval(timer);
	}, [hasProcessingTracks, fetchAlbum]);

	const isPublished = Boolean(album?.published_at);
	const isScheduled =
		Boolean(album?.published_at) &&
		new Date(album.published_at).getTime() > Date.now();

	// Чек-лист перед POST /publish (предотвращает 409 Conflict)
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

	const updateAlbum = useCallback(
		async (payload) => {
			const { album: updated } = await adminApi.updateAlbum(albumId, payload);
			setAlbum(updated);
			return updated;
		},
		[albumId],
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
		[albumId],
	);

	const addTrack = useCallback(
		async (payload) => {
			const { track } = await adminApi.createTrack({
				album_id: albumId,
				disc_no: payload.disc_no || 1,
				track_no: payload.track_no || tracksRef.current.length + 1,
				...payload,
			});
			setTracks((prev) => [...prev, track]);
			setAlbum((prev) =>
				prev ? { ...prev, track_count: prev.track_count + 1 } : prev,
			);
			return track;
		},
		[albumId],
	);

	const updateTrack = useCallback(async (trackId, payload) => {
		const { track } = await adminApi.updateTrack(trackId, payload);
		setTracks((prev) => prev.map((t) => (t.id === trackId ? track : t)));
		return track;
	}, []);

	const removeTrack = useCallback(async (trackId) => {
		await adminApi.deleteTrack(trackId);
		setTracks((prev) => prev.filter((t) => t.id !== trackId));
		setAlbum((prev) =>
			prev ? { ...prev, track_count: Math.max(0, prev.track_count - 1) } : prev,
		);
	}, []);

	const uploadTrackAudio = useCallback(async (trackId, file) => {
		setUploadingTrackIds((prev) => ({ ...prev, [trackId]: true }));
		try {
			const { track } = await adminApi.uploadTrackAudio(trackId, file);
			setTracks((prev) => prev.map((t) => (t.id === trackId ? track : t)));
			return track;
		} finally {
			setUploadingTrackIds((prev) => ({ ...prev, [trackId]: false }));
		}
	}, []);

	const reprocessTrack = useCallback(async (trackId) => {
		const { track } = await adminApi.reprocessTrack(trackId);
		setTracks((prev) => prev.map((t) => (t.id === trackId ? track : t)));
		return track;
	}, []);

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
				// Откатываем оптимистичное обновление при 422 / сетевой ошибке
				setTracks(previous);
				throw err;
			}
		},
		[albumId],
	);

	const publish = useCallback(
		async (publishedAt = null) => {
			setIsPublishing(true);
			try {
				const { album: updated } = await adminApi.publishAlbum(
					albumId,
					publishedAt,
				);
				setAlbum(updated);
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
	}, [albumId]);

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
		refresh: () => fetchAlbum(false),
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
