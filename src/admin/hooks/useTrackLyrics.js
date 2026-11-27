import { useState, useEffect, useCallback } from "react";
import { adminApi } from "../../api/adminApi.js";

export function useTrackLyrics(trackId) {
	const [state, setState] = useState({
		trackId: null,
		items: [],
		error: null,
	});
	const [selectedLang, setSelectedLang] = useState({
		trackId: null,
		lang: "ru",
	});
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (!trackId) return;

		let cancelled = false;
		adminApi
			.listTrackLyrics(trackId)
			.then((data) => {
				if (cancelled) return;
				const items = data.items ?? [];
				setState({ trackId, items, error: null });
				setSelectedLang({
					trackId,
					lang: items[0]?.language ?? "ru",
				});
			})
			.catch((err) => {
				if (!cancelled) {
					setState({ trackId, items: [], error: err });
				}
			});

		return () => {
			cancelled = true;
		};
	}, [trackId]);

	const lyricsList = trackId && state.trackId === trackId ? state.items : [];
	const error = trackId && state.trackId === trackId ? state.error : null;
	const isLoading = Boolean(trackId) && state.trackId !== trackId;
	const activeLang =
		selectedLang.trackId === trackId ? selectedLang.lang : "ru";

	const setActiveLang = useCallback(
		(lang) => {
			setSelectedLang({ trackId, lang });
		},
		[trackId],
	);

	const currentLyrics =
		lyricsList.find((l) => l.language === activeLang) ?? null;

	const saveLyrics = useCallback(
		async (language, payload) => {
			if (!trackId) return null;
			setIsSaving(true);
			setState((prev) => ({ ...prev, error: null }));
			try {
				const { lyrics } = await adminApi.putTrackLyrics(
					trackId,
					language,
					payload,
				);
				setState((prev) => {
					const exists = prev.items.some((l) => l.language === language);
					return {
						...prev,
						items: exists
							? prev.items.map((l) => (l.language === language ? lyrics : l))
							: [...prev.items, lyrics],
					};
				});
				setSelectedLang({ trackId, lang: language });
				return lyrics;
			} catch (err) {
				setState((prev) => ({ ...prev, error: err }));
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
			setState((prev) => ({ ...prev, error: null }));
			try {
				await adminApi.deleteTrackLyrics(trackId, language);
				setState((prev) => {
					const next = prev.items.filter((l) => l.language !== language);
					setSelectedLang((curr) =>
						curr.trackId === trackId && curr.lang === language
							? { trackId, lang: next[0]?.language ?? "ru" }
							: curr,
					);
					return { ...prev, items: next };
				});
			} catch (err) {
				setState((prev) => ({ ...prev, error: err }));
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
