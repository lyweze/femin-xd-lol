// ============================================================================
// Набор векторных SVG-иконок плеера, навигации и заглушек обложек
// Все иконки используют `currentColor` для мгновенного наследования цвета темы
// ============================================================================

/** Иконка переключения боковой панели */
export function SidebarIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<rect
				x="2"
				y="2.5"
				width="12"
				height="11"
				rx="2.5"
				stroke="currentColor"
				strokeWidth="1.4"
			/>
			<path d="M6 2.5V13.5" stroke="currentColor" strokeWidth="1.4" />
		</svg>
	);
}

/** Иконка раскрытия полноэкранного плеера */
export function ExpandIcon() {
	return (
		<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path
				d="M10 2.5h3.5V6M6 13.5H2.5V10M13.5 2.5L9.2 6.8M2.5 13.5l4.3-4.3"
				stroke="currentColor"
				strokeWidth="1.4"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** Иконка панели текстов песен */
export function LyricsIcon() {
	return (
		<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path
				d="M2.5 4h11M2.5 8h8M2.5 12h5.5"
				stroke="currentColor"
				strokeWidth="1.4"
				strokeLinecap="round"
			/>
		</svg>
	);
}

/** Иконка динамика (с волнами или перечёркнутая при mute) */
export function VolumeIcon({ muted = false, size = 14 }) {
	return (
		<svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
			{muted ? (
				<path
					d="M2.5 6.2h2.4l3.3-2.8v9.2L4.9 9.8H2.5V6.2zm8.5.3l3 3m0-3l-3 3"
					stroke="currentColor"
					strokeWidth="1.3"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			) : (
				<path
					d="M2.5 6.2h2.4l3.3-2.8v9.2L4.9 9.8H2.5V6.2zm8.2-.2a3 3 0 010 4m2-5.8a5.5 5.5 0 010 7.6"
					stroke="currentColor"
					strokeWidth="1.3"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			)}
		</svg>
	);
}

/** Иконка перемешивания очереди (Shuffle) */
export function ShuffleIcon() {
	return (
		<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path
				d="M2 4.5h2.4c1 0 1.9.5 2.4 1.3l2.4 4.4c.5.8 1.4 1.3 2.4 1.3H14M12 2.5L14 4.5L12 6.5M2 11.5h2.4c1 0 1.9-.5 2.4-1.3l.6-1.1M10.4 5.9l.4-.7c.5-.8 1.4-1.3 2.4-1.3H14M12 9.5L14 11.5L12 13.5"
				stroke="currentColor"
				strokeWidth="1.35"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** Иконка предыдущего трека */
export function PrevIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
			<path d="M3.2 3.2h1.5v9.6H3.2V3.2zm2.8 4.8l6.8-4.5v9L6 8z" />
		</svg>
	);
}

/** Иконка Play */
export function PlayIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
			<path d="M4.6 3.1l8.4 4.9-8.4 4.9V3.1z" />
		</svg>
	);
}

/** Иконка Pause */
export function PauseIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
			<rect x="3.5" y="3" width="3.2" height="10" rx="1" />
			<rect x="9.3" y="3" width="3.2" height="10" rx="1" />
		</svg>
	);
}

/** Иконка следующего трека */
export function NextIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
			<path d="M11.3 3.2h1.5v9.6h-1.5V3.2zM10 8l-6.8 4.5v-9L10 8z" />
		</svg>
	);
}

