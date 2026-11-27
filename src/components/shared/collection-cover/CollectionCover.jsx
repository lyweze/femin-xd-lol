// ============================================================================
// Универсальная обложка альбома / плейлиста / Избранного (`CollectionCover`)
// Для разделов без кастомной обложки рендерит детерминированный градиент + иконку
// ============================================================================
import { useState } from "react";
import { handleCoverError } from "../../../utils/cover.js";
import { HeartIcon, MusicNoteIcon } from "../icons/Icons.jsx";
import "./CollectionCover.css";

const GRADIENT_PRESETS = ["amber", "mist", "moss", "plum", "ochre"];

/**
 * Детерминированно выбирает палитру градиента для плейлиста без обложки
 * на основе его `id` / `title` (для Избранного всегда используется тема `favourites`).
 */
function pickPlaylistTone(item) {
	if (item?.id === "favourites") return "favourites";
	const seed = String(item?.id || item?.title || "playlist");
	let hash = 0;
	for (let i = 0; i < seed.length; i += 1) {
		hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
	}
	return GRADIENT_PRESETS[hash % GRADIENT_PRESETS.length];
}

/**
 * Выбирает оптимальный URL изображения нужного размера (`small` / `medium` / `large`).
 */
function selectCoverUrl(cover, size) {
	if (!cover) return null;
	if (size === "large") return cover.large_url || cover.medium_url || null;
	if (size === "small") return cover.small_url || cover.medium_url || null;
	return cover.medium_url || cover.small_url || null;
}

function CollectionCover({
	item,
	size = "medium",
	className = "",
	lazy = false,
}) {
	const imageUrl = selectCoverUrl(item?.cover, size);
	const [failedUrl, setFailedUrl] = useState(null);

	// Если изображение загрузить не удалось и даже фолбэк не сработал — рисуем градиент
	const showImage = Boolean(imageUrl) && failedUrl !== imageUrl;
	const tone = pickPlaylistTone(item);
	const isHero = className.includes("is-hero");
	const iconSize = isHero ? 54 : size === "small" ? 18 : 44;

	if (showImage) {
		return (
			<img
				className={`collection-cover-media ${className}`}
				src={imageUrl}
				alt={item?.title || ""}
				loading={lazy ? "lazy" : undefined}
				draggable={false}
				onError={(e) => {
					handleCoverError(e, item.cover, size);
					if (e.currentTarget.src === imageUrl) {
						setFailedUrl(imageUrl);
					}
				}}
			/>
		);
	}

	return (
		<div
			className={`collection-cover-media collection-cover-gradient is-${tone} ${className}`}
			aria-hidden="true"
		>
			<div className="collection-cover-sheen" />
			<span className="collection-cover-glyph">
				{tone === "favourites" ? (
					<HeartIcon filled size={iconSize} />
				) : (
					<MusicNoteIcon size={iconSize} />
				)}
			</span>
		</div>
	);
}

export default CollectionCover;
