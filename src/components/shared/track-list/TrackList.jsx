// ============================================================================
// Универсальный список треков (`TrackList`), подключённый к PlayerContext
// Инкапсулирует подписку на активный трек, лайки и длительности,
// избавляя страницы каталога от лишних ререндеров и повторяющегося маппинга.
// ============================================================================
import { useMemo } from "react";
import { usePlayerActions, usePlayerState } from "../../../context/playerContexts.js";
import { hasTrackLyrics } from "../../../utils/lrc.js";
import TrackRow from "../track-row/TrackRow.jsx";

/**
 * @param {Object} props
 * @param {Array} props.tracks - Отображаемый массив треков
 * @param {Array} [props.queueTracks] - Полная очередь, которая активируется при клике (по умолчанию `tracks`)
 * @param {boolean} [props.embedded=true] - Добавляет модификатор `.is-embedded` для встраивания в `.page-scroll`
 * @param {React.Ref} [props.listRef] - Ref для внешнего вертикального скролл-контейнера
 * @param {boolean} [props.useTrackNumber=false] - Показывать нумерацию диска (в альбомах) вместо мини-обложки трека
 * @param {boolean} [props.showCover] - Явно управляет показом обложки трека (по умолчанию `!useTrackNumber`)
 * @param {string} [props.ariaLabel] - Доступная подпись списка
 */
function TrackList({
	tracks,
	queueTracks,
	embedded = true,
	listRef,
	useTrackNumber = false,
	showCover,
	ariaLabel,
}) {
	const { currentTrack, isPlaying, likedIds, durationOverrides, lyricsByTrack } =
		usePlayerState();
	const { playTrack, toggleLike, openTrackLyrics, openTrackMenu } =
		usePlayerActions();

	const likedSet = useMemo(() => new Set(likedIds), [likedIds]);
	const activeQueue = queueTracks || tracks;
	const renderCover = showCover ?? !useTrackNumber;

	return (
		<ul
			className={embedded ? "Library is-embedded" : "Library"}
			ref={listRef}
			aria-label={ariaLabel}
		>
			{tracks.map((track, idx) => {
				const isCurrent = currentTrack?.id === track.id;
				const displayIndex = useTrackNumber ? track.track_no || idx + 1 : idx + 1;
				const hasLyrics = hasTrackLyrics(track, lyricsByTrack);

				return (
					<TrackRow
						key={track.id}
						track={track}
						trackList={activeQueue}
						index={displayIndex}
						showCover={renderCover}
						durationMsOverride={durationOverrides[track.id]}
						isCurrent={isCurrent}
						isPlaying={isCurrent && isPlaying}
						isLiked={likedSet.has(track.id)}
						hasLyrics={hasLyrics}
						onPlay={playTrack}
						onToggleLike={toggleLike}
						onOpenLyrics={openTrackLyrics}
						onOpenMenu={openTrackMenu}
					/>
				);
			})}
		</ul>
	);
}

export default TrackList;
