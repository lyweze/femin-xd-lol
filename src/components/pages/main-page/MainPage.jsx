// ============================================================================
// Импорты: хуки и стили страницы
// ============================================================================
import { useHorizontalScroll } from "../../../hooks/useHorizontalScroll";
import "./MainPage.css";

/**
 * Главная страница приложения (`MainPage`).
 * Отображает заголовок раздела, горизонтальную ленту плейлистов
 * с поддержкой Drag-to-Scroll и секцию библиотеки.
 */
function MainPage() {
	// Реф для горизонтальной прокрутки ленты плейлистов колесиком и перетаскиванием
	const playlistsRef = useHorizontalScroll();

	return (
		<main className="main">
			{/* ================================================================
                1. Шапка раздела
               ================================================================ */}
			<header className="main-header">
				<h1 className="main-title">Now Playing</h1>
				<p className="main-subtitle">Your favorite tracks</p>
			</header>

			{/* ================================================================
                2. Горизонтальная лента плейлистов (временная разметка без стора)
               ================================================================ */}
			<ul className="Playlists" ref={playlistsRef} aria-label="Playlists">
				<li className="Playlist-item">
					{/* Обложка плейлиста (декоративный контейнер под изображение/градиент) */}
					<div className="Playlist-icon" aria-hidden="true" />
					<span className="Playlist-name">My Playlist 1</span>
				</li>

				<li className="Playlist-item">
					<div className="Playlist-icon" aria-hidden="true" />
					<span className="Playlist-name">My Playlist 2</span>
				</li>

				<li className="Playlist-item">
					<div className="Playlist-icon" aria-hidden="true" />
					<span className="Playlist-name">My Playlist 3</span>
				</li>

				<li className="Playlist-item">
					<div className="Playlist-icon" aria-hidden="true" />
					<span className="Playlist-name">Late Night Mix</span>
				</li>

				<li className="Playlist-item">
					<div className="Playlist-icon" aria-hidden="true" />
					<span className="Playlist-name">Synthwave 2026</span>
				</li>

				<li className="Playlist-item">
					<div className="Playlist-icon" aria-hidden="true" />
					<span className="Playlist-name">Ambient Focus</span>
				</li>

				<li className="Playlist-item">
					<div className="Playlist-icon" aria-hidden="true" />
					<span className="Playlist-name">Mastering Reference</span>
				</li>

				<li className="Playlist-item">
					<div className="Playlist-icon" aria-hidden="true" />
					<span className="Playlist-name">Lo-Fi Beats</span>
				</li>

				<li className="Playlist-item">
					<div className="Playlist-icon" aria-hidden="true" />
					<span className="Playlist-name">Dark Techno</span>
				</li>

				<li className="Playlist-item">
					<div className="Playlist-icon" aria-hidden="true" />
					<span className="Playlist-name">Chillhop Essentials</span>
				</li>

				<li className="Playlist-item">
					<div className="Playlist-icon" aria-hidden="true" />
					<span className="Playlist-name">Gym Phonk</span>
				</li>

				<li className="Playlist-item">
					<div className="Playlist-icon" aria-hidden="true" />
					<span className="Playlist-name">Coding Session</span>
				</li>
			</ul>

			{/* ================================================================
                3. Секция библиотеки треков (заготовка под будущий список)
               ================================================================ */}
			<ul className="Library" aria-label="Library" />
		</main>
	);
}

export default MainPage;
