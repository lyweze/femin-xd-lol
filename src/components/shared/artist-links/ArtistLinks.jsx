import { Link } from "react-router-dom";

/**
 * Список ссылок на страницы исполнителей, разделённый запятой.
 */
function ArtistLinks({
	artists = [],
	linkClassName,
	onArtistClick,
}) {
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
