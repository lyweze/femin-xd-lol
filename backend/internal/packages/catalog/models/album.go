package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/pkg/opt"
)

// Album релиз: альбом, EP, сингл или сборник. Публикуется целиком.
type Album struct {
	id uuid.UUID

	title       opt.Optional[string]
	albumType   opt.Optional[AlbumType]
	releaseDate opt.Optional[*time.Time]
	coverKey    opt.Optional[*string]
	publishedAt opt.Optional[*time.Time]
	artists     opt.Optional[[]ArtistRef]
	trackCount  opt.Optional[int]
	createdAt   opt.Optional[time.Time]
	updatedAt   opt.Optional[time.Time]
}

func NewAlbum(id uuid.UUID) *Album {
	return &Album{ //nolint:exhaustruct
		id: id,
	}
}

func (m *Album) ID() uuid.UUID {
	return m.id
}

func (m *Album) Title() string {
	return m.title.MustGet()
}

func (m *Album) SetTitle(title string) {
	m.title = opt.New(title)
}

func (m *Album) Type() AlbumType {
	return m.albumType.MustGet()
}

func (m *Album) SetType(albumType AlbumType) {
	m.albumType = opt.New(albumType)
}

func (m *Album) ReleaseDate() *time.Time {
	return m.releaseDate.MustGet()
}

func (m *Album) SetReleaseDate(releaseDate *time.Time) {
	m.releaseDate = opt.New(releaseDate)
}

func (m *Album) CoverKey() *string {
	return m.coverKey.MustGet()
}

func (m *Album) SetCoverKey(coverKey *string) {
	m.coverKey = opt.New(coverKey)
}

func (m *Album) PublishedAt() *time.Time {
	return m.publishedAt.MustGet()
}

func (m *Album) SetPublishedAt(publishedAt *time.Time) {
	m.publishedAt = opt.New(publishedAt)
}

func (m *Album) Artists() []ArtistRef {
	return m.artists.MustGet()
}

func (m *Album) SetArtists(artists []ArtistRef) {
	m.artists = opt.New(artists)
}

func (m *Album) TrackCount() int {
	return m.trackCount.MustGet()
}

func (m *Album) SetTrackCount(trackCount int) {
	m.trackCount = opt.New(trackCount)
}

func (m *Album) CreatedAt() time.Time {
	return m.createdAt.MustGet()
}

func (m *Album) SetCreatedAt(createdAt time.Time) {
	m.createdAt = opt.New(createdAt)
}

func (m *Album) UpdatedAt() time.Time {
	return m.updatedAt.MustGet()
}

func (m *Album) SetUpdatedAt(updatedAt time.Time) {
	m.updatedAt = opt.New(updatedAt)
}
