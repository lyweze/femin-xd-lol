import { useRef, useState } from "react";
import { formatBytes } from "../../utils/format.js";

const ALLOWED_EXTS = new Set(["flac", "mp3", "wav", "m4a"]);

function AudioUploader({
	track,
	isAlbumPublished = false,
	isUploading = false,
	onUpload,
	onReprocess,
}) {
	const inputRef = useRef(null);
	const [error, setError] = useState(null);

	const isProcessing = track.status === "processing";
	const uploadDisabled = isUploading || isProcessing || isAlbumPublished;
	const hasSource = (track.files ?? []).some((f) => f.kind === "source");

	const handleFile = async (file) => {
		if (!file) return;
		const ext = file.name.split(".").pop()?.toLowerCase() || "";
		if (!ALLOWED_EXTS.has(ext) && !file.type?.startsWith("audio/")) {
			setError("Поддерживаются только FLAC, MP3, WAV или M4A (415).");
			return;
		}
		setError(null);
		try {
			await onUpload?.(track.id, file);
		} catch (err) {
			setError(err?.message || "Ошибка загрузки аудио.");
		}
	};

	const handleReprocess = async () => {
		setError(null);
		try {
			await onReprocess?.(track.id);
		} catch (err) {
			setError(err?.message || "Не удалось перезапустить обработку.");
		}
	};

	return (
		<div className="admin-audio-box">
			<div className="admin-audio-row">
				<span className={`admin-status-badge is-${track.status}`}>
					{track.status.toUpperCase()}
				</span>

				<button
					type="button"
					className="admin-btn admin-btn-ghost admin-btn-sm"
					disabled={uploadDisabled}
					title={
						isAlbumPublished
							? "Снимите альбом с публикации, чтобы заменить аудио (409)"
							: "Загрузить FLAC / MP3 / WAV / M4A"
					}
					onClick={() => inputRef.current?.click()}
				>
					{isUploading
						? "Uploading..."
						: hasSource
							? "Replace Audio"
							: "Upload Audio"}
				</button>

				{(track.status === "failed" ||
					(hasSource && track.status !== "processing")) && (
					<button
						type="button"
						className="admin-btn admin-btn-ghost admin-btn-sm"
						onClick={handleReprocess}
					>
						Reprocess
					</button>
				)}

				<input
					ref={inputRef}
					type="file"
					accept=".flac,.mp3,.wav,.m4a,audio/*"
					hidden
					onChange={(e) => {
						handleFile(e.target.files?.[0]);
						e.target.value = "";
					}}
				/>
			</div>

			{track.files?.length > 0 && (
				<div className="admin-files-meta">
					{track.files.map((f, idx) => (
						<span key={`${f.kind}-${idx}`} className="admin-file-chip">
							{f.kind}: {f.format.toUpperCase()}
							{f.bitrate_kbps ? ` ${f.bitrate_kbps}kbps` : ""} •{" "}
							{formatBytes(f.size_bytes)}
						</span>
					))}
				</div>
			)}

			{track.processing_error && (
				<p className="admin-field-error">{track.processing_error}</p>
			)}
			{error && <p className="admin-field-error">{error}</p>}
		</div>
	);
}

export default AudioUploader;
