// ============================================================================
// Боковая выдвижная шторка управления текстами трека (`LyricsDrawer`)
// Отвечает за выбор языка и жизненный цикл диалога; форма вынесена в LyricsEditorForm.
// ============================================================================
import { useState } from "react";
import { useTrackLyrics } from "../hooks/useTrackLyrics.js";
import LyricsEditorForm from "./LyricsEditorForm.jsx";

function LyricsDrawer({ track, onClose, onSaved }) {
	const trackId = track?.id ?? null;
	const {
		lyricsList,
		currentLyrics,
		activeLang,
		setActiveLang,
		isLoading,
		isSaving,
		error,
		saveLyrics,
		removeLyrics,
	} = useTrackLyrics(trackId);

	const [localError, setLocalError] = useState(null);

	if (!track) return null;

	const handleSave = async (lang, payload) => {
		try {
			await saveLyrics(lang, payload);
			onSaved?.();
		} catch (err) {
			setLocalError(err?.message || "Не удалось сохранить текст.");
		}
	};

	const handleDeleteLang = async () => {
		if (!currentLyrics) return;
		setLocalError(null);
		try {
			await removeLyrics(currentLyrics.language);
			onSaved?.();
		} catch (err) {
			setLocalError(err?.message || "Не удалось удалить текст.");
		}
	};

	// Ключ пересоздаёт состояние формы только при смене трека, языка или обновлении с сервера
	const formKey = `${trackId}-${activeLang}-${currentLyrics?.updated_at ?? "empty"}`;
	const initialLang = activeLang === "__new__" ? "en" : activeLang || "ru";

	return (
		<div className="admin-drawer-backdrop" onClick={onClose}>
			<div className="admin-drawer" onClick={(e) => e.stopPropagation()}>
				<div className="admin-drawer-head">
					<div>
						<span className="admin-brand-kicker">LYRICS EDITOR</span>
						<h2>{track.title}</h2>
					</div>
					<button
						type="button"
						className="admin-btn admin-btn-ghost admin-btn-sm"
						onClick={onClose}
					>
						Close
					</button>
				</div>

				<p className="admin-text-sub" style={{ margin: 0 }}>
					Тексты временно сохраняются локально в браузере (сразу видны в плеере)
					или подхватываются из файла <code>public/temp/&lt;трек&gt;/lyrics.lrc</code>.
				</p>

				<div className="admin-chip-group">
					{lyricsList.map((item) => (
						<button
							key={item.language}
							type="button"
							className={`admin-artist-pill ${activeLang === item.language ? "is-selected" : ""}`}
							onClick={() => {
								setLocalError(null);
								setActiveLang(item.language);
							}}
						>
							{item.language.toUpperCase()} ({item.lines.length})
						</button>
					))}
					<button
						type="button"
						className={`admin-artist-pill ${activeLang === "__new__" ? "is-selected" : ""}`}
						onClick={() => {
							setLocalError(null);
							setActiveLang("__new__");
						}}
					>
						+ New Language
					</button>
				</div>

				{(error || localError) && (
					<div className="admin-banner-error">{localError || error?.message}</div>
				)}

				{isLoading ? (
					<p>Loading lyrics...</p>
				) : (
					<LyricsEditorForm
						key={formKey}
						initialLang={initialLang}
						currentLyrics={currentLyrics}
						isSaving={isSaving}
						onSave={handleSave}
						onDelete={handleDeleteLang}
						onValidationError={setLocalError}
					/>
				)}
			</div>
		</div>
	);
}

export default LyricsDrawer;
