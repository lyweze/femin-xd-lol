// ============================================================================
// Мобильная нижняя шторка плейлистов, Избранного и профиля (`MobileMenuSheet`)
// Поддерживает закрытие тапом по фону, клавишей Escape и свайпом вниз.
// ============================================================================
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/authContext.js";
import { usePlayerState } from "../../../context/playerContexts.js";
import { useEscapeKey } from "../../../hooks/useEscapeKey.js";
import { useSwipeToDismiss } from "../../../hooks/useSwipeToDismiss.js";
import { formatTrackCount, getAccountSummary } from "../../../utils/format.js";
import CollectionCover from "../../shared/collection-cover/CollectionCover.jsx";
import { CloseIcon, EditIcon, PlusIcon } from "../../shared/icons/Icons.jsx";
import "./MobileMenuSheet.css";

const SWIPE_CLOSE_THRESHOLD_PX = 80;

const FAVOURITES_SHEET_ITEM = {
	id: "favourites",
	title: "Favourites",
	type: "playlist",
	cover: null,
};

function MobileMenuSheet({ isOpen, onClose, onCreatePlaylist }) {
	const navigate = useNavigate();
	const { user, isAdmin, openAccountModal } = useAuth();
	const { likedIds, playlists } = usePlayerState();

	const { dragOffsetY, isSwiping, touchHandlers } = useSwipeToDismiss({
		enabled: isOpen,
		thresholdPx: SWIPE_CLOSE_THRESHOLD_PX,
		onDismiss: onClose,
	});

	useEscapeKey(isOpen, onClose);

	if (!isOpen) return null;

	const { initialLetter, subtitle: accountSub } = getAccountSummary(user, isAdmin);

	return (
		<div
			className="mobile-sheet-root"
			role="dialog"
			aria-modal="true"
			aria-label="Playlists and account"
		>
			<div className="mobile-sheet-backdrop" onClick={onClose} aria-hidden="true" />

			<section
				className={`mobile-sheet ${isSwiping ? "is-dragging" : ""}`}
				style={
					isSwiping
						? { transform: `translate3d(0, ${dragOffsetY}px, 0)` }
						: undefined
				}
			>
				<div className="mobile-sheet-drag-zone" {...touchHandlers}>
					<div className="mobile-sheet-handle" aria-hidden="true" />
					<div className="mobile-sheet-header">
						<h2 className="mobile-sheet-title">Playlists</h2>
						<div className="mobile-sheet-head-actions">
							{onCreatePlaylist && (
								<button
									type="button"
									className="mobile-sheet-new-btn"
									onClick={() => {
										onClose();
										onCreatePlaylist();
									}}
								>
									<PlusIcon size={13} />
									<span>New</span>
								</button>
							)}
							<button
								type="button"
								className="mobile-sheet-close"
								onClick={onClose}
								aria-label="Close playlists menu"
							>
								<CloseIcon size={16} />
							</button>
						</div>
					</div>
				</div>

				<div className="mobile-sheet-list">
					<NavLink
						to="/playlist/favourites"
						className="mobile-sheet-playlist"
						onClick={onClose}
					>
						<div className="mobile-sheet-thumb">
							<CollectionCover item={FAVOURITES_SHEET_ITEM} size="small" />
						</div>
						<div className="mobile-sheet-playlist-meta">
							<span className="mobile-sheet-playlist-name">Favourites</span>
							<span className="mobile-sheet-playlist-sub">
								{formatTrackCount(likedIds.length)}
							</span>
						</div>
					</NavLink>

					{playlists.map((playlist) => (
						<NavLink
							key={playlist.id}
							to={`/playlist/${playlist.id}`}
							className="mobile-sheet-playlist"
							onClick={onClose}
						>
							<div className="mobile-sheet-thumb">
								<CollectionCover item={playlist} size="small" />
							</div>
							<div className="mobile-sheet-playlist-meta">
								<span className="mobile-sheet-playlist-name">{playlist.title}</span>
								<span className="mobile-sheet-playlist-sub">
									{formatTrackCount(playlist.track_ids?.length ?? 0)}
								</span>
							</div>
						</NavLink>
					))}
				</div>

				<div className="mobile-sheet-footer">
					<button
						type="button"
						className="mobile-sheet-account"
						onClick={() => {
							onClose();
							openAccountModal();
						}}
						aria-label="Edit account name"
					>
						<div className="mobile-sheet-avatar" aria-hidden="true">
							<span>{initialLetter}</span>
						</div>
						<div className="mobile-sheet-account-meta">
							<span className="mobile-sheet-account-name">
								{user?.username || "User"}
							</span>
							<span className="mobile-sheet-account-sub">{accountSub}</span>
						</div>
						<span className="mobile-sheet-account-edit" aria-hidden="true">
							<EditIcon size={13} />
						</span>
					</button>

					{isAdmin && (
						<button
							type="button"
							className="mobile-sheet-admin-btn"
							onClick={() => {
								onClose();
								navigate("/admin/albums");
							}}
						>
							Admin Studio
						</button>
					)}
				</div>
			</section>
		</div>
	);
}

export default MobileMenuSheet;
