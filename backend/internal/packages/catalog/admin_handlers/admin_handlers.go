package admin_handlers

import (
	"errors"
	"time"

	g "github.com/lyweze/femin-xd-lol/backend/gen/serveradminhttp"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/view_models"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// AdminCatalogHandlers методы каталога из админского API. Полный
// StrictServerInterface проверяет фасад в internal/httpserver.
type AdminCatalogHandlers struct {
	usecases *usecases.CatalogUsecases
}

type NewArgs struct {
	Usecases *usecases.CatalogUsecases
}

func New(args *NewArgs) *AdminCatalogHandlers {
	return &AdminCatalogHandlers{
		usecases: args.Usecases,
	}
}

func validationError(err error) g.ValidationErrorJSONResponse {
	return g.ValidationErrorJSONResponse{Code: g.VALIDATIONERROR, Message: new(err.Error())}
}

func notFound() g.NotFoundErrorJSONResponse {
	return g.NotFoundErrorJSONResponse{Code: g.NOTFOUND}
}

// conflict отдаёт админу причину целиком: по ней в админке понятно, что исправить.
func conflict(err error) g.ConflictErrorJSONResponse {
	return g.ConflictErrorJSONResponse{Code: g.CONFLICT, Message: new(err.Error())}
}

func isValidation(err error) bool {
	return errors.Is(err, usecases.ErrValidation)
}

func pageIn(limit *int, cursor *string) usecases.PageIn {
	return usecases.PageIn{Limit: limit, Cursor: cursor}
}

func dateToTime(d *openapi_types.Date) *time.Time {
	if d == nil {
		return nil
	}

	return new(d.Time)
}

func timeToDate(t *time.Time) *openapi_types.Date {
	if t == nil {
		return nil
	}

	return &openapi_types.Date{Time: *t}
}

func imageToHttp(image *view_models.Image) *g.Image {
	if image == nil {
		return nil
	}

	return &g.Image{SmallUrl: image.SmallURL, MediumUrl: image.MediumURL, LargeUrl: image.LargeURL}
}

func artistToHttp(artist view_models.Artist) g.AdminArtist {
	return g.AdminArtist{
		Id:        artist.ID,
		Name:      artist.Name,
		Bio:       artist.Bio,
		Avatar:    imageToHttp(artist.Avatar),
		CreatedAt: artist.CreatedAt,
		UpdatedAt: artist.UpdatedAt,
	}
}

func albumToHttp(album view_models.Album) g.AdminAlbum {
	artists := make([]g.ArtistRef, 0, len(album.Artists))
	for _, artist := range album.Artists {
		artists = append(artists, g.ArtistRef{Id: artist.ID, Name: artist.Name})
	}

	return g.AdminAlbum{
		Id:          album.ID,
		Title:       album.Title,
		Type:        g.AlbumType(album.Type),
		ReleaseDate: timeToDate(album.ReleaseDate),
		Cover:       imageToHttp(album.Cover),
		Artists:     artists,
		TrackCount:  album.TrackCount,
		PublishedAt: album.PublishedAt,
		CreatedAt:   album.CreatedAt,
		UpdatedAt:   album.UpdatedAt,
	}
}

func trackToHttp(track view_models.Track) g.AdminTrack {
	artists := make([]g.AdminTrackArtist, 0, len(track.Artists))
	for _, artist := range track.Artists {
		artists = append(artists, g.AdminTrackArtist{Id: artist.ID, Name: artist.Name, Role: g.TrackArtistRole(artist.Role)})
	}

	files := make([]g.AdminTrackFile, 0, len(track.Files))
	for _, file := range track.Files {
		files = append(files, g.AdminTrackFile{
			Kind:        g.TrackFileKind(file.Kind),
			Format:      file.Format,
			BitrateKbps: file.BitrateKbps,
			SizeBytes:   file.SizeBytes,
		})
	}

	return g.AdminTrack{
		Id:              track.ID,
		AlbumId:         track.AlbumID,
		Title:           track.Title,
		DiscNo:          track.DiscNo,
		TrackNo:         track.TrackNo,
		DurationMs:      track.DurationMs,
		Explicit:        track.Explicit,
		Status:          g.TrackStatus(track.Status),
		ProcessingError: track.ProcessingError,
		Artists:         artists,
		Files:           files,
		LyricsLanguages: track.LyricsLanguages,
		CreatedAt:       track.CreatedAt,
		UpdatedAt:       track.UpdatedAt,
	}
}

func albumWithTracksToHttp(out usecases.GetAlbumOut) g.AdminGetAlbum200Reply {
	tracks := make([]g.AdminTrack, 0, len(out.Tracks))
	for _, track := range out.Tracks {
		tracks = append(tracks, trackToHttp(track))
	}

	return g.AdminGetAlbum200Reply{Album: albumToHttp(out.Album), Tracks: tracks}
}

func trackArtistsFromHttp(in []g.AdminTrackArtistInput) []models.TrackArtistInput {
	out := make([]models.TrackArtistInput, 0, len(in))
	for _, artist := range in {
		out = append(out, models.TrackArtistInput{ArtistID: artist.ArtistId, Role: models.TrackArtistRole(artist.Role)})
	}

	return out
}
