// ============================================================================
// Модальное окно загрузки и редактирования локального трека (`TrackUploadModal`)
// Переиспользует `ModalDialog` и `CoverDropField`.
// ============================================================================
import { useMemo, useRef, useState } from "react";
import { usePlayerActions, usePlayerState } from "../../../context/playerContexts.js";
import {
	isSupportedAudioFile,
	parseAudioFilename,
	probeAudioDurationMs,
} from "../../../services/localTracksStorage.js";
import { getLocalTrackLyrics } from "../../../services/lyricsStorage.js";
import { formatBytes, formatDuration } from "../../../utils/format.js";
import { formatLyricsAsLrc, parseLrcDocument } from "../../../utils/lrc.js";
import CoverDropField from "../cover-drop-field/CoverDropField.jsx";
import { LyricsIcon, MusicNoteIcon } from "../icons/Icons.jsx";
import ModalDialog from "../modal-dialog/ModalDialog.jsx";
import "./TrackUploadModal.css";

function getInitialLyricsDraft(track) {
	if (!track?.id) return { text: "", lang: "ru" };
	const items = getLocalTrackLyrics(track.id);
	if (!items.length) return { text: "", lang: "ru" };
	return {
		text: formatLyricsAsLrc(items[0]),
		lang: items[0].language || "ru",
	};
}

