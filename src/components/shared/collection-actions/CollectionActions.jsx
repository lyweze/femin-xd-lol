// ============================================================================
// Общая панель кнопок запуска коллекции или артиста (`Play` / `Shuffle` / `Edit`)
// ============================================================================
import { EditIcon, PlayIcon } from "../icons/Icons.jsx";

/**
 * Рендерит кнопки запуска очереди (по порядку и вперемешку)
 * и опциональную кнопку редактирования пользовательского плейлиста.
 */
function CollectionActions({
	tracks,
	onPlayQueue,
	playLabel = "Play",
	onEdit,
}) {
	const isEmpty = !tracks || tracks.length === 0;

	return (
		<div className="collection-actions">
			<button
				type="button"
				className="btn-primary"
				disabled={isEmpty}
				onClick={() => onPlayQueue(tracks, { shuffle: false })}
			>
				<PlayIcon />
				<span>{playLabel}</span>
			</button>

			<button
				type="button"
				className="btn-secondary"
				disabled={isEmpty}
				onClick={() => onPlayQueue(tracks, { shuffle: true })}
			>
				Shuffle
			</button>

			{onEdit && (
				<button
					type="button"
					className="btn-secondary"
					onClick={onEdit}
					aria-label="Edit playlist"
				>
					<EditIcon size={13} />
					<span>Edit</span>
				</button>
			)}
		</div>
	);
}

export default CollectionActions;
