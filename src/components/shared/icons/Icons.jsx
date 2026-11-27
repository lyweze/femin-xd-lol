// ============================================================================
// Общие SVG-иконки плеера и навигации
// ============================================================================

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

export function PrevIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
			<path d="M3.2 3.2h1.5v9.6H3.2V3.2zm2.8 4.8l6.8-4.5v9L6 8z" />
		</svg>
	);
}

export function PlayIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
			<path d="M4.6 3.1l8.4 4.9-8.4 4.9V3.1z" />
		</svg>
	);
}

export function PauseIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
			<rect x="3.5" y="3" width="3.2" height="10" rx="1" />
			<rect x="9.3" y="3" width="3.2" height="10" rx="1" />
		</svg>
	);
}

export function NextIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
			<path d="M11.3 3.2h1.5v9.6h-1.5V3.2zM10 8l-6.8 4.5v-9L10 8z" />
		</svg>
	);
}

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
