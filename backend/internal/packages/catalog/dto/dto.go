package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/models"
)

// Lock режим блокировки строки при чтении внутри транзакции.
type Lock int

const (
	LockNone Lock = iota
	// LockShare не даёт удалить строку, но позволяет читать её параллельно.
	LockShare
	// LockUpdate для изменения строки.
	LockUpdate
)

// Page общие параметры курсорной пагинации: AfterID это id последней строки прошлой страницы.
type Page struct {
	AfterID *uuid.UUID
	Limit   int
}

// Artists

type ListArtistsQuery struct {
	Search *string
	Page   Page
}

type ListArtistsResult struct {
	Items []*models.Artist
}

type GetArtistQuery struct {
	ID   uuid.UUID
	Lock Lock
}

type GetArtistResult struct {
	Result *models.Artist
}

type GetArtistsQuery struct {
	IDs  []uuid.UUID
	Lock Lock
}

type GetArtistsResult struct {
	Items []*models.Artist
}

type CreateArtistCommand struct {
	ID        uuid.UUID
	Name      string
	Bio       string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type CreateArtistResult struct {
	Result *models.Artist
}

type UpdateArtistCommand struct {
	ID        uuid.UUID
	Name      *string
	Bio       *string
	UpdatedAt time.Time
}

type UpdateArtistResult struct {
	Result *models.Artist
}

type CountArtistUsageQuery struct {
	ID uuid.UUID
}

type CountArtistUsageResult struct {
	Albums int
	Tracks int
}

type DeleteArtistCommand struct {
	ID        uuid.UUID
	DeletedAt time.Time
}

// Albums

type ListAlbumsQuery struct {
	Search   *string
	ArtistID *uuid.UUID
	Page     Page
}

type ListAlbumsResult struct {
	Items []*models.Album
}

type GetAlbumQuery struct {
	ID   uuid.UUID
	Lock Lock
}

type GetAlbumResult struct {
	Result *models.Album
}

type CreateAlbumCommand struct {
	ID          uuid.UUID
	Title       string
	Type        models.AlbumType
	ReleaseDate *time.Time
	ArtistIDs   []uuid.UUID
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type CreateAlbumResult struct {
	Result *models.Album
}

type UpdateAlbumCommand struct {
	ID          uuid.UUID
	Title       *string
	Type        *models.AlbumType
	ReleaseDate *time.Time
	ArtistIDs   *[]uuid.UUID
	UpdatedAt   time.Time
}

type UpdateAlbumResult struct {
	Result *models.Album
}

type SetAlbumPublishedAtCommand struct {
	ID          uuid.UUID
	PublishedAt *time.Time
	UpdatedAt   time.Time
}

type SetAlbumPublishedAtResult struct {
	Result *models.Album
}

// DeleteAlbumCommand удаляет альбом вместе с его треками.
type DeleteAlbumCommand struct {
	ID        uuid.UUID
	DeletedAt time.Time
}

// Tracks

type ListTracksQuery struct {
	Search  *string
	AlbumID *uuid.UUID
	Status  *models.TrackStatus
	Page    Page
}

type ListTracksResult struct {
	Items []*models.Track
}

type ListAlbumTracksQuery struct {
	AlbumID uuid.UUID
}

type ListAlbumTracksResult struct {
	Items []*models.Track
}

type GetTrackQuery struct {
	ID   uuid.UUID
	Lock Lock
}

type GetTrackResult struct {
	Result *models.Track
}

type CreateTrackCommand struct {
	ID        uuid.UUID
	AlbumID   uuid.UUID
	Title     string
	DiscNo    int
	TrackNo   int
	Explicit  bool
	Artists   []models.TrackArtistInput
	CreatedAt time.Time
	UpdatedAt time.Time
}

type CreateTrackResult struct {
	Result *models.Track
}

type UpdateTrackCommand struct {
	ID        uuid.UUID
	Title     *string
	Explicit  *bool
	Artists   *[]models.TrackArtistInput
	UpdatedAt time.Time
}

type UpdateTrackResult struct {
	Result *models.Track
}

type SetTrackPositionsCommand struct {
	Items     []models.TrackPosition
	UpdatedAt time.Time
}

type DeleteTrackCommand struct {
	ID        uuid.UUID
	DeletedAt time.Time
}
