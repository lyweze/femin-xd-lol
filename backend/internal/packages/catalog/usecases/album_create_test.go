//go:build tests

package usecases

import (
	"testing"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/models"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestCatalogUsecases_CreateAlbum(t *testing.T) {
	t.Parallel()

	t.Run("ok: locks artists for share and keeps their order", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		d := newDeps(t)

		first, second := buildArtist(), buildArtist()
		ids := []uuid.UUID{second.ID(), first.ID()}
		album := buildAlbum(nil)

		d.timeProvider.EXPECT().Now().Return(testNow()).Once()
		d.uuidProvider.EXPECT().New().Return(album.ID()).Once()
		d.repo.EXPECT().GetArtists(mock.Anything, dto.GetArtistsQuery{IDs: ids, Lock: dto.LockShare}).
			Return(dto.GetArtistsResult{Items: []*models.Artist{first, second}}, nil).Once()
		d.repo.EXPECT().CreateAlbum(mock.Anything, dto.CreateAlbumCommand{
			ID:        album.ID(),
			Title:     "Xd",
			Type:      models.AlbumTypeEP,
			ArtistIDs: ids,
			CreatedAt: testNow(),
			UpdatedAt: testNow(),
		}).Return(dto.CreateAlbumResult{Result: album}, nil).Once()

		out, err := newUsecase(d).CreateAlbum(t.Context(), CreateAlbumIn{Title: " Xd ", Type: models.AlbumTypeEP, ArtistIDs: ids})
		r.NoError(err)
		r.Equal(album.ID(), out.Album.ID)
	})

	t.Run("error: unknown artist is a validation error", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		d := newDeps(t)

		known, unknown := buildArtist(), uuid.New()

		d.timeProvider.EXPECT().Now().Return(testNow()).Once()
		d.repo.EXPECT().GetArtists(mock.Anything, mock.Anything).
			Return(dto.GetArtistsResult{Items: []*models.Artist{known}}, nil).Once()

		_, err := newUsecase(d).CreateAlbum(t.Context(), CreateAlbumIn{
			Title:     "Xd",
			Type:      models.AlbumTypeAlbum,
			ArtistIDs: []uuid.UUID{known.ID(), unknown},
		})
		r.ErrorIs(err, ErrValidation)
		r.ErrorContains(err, unknown.String())
	})

	validation := map[string]CreateAlbumIn{
		"empty title":      {Title: "  ", Type: models.AlbumTypeAlbum, ArtistIDs: []uuid.UUID{uuid.New()}},
		"unknown type":     {Title: "Xd", Type: "mixtape", ArtistIDs: []uuid.UUID{uuid.New()}},
		"no artists":       {Title: "Xd", Type: models.AlbumTypeAlbum},
		"duplicate artist": {Title: "Xd", Type: models.AlbumTypeAlbum, ArtistIDs: []uuid.UUID{{1}, {1}}},
	}

	for name, in := range validation {
		t.Run("error: "+name, func(t *testing.T) {
			t.Parallel()

			_, err := newUsecase(newDeps(t)).CreateAlbum(t.Context(), in)
			require.ErrorIs(t, err, ErrValidation)
		})
	}
}
