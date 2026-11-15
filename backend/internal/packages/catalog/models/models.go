package models

import "github.com/google/uuid"

type AlbumType string

const (
	AlbumTypeAlbum       AlbumType = "album"
	AlbumTypeEP          AlbumType = "ep"
	AlbumTypeSingle      AlbumType = "single"
	AlbumTypeCompilation AlbumType = "compilation"
)

type TrackStatus string

const (
	// TrackStatusDraft карточка без аудио.
	TrackStatusDraft TrackStatus = "draft"
	// TrackStatusProcessing аудио загружено, его обрабатывает worker.
	TrackStatusProcessing TrackStatus = "processing"
	// TrackStatusReady трек можно слушать.
	TrackStatusReady TrackStatus = "ready"
	// TrackStatusFailed обработка упала, причина в ProcessingError.
	TrackStatusFailed TrackStatus = "failed"
)

type TrackArtistRole string

const (
	TrackArtistRoleMain TrackArtistRole = "main"
	TrackArtistRoleFeat TrackArtistRole = "feat"
)

type TrackFileKind string

const (
	// TrackFileKindSource исходник, нужен для повторной обработки.
	TrackFileKindSource TrackFileKind = "source"
	// TrackFileKindStream то, что отдаётся слушателям.
	TrackFileKindStream TrackFileKind = "stream"
)

type ArtistRef struct {
	ID   uuid.UUID
	Name string
}

type TrackArtist struct {
	ID   uuid.UUID
	Name string
	Role TrackArtistRole
}

type TrackArtistInput struct {
	ArtistID uuid.UUID
	Role     TrackArtistRole
}

type TrackFile struct {
	Kind        TrackFileKind
	Format      string
	BitrateKbps *int
	SizeBytes   int64
}

type TrackPosition struct {
	TrackID uuid.UUID
	DiscNo  int
	TrackNo int
}
