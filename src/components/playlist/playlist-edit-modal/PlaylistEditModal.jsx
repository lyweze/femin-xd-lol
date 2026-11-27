// ============================================================================
// Клиентский редактор / конструктор плейлиста (`PlaylistEditModal`)
// Позволяет сменить обложку (с автообрезкой и сжатием), название, описание,
// порядок и состав треков или удалить собственный плейлист.
// ============================================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MOCK_TRACKS } from "../../../services/mockData.js";
import { processPlaylistCoverFile } from "../../../utils/cover.js";
import { formatArtistNames } from "../../../utils/format.js";
import CollectionCover from "../../shared/collection-cover/CollectionCover.jsx";
import {
	ArrowStepIcon,
	CameraIcon,
	CloseIcon,
	PlusIcon,
} from "../../shared/icons/Icons.jsx";
import "./PlaylistEditModal.css";

function PlaylistEditDialogContent({
	mode,
	playlist,
	onSave,
	onDelete,
	onClose,
}) {
	const fileInputRef = useRef(null);

	const [title, setTitle] = useState(playlist?.title ?? "");
	const [description, setDescription] = useState(playlist?.description ?? "");
	const [cover, setCover] = useState(playlist?.cover ?? null);
	const [trackIds, setTrackIds] = useState(() => [...(playlist?.track_ids ?? [])]);
	const [trackFilter, setTrackFilter] = useState("");
	const [isProcessingCover, setIsProcessingCover] = useState(false);
	const [isDragOver, setIsDragOver] = useState(false);
	const [coverError, setCoverError] = useState(null);
	const [confirmDelete, setConfirmDelete] = useState(false);

	// Закрытие диалога по клавише Escape
	useEffect(() => {
		const onKeyDown = (e) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onClose]);

	const trackById = useMemo(
		() => new Map(MOCK_TRACKS.map((t) => [t.id, t])),
		[],
	);

	const selectedTracks = useMemo(
		() => trackIds.map((id) => trackById.get(id)).filter(Boolean),
		[trackIds, trackById],
	);

	const availableTracks = useMemo(() => {
		const inPlaylist = new Set(trackIds);
		const q = trackFilter.trim().toLowerCase();
		return MOCK_TRACKS.filter((track) => {
			if (inPlaylist.has(track.id)) return false;
			if (!q) return true;
			return (
				track.title.toLowerCase().includes(q) ||
				formatArtistNames(track.artists).toLowerCase().includes(q)
			);
		});
	}, [trackIds, trackFilter]);

	const handleCoverFile = async (file) => {
		if (!file) return;
		setCoverError(null);
		setIsProcessingCover(true);
		try {
			const processed = await processPlaylistCoverFile(file);
			setCover(processed);
		} catch (err) {
			setCoverError(err?.message || "Не удалось загрузить обложку.");
		} finally {
			setIsProcessingCover(false);
		}
	};

	const moveTrack = (idx, delta) => {
		const nextIdx = idx + delta;
		if (nextIdx < 0 || nextIdx >= trackIds.length) return;
		setTrackIds((prev) => {
			const next = [...prev];
			const [moved] = next.splice(idx, 1);
			next.splice(nextIdx, 0, moved);
			return next;
		});
	};

	const removeTrack = (trackId) => {
		setTrackIds((prev) => prev.filter((id) => id !== trackId));
	};

	const addTrack = (trackId) => {
		setTrackIds((prev) => (prev.includes(trackId) ? prev : [...prev, trackId]));
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		const cleanTitle = title.trim();
		if (!cleanTitle || isProcessingCover) return;
		onSave?.({
			title: cleanTitle,
			description: description.trim(),
			cover,
			track_ids: trackIds,
		});
		onClose();
	};

	const previewItem = {
		id: playlist?.id || "new-playlist",
		title: title || "Playlist",
		type: "playlist",
		cover,
	};

	const isCreate = mode === "create";

	return (
		<div
			className="pl-modal-backdrop"
			role="dialog"
			aria-modal="true"
			aria-label={isCreate ? "Create playlist" : "Edit playlist"}
			onClick={onClose}
		>
			<form
				className="pl-modal"
				onClick={(e) => e.stopPropagation()}
				onSubmit={handleSubmit}
			>
				<header className="pl-modal-head">
					<h2 className="pl-modal-title">
						{isCreate ? "New Playlist" : "Edit Playlist"}
					</h2>
					<button
						type="button"
						className="pl-modal-close"
						onClick={onClose}
						aria-label="Close modal"
					>
						<CloseIcon size={16} />
					</button>
				</header>

				<div className="pl-modal-body">
					{/* Верхний блок: обложка + текстовые поля */}
					<div className="pl-modal-hero">
						<div className="pl-modal-cover-col">
							<div
								role="button"
								tabIndex={0}
								className={`pl-modal-cover-btn ${isDragOver ? "is-drag-over" : ""}`}
								onClick={() => !isProcessingCover && fileInputRef.current?.click()}
								onKeyDown={(e) => {
									if ((e.key === "Enter" || e.key === " ") && !isProcessingCover) {
										e.preventDefault();
										fileInputRef.current?.click();
									}
								}}
								onDragOver={(e) => {
									e.preventDefault();
									setIsDragOver(true);
								}}
								onDragLeave={() => setIsDragOver(false)}
								onDrop={(e) => {
									e.preventDefault();
									setIsDragOver(false);
									handleCoverFile(e.dataTransfer.files?.[0]);
								}}
								aria-label="Upload playlist cover"
							>
								<CollectionCover item={previewItem} size="medium" />
								<span className="pl-modal-cover-scrim">
									<CameraIcon size={18} />
									<span>
										{isProcessingCover
											? "Processing…"
											: cover
												? "Change cover"
												: "Choose cover"}
									</span>
								</span>
							</div>

							<input
								ref={fileInputRef}
								type="file"
								accept="image/jpeg,image/png,image/webp"
								hidden
								onChange={(e) => {
									handleCoverFile(e.target.files?.[0]);
									e.target.value = "";
								}}
							/>

							{cover && (
								<button
									type="button"
									className="pl-modal-reset-cover"
									onClick={() => {
										setCoverError(null);
										setCover(null);
									}}
								>
									Reset to gradient
								</button>
							)}
						</div>

						<div className="pl-modal-fields">
							<label className="pl-modal-field">
								<span>Title</span>
								<input
									type="text"
									className="pl-modal-input"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder="My playlist"
									maxLength={120}
									required
								/>
							</label>

							<label className="pl-modal-field">
								<span>Description</span>
								<textarea
									className="pl-modal-textarea"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder="Notes, mood or rotation details..."
									maxLength={300}
									rows={3}
								/>
							</label>
						</div>
					</div>

					{coverError && <p className="pl-modal-error">{coverError}</p>}

					{/* Управление треками плейлиста: порядок + добавление из каталога */}
					<div className="pl-modal-tracks">
						<div className="pl-modal-tracks-head">
							<span>Tracks in playlist ({selectedTracks.length})</span>
						</div>

						{selectedTracks.length === 0 ? (
							<p className="pl-modal-empty">
								Playlist is empty. Add tracks from the catalog below.
							</p>
						) : (
							<ul className="pl-modal-track-list">
								{selectedTracks.map((track, idx) => (
									<li key={track.id} className="pl-modal-track-row">
										<div className="pl-modal-track-thumb">
											<CollectionCover item={track} size="small" />
										</div>
										<div className="pl-modal-track-meta">
											<span className="pl-modal-track-title">{track.title}</span>
											<span className="pl-modal-track-sub">
												{formatArtistNames(track.artists)}
											</span>
										</div>
										<div className="pl-modal-track-actions">
											<button
												type="button"
												className="pl-modal-mini-btn"
												disabled={idx === 0}
												onClick={() => moveTrack(idx, -1)}
												title="Move up"
												aria-label={`Move ${track.title} up`}
											>
												<ArrowStepIcon direction="up" />
											</button>
											<button
												type="button"
												className="pl-modal-mini-btn"
												disabled={idx === selectedTracks.length - 1}
												onClick={() => moveTrack(idx, 1)}
												title="Move down"
												aria-label={`Move ${track.title} down`}
											>
												<ArrowStepIcon direction="down" />
											</button>
											<button
												type="button"
												className="pl-modal-mini-btn is-danger"
												onClick={() => removeTrack(track.id)}
												title="Remove from playlist"
												aria-label={`Remove ${track.title}`}
											>
												<CloseIcon size={12} />
											</button>
										</div>
									</li>
								))}
							</ul>
						)}

						{MOCK_TRACKS.length > trackIds.length && (
							<div className="pl-modal-catalog">
								<div className="pl-modal-tracks-head">
									<span>Add from catalog</span>
									{MOCK_TRACKS.length > 5 && (
										<input
											type="text"
											className="pl-modal-filter"
											placeholder="Filter tracks..."
											value={trackFilter}
											onChange={(e) => setTrackFilter(e.target.value)}
										/>
									)}
								</div>

								<ul className="pl-modal-track-list">
									{availableTracks.map((track) => (
										<li key={track.id} className="pl-modal-track-row">
											<div className="pl-modal-track-thumb">
												<CollectionCover item={track} size="small" />
											</div>
											<div className="pl-modal-track-meta">
												<span className="pl-modal-track-title">{track.title}</span>
												<span className="pl-modal-track-sub">
													{formatArtistNames(track.artists)}
												</span>
											</div>
											<button
												type="button"
												className="pl-modal-add-btn"
												onClick={() => addTrack(track.id)}
											>
												<PlusIcon size={12} />
												<span>Add</span>
											</button>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</div>

				<footer className="pl-modal-foot">
					<div className="pl-modal-foot-left">
						{!isCreate && onDelete && (
							confirmDelete ? (
								<div className="pl-modal-confirm-delete">
									<button
										type="button"
										className="pl-modal-btn is-danger"
										onClick={() => {
											onDelete();
											onClose();
										}}
									>
										Confirm Delete
									</button>
									<button
										type="button"
										className="pl-modal-btn is-ghost"
										onClick={() => setConfirmDelete(false)}
									>
										Keep
									</button>
								</div>
							) : (
								<button
									type="button"
									className="pl-modal-btn is-danger"
									onClick={() => setConfirmDelete(true)}
								>
									Delete
								</button>
							)
						)}
					</div>

					<div className="pl-modal-foot-right">
						<button type="button" className="pl-modal-btn is-ghost" onClick={onClose}>
							Cancel
						</button>
						<button
							type="submit"
							className="pl-modal-btn is-primary"
							disabled={!title.trim() || isProcessingCover}
						>
							{isCreate ? "Create" : "Save"}
						</button>
					</div>
				</footer>
			</form>
		</div>
	);
}

/**
 * Обёртка модального редактора плейлиста: пересоздаёт форму по ключу плейлиста
 * только когда окно открыто. Рендерится через портал в `document.body`, чтобы
 * выходить из контекста наложения `.page-transition` / `.page-scroll` и гарантированно
 * перекрывать мобильный мини-плеер и таб-бар.
 */
function PlaylistEditModal({
	isOpen,
	mode = "edit",
	playlist = null,
	onSave,
	onDelete,
	onClose,
}) {
	if (!isOpen || typeof document === "undefined") return null;

	return createPortal(
		<PlaylistEditDialogContent
			key={mode === "edit" ? `edit-${playlist?.id}` : "create-playlist"}
			mode={mode}
			playlist={playlist}
			onSave={onSave}
			onDelete={onDelete}
			onClose={onClose}
		/>,
		document.body,
	);
}

export default PlaylistEditModal;
