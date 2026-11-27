// ============================================================================
// Форма редактирования текста песни (`LyricsEditorForm`)
// Поддерживает ручной построчный ввод таймкодов и быстрый импорт LRC-формата.
// ============================================================================
import { useState } from "react";
import { buildInitialLyricsLines, parseLrcText } from "../utils/albumHelpers.js";

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
	const [lines, setLines] = useState(() => buildInitialLyricsLines(currentLyrics));
	const [lrcDraft, setLrcDraft] = useState("");

	const updateLine = (idx, patch) => {
		setLines((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
	};

	const addLine = () => {
		const lastStart = Number(lines[lines.length - 1]?.start_ms || 0);
		setLines((prev) => [
			...prev,
			{ start_ms: synced ? lastStart + 4000 : 0, end_ms: "", text: "" },
		]);
	};

	const removeLine = (idx) => {
		setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
	};

	/** Раскладывает вставленный LRC/обычный текст по строкам редактора */
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
							aria-label={`Remove line ${idx + 1}`}
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

export default LyricsEditorForm;
