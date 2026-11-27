import { useState } from "react";
import { Link } from "react-router-dom";
import { useTracks } from "../hooks/useTracks.js";
import { formatDuration } from "../../services/mockData.js";
import AudioUploader from "../components/AudioUploader.jsx";
import LyricsDrawer from "../components/LyricsDrawer.jsx";

const STATUS_FILTERS = [
	{ value: "", label: "All" },
	{ value: "failed", label: "Failed" },
	{ value: "processing", label: "Processing" },
	{ value: "draft", label: "Draft" },
	{ value: "ready", label: "Ready" },
];

function TracksQueuePage() {
	const {
		items: tracks,
		params,
		hasMore,
		isLoading,
		error,
		uploadingIds,
		loadMore,
		updateFilters,
		refresh,
		uploadAudio,
		reprocessTrack,
		deleteTrack,
	} = useTracks({ limit: 30 });

	const [lyricsTrack, setLyricsTrack] = useState(null);

	return (
		<div className="admin-page">
			<header className="admin-page-head">
				<div>
					<h1>Tracks & Processing Queue</h1>
					<p>
						Мониторинг статусов воркера (`draft` / `processing` / `ready` /
						`failed`) и перезапуск упавших задач.
					</p>
				</div>
				<button
					type="button"
					className="admin-btn admin-btn-ghost"
					onClick={refresh}
				>
					Refresh
				</button>
			</header>

			{error && <div className="admin-banner-error">{error.message}</div>}

			<div className="admin-toolbar">
				<input
					className="admin-input"
					style={{ maxWidth: 260 }}
					placeholder="Search tracks..."
					value={params.q || ""}
					onChange={(e) => updateFilters({ q: e.target.value })}
				/>

				<div className="admin-chip-group">
					{STATUS_FILTERS.map((st) => (
						<button
							key={st.value || "all"}
							type="button"
							className={`admin-artist-pill ${(params.status || "") === st.value ? "is-selected" : ""}`}
							onClick={() => updateFilters({ status: st.value })}
						>
							{st.label}
						</button>
					))}
				</div>
			</div>

			<div className="admin-table-wrap">
				<table className="admin-table">
					<thead>
						<tr>
							<th>Track</th>
							<th>Duration</th>
							<th>Worker & Audio</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{tracks.map((track) => (
							<tr key={track.id}>
								<td>
									<div style={{ fontWeight: 500 }}>{track.title}</div>
									<div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
										{track.artists.map((a) => a.name).join(", ")}
									</div>
								</td>
								<td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
									{track.duration_ms ? formatDuration(track.duration_ms) : "—"}
								</td>
								<td>
									<AudioUploader
										track={track}
										isUploading={Boolean(uploadingIds[track.id])}
										onUpload={uploadAudio}
										onReprocess={reprocessTrack}
									/>
								</td>
								<td>
									<div className="admin-row-actions">
										<Link
											to={`/admin/albums/${track.album_id}`}
											className="admin-btn admin-btn-ghost admin-btn-sm"
										>
											Album
										</Link>
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
											onClick={() => deleteTrack(track.id)}
										>
											Delete
										</button>
									</div>
								</td>
							</tr>
						))}

						{!isLoading && tracks.length === 0 && (
							<tr>
								<td colSpan={4} style={{ color: "var(--text-tertiary)" }}>
									No tracks match the filter.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{hasMore && (
				<div className="admin-toolbar">
					<button
						type="button"
						className="admin-btn admin-btn-ghost"
						disabled={isLoading}
						onClick={loadMore}
					>
						Load More
					</button>
				</div>
			)}

			<LyricsDrawer
				track={lyricsTrack}
				onClose={() => setLyricsTrack(null)}
				onSaved={refresh}
			/>
		</div>
	);
}

export default TracksQueuePage;
