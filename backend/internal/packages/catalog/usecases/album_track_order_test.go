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

func TestCatalogUsecases_SetAlbumTrackOrder(t *testing.T) {
	t.Parallel()

	setup := func(t *testing.T) (*deps, *models.Album, []*models.Track) {
		d := newDeps(t)
		album := buildAlbum(nil)
		tracks := []*models.Track{
			buildTrack(album.ID(), 1, 1, models.TrackStatusDraft),
			buildTrack(album.ID(), 1, 2, models.TrackStatusDraft),
		}

		d.timeProvider.EXPECT().Now().Return(testNow()).Once()
		d.repo.EXPECT().GetAlbum(mock.Anything, dto.GetAlbumQuery{ID: album.ID(), Lock: dto.LockUpdate}).
			Return(dto.GetAlbumResult{Result: album}, nil).Once()
		d.repo.EXPECT().ListAlbumTracks(mock.Anything, mock.Anything).
			Return(dto.ListAlbumTracksResult{Items: tracks}, nil).Once()

		return d, album, tracks
	}

	t.Run("ok: swaps two tracks", func(t *testing.T) {
		t.Parallel()

		d, album, tracks := setup(t)
		items := []models.TrackPosition{
			{TrackID: tracks[0].ID(), DiscNo: 1, TrackNo: 2},
			{TrackID: tracks[1].ID(), DiscNo: 1, TrackNo: 1},
		}

		d.repo.EXPECT().SetTrackPositions(mock.Anything, dto.SetTrackPositionsCommand{Items: items, UpdatedAt: testNow()}).
			Return(nil).Once()
		d.repo.EXPECT().GetAlbum(mock.Anything, dto.GetAlbumQuery{ID: album.ID(), Lock: dto.LockNone}).
			Return(dto.GetAlbumResult{Result: album}, nil).Once()
		d.repo.EXPECT().ListAlbumTracks(mock.Anything, mock.Anything).
			Return(dto.ListAlbumTracksResult{Items: tracks}, nil).Once()

		_, err := newUsecase(d).SetAlbumTrackOrder(t.Context(), SetAlbumTrackOrderIn{AlbumID: album.ID(), Items: items})
		require.NoError(t, err)
	})

	t.Run("error: a track is missing from the order", func(t *testing.T) {
		t.Parallel()

		d, album, tracks := setup(t)

		_, err := newUsecase(d).SetAlbumTrackOrder(t.Context(), SetAlbumTrackOrderIn{
			AlbumID: album.ID(),
			Items:   []models.TrackPosition{{TrackID: tracks[0].ID(), DiscNo: 1, TrackNo: 1}},
		})
		require.ErrorIs(t, err, ErrValidation)
	})

	t.Run("error: a track from another album", func(t *testing.T) {
		t.Parallel()

		d, album, tracks := setup(t)

		_, err := newUsecase(d).SetAlbumTrackOrder(t.Context(), SetAlbumTrackOrderIn{
			AlbumID: album.ID(),
			Items: []models.TrackPosition{
				{TrackID: tracks[0].ID(), DiscNo: 1, TrackNo: 1},
				{TrackID: uuid.New(), DiscNo: 1, TrackNo: 2},
			},
		})
		require.ErrorIs(t, err, ErrValidation)
	})

	invalid := map[string][]models.TrackPosition{
		"same position twice":   {{TrackID: uuid.New(), DiscNo: 1, TrackNo: 1}, {TrackID: uuid.New(), DiscNo: 1, TrackNo: 1}},
		"same track twice":      {{TrackID: uuid.UUID{1}, DiscNo: 1, TrackNo: 1}, {TrackID: uuid.UUID{1}, DiscNo: 1, TrackNo: 2}},
		"zero track number":     {{TrackID: uuid.New(), DiscNo: 1, TrackNo: 0}},
		"zero disc number":      {{TrackID: uuid.New(), DiscNo: 0, TrackNo: 1}},
		"number above smallint": {{TrackID: uuid.New(), DiscNo: 1, TrackNo: positionMax + 1}},
	}

	for name, items := range invalid {
		t.Run("error: "+name, func(t *testing.T) {
			t.Parallel()

			_, err := newUsecase(newDeps(t)).SetAlbumTrackOrder(t.Context(), SetAlbumTrackOrderIn{AlbumID: uuid.New(), Items: items})
			require.ErrorIs(t, err, ErrValidation)
		})
	}
}
