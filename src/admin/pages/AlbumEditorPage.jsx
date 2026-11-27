// ============================================================================
// Страница студии альбома (`AlbumEditorPage`)
// Объединяет обложку, метаданные, чеклист публикации, треклист и редактор текстов.
// ============================================================================
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useActionError } from "../hooks/useActionError.js";
import { useAlbumStudio } from "../hooks/useAlbumStudio.js";
import { useArtists } from "../hooks/useArtists.js";
import AlbumMetadataForm from "../components/AlbumMetadataForm.jsx";
import AlbumTracklistCard from "../components/AlbumTracklistCard.jsx";
import CoverUploader from "../components/CoverUploader.jsx";
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
		publicationStatus,
		isPublished,
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
	const [scheduleDate, setScheduleDate] = useState("");
	const { actionError, setActionError, runAction } = useActionError();
	const [lyricsTrack, setLyricsTrack] = useState(null);

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

	const handlePublish = (withSchedule = false) =>
		runAction(async () => {
			await publish(withSchedule && scheduleDate ? scheduleDate : null);
			setScheduleDate("");
		}, "Не удалось опубликовать альбом.");

	const handleUnpublish = () =>
		runAction(() => unpublish(), "Не удалось снять альбом с публикации.");

	return (
		<div className="admin-page">
			<header className="admin-page-head">
				<div>
					<Link to="/admin/albums" className="admin-back-link">
						← ALL ALBUMS
					</Link>
					<h1>{album.title}</h1>
				</div>

				<span className={`admin-status-badge is-${publicationStatus.key}`}>
					{publicationStatus.label}
				</span>
			</header>

			{(error || actionError) && (
				<div className="admin-banner-error">{actionError || error?.message}</div>
			)}

			<div className="admin-studio-grid">
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

					<AlbumMetadataForm
						key={`${album.id}-${album.updated_at}`}
						album={album}
						allArtists={allArtists}
						onSave={updateAlbum}
						onError={setActionError}
					/>

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
							<div className="admin-stack-compact">
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

				<AlbumTracklistCard
					albumArtists={album.artists}
					allArtists={allArtists}
					tracks={tracks}
					isPublished={isPublished}
					uploadingTrackIds={uploadingTrackIds}
					onAddTrack={addTrack}
					onUpdateTrack={updateTrack}
					onRemoveTrack={removeTrack}
					onUploadTrackAudio={uploadTrackAudio}
					onReprocessTrack={reprocessTrack}
					onReorderTracks={reorderTracks}
					onOpenLyrics={setLyricsTrack}
					onError={setActionError}
				/>
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
