import { useState, useEffect, useCallback } from "react";
import { adminApi } from "../../api/adminApi.js";

export function useTrackLyrics(trackId) {
	const [lyricsList, setLyricsList] = useState([]);
	const [activeLang, setActiveLang] = useState("ru");
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!trackId) {
			setLyricsList([]);
			setError(null);
			return;
		}

		let cancelled = false;
		setIsLoading(true);
		setError(null);

		adminApi
			.listTrackLyrics(trackId)
			.then((data) => {
				if (cancelled) return;
				setLyricsList(data.items ?? []);
				setActiveLang(data.items?.[0]?.language ?? "ru");
			})
			.catch((err) => {
				if (!cancelled) setError(err);
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [trackId]);

	const currentLyrics =
		lyricsList.find((l) => l.language === activeLang) ?? null;

	const saveLyrics = useCallback(
		async (language, payload) => {
			if (!trackId) return null;
			setIsSaving(true);
			setError(null);
			try {
				const { lyrics } = await adminApi.putTrackLyrics(
					trackId,
					language,
					payload,
				);
				setLyricsList((prev) => {
					const exists = prev.some((l) => l.language === language);
					return exists
						? prev.map((l) => (l.language === language ? lyrics : l))
						: [...prev, lyrics];
				});
				setActiveLang(language);
				return lyrics;
			} catch (err) {
				setError(err);
				throw err;
			} finally {
				setIsSaving(false);
			}
		},
		[trackId],
	);

	const removeLyrics = useCallback(
		async (language) => {
			if (!trackId) return;
			setError(null);
			try {
				await adminApi.deleteTrackLyrics(trackId, language);
				setLyricsList((prev) => {
					const next = prev.filter((l) => l.language !== language);
					setActiveLang((curr) =>
						curr === language ? (next[0]?.language ?? "ru") : curr,
					);
					return next;
				});
			} catch (err) {
				setError(err);
				throw err;
			}
		},
		[trackId],
	);

	return {
		lyricsList,
		currentLyrics,
		activeLang,
		setActiveLang,
		isLoading,
		isSaving,
		error,
		saveLyrics,
		removeLyrics,
	};
}
