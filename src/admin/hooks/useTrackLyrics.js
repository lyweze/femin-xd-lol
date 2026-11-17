import { useState, useEffect, useCallback } from "react";
import { adminApi } from "../../api/adminApi.js";

export function useTrackLyrics(trackId) {
	const [lyricsList, setLyricsList] = useState([]);
	const [activeLang, setActiveLang] = useState("ru");
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (!trackId) {
			setLyricsList([]);
			return;
		}

		let cancelled = false;
		setIsLoading(true);

		adminApi
			.listTrackLyrics(trackId)
			.then((data) => {
				if (cancelled) return;
				setLyricsList(data.items);
				setActiveLang(data.items[0]?.language ?? "ru");
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
			if (!trackId) return;
			setIsSaving(true);
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
			} finally {
				setIsSaving(false);
			}
		},
		[trackId],
	);

	const removeLyrics = useCallback(
		async (language) => {
			if (!trackId) return;
			await adminApi.deleteTrackLyrics(trackId, language);
			setLyricsList((prev) => prev.filter((l) => l.language !== language));
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
		saveLyrics,
		removeLyrics,
	};
}
