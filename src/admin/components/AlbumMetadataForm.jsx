import { useState } from "react";

function AlbumMetadataForm({ album, allArtists, onSave, onError }) {
	const [title, setTitle] = useState(album.title || "");
	const [type, setType] = useState(album.type || "album");
	const [releaseDate, setReleaseDate] = useState(album.release_date || "");
	const [artistIds, setArtistIds] = useState(
		() => album.artists?.map((a) => a.id) ?? [],
	);
	const [isSaving, setIsSaving] = useState(false);

	const toggleAlbumArtist = (id) => {
		setArtistIds((prev) =>
			prev.includes(id)
				? prev.length > 1
					? prev.filter((x) => x !== id)
					: prev
				: [...prev, id],
		);
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsSaving(true);
		onError?.(null);
		try {
			await onSave({
				title: title.trim(),
				type,
				release_date: releaseDate || undefined,
				artist_ids: artistIds,
			});
		} catch (err) {
			onError?.(err?.message || "Не удалось обновить альбом.");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<form className="admin-card admin-page" onSubmit={handleSubmit}>
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
				disabled={isSaving}
			>
				{isSaving ? "Saving..." : "Save Metadata"}
			</button>
		</form>
	);
}

export default AlbumMetadataForm;
