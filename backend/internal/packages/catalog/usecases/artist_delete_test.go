//go:build tests

package usecases

import (
	"testing"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestCatalogUsecases_DeleteArtist(t *testing.T) {
	t.Parallel()

	t.Run("ok: unused artist is deleted under an update lock", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)
		artist := buildArtist()

		d.timeProvider.EXPECT().Now().Return(testNow()).Once()
		d.repo.EXPECT().GetArtist(mock.Anything, dto.GetArtistQuery{ID: artist.ID(), Lock: dto.LockUpdate}).
			Return(dto.GetArtistResult{Result: artist}, nil).Once()
		d.repo.EXPECT().CountArtistUsage(mock.Anything, dto.CountArtistUsageQuery{ID: artist.ID()}).
			Return(dto.CountArtistUsageResult{}, nil).Once()
		d.repo.EXPECT().DeleteArtist(mock.Anything, dto.DeleteArtistCommand{ID: artist.ID(), DeletedAt: testNow()}).
			Return(nil).Once()

		require.NoError(t, newUsecase(d).DeleteArtist(t.Context(), DeleteArtistIn{ID: artist.ID()}))
	})

	for name, usage := range map[string]dto.CountArtistUsageResult{
		"error: artist has albums":       {Albums: 1},
		"error: artist is feat on track": {Tracks: 1},
	} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			d := newDeps(t)
			artist := buildArtist()

			d.timeProvider.EXPECT().Now().Return(testNow()).Once()
			d.repo.EXPECT().GetArtist(mock.Anything, mock.Anything).Return(dto.GetArtistResult{Result: artist}, nil).Once()
			d.repo.EXPECT().CountArtistUsage(mock.Anything, mock.Anything).Return(usage, nil).Once()

			err := newUsecase(d).DeleteArtist(t.Context(), DeleteArtistIn{ID: artist.ID()})
			require.ErrorIs(t, err, ErrArtistInUse)
		})
	}

	t.Run("error: not found", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)

		d.timeProvider.EXPECT().Now().Return(testNow()).Once()
		d.repo.EXPECT().GetArtist(mock.Anything, mock.Anything).Return(dto.GetArtistResult{}, ErrArtistNotFound).Once()

		err := newUsecase(d).DeleteArtist(t.Context(), DeleteArtistIn{ID: uuid.New()})
		require.ErrorIs(t, err, ErrArtistNotFound)
	})
}