/** Иконка повтора (Repeat) */
export function RepeatIcon() {
	return (
		<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path
				d="M11.5 2.5L13.5 4.5L11.5 6.5M3 8V6.5C3 5.4 3.9 4.5 5 4.5h8.5M4.5 13.5L2.5 11.5L4.5 9.5M13 8v1.5c0 1.1-.9 2-2 2H2.5"
				stroke="currentColor"
				strokeWidth="1.35"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** Стрелка вниз (сворачивание полноэкранного плеера) */
export function ChevronDownIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path
				d="M3.5 6L8 10.5L12.5 6"
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** Иконка лупы для поиска */
export function SearchIcon({ className }) {
	return (
		<svg
			className={className}
			width="15"
			height="15"
			viewBox="0 0 16 16"
			fill="none"
			aria-hidden="true"
		>
			<circle cx="7" cy="7" r="4.8" stroke="currentColor" strokeWidth="1.4" />
			<path
				d="M10.8 10.8L14 14"
				stroke="currentColor"
				strokeWidth="1.4"
				strokeLinecap="round"
			/>
		</svg>
	);
}

/** Сердце для Избранного и градиентных обложек (контурное или залитое) */
export function HeartIcon({ filled = false, size = 14 }) {
	return (
		<svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path
				d="M8 13.7s-5.2-3.2-5.2-6.9A3.1 3.1 0 0 1 8 4.6a3.1 3.1 0 0 1 5.2 2.2c0 3.7-5.2 6.9-5.2 6.9z"
				fill={filled ? "currentColor" : "none"}
				stroke="currentColor"
				strokeWidth="1.35"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** Стрелка вправо (полоса повторного открытия сайдбара) */
export function ChevronRightIcon({ size = 12 }) {
	return (
		<svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path
				d="M6 3.5L10.5 8L6 12.5"
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** Домик для мобильной вкладки Home */
export function HomeIcon({ size = 18 }) {
	return (
		<svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path
				d="M2.5 6.8L8 2.4l5.5 4.4v6.1a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V6.8z"
				stroke="currentColor"
				strokeWidth="1.35"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** Стопка книг/пластинок для мобильной вкладки Library */
export function LibraryIcon({ size = 18 }) {
	return (
		<svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path
				d="M3 3.2v9.6M6.3 3.2v9.6M9.6 3.6l3.4 9"
				stroke="currentColor"
				strokeWidth="1.4"
				strokeLinecap="round"
			/>
		</svg>
	);
}

/** Иконка списка для открытия шторки плейлистов */
export function MenuIcon({ size = 18 }) {
	return (
		<svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path
				d="M2.5 4.5h11M2.5 8h11M2.5 11.5h7.5"
				stroke="currentColor"
				strokeWidth="1.4"
				strokeLinecap="round"
			/>
		</svg>
	);
}

/** Крестик закрытия */
export function CloseIcon({ size = 16 }) {
	return (
		<svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path
				d="M4 4l8 8M12 4l-8 8"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
		</svg>
	);
}

/** Музыкальная нота (для градиентных обложек плейлистов по умолчанию) */
export function MusicNoteIcon({ size = 28 }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path
				d="M9 17.5a2.5 2.5 0 1 1-1.5-2.3V6.8l10-2.1v8.8a2.5 2.5 0 1 1-1.5-2.3V7.9l-7 1.5v8.1z"
				fill="currentColor"
			/>
		</svg>
	);
}

/** Иконка «+» (создание плейлиста или добавление трека) */
export function PlusIcon({ size = 14 }) {
	return (
		<svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path
				d="M8 3v10M3 8h10"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
		</svg>
	);
}

/** Иконка карандаша (редактирование плейлиста) */
export function EditIcon({ size = 14 }) {
	return (
		<svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path
				d="M11.4 2.6a1.4 1.4 0 0 1 2 2L5.6 12.4 2.5 13.5l1.1-3.1 7.8-7.8z"
				stroke="currentColor"
				strokeWidth="1.35"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/** Иконка камеры (смена обложки) */
export function CameraIcon({ size = 18 }) {
	return (
		<svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path
				d="M2.2 5.4a1.2 1.2 0 0 1 1.2-1.2h1.4l1-1.4h4.4l1 1.4h1.4a1.2 1.2 0 0 1 1.2 1.2v6.4a1.2 1.2 0 0 1-1.2 1.2H3.4a1.2 1.2 0 0 1-1.2-1.2V5.4z"
				stroke="currentColor"
				strokeWidth="1.3"
				strokeLinejoin="round"
			/>
			<circle cx="8" cy="8.4" r="2.1" stroke="currentColor" strokeWidth="1.3" />
		</svg>
	);
}

/** Стрелка вверх / вниз для сортировки треков */
export function ArrowStepIcon({ direction = "up", size = 12 }) {
	return (
		<svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path
				d={direction === "up" ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4"}
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
