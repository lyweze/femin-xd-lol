import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAlbums } from "../hooks/useAlbums.js";
import { useArtists } from "../hooks/useArtists.js";

function getAlbumStatus(album) {
	if (!album.published_at) return { key: "draft", label: "DRAFT" };
	const isFuture = new Date(album.published_at).getTime() > Date.now();
	return isFuture
		? { key: "scheduled", label: "SCHEDULED" }
		: { key: "published", label: "PUBLISHED" };
}

function AlbumsListPage() {
	const navigate = useNavigate();
	const {
		items: albums,
		params,
		hasMore,
		isLoading,
		error,
		loadMore,
		updateFilters,
		createAlbum,
		deleteAlbum,
	} = useAlbums({ limit: 20 });

	const { items: artists } = useArtists({ limit: 100 });

	const [showForm, setShowForm] = useState(false);
	const [title, setTitle] = useState("");
	const [type, setType] = useState("album");
	const [releaseDate, setReleaseDate] = useState("");
	const [selectedArtistIds, setSelectedArtistIds] = useState([]);
	const [actionError, setActionError] = useState(null);
	const [isCreating, setIsCreating] = useState(false);

	const toggleArtistId = (id) => {
		setSelectedArtistIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	};

	const handleCreate = async (e) => {
		e.preventDefault();
		if (selectedArtistIds.length === 0) {
			setActionError("Выберите хотя бы одного артиста (artist_ids).");
			return;
		}
		setIsCreating(true);
		setActionError(null);
		try {
			const album = await createAlbum({
				title: title.trim(),
				type,
				release_date: releaseDate || undefined,
				artist_ids: selectedArtistIds,
			});
			setTitle("");
			setReleaseDate("");
			setSelectedArtistIds([]);
			setShowForm(false);
			navigate(`/admin/albums/${album.id}`);
		} catch (err) {
			setActionError(err?.message || "Не удалось создать альбом.");
		} finally {
			setIsCreating(false);
		}
	};

	const handleDelete = async (album) => {
		setActionError(null);
		try {
			await deleteAlbum(album.id);
		} catch (err) {
			setActionError(err?.message || "Не удалось удалить альбом.");
		}
	};

	return (
		<div className="admin-page">
			<header className="admin-page-head">
				<div>
					<h1>Albums</h1>
					<p>Черновики, отложенные и опубликованные релизы каталога.</p>
				</div>

				<button
					type="button"
					className="admin-btn admin-btn-primary"
					onClick={() => setShowForm((v) => !v)}
				>
					{showForm ? "Cancel" : "+ New Album"}
				</button>
			</header>

			{(error || actionError) && (
				<div className="admin-banner-error">
					{actionError || error?.message}
				</div>
			)}

			{showForm && (
				<form className="admin-card admin-page" onSubmit={handleCreate}>
					<h2 className="admin-card-title">Create Album Draft</h2>
					<div className="admin-form-grid">
						<div className="admin-field">
							<label>Title *</label>
							<input
								className="admin-input"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Smoked Glass Vol. II"
								required
							/>
						</div>
						<div className="admin-field">
							<label>Type *</label>
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
					</div>

					<div className="admin-field">
						<label>Artists * (in display order)</label>
						<div className="admin-chip-group">
							{artists.map((artist) => (
								<button
									key={artist.id}
									type="button"
									className={`admin-artist-pill ${selectedArtistIds.includes(artist.id) ? "is-selected" : ""}`}
									onClick={() => toggleArtistId(artist.id)}
								>
									{artist.name}
								</button>
							))}
						</div>
					</div>

					<div className="admin-toolbar">
						<button
							type="submit"
							className="admin-btn admin-btn-primary"
							disabled={isCreating}
						>
							{isCreating ? "Creating..." : "Create & Open Studio"}
						</button>
					</div>
				</form>
			)}

			{/* Фильтры q и artist_id */}
			<div className="admin-toolbar">
				<input
					className="admin-input"
					style={{ maxWidth: 280 }}
					placeholder="Search albums..."
					value={params.q || ""}
					onChange={(e) => updateFilters({ q: e.target.value })}
				/>
				<select
					className="admin-select"
					style={{ maxWidth: 220 }}
					value={params.artist_id || ""}
					onChange={(e) => updateFilters({ artist_id: e.target.value })}
				>
					<option value="">All artists</option>
					{artists.map((a) => (
						<option key={a.id} value={a.id}>
							{a.name}
						</option>
					))}
				</select>
			</div>

			<div className="admin-table-wrap">
				<table className="admin-table">
					<thead>
						<tr>
							<th>Album</th>
							<th>Type</th>
							<th>Artists</th>
							<th>Tracks</th>
							<th>Status</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{albums.map((album) => {
							const st = getAlbumStatus(album);
							return (
								<tr key={album.id}>
									<td>
										<div className="admin-cell-media">
											{album.cover?.small_url ? (
												<img
													src={album.cover.small_url}
													alt=""
													className="admin-thumb"
												/>
											) : (
												<div className="admin-thumb" />
											)}
											<div>
												<div>{album.title}</div>
												<small style={{ color: "var(--text-tertiary)" }}>
													{album.release_date || "No release date"}
												</small>
											</div>
										</div>
									</td>
									<td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
										{album.type.toUpperCase()}
									</td>
									<td>{album.artists.map((a) => a.name).join(", ")}</td>
									<td style={{ fontFamily: "var(--font-mono)" }}>
										{album.track_count}
									</td>
									<td>
										<span className={`admin-status-badge is-${st.key}`}>
											{st.label}
										</span>
									</td>
									<td>
										<div className="admin-row-actions">
											<Link
												to={`/admin/albums/${album.id}`}
												className="admin-btn admin-btn-ghost admin-btn-sm"
											>
												Open Studio
											</Link>
											<button
												type="button"
												className="admin-btn admin-btn-danger admin-btn-sm"
												onClick={() => handleDelete(album)}
											>
												Delete
											</button>
										</div>
									</td>
								</tr>
							);
						})}

						{!isLoading && albums.length === 0 && (
							<tr>
								<td colSpan={6} style={{ color: "var(--text-tertiary)" }}>
									No albums found.
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
						{isLoading ? "Loading..." : "Load More"}
					</button>
				</div>
			)}
		</div>
	);
}

export default AlbumsListPage;
