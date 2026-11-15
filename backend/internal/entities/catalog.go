package entities

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type Artist struct {
	ID        uuid.UUID        `db:"id"`
	Name      string           `db:"name"`
	Bio       string           `db:"bio"`
	AvatarKey sql.Null[string] `db:"avatar_key"`

	CreatedAt time.Time           `db:"created_at"`
	UpdatedAt time.Time           `db:"updated_at"`
	DeletedAt sql.Null[time.Time] `db:"deleted_at"`
}

const (
	ArtistTableName = "artists"

	ArtistIDCol        = "id"
	ArtistNameCol      = "name"
	ArtistBioCol       = "bio"
	ArtistAvatarKeyCol = "avatar_key"
	ArtistCreatedAtCol = "created_at"
	ArtistUpdatedAtCol = "updated_at"
	ArtistDeletedAtCol = "deleted_at"
)

var ArtistCols = []string{ //nolint:gochecknoglobals
	ArtistIDCol,
	ArtistNameCol,
	ArtistBioCol,
	ArtistAvatarKeyCol,
	ArtistCreatedAtCol,
	ArtistUpdatedAtCol,
	ArtistDeletedAtCol,
}

type Album struct {
	ID          uuid.UUID           `db:"id"`
	Title       string              `db:"title"`
	Type        string              `db:"type"`
	ReleaseDate sql.Null[time.Time] `db:"release_date"`
	CoverKey    sql.Null[string]    `db:"cover_key"`
	PublishedAt sql.Null[time.Time] `db:"published_at"`

	CreatedAt time.Time           `db:"created_at"`
	UpdatedAt time.Time           `db:"updated_at"`
	DeletedAt sql.Null[time.Time] `db:"deleted_at"`
}

const (
	AlbumTableName = "albums"

	AlbumIDCol          = "id"
	AlbumTitleCol       = "title"
	AlbumTypeCol        = "type"
	AlbumReleaseDateCol = "release_date"
	AlbumCoverKeyCol    = "cover_key"
	AlbumPublishedAtCol = "published_at"
	AlbumCreatedAtCol   = "created_at"
	AlbumUpdatedAtCol   = "updated_at"
	AlbumDeletedAtCol   = "deleted_at"
)

var AlbumCols = []string{ //nolint:gochecknoglobals
	AlbumIDCol,
	AlbumTitleCol,
	AlbumTypeCol,
	AlbumReleaseDateCol,
	AlbumCoverKeyCol,
	AlbumPublishedAtCol,
	AlbumCreatedAtCol,
	AlbumUpdatedAtCol,
	AlbumDeletedAtCol,
}

const (
	AlbumArtistTableName = "album_artists"

	AlbumArtistAlbumIDCol  = "album_id"
	AlbumArtistArtistIDCol = "artist_id"
	AlbumArtistPositionCol = "position"
)

type Track struct {
	ID              uuid.UUID        `db:"id"`
	AlbumID         uuid.UUID        `db:"album_id"`
	Title           string           `db:"title"`
	DiscNo          int              `db:"disc_no"`
	TrackNo         int              `db:"track_no"`
	DurationMs      sql.Null[int]    `db:"duration_ms"`
	Explicit        bool             `db:"explicit"`
	Status          string           `db:"status"`
	ProcessingError sql.Null[string] `db:"processing_error"`

	CreatedAt time.Time           `db:"created_at"`
	UpdatedAt time.Time           `db:"updated_at"`
	DeletedAt sql.Null[time.Time] `db:"deleted_at"`
}

const (
	TrackTableName = "tracks"

	TrackIDCol              = "id"
	TrackAlbumIDCol         = "album_id"
	TrackTitleCol           = "title"
	TrackDiscNoCol          = "disc_no"
	TrackTrackNoCol         = "track_no"
	TrackDurationMsCol      = "duration_ms"
	TrackExplicitCol        = "explicit"
	TrackStatusCol          = "status"
	TrackProcessingErrorCol = "processing_error"
	TrackCreatedAtCol       = "created_at"
	TrackUpdatedAtCol       = "updated_at"
	TrackDeletedAtCol       = "deleted_at"
)

var TrackCols = []string{ //nolint:gochecknoglobals
	TrackIDCol,
	TrackAlbumIDCol,
	TrackTitleCol,
	TrackDiscNoCol,
	TrackTrackNoCol,
	TrackDurationMsCol,
	TrackExplicitCol,
	TrackStatusCol,
	TrackProcessingErrorCol,
	TrackCreatedAtCol,
	TrackUpdatedAtCol,
	TrackDeletedAtCol,
}

const (
	TrackArtistTableName = "track_artists"

	TrackArtistTrackIDCol  = "track_id"
	TrackArtistArtistIDCol = "artist_id"
	TrackArtistRoleCol     = "role"
	TrackArtistPositionCol = "position"
)

const (
	TrackFileTableName = "track_files"
	LyricsTableName    = "lyrics"
)
