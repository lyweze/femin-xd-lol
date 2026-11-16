package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/pkg/opt"
)

// Track трек альбома.
type Track struct {
	id uuid.UUID

	albumID         opt.Optional[uuid.UUID]
	title           opt.Optional[string]
	discNo          opt.Optional[int]
	trackNo         opt.Optional[int]
	durationMs      opt.Optional[*int]
	explicit        opt.Optional[bool]
	status          opt.Optional[TrackStatus]
	processingError opt.Optional[*string]
	artists         opt.Optional[[]TrackArtist]
	files           opt.Optional[[]TrackFile]
	lyricsLanguages opt.Optional[[]string]
	createdAt       opt.Optional[time.Time]
	updatedAt       opt.Optional[time.Time]
}

func NewTrack(id uuid.UUID) *Track {
	return &Track{ //nolint:exhaustruct
		id: id,
	}
}

func (m *Track) ID() uuid.UUID {
	return m.id
}

func (m *Track) AlbumID() uuid.UUID {
	return m.albumID.MustGet()
}

func (m *Track) SetAlbumID(albumID uuid.UUID) {
	m.albumID = opt.New(albumID)
}

func (m *Track) Title() string {
	return m.title.MustGet()
}

func (m *Track) SetTitle(title string) {
	m.title = opt.New(title)
}

func (m *Track) DiscNo() int {
	return m.discNo.MustGet()
}

func (m *Track) SetDiscNo(discNo int) {
	m.discNo = opt.New(discNo)
}

func (m *Track) TrackNo() int {
	return m.trackNo.MustGet()
}

func (m *Track) SetTrackNo(trackNo int) {
	m.trackNo = opt.New(trackNo)
}

func (m *Track) DurationMs() *int {
	return m.durationMs.MustGet()
}

func (m *Track) SetDurationMs(durationMs *int) {
	m.durationMs = opt.New(durationMs)
}

func (m *Track) Explicit() bool {
	return m.explicit.MustGet()
}

func (m *Track) SetExplicit(explicit bool) {
	m.explicit = opt.New(explicit)
}

func (m *Track) Status() TrackStatus {
	return m.status.MustGet()
}

func (m *Track) SetStatus(status TrackStatus) {
	m.status = opt.New(status)
}

func (m *Track) ProcessingError() *string {
	return m.processingError.MustGet()
}

func (m *Track) SetProcessingError(processingError *string) {
	m.processingError = opt.New(processingError)
}

func (m *Track) Artists() []TrackArtist {
	return m.artists.MustGet()
}

func (m *Track) SetArtists(artists []TrackArtist) {
	m.artists = opt.New(artists)
}

func (m *Track) Files() []TrackFile {
	return m.files.MustGet()
}

func (m *Track) SetFiles(files []TrackFile) {
	m.files = opt.New(files)
}

func (m *Track) LyricsLanguages() []string {
	return m.lyricsLanguages.MustGet()
}

func (m *Track) SetLyricsLanguages(lyricsLanguages []string) {
	m.lyricsLanguages = opt.New(lyricsLanguages)
}

func (m *Track) CreatedAt() time.Time {
	return m.createdAt.MustGet()
}

func (m *Track) SetCreatedAt(createdAt time.Time) {
	m.createdAt = opt.New(createdAt)
}

func (m *Track) UpdatedAt() time.Time {
	return m.updatedAt.MustGet()
}

func (m *Track) SetUpdatedAt(updatedAt time.Time) {
	m.updatedAt = opt.New(updatedAt)
}
