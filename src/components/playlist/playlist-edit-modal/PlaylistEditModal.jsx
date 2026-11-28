// ============================================================================
// Клиентский редактор / конструктор плейлиста (`PlaylistEditModal`)
// Переиспользует `ModalDialog` и `CoverDropField`.
// ============================================================================
import { useMemo, useState } from "react";
import { usePlayerState } from "../../../context/playerContexts.js";
import { formatArtistNames } from "../../../utils/format.js";
import CollectionCover from "../../shared/collection-cover/CollectionCover.jsx";
import CoverDropField from "../../shared/cover-drop-field/CoverDropField.jsx";
import { ArrowStepIcon, CloseIcon, PlusIcon } from "../../shared/icons/Icons.jsx";
import ModalDialog from "../../shared/modal-dialog/ModalDialog.jsx";
import "./PlaylistEditModal.css";

function PlaylistEditForm({ mode, playlist, onSave, onDelete, onClose }) {
	const { catalogTracks } = usePlayerState();

	const [title, setTitle] = useState(playlist?.title ?? "");
	const [description, setDescription] = useState(playlist?.description ?? "");
	const [cover, setCover] = useState(playlist?.cover ?? null);
	const [trackIds, setTrackIds] = useState(() => [...(playlist?.track_ids ?? [])]);
	const [trackFilter, setTrackFilter] = useState("");
	const [isProcessingCover, setIsProcessingCover] = useState(false);
	const [coverError, setCoverError] = useState(null);

	const isCreate = mode === "create";

	const trackById = useMemo(
		() => new Map(catalogTracks.map((t) => [t.id, t])),
		[catalogTracks],
	);

	const selectedTracks = useMemo(
		() => trackIds.map((id) => trackById.get(id)).filter(Boolean),
		[trackIds, trackById],
	);

	const availableTracks = useMemo(() => {
		const inPlaylist = new Set(trackIds);
		const q = trackFilter.trim().toLowerCase();
		return catalogTracks.filter((track) => {
			if (inPlaylist.has(track.id)) return false;
			if (!q) return true;
			return (
				track.title.toLowerCase().includes(q) ||
				formatArtistNames(track.artists).toLowerCase().includes(q)
			);
		});
	}, [catalogTracks, trackIds, trackFilter]);

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

	return (
		<ModalDialog
			isOpen
			title={isCreate ? "New Playlist" : "Edit Playlist"}
			ariaLabel={isCreate ? "Create playlist" : "Edit playlist"}
			onClose={onClose}
			onSubmit={handleSubmit}
			submitLabel={isCreate ? "Create" : "Save"}
			submitDisabled={!title.trim() || isProcessingCover}
			onDelete={!isCreate && onDelete ? onDelete : undefined}
		>
			<div className="pl-modal-hero">
				<CoverDropField
					previewItem={previewItem}
					hasCustomCover={Boolean(cover)}
					isProcessing={isProcessingCover}
					onProcessingChange={setIsProcessingCover}
					onCoverReady={setCover}
					onResetCover={() => {
						setCoverError(null);
						setCover(null);
					}}
					onError={setCoverError}
					ariaLabel="Upload playlist cover"
					resetLabel="Reset to gradient"
				/>

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

				{catalogTracks.length > trackIds.length && (
					<div className="pl-modal-catalog">
						<div className="pl-modal-tracks-head">
							<span>Add from catalog</span>
							{catalogTracks.length > 5 && (
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
		</ModalDialog>
	);
}

function PlaylistEditModal({
	isOpen,
	mode = "edit",
	playlist = null,
	onSave,
	onDelete,
	onClose,
}) {
	if (!isOpen) return null;

	return (
		<PlaylistEditForm
			key={mode === "edit" ? `edit-${playlist?.id}` : "create-playlist"}
			mode={mode}
			playlist={playlist}
			onSave={onSave}
			onDelete={onDelete}
			onClose={onClose}
		/>
	);
}

export default PlaylistEditModal;
