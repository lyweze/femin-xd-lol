//go:build tests

package usecases

import (
	"testing"
	"time"

	"github.com/brianvoe/gofakeit/v7"
	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/models"
	mocks "github.com/lyweze/femin-xd-lol/backend/tests/mocks/packages/catalog/usecases"
	"github.com/lyweze/femin-xd-lol/backend/tests/stubs"
)

type deps struct {
	timeProvider *mocks.MockTimeProvider
	uuidProvider *mocks.MockUUIDProvider
	repo         *mocks.MockRepo
}

func newDeps(t *testing.T) *deps {
	return &deps{
		timeProvider: mocks.NewMockTimeProvider(t),
		uuidProvider: mocks.NewMockUUIDProvider(t),
		repo:         mocks.NewMockRepo(t),
	}
}

func newUsecase(d *deps) *CatalogUsecases {
	return New(&NewArgs{
		RepoHandler:  stubs.NewRepoHandlerStub[Repo](d.repo),
		TimeProvider: d.timeProvider,
		UUIDProvider: d.uuidProvider,
	})
}

func testNow() time.Time {
	return time.Date(2026, 11, 15, 12, 0, 0, 0, time.UTC)
}

func buildArtist() *models.Artist {
	artist := models.NewArtist(uuid.Must(uuid.NewV7()))
	artist.SetName(gofakeit.Name())
	artist.SetBio("")
	artist.SetAvatarKey(nil)
	artist.SetCreatedAt(testNow())
	artist.SetUpdatedAt(testNow())

	return artist
}

func buildAlbum(coverKey *string) *models.Album {
	album := models.NewAlbum(uuid.Must(uuid.NewV7()))
	album.SetTitle(gofakeit.Word())
	album.SetType(models.AlbumTypeAlbum)
	album.SetReleaseDate(nil)
	album.SetCoverKey(coverKey)
	album.SetPublishedAt(nil)
	album.SetArtists(nil)
	album.SetTrackCount(0)
	album.SetCreatedAt(testNow())
	album.SetUpdatedAt(testNow())

	return album
}

func buildTrack(albumID uuid.UUID, disc, number int, status models.TrackStatus) *models.Track {
	track := models.NewTrack(uuid.Must(uuid.NewV7()))
	track.SetAlbumID(albumID)
	track.SetTitle(gofakeit.Word())
	track.SetDiscNo(disc)
	track.SetTrackNo(number)
	track.SetDurationMs(nil)
	track.SetExplicit(false)
	track.SetStatus(status)
	track.SetProcessingError(nil)
	track.SetArtists(nil)
	track.SetFiles(nil)
	track.SetLyricsLanguages(nil)
	track.SetCreatedAt(testNow())
	track.SetUpdatedAt(testNow())

	return track
}

func mainArtist(id uuid.UUID) models.TrackArtistInput {
	return models.TrackArtistInput{ArtistID: id, Role: models.TrackArtistRoleMain}
}
