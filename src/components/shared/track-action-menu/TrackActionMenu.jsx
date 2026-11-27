// ============================================================================
// Контекстное меню действий трека (`TrackActionMenu`)
// Десктоп (> 768px): компактный frosted-поповер рядом с кнопкой `⋯`
// Мобильные (<= 768px): нижняя шторка (Action Sheet) в духе Apple Music
// ============================================================================
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { usePlayerActions, usePlayerState } from "../../../context/playerContexts.js";
import { useEscapeKey } from "../../../hooks/useEscapeKey.js";
import { useMediaQuery } from "../../../hooks/useMediaQuery.js";
import { clamp, formatArtistNames } from "../../../utils/format.js";
import { hasTrackLyrics } from "../../../utils/lrc.js";
import CollectionCover from "../collection-cover/CollectionCover.jsx";
import {
	AddToQueueIcon,
	ChevronRightIcon,
	CloseIcon,
	EditIcon,
	LyricsIcon,
	PlayNextIcon,
} from "../icons/Icons.jsx";
import "./TrackActionMenu.css";

const DESKTOP_MENU_WIDTH = 228;

/**
 * Вычисляет безопасные координаты поповера в пределах вьюпорта,
 * раскрывая его вниз или вверх в зависимости от свободного места.
 */
function computeDesktopMenuPosition(anchorRect, minHeightHint = 220) {
	if (typeof window === "undefined" || !anchorRect) {
		return { left: 16, top: 16, openUp: false };
	}

	const vw = window.innerWidth;
	const vh = window.innerHeight;
	const left = clamp(anchorRect.right - DESKTOP_MENU_WIDTH, 12, vw - DESKTOP_MENU_WIDTH - 12);
	const spaceBelow = vh - anchorRect.bottom - 12;
	const spaceAbove = anchorRect.top - 12;
	const openUp = spaceBelow < minHeightHint && spaceAbove > spaceBelow;

	if (openUp) {
		return {
			left,
			bottom: Math.max(12, vh - anchorRect.top + 6),
			openUp: true,
		};
	}

	return {
		left,
		top: clamp(anchorRect.bottom + 6, 12, Math.max(12, vh - 190)),
		openUp: false,
	};
}

function TrackActionMenu() {
	const { trackMenuState, lyricsByTrack } = usePlayerState();
	const {
		playTrackNext,
		enqueueTrack,
		openTrackLyrics,
		openTrackEditor,
		removeLocalTrack,
		closeTrackMenu,
	} = usePlayerActions();
	const isMobile = useMediaQuery("(max-width: 768px)");
	const navigate = useNavigate();

	useEscapeKey(Boolean(trackMenuState), closeTrackMenu);

	useEffect(() => {
		if (!trackMenuState) return undefined;
		window.addEventListener("resize", closeTrackMenu);
		return () => window.removeEventListener("resize", closeTrackMenu);
	}, [trackMenuState, closeTrackMenu]);

	const desktopPlacement = useMemo(() => {
		if (isMobile || !trackMenuState?.anchorRect) {
			return { style: undefined, openUp: false };
		}
		const minHeightHint = trackMenuState.track?.is_local ? 290 : 220;
		const pos = computeDesktopMenuPosition(trackMenuState.anchorRect, minHeightHint);
		return {
			style: pos.openUp
				? { left: `${pos.left}px`, bottom: `${pos.bottom}px` }
				: { left: `${pos.left}px`, top: `${pos.top}px` },
			openUp: pos.openUp,
		};
	}, [isMobile, trackMenuState]);

	if (!trackMenuState?.track || typeof document === "undefined") {
		return null;
	}

	const { track, queueTracks } = trackMenuState;
	const artistNames = formatArtistNames(track.artists);
	const hasLyrics = hasTrackLyrics(track, lyricsByTrack);

	const handlePlayNext = () => {
		playTrackNext(track);
		closeTrackMenu();
	};

	const handleAddToQueue = () => {
		enqueueTrack(track);
		closeTrackMenu();
	};

	const handleOpenLyrics = () => {
		openTrackLyrics(track, queueTracks);
		closeTrackMenu();
	};

	const handleGoToAlbum = () => {
		if (!track.album_id) return;
		closeTrackMenu();
		navigate(`/album/${track.album_id}`);
	};

	const handleEditLocal = () => {
		closeTrackMenu();
		openTrackEditor(track);
	};

	const handleDeleteLocal = async () => {
		closeTrackMenu();
		await removeLocalTrack(track.id);
	};

	return createPortal(
		<div
			className={`track-action-portal ${isMobile ? "is-mobile" : "is-desktop"}`}
			role="presentation"
		>
			<div
				className="track-action-backdrop"
				onClick={closeTrackMenu}
				aria-hidden="true"
			/>

			<div
				className={`track-action-menu ${isMobile ? "is-sheet" : "is-popover"} ${desktopPlacement.openUp ? "is-up" : ""}`}
				style={desktopPlacement.style}
				role="menu"
				aria-label={`Actions for ${track.title}`}
			>
				{isMobile && <div className="track-action-handle" aria-hidden="true" />}

				<div className="track-action-header">
					<div className="track-action-cover">
						<CollectionCover
							item={track}
							size="small"
							className="track-action-cover-img"
						/>
					</div>
					<div className="track-action-meta">
						<span className="track-action-title">{track.title}</span>
						{artistNames && (
							<span className="track-action-artist">{artistNames}</span>
						)}
					</div>
				</div>

				<div className="track-action-divider" aria-hidden="true" />

				<div className="track-action-list">
					<button
						type="button"
						className="track-action-item"
						role="menuitem"
						onClick={handlePlayNext}
					>
						<PlayNextIcon size={16} />
						<span>Play Next</span>
					</button>

					<button
						type="button"
						className="track-action-item"
						role="menuitem"
						onClick={handleAddToQueue}
					>
						<AddToQueueIcon size={16} />
						<span>Add to Queue</span>
					</button>

					{hasLyrics && (
						<button
							type="button"
							className="track-action-item"
							role="menuitem"
							onClick={handleOpenLyrics}
						>
							<LyricsIcon />
							<span>View Lyrics</span>
						</button>
					)}

					{track.album_id && (
						<button
							type="button"
							className="track-action-item"
							role="menuitem"
							onClick={handleGoToAlbum}
						>
							<ChevronRightIcon size={14} />
							<span>Go to Album</span>
						</button>
					)}

					{track.is_local && (
						<>
							<button
								type="button"
								className="track-action-item"
								role="menuitem"
								onClick={handleEditLocal}
							>
								<EditIcon size={15} />
								<span>Edit Track</span>
							</button>

							<button
								type="button"
								className="track-action-item is-danger"
								role="menuitem"
								onClick={handleDeleteLocal}
							>
								<CloseIcon size={15} />
								<span>Delete Local Track</span>
							</button>
						</>
					)}
				</div>

				{isMobile && (
					<button
						type="button"
						className="track-action-cancel"
						onClick={closeTrackMenu}
					>
						Cancel
					</button>
				)}
			</div>
		</div>,
		document.body,
	);
}

export default TrackActionMenu;
