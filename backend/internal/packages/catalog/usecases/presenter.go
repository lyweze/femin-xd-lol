package usecases

import (
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/view_models"
)

type Presenter struct{}

// image пока всегда nil: ссылки на картинки появятся вместе с хранилищем файлов.
func (p *Presenter) image(_ *string) *view_models.Image {
	return nil
}

func (p *Presenter) Artist(artist *models.Artist) view_models.Artist {
	return view_models.Artist{
		ID:        artist.ID(),
		Name:      artist.Name(),
		Bio:       artist.Bio(),
		Avatar:    p.image(artist.AvatarKey()),
		CreatedAt: artist.CreatedAt(),
		UpdatedAt: artist.UpdatedAt(),
	}
}

func (p *Presenter) Album(album *models.Album) view_models.Album {
	artists := make([]view_models.ArtistRef, 0, len(album.Artists()))
	for _, artist := range album.Artists() {
		artists = append(artists, view_models.ArtistRef{ID: artist.ID, Name: artist.Name})
	}

	return view_models.Album{
		ID:          album.ID(),
		Title:       album.Title(),
		Type:        string(album.Type()),
		ReleaseDate: album.ReleaseDate(),
		Cover:       p.image(album.CoverKey()),
		Artists:     artists,
		TrackCount:  album.TrackCount(),
		PublishedAt: album.PublishedAt(),
		CreatedAt:   album.CreatedAt(),
		UpdatedAt:   album.UpdatedAt(),
	}
}

func (p *Presenter) Track(track *models.Track) view_models.Track {
	artists := make([]view_models.TrackArtist, 0, len(track.Artists()))
	for _, artist := range track.Artists() {
		artists = append(artists, view_models.TrackArtist{ID: artist.ID, Name: artist.Name, Role: string(artist.Role)})
	}

	files := make([]view_models.TrackFile, 0, len(track.Files()))
	for _, file := range track.Files() {
		files = append(files, view_models.TrackFile{
			Kind:        string(file.Kind),
			Format:      file.Format,
			BitrateKbps: file.BitrateKbps,
			SizeBytes:   file.SizeBytes,
		})
	}

	return view_models.Track{
		ID:              track.ID(),
		AlbumID:         track.AlbumID(),
		Title:           track.Title(),
		DiscNo:          track.DiscNo(),
		TrackNo:         track.TrackNo(),
		DurationMs:      track.DurationMs(),
		Explicit:        track.Explicit(),
		Status:          string(track.Status()),
		ProcessingError: track.ProcessingError(),
		Artists:         artists,
		Files:           files,
		LyricsLanguages: append([]string{}, track.LyricsLanguages()...),
		CreatedAt:       track.CreatedAt(),
		UpdatedAt:       track.UpdatedAt(),
	}
}

func (p *Presenter) Artists(items []*models.Artist) []view_models.Artist {
	out := make([]view_models.Artist, 0, len(items))
	for _, item := range items {
		out = append(out, p.Artist(item))
	}

	return out
}

func (p *Presenter) Albums(items []*models.Album) []view_models.Album {
	out := make([]view_models.Album, 0, len(items))
	for _, item := range items {
		out = append(out, p.Album(item))
	}

	return out
}

func (p *Presenter) Tracks(items []*models.Track) []view_models.Track {
	out := make([]view_models.Track, 0, len(items))
	for _, item := range items {
		out = append(out, p.Track(item))
	}

	return out
}
