// ============================================================================
// Панель настраиваемой очереди воспроизведения («Playing Next») в FullscreenPlayer
// Поддерживает drag-and-drop на десктопе, кнопки перемещения ↑/↓ на мобильных,
// историю прослушивания, удаление позиций и быстрое добавление из каталога.
// ============================================================================
import { useMemo, useState } from "react";
import { usePlayerActions, usePlayerState } from "../../../context/playerContexts.js";
import { clamp, formatArtistNames, formatDuration } from "../../../utils/format.js";
import CollectionCover from "../../shared/collection-cover/CollectionCover.jsx";
import {
	AddToQueueIcon,
	ArrowStepIcon,
	CloseIcon,
	HistoryIcon,
	PlayNextIcon,
	PlusIcon,
} from "../../shared/icons/Icons.jsx";
import "./FullscreenQueuePane.css";

/** Визуальная метка перетаскивания (шесть точек для десктопного drag-and-drop) */
function DragGripDots() {
	return (
		<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">
			<circle cx="2.5" cy="2.5" r="1.15" />
			<circle cx="7.5" cy="2.5" r="1.15" />
			<circle cx="2.5" cy="7" r="1.15" />
			<circle cx="7.5" cy="7" r="1.15" />
			<circle cx="2.5" cy="11.5" r="1.15" />
			<circle cx="7.5" cy="11.5" r="1.15" />
		</svg>
	);
}

