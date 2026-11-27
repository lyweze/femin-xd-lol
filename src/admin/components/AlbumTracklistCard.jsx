import { useState } from "react";
import { formatDuration } from "../../utils/format.js";
import AudioUploader from "./AudioUploader.jsx";

function AlbumTracklistCard({
	albumArtists,
	allArtists,
	tracks,
	isPublished,
	uploadingTrackIds,
	onAddTrack,
	onUpdateTrack,
	onRemoveTrack,
	onUploadTrackAudio,
	onReprocessTrack,
	onReorderTracks,
	onOpenLyrics,
	onError,
}) {
	const [newTrackTitle, setNewTrackTitle] = useState("");
	const [newTrackDisc, setNewTrackDisc] = useState(1);
	const [newTrackExplicit, setNewTrackExplicit] = useState(false);
	const [selectedTrackArtistId, setSelectedTrackArtistId] = useState("");
	const [isAddingTrack, setIsAddingTrack] = useState(false);

	const [draggedTrackId, setDraggedTrackId] = useState(null);
	const [dragOverTrackId, setDragOverTrackId] = useState(null);

	const defaultArtistId = albumArtists?.[0]?.id || allArtists[0]?.id || "";
	const effectiveTrackArtistId = selectedTrackArtistId || defaultArtistId;

	const handleAddTrack = async (e) => {
		e.preventDefault();
		if (!effectiveTrackArtistId) {
			onError?.("Сначала создайте хотя бы одного артиста.");
			return;
		}
		setIsAddingTrack(true);
		onError?.(null);
		try {
			await onAddTrack({
				title: newTrackTitle.trim(),
				disc_no: Number(newTrackDisc) || 1,
				explicit: newTrackExplicit,
				artists: [{ artist_id: effectiveTrackArtistId, role: "main" }],
			});
			setNewTrackTitle("");
			setNewTrackExplicit(false);
		} catch (err) {
			onError?.(err?.message || "Не удалось добавить трек.");
		} finally {
			setIsAddingTrack(false);
		}
	};

	const handleDropOnTrack = async (targetTrackId) => {
		setDragOverTrackId(null);
		if (!draggedTrackId || draggedTrackId === targetTrackId) {
			setDraggedTrackId(null);
			return;
		}
		const fromIdx = tracks.findIndex((t) => t.id === draggedTrackId);
		const toIdx = tracks.findIndex((t) => t.id === targetTrackId);
		setDraggedTrackId(null);
		if (fromIdx === -1 || toIdx === -1) return;

		const next = [...tracks];
		const [moved] = next.splice(fromIdx, 1);
		next.splice(toIdx, 0, moved);

		onError?.(null);
		try {
			await onReorderTracks(next);
		} catch (err) {
			onError?.(err?.message || "Не удалось обновить порядок треков.");
		}
	};

	return (
		<div className="admin-page">
			<form className="admin-card admin-page" onSubmit={handleAddTrack}>
				<h2 className="admin-card-title">Add Track (Draft)</h2>
				<div className="admin-form-grid">
					<div className="admin-field">
						<label>Track Title *</label>
						<input
							className="admin-input"
							value={newTrackTitle}
							onChange={(e) => setNewTrackTitle(e.target.value)}
							placeholder="New track title"
							required
						/>
					</div>
					<div className="admin-field">
						<label>Main Artist *</label>
						<select
							className="admin-select"
							value={effectiveTrackArtistId}
							onChange={(e) => setSelectedTrackArtistId(e.target.value)}
						>
							{allArtists.map((a) => (
								<option key={a.id} value={a.id}>
									{a.name}
								</option>
							))}
						</select>
					</div>
					<div className="admin-field">
						<label>Disc №</label>
						<input
							type="number"
							min={1}
							className="admin-input"
							value={newTrackDisc}
							onChange={(e) => setNewTrackDisc(e.target.value)}
						/>
					</div>
				</div>

				<div className="admin-toolbar">
					<label className="admin-checkbox-label">
						<input
							type="checkbox"
							checked={newTrackExplicit}
							onChange={(e) => setNewTrackExplicit(e.target.checked)}
						/>
						<span>Explicit (E)</span>
					</label>

					<button
						type="submit"
						className="admin-btn admin-btn-primary"
						disabled={isAddingTrack}
					>
						{isAddingTrack ? "Adding..." : "+ Add Track"}
					</button>
				</div>
			</form>

			<section className="admin-card">
				<h2 className="admin-card-title">
					Tracklist ({tracks.length}) — drag rows to reorder
				</h2>

				<div className="admin-track-list">
					{tracks.map((track, idx) => (
						<div
							key={track.id}
							draggable
							onDragStart={() => setDraggedTrackId(track.id)}
							onDragOver={(e) => {
								e.preventDefault();
								setDragOverTrackId(track.id);
							}}
							onDragLeave={() => setDragOverTrackId(null)}
							onDrop={() => handleDropOnTrack(track.id)}
							className={`admin-track-item ${dragOverTrackId === track.id ? "is-drag-over" : ""}`}
						>
							<div className="admin-track-top">
								<div className="admin-track-ident">
									<span className="admin-drag-handle" title="Drag to reorder">
										⋮⋮
									</span>
									<span className="admin-track-pos">
										D{track.disc_no} • #{idx + 1}
									</span>
									<strong>{track.title}</strong>
									{track.explicit && (
										<span className="admin-file-chip">E</span>
									)}
									{track.duration_ms && (
										<span className="admin-track-pos">
											{formatDuration(track.duration_ms)}
										</span>
									)}
								</div>

								<div className="admin-row-actions">
									<button
										type="button"
										className="admin-btn admin-btn-ghost admin-btn-sm"
										onClick={() =>
											onUpdateTrack(track.id, { explicit: !track.explicit })
										}
									>
										{track.explicit ? "Unset E" : "Mark E"}
									</button>

									<button
										type="button"
										className="admin-btn admin-btn-ghost admin-btn-sm"
										onClick={() => onOpenLyrics(track)}
									>
										Lyrics ({track.lyrics_languages?.length || 0})
									</button>

									<button
										type="button"
										className="admin-btn admin-btn-danger admin-btn-sm"
										onClick={() => onRemoveTrack(track.id)}
									>
										Delete
									</button>
								</div>
							</div>

							<AudioUploader
								track={track}
								isAlbumPublished={isPublished}
								isUploading={Boolean(uploadingTrackIds[track.id])}
								onUpload={onUploadTrackAudio}
								onReprocess={onReprocessTrack}
							/>
						</div>
					))}

					{tracks.length === 0 && (
						<p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
							No tracks yet. Add the first draft above.
						</p>
					)}
				</div>
			</section>
		</div>
	);
}

export default AlbumTracklistCard;
