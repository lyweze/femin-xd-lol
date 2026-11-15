//go:build tests

package usecases

import (
	"testing"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestCatalogUsecases_UpdateAlbum(t *testing.T) {
	t.Parallel()

	t.Run("ok: artists are not checked when not changed", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)
		album := buildAlbum(nil)

		d.timeProvider.EXPECT().Now().Return(testNow()).Once()
		d.repo.EXPECT().GetAlbum(mock.Anything, dto.GetAlbumQuery{ID: album.ID(), Lock: dto.LockUpdate}).
			Return(dto.GetAlbumResult{Result: album}, nil).Once()
		d.repo.EXPECT().UpdateAlbum(mock.Anything, dto.UpdateAlbumCommand{
			ID:        album.ID(),
			Title:     new("New"),
			UpdatedAt: testNow(),
		}).Return(dto.UpdateAlbumResult{Result: album}, nil).Once()

		_, err := newUsecase(d).UpdateAlbum(t.Context(), UpdateAlbumIn{ID: album.ID(), Title: new("New")})
		require.NoError(t, err)
	})

	t.Run("error: empty artist list", func(t *testing.T) {
		t.Parallel()

		_, err := newUsecase(newDeps(t)).UpdateAlbum(t.Context(), UpdateAlbumIn{ID: uuid.New(), ArtistIDs: &[]uuid.UUID{}})
		require.ErrorIs(t, err, ErrValidation)
	})

	t.Run("error: empty title", func(t *testing.T) {
		t.Parallel()

		_, err := newUsecase(newDeps(t)).UpdateAlbum(t.Context(), UpdateAlbumIn{ID: uuid.New(), Title: new(" ")})
		require.ErrorIs(t, err, ErrValidation)
	})

	t.Run("error: not found", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		d.timeProvider.EXPECT().Now().Return(testNow()).Once()
		d.repo.EXPECT().GetAlbum(mock.Anything, mock.Anything).Return(dto.GetAlbumResult{}, ErrAlbumNotFound).Once()

		_, err := newUsecase(d).UpdateAlbum(t.Context(), UpdateAlbumIn{ID: uuid.New(), Title: new("New")})
		require.ErrorIs(t, err, ErrAlbumNotFound)
	})
}
