// ============================================================================
// Панель синхронизированных/статичных текстов внутри FullscreenPlayer
// Изолирована по подписке `usePlayerTime()`, не мешает ручному скроллу
// ============================================================================
import { useEffect, useMemo, useRef } from "react";
import { usePlayerTime } from "../../../context/playerContexts.js";

const MANUAL_SCROLL_COOLDOWN_MS = 3500;

function FullscreenLyricsPane({
	lyricsItems,
	activeLyrics,
	onSelectLang,
	isFullscreenOpen,
	onSeekToMs,
}) {
	const { currentTimeMs } = usePlayerTime();
	const activeLineRef = useRef(null);
	const manualScrollUntilRef = useRef(0);

	const activeLineIndex = useMemo(() => {
		if (!activeLyrics?.synced || !activeLyrics.lines?.length) return -1;
		const adjustedMs = currentTimeMs + (activeLyrics.offset_ms || 0);
		let found = -1;
		for (let i = 0; i < activeLyrics.lines.length; i += 1) {
			if (adjustedMs >= activeLyrics.lines[i].start_ms) {
				found = i;
			} else {
				break;
			}
		}
		return found;
	}, [activeLyrics, currentTimeMs]);

	useEffect(() => {
		if (!isFullscreenOpen || activeLineIndex < 0) return;
		if (Date.now() < manualScrollUntilRef.current) return;
		activeLineRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "center",
		});
	}, [activeLineIndex, isFullscreenOpen]);

	const handleManualScrollIntent = () => {
		manualScrollUntilRef.current = Date.now() + MANUAL_SCROLL_COOLDOWN_MS;
	};

	const adjustedMs = currentTimeMs + (activeLyrics.offset_ms || 0);

	return (
		<section className="fs-lyrics-pane" aria-label="Track lyrics">
			{lyricsItems.length > 1 && (
				<div className="fs-lyrics-langs" role="tablist">
					{lyricsItems.map((item) => (
						<button
							key={item.language}
							type="button"
							className={`fs-pill-btn ${item.language === activeLyrics.language ? "is-active" : ""}`}
							onClick={() => onSelectLang(item.language)}
						>
							{item.language.toUpperCase()}
						</button>
					))}
				</div>
			)}

			<div
				className="fs-lyrics-scroll"
				onWheel={handleManualScrollIntent}
				onTouchStart={handleManualScrollIntent}
			>
				{activeLyrics.lines.map((line, idx) => {
					const isActive = activeLyrics.synced && idx === activeLineIndex;
					const isPassed = activeLyrics.synced && idx < activeLineIndex;

					return (
						<p
							key={`${activeLyrics.language}-${idx}`}
							ref={isActive ? activeLineRef : undefined}
							className={`fs-lyrics-line ${!activeLyrics.synced ? "is-static" : ""} ${isActive ? "is-active" : ""} ${isPassed ? "is-passed" : ""}`}
							onClick={() => {
								if (!activeLyrics.synced) return;
								manualScrollUntilRef.current = 0;
								onSeekToMs(
									Math.max(0, line.start_ms - (activeLyrics.offset_ms || 0)),
								);
							}}
						>
							{Array.isArray(line.words) && line.words.length > 0
								? line.words.map((word, wIdx) => {
										const wordActive =
											isActive &&
											adjustedMs >= word.start_ms &&
											adjustedMs <= word.end_ms;
										return (
											<span
												key={wIdx}
												className={wordActive ? "is-word-active" : ""}
											>
												{word.text}{" "}
											</span>
										);
									})
								: line.text}
						</p>
					);
				})}
			</div>
		</section>
	);
}

export default FullscreenLyricsPane;
