// ============================================================================
// Зона загрузки обложек и аватаров с drag-and-drop (`CoverUploader`)
// ============================================================================
import { useRef, useState } from "react";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function CoverUploader({
	image,
	label = "Cover",
	shape = "square",
	isUploading = false,
	onUpload,
}) {
	const inputRef = useRef(null);
	const [dragOver, setDragOver] = useState(false);
	const [localError, setLocalError] = useState(null);

	const handleFile = async (file) => {
		if (!file) return;
		if (!ALLOWED_TYPES.has(file.type)) {
			setLocalError("Поддерживаются только JPEG, PNG или WebP (415).");
			return;
		}
		setLocalError(null);
		try {
			await onUpload?.(file);
		} catch (err) {
			setLocalError(err?.message || "Не удалось загрузить изображение.");
		}
	};

	const previewUrl = image?.medium_url || image?.small_url || null;

	return (
		<div className="admin-uploader">
			<div
				className={`admin-cover-drop ${shape === "circle" ? "is-circle" : ""} ${dragOver ? "is-over" : ""}`}
				onClick={() => !isUploading && inputRef.current?.click()}
				onDragOver={(e) => {
					e.preventDefault();
					setDragOver(true);
				}}
				onDragLeave={() => setDragOver(false)}
				onDrop={(e) => {
					e.preventDefault();
					setDragOver(false);
					handleFile(e.dataTransfer.files?.[0]);
				}}
			>
				{previewUrl ? (
					<img src={previewUrl} alt={label} className="admin-cover-preview" />
				) : (
					<div className="admin-cover-placeholder">
						<span>{isUploading ? "Uploading..." : `Drop ${label}`}</span>
						<small>JPEG / PNG / WebP</small>
					</div>
				)}
				{isUploading && <div className="admin-cover-overlay">Uploading…</div>}
			</div>

			<input
				ref={inputRef}
				type="file"
				accept="image/jpeg,image/png,image/webp"
				hidden
				onChange={(e) => {
					handleFile(e.target.files?.[0]);
					e.target.value = "";
				}}
			/>

			{localError && <p className="admin-field-error">{localError}</p>}
		</div>
	);
}

export default CoverUploader;