function TrackUploadForm({ mode, track, onCreate, onEdit, onDelete, onClose }) {
	const isCreate = mode === "create";
	const audioInputRef = useRef(null);
	const lrcInputRef = useRef(null);

	const initialLyrics = useMemo(
		() => (isCreate ? { text: "", lang: "ru" } : getInitialLyricsDraft(track)),
		[isCreate, track],
	);

	const [audioFile, setAudioFile] = useState(null);
	const [durationMs, setDurationMs] = useState(track?.duration_ms ?? 0);
	const [isProbingAudio, setIsProbingAudio] = useState(false);
	const [audioDragOver, setAudioDragOver] = useState(false);
	const [audioError, setAudioError] = useState(null);

	const [title, setTitle] = useState(track?.title ?? "");
	const [artistName, setArtistName] = useState(track?.artists?.[0]?.name ?? "");
	const [albumTitle, setAlbumTitle] = useState(track?.album_title ?? "");
	const [explicit, setExplicit] = useState(Boolean(track?.explicit));
	const [playImmediately, setPlayImmediately] = useState(false);

	const [cover, setCover] = useState(() => (track?.has_cover ? track.cover : null));
	const [clearCover, setClearCover] = useState(false);
	const [isProcessingCover, setIsProcessingCover] = useState(false);
	const [coverError, setCoverError] = useState(null);

	const [showLyricsSection, setShowLyricsSection] = useState(() =>
		Boolean(initialLyrics.text),
	);
	const [lyricsText, setLyricsText] = useState(initialLyrics.text);
	const [lyricsLanguage, setLyricsLanguage] = useState(initialLyrics.lang);

	const [submitError, setSubmitError] = useState(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleAudioSelect = async (file) => {
		if (!file) return;
		if (!isSupportedAudioFile(file)) {
			setAudioError("Поддерживаются MP3, WAV, M4A, FLAC, OGG и AAC.");
			return;
		}
		setAudioError(null);
		setAudioFile(file);

		const parsed = parseAudioFilename(file.name);
		setTitle((prev) => (prev.trim() ? prev : parsed.title));
		if (parsed.artist) {
			setArtistName((prev) => (prev.trim() ? prev : parsed.artist));
		}

		setIsProbingAudio(true);
		try {
			const probedMs = await probeAudioDurationMs(file);
			if (probedMs > 0) setDurationMs(probedMs);
		} finally {
			setIsProbingAudio(false);
		}
	};

	const handleLrcFileSelect = async (file) => {
		if (!file) return;
		try {
			const text = await file.text();
			const parsed = parseLrcDocument(text);
			setLyricsText(text);
			if (parsed.language) {
				setLyricsLanguage(parsed.language);
			}
			setShowLyricsSection(true);
		} catch {
			setSubmitError("Не удалось прочитать файл текста.");
		}
	};

	const parsedLyricsStats = useMemo(() => {
		const trimmed = lyricsText.trim();
		if (!trimmed) return null;
		const doc = parseLrcDocument(trimmed);
		return {
			count: doc.lines.length,
			synced: doc.synced,
		};
	}, [lyricsText]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (isSubmitting || isProcessingCover || isProbingAudio) return;

		const cleanTitle = title.trim();
		if (!cleanTitle) {
			setSubmitError("Укажите название трека.");
			return;
		}
		if (isCreate && !audioFile) {
			setSubmitError("Выберите MP3 или другой аудиофайл.");
			return;
		}

		setSubmitError(null);
		setIsSubmitting(true);
		try {
			if (isCreate) {
				await onCreate({
					title: cleanTitle,
					artistName: artistName.trim(),
					albumTitle: albumTitle.trim(),
					explicit,
					durationMs,
					audioFile,
					cover,
					lyricsText,
					lyricsLanguage,
					playImmediately,
				});
			} else if (track?.id) {
				await onEdit(track.id, {
					title: cleanTitle,
					artistName: artistName.trim(),
					albumTitle: albumTitle.trim(),
					explicit,
					durationMs,
					audioFile,
					cover,
					clearCover,
					lyricsText,
					lyricsLanguage,
				});
			}
			onClose();
		} catch (err) {
			setSubmitError(err?.message || "Не удалось сохранить трек.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const previewItem = {
		id: track?.id || "new-local-track",
		title: title.trim() || "New Track",
		type: "album",
		cover: clearCover ? null : cover || track?.cover || null,
	};

	const activeAudioLabel = audioFile ? audioFile.name : track?.audio_file_name || null;
	const activeAudioBytes = audioFile ? audioFile.size : track?.audio_size_bytes || 0;
	const hasCustomCover = Boolean(cover && !clearCover);

	return (
		<ModalDialog
			isOpen
			title={isCreate ? "Add Local Track" : "Edit Local Track"}
			ariaLabel={isCreate ? "Add local track" : "Edit local track"}
			onClose={onClose}
			onSubmit={handleSubmit}
			submitLabel={isSubmitting ? "Saving..." : isCreate ? "Add Track" : "Save"}
			submitDisabled={
				isSubmitting ||
				isProcessingCover ||
				isProbingAudio ||
				!title.trim() ||
				(isCreate && !audioFile)
			}
			onDelete={!isCreate && track?.id && onDelete ? () => onDelete(track.id) : undefined}
		>
			<div
				className={`trk-audio-drop ${audioDragOver ? "is-drag-over" : ""} ${activeAudioLabel ? "has-file" : ""}`}
				role="button"
				tabIndex={0}
				onClick={() => audioInputRef.current?.click()}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						audioInputRef.current?.click();
					}
				}}
				onDragOver={(e) => {
					e.preventDefault();
					setAudioDragOver(true);
				}}
				onDragLeave={() => setAudioDragOver(false)}
				onDrop={(e) => {
					e.preventDefault();
					setAudioDragOver(false);
					handleAudioSelect(e.dataTransfer.files?.[0]);
				}}
			>
				<div className="trk-audio-icon" aria-hidden="true">
					<MusicNoteIcon size={20} />
				</div>
				<div className="trk-audio-copy">
					<span className="trk-audio-name">
						{activeAudioLabel || "Drop MP3 / WAV / M4A / FLAC or tap to choose"}
					</span>
					<span className="trk-audio-sub">
						{isProbingAudio
							? "Detecting duration..."
							: activeAudioLabel
								? `${activeAudioBytes > 0 ? formatBytes(activeAudioBytes) : "Audio ready"}${durationMs > 0 ? ` • ${formatDuration(durationMs)}` : ""} • Tap to replace`
								: "Saved locally in browser IndexedDB (works offline)"}
					</span>
				</div>
			</div>

			<input
				ref={audioInputRef}
				type="file"
				accept=".mp3,.wav,.flac,.m4a,.aac,.ogg,audio/*"
				hidden
				onChange={(e) => {
					handleAudioSelect(e.target.files?.[0]);
					e.target.value = "";
				}}
			/>

			{audioError && <p className="trk-modal-error">{audioError}</p>}

			<div className="trk-modal-hero">
				<CoverDropField
					previewItem={previewItem}
					hasCustomCover={hasCustomCover}
					isProcessing={isProcessingCover}
					onProcessingChange={setIsProcessingCover}
					onCoverReady={(processed) => {
						setCover(processed);
						setClearCover(false);
					}}
					onResetCover={() => {
						setCover(null);
						setClearCover(true);
					}}
					onError={setCoverError}
					ariaLabel="Upload track cover"
					resetLabel="Reset cover"
				/>

				<div className="trk-modal-fields">
					<label className="trk-modal-field">
						<span>Track title *</span>
						<input
							type="text"
							className="trk-modal-input"
							placeholder="Midnight Reference"
							maxLength={140}
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							required
						/>
					</label>

					<label className="trk-modal-field">
						<span>Artist</span>
						<input
							type="text"
							className="trk-modal-input"
							placeholder="Local Artist"
							maxLength={120}
							value={artistName}
							onChange={(e) => setArtistName(e.target.value)}
						/>
					</label>

					<label className="trk-modal-field">
						<span>Album / Release (optional)</span>
						<input
							type="text"
							className="trk-modal-input"
							placeholder="Demo Tape"
							maxLength={140}
							value={albumTitle}
							onChange={(e) => setAlbumTitle(e.target.value)}
						/>
					</label>

					<div className="trk-modal-toggles">
						<label className="trk-check-pill">
							<input
								type="checkbox"
								checked={explicit}
								onChange={(e) => setExplicit(e.target.checked)}
							/>
							<span>Explicit (E)</span>
						</label>

						{isCreate && (
							<label className="trk-check-pill">
								<input
									type="checkbox"
									checked={playImmediately}
									onChange={(e) => setPlayImmediately(e.target.checked)}
								/>
								<span>Play immediately</span>
							</label>
						)}
					</div>
				</div>
			</div>

			{coverError && <p className="trk-modal-error">{coverError}</p>}

			<div className="trk-lyrics-block">
				<div className="trk-lyrics-bar">
					<button
						type="button"
						className={`trk-lyrics-toggle ${showLyricsSection ? "is-open" : ""}`}
						onClick={() => setShowLyricsSection((v) => !v)}
					>
						<LyricsIcon />
						<span>Lyrics & Timings (.lrc, optional)</span>
						{parsedLyricsStats && (
							<span className="trk-lyrics-badge">
								{parsedLyricsStats.count} {parsedLyricsStats.synced ? "• synced" : "• text"}
							</span>
						)}
					</button>

					<button
						type="button"
						className="trk-modal-text-btn"
						onClick={() => lrcInputRef.current?.click()}
					>
						Load .lrc / .txt
					</button>

					<input
						ref={lrcInputRef}
						type="file"
						accept=".lrc,.txt,text/plain"
						hidden
						onChange={(e) => {
							handleLrcFileSelect(e.target.files?.[0]);
							e.target.value = "";
						}}
					/>
				</div>

				{showLyricsSection && (
					<div className="trk-lyrics-editor">
						<div className="trk-lyrics-lang-row">
							<span>Language:</span>
							{["ru", "en", "und"].map((lang) => (
								<button
									key={lang}
									type="button"
									className={`trk-lang-pill ${lyricsLanguage === lang ? "is-active" : ""}`}
									onClick={() => setLyricsLanguage(lang)}
								>
									{lang.toUpperCase()}
								</button>
							))}
						</div>

						<textarea
							className="trk-lyrics-textarea"
							rows={5}
							placeholder="[00:12.40] Первая строка&#10;[00:16.80] Вторая строка&#10;или обычный текст построчно..."
							value={lyricsText}
							onChange={(e) => setLyricsText(e.target.value)}
						/>
					</div>
				)}
			</div>

			{submitError && <p className="trk-modal-error">{submitError}</p>}
		</ModalDialog>
	);
}

function TrackUploadModal() {
	const { trackEditorState } = usePlayerState();
	const { createLocalTrack, editLocalTrack, removeLocalTrack, closeTrackEditor } =
		usePlayerActions();

	if (!trackEditorState) return null;

	const key =
		trackEditorState.mode === "edit"
			? `edit-track-${trackEditorState.track?.id}`
			: "create-local-track";

	return (
		<TrackUploadForm
			key={key}
			mode={trackEditorState.mode}
			track={trackEditorState.track ?? null}
			onCreate={createLocalTrack}
			onEdit={editLocalTrack}
			onDelete={removeLocalTrack}
			onClose={closeTrackEditor}
		/>
	);
}

export default TrackUploadModal;
