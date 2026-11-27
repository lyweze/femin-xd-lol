// ============================================================================
// Список кликабельных ссылок на страницы исполнителей (`ArtistLinks`)
// ============================================================================
import { Link } from "react-router-dom";

/**
 * Отображает список артистов через запятую со ссылками на `/artist/:id`.
 */
function ArtistLinks({ artists = [], linkClassName, onArtistClick }) {
	return artists.map((artist, idx) => (
		<span key={artist.id}>
			{idx > 0 && ", "}
			<Link
				to={`/artist/${artist.id}`}
				className={linkClassName}
				onClick={onArtistClick}
			>
				{artist.name}
			</Link>
		</span>
	));
}

export default ArtistLinks;
