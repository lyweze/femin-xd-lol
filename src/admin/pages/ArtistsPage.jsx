import { useState } from "react";
import { useArtists } from "../hooks/useArtists.js";
import CoverUploader from "../components/CoverUploader.jsx";

function ArtistsPage() {
	const {
		items: artists,
		params,
		hasMore,
		isLoading,
		uploadingAvatarId,
		error,
		loadMore,
		updateFilters,
		createArtist,
		updateArtist,
		uploadAvatar,
		deleteArtist,
	} = useArtists({ limit: 20 });

	const [name, setName] = useState("");
	const [bio, setBio] = useState("");
	const [editingId, setEditingId] = useState(null);
	const [editName, setEditName] = useState("");
	const [editBio, setEditBio] = useState("");
	const [actionError, setActionError] = useState(null);

	const handleCreate = async (e) => {
		e.preventDefault();
		setActionError(null);
		try {
			await createArtist({ name: name.trim(), bio: bio.trim() });
			setName("");
			setBio("");
		} catch (err) {
			setActionError(err?.message || "Не удалось создать артиста.");
		}
	};

	const startEdit = (artist) => {
		setEditingId(artist.id);
		setEditName(artist.name);
		setEditBio(artist.bio || "");
		setActionError(null);
	};

	const handleUpdate = async (artistId) => {
		setActionError(null);
		try {
			await updateArtist(artistId, {
				name: editName.trim(),
				bio: editBio.trim(),
			});
			setEditingId(null);
		} catch (err) {
			setActionError(err?.message || "Не удалось сохранить изменения.");
		}
	};

	const handleDelete = async (artistId) => {
		setActionError(null);
		try {
			await deleteArtist(artistId);
		} catch (err) {
			// Пока у артиста есть альбомы, API вернёт 409 Conflict
			setActionError(err?.message || "Не удалось удалить артиста.");
		}
	};

	return (
		<div className="admin-page">
			<header className="admin-page-head">
				<div>
					<h1>Artists</h1>
					<p>Справочник исполнителей, биографии и загрузка аватаров.</p>
				</div>
			</header>

			{(error || actionError) && (
				<div className="admin-banner-error">
					{actionError || error?.message}
				</div>
			)}

			<form className="admin-card admin-page" onSubmit={handleCreate}>
				<h2 className="admin-card-title">Create Artist</h2>
				<div className="admin-form-grid">
					<div className="admin-field">
						<label>Name *</label>
						<input
							className="admin-input"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Artist name"
							required
						/>
					</div>
					<div className="admin-field">
						<label>Bio</label>
						<input
							className="admin-input"
							value={bio}
							onChange={(e) => setBio(e.target.value)}
							placeholder="Short artist biography..."
						/>
					</div>
				</div>
				<div className="admin-toolbar">
					<button type="submit" className="admin-btn admin-btn-primary">
						+ Create Artist
					</button>
				</div>
			</form>

			<div className="admin-toolbar">
				<input
					className="admin-input"
					style={{ maxWidth: 280 }}
					placeholder="Search artists..."
					value={params.q || ""}
					onChange={(e) => updateFilters({ q: e.target.value })}
				/>
			</div>

			<div className="admin-table-wrap">
				<table className="admin-table">
					<thead>
						<tr>
							<th>Avatar</th>
							<th>Artist & Bio</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{artists.map((artist) => {
							const isEditing = editingId === artist.id;
							return (
								<tr key={artist.id}>
									<td style={{ width: 124 }}>
										<CoverUploader
											image={artist.avatar}
											label="Avatar"
											shape="circle"
											isUploading={uploadingAvatarId === artist.id}
											onUpload={(file) => uploadAvatar(artist.id, file)}
										/>
									</td>
									<td>
										{isEditing ? (
											<div className="admin-page" style={{ gap: 8, paddingBottom: 0 }}>
												<input
													className="admin-input"
													value={editName}
													onChange={(e) => setEditName(e.target.value)}
												/>
												<textarea
													className="admin-textarea"
													value={editBio}
													onChange={(e) => setEditBio(e.target.value)}
												/>
											</div>
										) : (
											<div>
												<div style={{ fontWeight: 500, marginBottom: 4 }}>
													{artist.name}
												</div>
												<div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
													{artist.bio || "No bio yet"}
												</div>
											</div>
										)}
									</td>
									<td style={{ width: 200 }}>
										<div className="admin-row-actions">
											{isEditing ? (
												<>
													<button
														type="button"
														className="admin-btn admin-btn-primary admin-btn-sm"
														onClick={() => handleUpdate(artist.id)}
													>
														Save
													</button>
													<button
														type="button"
														className="admin-btn admin-btn-ghost admin-btn-sm"
														onClick={() => setEditingId(null)}
													>
														Cancel
													</button>
												</>
											) : (
												<>
													<button
														type="button"
														className="admin-btn admin-btn-ghost admin-btn-sm"
														onClick={() => startEdit(artist)}
													>
														Edit
													</button>
													<button
														type="button"
														className="admin-btn admin-btn-danger admin-btn-sm"
														onClick={() => handleDelete(artist.id)}
													>
														Delete
													</button>
												</>
											)}
										</div>
									</td>
								</tr>
							);
						})}

						{!isLoading && artists.length === 0 && (
							<tr>
								<td colSpan={3} style={{ color: "var(--text-tertiary)" }}>
									No artists found.
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
		</div>
	);
}

export default ArtistsPage;