function FullscreenQueuePane() {
	const {
		catalogTracks,
		queue,
		currentQueueIndex,
		isShuffle,
		repeatMode,
		durationOverrides,
	} = usePlayerState();
	const {
		playQueueIndex,
		moveQueueItem,
		removeFromQueue,
		clearUpcomingQueue,
		playTrackNext,
		enqueueTrack,
	} = usePlayerActions();

	const [showHistory, setShowHistory] = useState(false);
	const [showCatalogPicker, setShowCatalogPicker] = useState(false);
	const [dragIdx, setDragIdx] = useState(null);
	const [dragOverIdx, setDragOverIdx] = useState(null);

	const safeIndex =
		queue.length > 0 ? clamp(currentQueueIndex, 0, queue.length - 1) : -1;

	const historyEntries = useMemo(
		() => (safeIndex > 0 ? queue.slice(0, safeIndex) : []),
		[queue, safeIndex],
	);

	const upcomingEntries = useMemo(
		() => (safeIndex >= 0 ? queue.slice(safeIndex + 1) : queue),
		[queue, safeIndex],
	);

	const modeHint = useMemo(() => {
		const parts = [];
		if (isShuffle) parts.push("Shuffled");
		if (repeatMode === "one") parts.push("Repeat One");
		else if (repeatMode === "all") parts.push("Repeat All");
		return parts.join(" • ");
	}, [isShuffle, repeatMode]);

	const handleDragStart = (event, upcomingIdx) => {
		setDragIdx(upcomingIdx);
		setDragOverIdx(upcomingIdx);
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = "move";
			event.dataTransfer.setData("text/plain", String(upcomingIdx));
		}
	};

	const handleDragOver = (event, upcomingIdx) => {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = "move";
		}
		if (dragOverIdx !== upcomingIdx) {
			setDragOverIdx(upcomingIdx);
		}
	};

	const handleDrop = (event, targetUpcomingIdx) => {
		event.preventDefault();
		const fallbackIdx = Number.parseInt(
			event.dataTransfer?.getData("text/plain") ?? "",
			10,
		);
		const fromIdx = dragIdx ?? (Number.isFinite(fallbackIdx) ? fallbackIdx : null);
		if (fromIdx !== null && fromIdx !== targetUpcomingIdx) {
			moveQueueItem(fromIdx, targetUpcomingIdx);
		}
		setDragIdx(null);
		setDragOverIdx(null);
	};

	const handleDragEnd = () => {
		setDragIdx(null);
		setDragOverIdx(null);
	};

	return (
		<section className="fs-queue-pane" aria-label="Playing Next queue">
			<header className="fs-queue-head">
				<div className="fs-queue-heading">
					<div className="fs-queue-title-row">
						<h3 className="fs-queue-title">Playing Next</h3>
						{upcomingEntries.length > 0 && (
							<span className="fs-queue-count">{upcomingEntries.length}</span>
						)}
					</div>
					{modeHint && <span className="fs-queue-mode-hint">{modeHint}</span>}
				</div>

				<div className="fs-queue-tools">
					{historyEntries.length > 0 && (
						<button
							type="button"
							className={`fs-pill-btn fs-queue-tool-btn ${showHistory ? "is-active" : ""}`}
							onClick={() => setShowHistory((prev) => !prev)}
							aria-pressed={showHistory}
							title="Toggle listening history"
						>
							<HistoryIcon size={14} />
							<span>History</span>
						</button>
					)}

					<button
						type="button"
						className="fs-pill-btn fs-queue-tool-btn"
						onClick={clearUpcomingQueue}
						disabled={upcomingEntries.length === 0}
						title="Clear upcoming queue"
					>
						Clear
					</button>
				</div>
			</header>

			<div className="fs-queue-scroll">
				{showHistory && historyEntries.length > 0 && (
					<div className="fs-queue-section">
						<div className="fs-queue-section-label">History</div>
						<ul className="fs-queue-list">
							{historyEntries.map((entry, idx) => (
								<li key={entry.uid} className="fs-queue-row is-history">
									<button
										type="button"
										className="fs-queue-item-main"
										onClick={() => playQueueIndex(idx)}
									>
										<span className="fs-queue-thumb">
											<CollectionCover
												item={entry.track}
												size="small"
												className="fs-queue-thumb-img"
												lazy
											/>
										</span>
										<span className="fs-queue-item-meta">
											<span className="fs-queue-item-title">
												{entry.track.title}
											</span>
											<span className="fs-queue-item-artist">
												{formatArtistNames(entry.track.artists)}
											</span>
										</span>
									</button>
									<span className="fs-queue-duration">
										{formatDuration(
											durationOverrides[entry.track.id] || entry.track.duration_ms,
										)}
									</span>
								</li>
							))}
						</ul>
					</div>
				)}

				<div className="fs-queue-section">
					{upcomingEntries.length === 0 ? (
						<div className="fs-queue-empty">
							<p className="fs-queue-empty-title">No upcoming tracks</p>
							<p className="fs-queue-empty-sub">
								Tap ⋯ on any track or add songs from the catalog below.
							</p>
						</div>
					) : (
						<ul className="fs-queue-list">
							{upcomingEntries.map((entry, upcomingIdx) => {
								const globalIdx = safeIndex + 1 + upcomingIdx;
								const isDragging = dragIdx === upcomingIdx;
								const isDropTarget =
									dragOverIdx === upcomingIdx &&
									dragIdx !== null &&
									dragIdx !== upcomingIdx;

								return (
									<li
										key={entry.uid}
										draggable
										onDragStart={(e) => handleDragStart(e, upcomingIdx)}
										onDragOver={(e) => handleDragOver(e, upcomingIdx)}
										onDrop={(e) => handleDrop(e, upcomingIdx)}
										onDragEnd={handleDragEnd}
										className={[
											"fs-queue-row",
											entry.source === "manual" ? "is-manual" : "",
											isDragging ? "is-dragging" : "",
											isDropTarget ? "is-drop-target" : "",
										]
											.filter(Boolean)
											.join(" ")}
									>
										<span className="fs-queue-grip" aria-hidden="true">
											<DragGripDots />
										</span>

										<button
											type="button"
											className="fs-queue-item-main"
											onClick={() => playQueueIndex(globalIdx)}
										>
											<span className="fs-queue-thumb">
												<CollectionCover
													item={entry.track}
													size="small"
													className="fs-queue-thumb-img"
													lazy
												/>
											</span>
											<span className="fs-queue-item-meta">
												<span className="fs-queue-item-title-line">
													<span className="fs-queue-item-title">
														{entry.track.title}
													</span>
													{entry.source === "manual" && (
														<span className="fs-queue-badge">Queued</span>
													)}
												</span>
												<span className="fs-queue-item-artist">
													{formatArtistNames(entry.track.artists)}
												</span>
											</span>
										</button>

										<div className="fs-queue-item-actions">
											<button
												type="button"
												className="fs-queue-row-btn"
												disabled={upcomingIdx === 0}
												onClick={() =>
													moveQueueItem(upcomingIdx, upcomingIdx - 1)
												}
												title="Move up"
												aria-label={`Move ${entry.track.title} up`}
											>
												<ArrowStepIcon direction="up" size={12} />
											</button>

											<button
												type="button"
												className="fs-queue-row-btn"
												disabled={upcomingIdx === upcomingEntries.length - 1}
												onClick={() =>
													moveQueueItem(upcomingIdx, upcomingIdx + 1)
												}
												title="Move down"
												aria-label={`Move ${entry.track.title} down`}
											>
												<ArrowStepIcon direction="down" size={12} />
											</button>

											<button
												type="button"
												className="fs-queue-row-btn is-remove"
												onClick={() => removeFromQueue(entry.uid)}
												title="Remove from queue"
												aria-label={`Remove ${entry.track.title} from queue`}
											>
												<CloseIcon size={12} />
											</button>
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</div>

				<div className="fs-queue-catalog">
					<button
						type="button"
						className={`fs-queue-catalog-toggle ${showCatalogPicker ? "is-open" : ""}`}
						onClick={() => setShowCatalogPicker((prev) => !prev)}
						aria-expanded={showCatalogPicker}
					>
						<PlusIcon size={13} />
						<span>Add from catalog</span>
						<ArrowStepIcon direction={showCatalogPicker ? "up" : "down"} size={12} />
					</button>

					{showCatalogPicker && (
						<ul className="fs-queue-catalog-list">
							{catalogTracks.map((track) => (
								<li key={track.id} className="fs-queue-catalog-row">
									<div className="fs-queue-catalog-info">
										<span className="fs-queue-thumb is-compact">
											<CollectionCover
												item={track}
												size="small"
												className="fs-queue-thumb-img"
												lazy
											/>
										</span>
										<span className="fs-queue-item-meta">
											<span className="fs-queue-item-title">{track.title}</span>
											<span className="fs-queue-item-artist">
												{formatArtistNames(track.artists)}
											</span>
										</span>
									</div>

									<div className="fs-queue-catalog-actions">
										<button
											type="button"
											className="fs-queue-row-btn is-labeled"
											onClick={() => playTrackNext(track)}
											title="Play Next"
											aria-label={`Play ${track.title} next`}
										>
											<PlayNextIcon size={13} />
											<span>Next</span>
										</button>

										<button
											type="button"
											className="fs-queue-row-btn is-labeled"
											onClick={() => enqueueTrack(track)}
											title="Add to Queue"
											aria-label={`Add ${track.title} to queue`}
										>
											<AddToQueueIcon size={13} />
											<span>Add</span>
										</button>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</section>
	);
}

export default FullscreenQueuePane;
