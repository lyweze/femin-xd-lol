// ============================================================================
// Модальное окно загрузки и редактирования локального трека (`TrackUploadModal`)
// Поддерживает выбор MP3/WAV/M4A/FLAC/OGG, автоопределение длительности,
// загрузку квадратной обложки, метаданных (название, артист, альбом, Explicit)
// и опциональных синхронизированных `.lrc` / текстовых текстов песен.
// ============================================================================
import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePlayerActions, usePlayerState } from "../../../context/playerContexts.js";
import { useEscapeKey } from "../../../hooks/useEscapeKey.js";
import {
	isSupportedAudioFile,
	parseAudioFilename,
	probeAudioDurationMs,
} from "../../../services/localTracksStorage.js";
import { getLocalTrackLyrics } from "../../../services/lyricsStorage.js";
import { processPlaylistCoverFile } from "../../../utils/cover.js";
import { formatBytes, formatDuration } from "../../../utils/format.js";
import { formatLyricsAsLrc, parseLrcDocument } from "../../../utils/lrc.js";
import CollectionCover from "../collection-cover/CollectionCover.jsx";
import {
	CameraIcon,
	CloseIcon,
	LyricsIcon,
	MusicNoteIcon,
} from "../icons/Icons.jsx";
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

function TrackUploadDialogContent({
	mode,
	track,
	onCreate,
	onEdit,
	onDelete,
	onClose,
}) {
	const isCreate = mode === "create";
	const audioInputRef = useRef(null);
	const coverInputRef = useRef(null);
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
	const [coverDragOver, setCoverDragOver] = useState(false);
	const [coverError, setCoverError] = useState(null);

	const [showLyricsSection, setShowLyricsSection] = useState(() =>
		Boolean(initialLyrics.text),
	);
	const [lyricsText, setLyricsText] = useState(initialLyrics.text);
	const [lyricsLanguage, setLyricsLanguage] = useState(initialLyrics.lang);

	const [confirmDelete, setConfirmDelete] = useState(false);
	const [submitError, setSubmitError] = useState(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEscapeKey(true, onClose);

	const handleAudioSelect = async (file) => {
		if (!file) return;
		if (!isSupportedAudioFile(file)) {
			setAudioError("Поддерживаются MP3, WAV, M4A, FLAC, OGG и AAC.");
			return;
		}
		setAudioError(null);
		setAudioFile(file);

		// Подставляем название и артиста из имени файла, если поля ещё не заполнены
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

	const handleCoverSelect = async (file) => {
		if (!file) return;
		setCoverError(null);
		setIsProcessingCover(true);
		try {
			const processed = await processPlaylistCoverFile(file);
			setCover(processed);
			setClearCover(false);
		} catch (err) {
			setCoverError(err?.message || "Не удалось обработать обложку.");
		} finally {
			setIsProcessingCover(false);
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

	const activeAudioLabel = audioFile
		? audioFile.name
		: track?.audio_file_name || null;
	const activeAudioBytes = audioFile
		? audioFile.size
		: track?.audio_size_bytes || 0;

	return (
		<div
			className="trk-modal-backdrop"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label={isCreate ? "Add local track" : "Edit local track"}
		>
			<form
				className="trk-modal"
				onClick={(e) => e.stopPropagation()}
				onSubmit={handleSubmit}
			>
				<header className="trk-modal-head">
					<h2 className="trk-modal-title">
						{isCreate ? "Add Local Track" : "Edit Local Track"}
					</h2>
					<button
						type="button"
						className="trk-modal-close"
						onClick={onClose}
						aria-label="Close modal"
					>
						<CloseIcon size={16} />
					</button>
				</header>

				<div className="trk-modal-body">
					{/* 1. Выбор аудиофайла */}
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

					{/* 2. Обложка + основные поля */}
					<div className="trk-modal-hero">
						<div className="trk-modal-cover-col">
							<button
								type="button"
								className={`trk-modal-cover-btn ${coverDragOver ? "is-drag-over" : ""}`}
								onClick={() => coverInputRef.current?.click()}
								onDragOver={(e) => {
									e.preventDefault();
									setCoverDragOver(true);
								}}
								onDragLeave={() => setCoverDragOver(false)}
								onDrop={(e) => {
									e.preventDefault();
									setCoverDragOver(false);
									handleCoverSelect(e.dataTransfer.files?.[0]);
								}}
								aria-label="Upload track cover"
							>
								<CollectionCover
									item={previewItem}
									size="medium"
									className="trk-modal-cover-preview"
								/>
								<span className="trk-modal-cover-scrim">
									<CameraIcon size={17} />
									<span>
										{isProcessingCover ? "Loading..." : cover ? "Change" : "Cover"}
									</span>
								</span>
							</button>

							<input
								ref={coverInputRef}
								type="file"
								accept="image/jpeg,image/png,image/webp"
								hidden
								onChange={(e) => {
									handleCoverSelect(e.target.files?.[0]);
									e.target.value = "";
								}}
							/>

							{cover && !clearCover && (
								<button
									type="button"
									className="trk-modal-text-btn"
									onClick={() => {
										setCover(null);
										setClearCover(true);
									}}
								>
									Reset cover
								</button>
							)}
						</div>

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

					{/* 3. Опциональные тексты песен (.lrc / plain text) */}
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
				</div>

				<footer className="trk-modal-foot">
					<div className="trk-modal-foot-left">
						{!isCreate && track?.id && onDelete && (
							confirmDelete ? (
								<div className="trk-confirm-delete">
									<button
										type="button"
										className="trk-modal-btn is-danger"
										onClick={async () => {
											await onDelete(track.id);
											onClose();
										}}
									>
										Confirm Delete
									</button>
									<button
										type="button"
										className="trk-modal-btn is-ghost"
										onClick={() => setConfirmDelete(false)}
									>
										Keep
									</button>
								</div>
							) : (
								<button
									type="button"
									className="trk-modal-btn is-danger"
									onClick={() => setConfirmDelete(true)}
								>
									Delete
								</button>
							)
						)}
					</div>

					<div className="trk-modal-foot-right">
						<button
							type="button"
							className="trk-modal-btn is-ghost"
							onClick={onClose}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="trk-modal-btn is-primary"
							disabled={
								isSubmitting ||
								isProcessingCover ||
								isProbingAudio ||
								!title.trim() ||
								(isCreate && !audioFile)
							}
						>
							{isSubmitting ? "Saving..." : isCreate ? "Add Track" : "Save"}
						</button>
					</div>
				</footer>
			</form>
		</div>
	);
}

/**
 * Портальная обёртка для формы добавления/редактирования локального трека.
 */
function TrackUploadModal() {
	const { trackEditorState } = usePlayerState();
	const { createLocalTrack, editLocalTrack, removeLocalTrack, closeTrackEditor } =
		usePlayerActions();

	if (!trackEditorState || typeof document === "undefined") {
		return null;
	}

	const key =
		trackEditorState.mode === "edit"
			? `edit-track-${trackEditorState.track?.id}`
			: "create-local-track";

	return createPortal(
		<TrackUploadDialogContent
			key={key}
			mode={trackEditorState.mode}
			track={trackEditorState.track ?? null}
			onCreate={createLocalTrack}
			onEdit={editLocalTrack}
			onDelete={removeLocalTrack}
			onClose={closeTrackEditor}
		/>,
		document.body,
	);
}

export default TrackUploadModal;
