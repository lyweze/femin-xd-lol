import { useState } from "react";
import { useTrackLyrics } from "../hooks/useTrackLyrics.js";

/**
 * Парсит простой LRC-текст формата `[01:12.50] Line text` в массив AdminLyricsLine.
 */
function parseLrcText(raw) {
	const rows = raw.split(/\r?\n/);
	const parsed = [];
	const regex = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/;

	for (const row of rows) {
		const trimmed = row.trim();
		if (!trimmed) continue;
		const match = trimmed.match(regex);
		if (match) {
			const min = Number(match[1]);
			const sec = Number(match[2]);
			const frac = match[3] ? Number(match[3].padEnd(3, "0")) : 0;
			parsed.push({
				start_ms: min * 60000 + sec * 1000 + frac,
				end_ms: null,
				text: match[4],
			});
		} else {
			parsed.push({ start_ms: 0, end_ms: null, text: trimmed });
		}
	}

	return parsed;
}

function buildInitialLines(currentLyrics) {
	if (!currentLyrics?.lines?.length) {
		return [{ start_ms: 0, end_ms: "", text: "" }];
	}
	return currentLyrics.lines.map((l) => ({
		start_ms: l.start_ms ?? 0,
		end_ms: l.end_ms ?? "",
		text: l.text ?? "",
	}));
}

function LyricsEditorForm({
	initialLang,
	currentLyrics,
	isSaving,
	onSave,
	onDelete,
	onValidationError,
}) {
	const [langInput, setLangInput] = useState(initialLang);
	const [synced, setSynced] = useState(Boolean(currentLyrics?.synced));
	const [offsetMs, setOffsetMs] = useState(currentLyrics?.offset_ms ?? 0);
	const [source, setSource] = useState(currentLyrics?.source || "manual");
	const [lines, setLines] = useState(() => buildInitialLines(currentLyrics));
	const [lrcDraft, setLrcDraft] = useState("");

	const updateLine = (idx, patch) => {
		setLines((prev) =>
			prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
		);
	};

	const addLine = () => {
		const lastStart = Number(lines[lines.length - 1]?.start_ms || 0);
		setLines((prev) => [
			...prev,
			{ start_ms: synced ? lastStart + 4000 : 0, end_ms: "", text: "" },
		]);
	};

	const removeLine = (idx) => {
		setLines((prev) =>
			prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev,
		);
	};

	const handleImportLrc = () => {
		const parsed = parseLrcText(lrcDraft);
		if (parsed.length === 0) return;
		const hasTimestamps = parsed.some((l) => l.start_ms > 0);
		setSynced(hasTimestamps);
		setSource(hasTimestamps ? "lrc" : "manual");
		setLines(
			parsed.map((l) => ({
				start_ms: l.start_ms,
				end_ms: "",
				text: l.text,
			})),
		);
		setLrcDraft("");
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		const lang = langInput.trim().toLowerCase();
		if (lang.length < 2 || lang.length > 8) {
			onValidationError("Код языка должен содержать 2..8 символов (например: ru, en).");
			return;
		}
		const cleanLines = lines
			.map((l) => ({
				start_ms: synced ? Math.max(0, Number(l.start_ms) || 0) : 0,
				end_ms:
					synced && l.end_ms !== "" && l.end_ms !== null
						? Math.max(0, Number(l.end_ms))
						: null,
				text: String(l.text || "").trim(),
			}))
			.filter((l) => l.text.length > 0);

		if (cleanLines.length === 0) {
			onValidationError("Добавьте хотя бы одну непустую строку текста.");
			return;
		}

		onValidationError(null);
		await onSave(lang, {
			synced,
			offset_ms: Number(offsetMs) || 0,
			source: source.trim() || "manual",
			lines: cleanLines,
		});
	};

	return (
		<form className="admin-page" onSubmit={handleSubmit}>
			<div className="admin-form-grid">
				<div className="admin-field">
					<label>Language code (2–8)</label>
					<input
						className="admin-input"
						value={langInput}
						onChange={(e) => setLangInput(e.target.value)}
						placeholder="ru / en"
						maxLength={8}
						required
					/>
				</div>
				<div className="admin-field">
					<label>Offset (ms)</label>
					<input
						type="number"
						className="admin-input"
						value={offsetMs}
						onChange={(e) => setOffsetMs(e.target.value)}
					/>
				</div>
				<div className="admin-field">
					<label>Source</label>
					<input
						className="admin-input"
						value={source}
						onChange={(e) => setSource(e.target.value)}
						placeholder="lrc / whisper / manual"
					/>
				</div>
			</div>

			<label className="admin-checkbox-label">
				<input
					type="checkbox"
					checked={synced}
					onChange={(e) => setSynced(e.target.checked)}
				/>
				<span>Synced lyrics (timecodes in ms)</span>
			</label>

			<div className="admin-field">
				<label>Quick paste LRC or plain text</label>
				<textarea
					className="admin-textarea"
					placeholder="[00:07.00] Tape reels turning slow in amber light"
					value={lrcDraft}
					onChange={(e) => setLrcDraft(e.target.value)}
				/>
				{lrcDraft.trim() && (
					<button
						type="button"
						className="admin-btn admin-btn-ghost admin-btn-sm"
						onClick={handleImportLrc}
					>
						Parse lines into editor
					</button>
				)}
			</div>

			<div className="admin-track-list">
				{lines.map((row, idx) => (
					<div key={idx} className="admin-lyrics-line-row">
						<input
							type="number"
							className="admin-input"
							min={0}
							disabled={!synced}
							value={synced ? row.start_ms : 0}
							onChange={(e) => updateLine(idx, { start_ms: e.target.value })}
							placeholder="start_ms"
							title="start_ms"
						/>
						<input
							type="number"
							className="admin-input"
							min={0}
							disabled={!synced}
							value={synced ? row.end_ms : ""}
							onChange={(e) => updateLine(idx, { end_ms: e.target.value })}
							placeholder="end_ms"
							title="end_ms (optional)"
						/>
						<input
							className="admin-input"
							value={row.text}
							onChange={(e) => updateLine(idx, { text: e.target.value })}
							placeholder={`Line ${idx + 1}`}
						/>
						<button
							type="button"
							className="admin-btn admin-btn-danger admin-btn-sm"
							onClick={() => removeLine(idx)}
						>
							×
						</button>
					</div>
				))}
			</div>

			<div className="admin-toolbar">
				<button
					type="button"
					className="admin-btn admin-btn-ghost admin-btn-sm"
					onClick={addLine}
				>
					+ Add Line
				</button>

				<button
					type="submit"
					className="admin-btn admin-btn-primary"
					disabled={isSaving}
				>
					{isSaving ? "Saving..." : `Save (${langInput.toUpperCase()})`}
				</button>

				{currentLyrics && (
					<button
						type="button"
						className="admin-btn admin-btn-danger"
						onClick={onDelete}
					>
						Delete {currentLyrics.language.toUpperCase()}
					</button>
				)}
			</div>
		</form>
	);
}

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
					<div className="admin-banner-error">
						{localError || error?.message}
					</div>
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
