// ============================================================================
// Импорты: кастомные хуки скролла и стили страницы
// ============================================================================
import { useHorizontalScroll } from "../../../hooks/useHorizontalScroll";
import { useVerticalScroll } from "../../../hooks/useVerticalScroll";
import "./MainPage.css";

/**
 * Главная страница приложения (`MainPage`).
 * Отображает зафиксированную шапку, горизонтальную ленту плейлистов
 * с поддержкой Drag-to-Scroll и независимо скроллящийся список библиотеки.
 */
function MainPage() {
	// Рефы для независимой прокрутки и динамического расчёта краёв затухания (mask-image)
	const playlistsRef = useHorizontalScroll();
	const libraryRef = useVerticalScroll();

	return (
		<main className="main">
			{/* ================================================================
                1. Шапка раздела (зафиксирована сверху)
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
                3. Секция библиотеки (вертикально скроллящийся список треков)
               ================================================================ */}
			<ul className="Library" ref={libraryRef} aria-label="Library">
				{/* Активный трек: подсвечен фоном и акцентной точкой в цвет обложки */}
				<li className="Library-item is-current" aria-current="true">
					<div className="Library-left">
						<div className="Library-index">
							<span className="Library-dot" aria-hidden="true" />
							<span>1</span>
						</div>
						<div className="Library-meta">
							<span className="Library-title">The Rint</span>
							<span className="Library-artist">Matte Obsidian</span>
						</div>
					</div>
					<span className="Library-duration">03:12</span>
				</li>

				<li className="Library-item">
					<div className="Library-left">
						<div className="Library-index">
							<span>2</span>
						</div>
						<div className="Library-meta">
							<span className="Library-title">The Skin</span>
							<span className="Library-artist">Kiasmos &amp; Olafur</span>
						</div>
					</div>
					<span className="Library-duration">04:05</span>
				</li>

				<li className="Library-item">
					<div className="Library-left">
						<div className="Library-index">
							<span>3</span>
						</div>
						<div className="Library-meta">
							<span className="Library-title">Alabaster Echo</span>
							<span className="Library-artist">Nils Frahm</span>
						</div>
					</div>
					<span className="Library-duration">03:38</span>
				</li>

				<li className="Library-item">
					<div className="Library-left">
						<div className="Library-index">
							<span>4</span>
						</div>
						<div className="Library-meta">
							<span className="Library-title">Spatial Drift</span>
							<span className="Library-artist">Rival Consoles</span>
						</div>
					</div>
					<span className="Library-duration">04:24</span>
				</li>

				<li className="Library-item">
					<div className="Library-left">
						<div className="Library-index">
							<span>5</span>
						</div>
						<div className="Library-meta">
							<span className="Library-title">Subtle Grain</span>
							<span className="Library-artist">Christian Löffler</span>
						</div>
					</div>
					<span className="Library-duration">03:51</span>
				</li>

				<li className="Library-item">
					<div className="Library-left">
						<div className="Library-index">
							<span>6</span>
						</div>
						<div className="Library-meta">
							<span className="Library-title">Monolith II</span>
							<span className="Library-artist">Ben Böhmer</span>
						</div>
					</div>
					<span className="Library-duration">05:10</span>
				</li>

				<li className="Library-item">
					<div className="Library-left">
						<div className="Library-index">
							<span>7</span>
						</div>
						<div className="Library-meta">
							<span className="Library-title">Nocturne Tape</span>
							<span className="Library-artist">Olafur Arnalds</span>
						</div>
					</div>
					<span className="Library-duration">02:58</span>
				</li>

				<li className="Library-item">
					<div className="Library-left">
						<div className="Library-index">
							<span>8</span>
						</div>
						<div className="Library-meta">
							<span className="Library-title">Velvet Horizon</span>
							<span className="Library-artist">Moderat</span>
						</div>
					</div>
					<span className="Library-duration">04:47</span>
				</li>
			</ul>
		</main>
	);
}

export default MainPage;
