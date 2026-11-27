import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAlbumStudio } from "../hooks/useAlbumStudio.js";
import { useArtists } from "../hooks/useArtists.js";
import { formatDuration } from "../../services/mockData.js";
import CoverUploader from "../components/CoverUploader.jsx";
import AudioUploader from "../components/AudioUploader.jsx";
import LyricsDrawer from "../components/LyricsDrawer.jsx";

function AlbumEditorPage() {
	const { albumId } = useParams();
	const {
		album,
		tracks,
		isLoading,
		isUploadingCover,
		uploadingTrackIds,
		isPublishing,
		isPublished,
		isScheduled,
		error,
		publishChecklist,
		refresh,
		updateAlbum,
		uploadCover,
		addTrack,
		updateTrack,
		removeTrack,
		uploadTrackAudio,
		reprocessTrack,
		reorderTracks,
		publish,
		unpublish,
	} = useAlbumStudio(albumId);

	const { items: allArtists } = useArtists({ limit: 100 });

	// Форма метаданных альбома
	const [title, setTitle] = useState("");
	const [type, setType] = useState("album");
	const [releaseDate, setReleaseDate] = useState("");
	const [artistIds, setArtistIds] = useState([]);
	const [isSavingMeta, setIsSavingMeta] = useState(false);

	// Добавление трека
	const [newTrackTitle, setNewTrackTitle] = useState("");
	const [newTrackDisc, setNewTrackDisc] = useState(1);
	const [newTrackExplicit, setNewTrackExplicit] = useState(false);
	const [newTrackArtistId, setNewTrackArtistId] = useState("");
	const [isAddingTrack, setIsAddingTrack] = useState(false);

	// Публикация
	const [scheduleDate, setScheduleDate] = useState("");
	const [actionError, setActionError] = useState(null);

	// Drag-and-drop порядок треков
	const [draggedTrackId, setDraggedTrackId] = useState(null);
	const [dragOverTrackId, setDragOverTrackId] = useState(null);

	// Редактор текстов
	const [lyricsTrack, setLyricsTrack] = useState(null);

	useEffect(() => {
		if (!album) return;
		setTitle(album.title || "");
		setType(album.type || "album");
		setReleaseDate(album.release_date || "");
		const ids = album.artists?.map((a) => a.id) ?? [];
		setArtistIds(ids);
		if (!newTrackArtistId && ids[0]) {
			setNewTrackArtistId(ids[0]);
		}
	}, [album, newTrackArtistId]);

	if (isLoading && !album) {
		return <div className="admin-page">Loading album studio...</div>;
	}

	if (!album) {
		return (
			<div className="admin-page">
				<div className="admin-banner-error">
					{error?.message || "Album not found."}
				</div>
				<Link to="/admin/albums" className="admin-btn admin-btn-ghost">
					← Back to Albums
				</Link>
			</div>
		);
	}

	const toggleAlbumArtist = (id) => {
		setArtistIds((prev) =>
			prev.includes(id)
				? prev.length > 1
					? prev.filter((x) => x !== id)
					: prev
				: [...prev, id],
		);
	};

	const handleSaveMeta = async (e) => {
		e.preventDefault();
		setIsSavingMeta(true);
		setActionError(null);
		try {
			await updateAlbum({
				title: title.trim(),
				type,
				release_date: releaseDate || undefined,
				artist_ids: artistIds,
			});
		} catch (err) {
			setActionError(err?.message || "Не удалось обновить альбом.");
		} finally {
			setIsSavingMeta(false);
		}
	};

	const handleAddTrack = async (e) => {
		e.preventDefault();
		const targetArtist = newTrackArtistId || artistIds[0] || allArtists[0]?.id;
		if (!targetArtist) {
			setActionError("Сначала создайте хотя бы одного артиста.");
			return;
		}
		setIsAddingTrack(true);
		setActionError(null);
		try {
			await addTrack({
				title: newTrackTitle.trim(),
				disc_no: Number(newTrackDisc) || 1,
				explicit: newTrackExplicit,
				artists: [{ artist_id: targetArtist, role: "main" }],
			});
			setNewTrackTitle("");
			setNewTrackExplicit(false);
		} catch (err) {
			setActionError(err?.message || "Не удалось добавить трек.");
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

		setActionError(null);
		try {
			await reorderTracks(next);
		} catch (err) {
			setActionError(err?.message || "Не удалось обновить порядок треков.");
		}
	};

	const handlePublish = async (withSchedule = false) => {
		setActionError(null);
		try {
			await publish(withSchedule && scheduleDate ? scheduleDate : null);
			setScheduleDate("");
		} catch (err) {
			setActionError(err?.message || "Не удалось опубликовать альбом.");
		}
	};

	const handleUnpublish = async () => {
		setActionError(null);
		try {
			await unpublish();
		} catch (err) {
			setActionError(err?.message || "Не удалось снять альбом с публикации.");
		}
	};

	return (
		<div className="admin-page">
			<header className="admin-page-head">
				<div>
					<Link
						to="/admin/albums"
						style={{
							fontFamily: "var(--font-mono)",
							fontSize: 11,
							color: "var(--text-secondary)",
							textDecoration: "none",
						}}
					>
						← ALL ALBUMS
					</Link>
					<h1>{album.title}</h1>
				</div>

				<span
					className={`admin-status-badge is-${isPublished ? (isScheduled ? "scheduled" : "published") : "draft"}`}
				>
					{isPublished
						? isScheduled
							? `SCHEDULED • ${album.published_at.slice(0, 10)}`
							: "PUBLISHED"
						: "DRAFT"}
				</span>
			</header>

			{(error || actionError) && (
				<div className="admin-banner-error">
					{actionError || error?.message}
				</div>
			)}

			<div className="admin-studio-grid">
				{/* Левая колонка: обложка + метаданные + публикация */}
				<div className="admin-page">
					<section className="admin-card">
						<h2 className="admin-card-title">Album Cover</h2>
						<CoverUploader
							image={album.cover}
							label="Album Cover"
							isUploading={isUploadingCover}
							onUpload={uploadCover}
						/>
					</section>

					<form className="admin-card admin-page" onSubmit={handleSaveMeta}>
						<h2 className="admin-card-title">Metadata</h2>
						<div className="admin-field">
							<label>Title</label>
							<input
								className="admin-input"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								required
							/>
						</div>
						<div className="admin-field">
							<label>Type</label>
							<select
								className="admin-select"
								value={type}
								onChange={(e) => setType(e.target.value)}
							>
								<option value="album">Album</option>
								<option value="ep">EP</option>
								<option value="single">Single</option>
								<option value="compilation">Compilation</option>
							</select>
						</div>
						<div className="admin-field">
							<label>Release Date</label>
							<input
								type="date"
								className="admin-input"
								value={releaseDate}
								onChange={(e) => setReleaseDate(e.target.value)}
							/>
						</div>
						<div className="admin-field">
							<label>Artists</label>
							<div className="admin-chip-group">
								{allArtists.map((a) => (
									<button
										key={a.id}
										type="button"
										className={`admin-artist-pill ${artistIds.includes(a.id) ? "is-selected" : ""}`}
										onClick={() => toggleAlbumArtist(a.id)}
									>
										{a.name}
									</button>
								))}
							</div>
						</div>
						<button
							type="submit"
							className="admin-btn admin-btn-ghost"
							disabled={isSavingMeta}
						>
							{isSavingMeta ? "Saving..." : "Save Metadata"}
						</button>
					</form>

					<section className="admin-card">
						<h2 className="admin-card-title">Publication</h2>
						<ul className="admin-checklist">
							<li className={publishChecklist.hasCover ? "is-ok" : ""}>
								<span>{publishChecklist.hasCover ? "✓" : "○"}</span>
								<span>Cover uploaded (96 / 300 / 640 px)</span>
							</li>
							<li className={publishChecklist.hasTracks ? "is-ok" : ""}>
								<span>{publishChecklist.hasTracks ? "✓" : "○"}</span>
								<span>At least 1 track added ({tracks.length})</span>
							</li>
							<li className={publishChecklist.allReady ? "is-ok" : ""}>
								<span>{publishChecklist.allReady ? "✓" : "○"}</span>
								<span>All tracks processed (status: ready)</span>
							</li>
						</ul>

						{isPublished ? (
							<button
								type="button"
								className="admin-btn admin-btn-danger"
								disabled={isPublishing}
								onClick={handleUnpublish}
							>
								{isPublishing ? "Updating..." : "Unpublish Album"}
							</button>
						) : (
							<div className="admin-page" style={{ gap: 10, paddingBottom: 0 }}>
								<button
									type="button"
									className="admin-btn admin-btn-primary"
									disabled={!publishChecklist.canPublish || isPublishing}
									onClick={() => handlePublish(false)}
								>
									{isPublishing ? "Publishing..." : "Publish Now"}
								</button>

								<div className="admin-field">
									<label>Or schedule future release</label>
									<input
										type="datetime-local"
										className="admin-input"
										value={scheduleDate}
										onChange={(e) => setScheduleDate(e.target.value)}
									/>
								</div>
								{scheduleDate && (
									<button
										type="button"
										className="admin-btn admin-btn-ghost"
										disabled={!publishChecklist.canPublish || isPublishing}
										onClick={() => handlePublish(true)}
									>
										Schedule Release
									</button>
								)}
							</div>
						)}
					</section>
				</div>

				{/* Правая колонка: треклист (DnD + AudioUploader + LyricsDrawer) */}
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
									value={newTrackArtistId}
									onChange={(e) => setNewTrackArtistId(e.target.value)}
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
													updateTrack(track.id, { explicit: !track.explicit })
												}
											>
												{track.explicit ? "Unset E" : "Mark E"}
											</button>

											<button
												type="button"
												className="admin-btn admin-btn-ghost admin-btn-sm"
												onClick={() => setLyricsTrack(track)}
											>
												Lyrics ({track.lyrics_languages?.length || 0})
											</button>

											<button
												type="button"
												className="admin-btn admin-btn-danger admin-btn-sm"
												onClick={() => removeTrack(track.id)}
											>
												Delete
											</button>
										</div>
									</div>

									<AudioUploader
										track={track}
										isAlbumPublished={isPublished}
										isUploading={Boolean(uploadingTrackIds[track.id])}
										onUpload={uploadTrackAudio}
										onReprocess={reprocessTrack}
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
			</div>

			<LyricsDrawer
				track={lyricsTrack}
				onClose={() => setLyricsTrack(null)}
				onSaved={refresh}
			/>
		</div>
	);
}

export default AlbumEditorPage;
