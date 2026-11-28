// ============================================================================
// Поле загрузки квадратной обложки с drag-and-drop и сжатием (`CoverDropField`)
// ============================================================================
import { useRef, useState } from "react";
import { processPlaylistCoverFile } from "../../../utils/cover.js";
import CollectionCover from "../collection-cover/CollectionCover.jsx";
import { CameraIcon } from "../icons/Icons.jsx";
import "./CoverDropField.css";

function CoverDropField({
	previewItem,
	hasCustomCover,
	isProcessing = false,
	onProcessingChange,
	onCoverReady,
	onResetCover,
	onError,
	ariaLabel = "Upload cover image",
	resetLabel = "Reset cover",
}) {
	const inputRef = useRef(null);
	const [isDragOver, setIsDragOver] = useState(false);

	const handleFile = async (file) => {
		if (!file) return;
		onError?.(null);
		onProcessingChange?.(true);
		try {
			const processed = await processPlaylistCoverFile(file);
			onCoverReady?.(processed);
		} catch (err) {
			onError?.(err?.message || "Не удалось загрузить обложку.");
		} finally {
			onProcessingChange?.(false);
		}
	};

	const openPicker = () => {
		if (!isProcessing) inputRef.current?.click();
	};

	return (
		<div className="cover-drop-col">
			<div
				role="button"
				tabIndex={0}
				className={`cover-drop-btn ${isDragOver ? "is-drag-over" : ""}`}
				onClick={openPicker}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						openPicker();
					}
				}}
				onDragOver={(e) => {
					e.preventDefault();
					setIsDragOver(true);
				}}
				onDragLeave={() => setIsDragOver(false)}
				onDrop={(e) => {
					e.preventDefault();
					setIsDragOver(false);
					handleFile(e.dataTransfer.files?.[0]);
				}}
				aria-label={ariaLabel}
			>
				<CollectionCover
					item={previewItem}
					size="medium"
					className="cover-drop-preview"
				/>
				<span className="cover-drop-scrim">
					<CameraIcon size={18} />
					<span>
						{isProcessing
							? "Processing…"
							: hasCustomCover
								? "Change cover"
								: "Choose cover"}
					</span>
				</span>
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

			{hasCustomCover && onResetCover && (
				<button type="button" className="cover-drop-reset" onClick={onResetCover}>
					{resetLabel}
				</button>
			)}
		</div>
	);
}

export default CoverDropField;
