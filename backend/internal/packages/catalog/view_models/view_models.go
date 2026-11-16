package view_models

import (
	"time"

	"github.com/google/uuid"
)

// Image ссылки на картинку в трёх размерах.
type Image struct {
	SmallURL  string
	MediumURL string
	LargeURL  string
}

type ArtistRef struct {
	ID   uuid.UUID
	Name string
}

type Artist struct {
	ID        uuid.UUID
	Name      string
	Bio       string
	Avatar    *Image
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Album struct {
	ID          uuid.UUID
	Title       string
	Type        string
	ReleaseDate *time.Time
	Cover       *Image
	Artists     []ArtistRef
	TrackCount  int
	PublishedAt *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type TrackArtist struct {
	ID   uuid.UUID
	Name string
	Role string
}

type TrackFile struct {
	Kind        string
	Format      string
	BitrateKbps *int
	SizeBytes   int64
}

type Track struct {
	ID              uuid.UUID
	AlbumID         uuid.UUID
	Title           string
	DiscNo          int
	TrackNo         int
	DurationMs      *int
	Explicit        bool
	Status          string
	ProcessingError *string
	Artists         []TrackArtist
	Files           []TrackFile
	LyricsLanguages []string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}
