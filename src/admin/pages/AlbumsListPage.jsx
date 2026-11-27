// ============================================================================
// Страница списка альбомов (`AlbumsListPage`): создание черновиков и фильтрация
// ============================================================================
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatArtistNames } from "../../utils/format.js";
import { useActionError } from "../hooks/useActionError.js";
import { useAlbums } from "../hooks/useAlbums.js";
import { useArtists } from "../hooks/useArtists.js";
import { ALBUM_TYPES, getAlbumPublicationStatus } from "../utils/albumHelpers.js";

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
	const [isCreating, setIsCreating] = useState(false);
	const { actionError, setActionError, runAction } = useActionError();

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
		try {
			await runAction(async () => {
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
			}, "Не удалось создать альбом.");
		} finally {
			setIsCreating(false);
		}
	};

	const handleDelete = (album) =>
		runAction(() => deleteAlbum(album.id), "Не удалось удалить альбом.");

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
				<div className="admin-banner-error">{actionError || error?.message}</div>
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
								{ALBUM_TYPES.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
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

			<div className="admin-toolbar">
				<input
					className="admin-input admin-filter-input"
					placeholder="Search albums..."
					value={params.q || ""}
					onChange={(e) => updateFilters({ q: e.target.value })}
				/>
				<select
					className="admin-select admin-filter-select"
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
							const status = getAlbumPublicationStatus(album);
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
												<small className="admin-text-muted">
													{album.release_date || "No release date"}
												</small>
											</div>
										</div>
									</td>
									<td className="admin-mono-sm">{album.type.toUpperCase()}</td>
									<td>{formatArtistNames(album.artists)}</td>
									<td className="admin-mono">{album.track_count}</td>
									<td>
										<span className={`admin-status-badge is-${status.key}`}>
											{status.shortLabel ?? status.label}
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
								<td colSpan={6} className="admin-text-muted">
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
