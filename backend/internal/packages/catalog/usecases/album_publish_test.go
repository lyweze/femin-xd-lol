//go:build tests

package usecases

import (
	"testing"
	"time"

	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/models"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestCatalogUsecases_PublishAlbum(t *testing.T) {
	t.Parallel()

	cover := new("covers/album")

	t.Run("ok: publishes now by default", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)
		album := buildAlbum(cover)
		track := buildTrack(album.ID(), 1, 1, models.TrackStatusReady)

		d.timeProvider.EXPECT().Now().Return(testNow()).Once()
		d.repo.EXPECT().GetAlbum(mock.Anything, dto.GetAlbumQuery{ID: album.ID(), Lock: dto.LockUpdate}).
			Return(dto.GetAlbumResult{Result: album}, nil).Once()
		d.repo.EXPECT().ListAlbumTracks(mock.Anything, dto.ListAlbumTracksQuery{AlbumID: album.ID()}).
			Return(dto.ListAlbumTracksResult{Items: []*models.Track{track}}, nil).Once()
		d.repo.EXPECT().SetAlbumPublishedAt(mock.Anything, dto.SetAlbumPublishedAtCommand{
			ID:          album.ID(),
			PublishedAt: new(testNow()),
			UpdatedAt:   testNow(),
		}).Return(dto.SetAlbumPublishedAtResult{Result: album}, nil).Once()

		_, err := newUsecase(d).PublishAlbum(t.Context(), PublishAlbumIn{ID: album.ID()})
		require.NoError(t, err)
	})

	t.Run("ok: date in the future schedules the release", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)
		album := buildAlbum(cover)
		releaseAt := testNow().Add(7 * 24 * time.Hour)

		d.timeProvider.EXPECT().Now().Return(testNow()).Once()
		d.repo.EXPECT().GetAlbum(mock.Anything, mock.Anything).Return(dto.GetAlbumResult{Result: album}, nil).Once()
		d.repo.EXPECT().ListAlbumTracks(mock.Anything, mock.Anything).
			Return(dto.ListAlbumTracksResult{Items: []*models.Track{buildTrack(album.ID(), 1, 1, models.TrackStatusReady)}}, nil).Once()
		d.repo.EXPECT().SetAlbumPublishedAt(mock.Anything, dto.SetAlbumPublishedAtCommand{
			ID:          album.ID(),
			PublishedAt: &releaseAt,
			UpdatedAt:   testNow(),
		}).Return(dto.SetAlbumPublishedAtResult{Result: album}, nil).Once()

		_, err := newUsecase(d).PublishAlbum(t.Context(), PublishAlbumIn{ID: album.ID(), PublishedAt: &releaseAt})
		require.NoError(t, err)
	})

	notPublishable := map[string]struct {
		cover  *string
		tracks []models.TrackStatus
		reason string
	}{
		"no cover":          {nil, []models.TrackStatus{models.TrackStatusReady}, "no cover"},
		"no tracks":         {cover, nil, "no tracks"},
		"track still draft": {cover, []models.TrackStatus{models.TrackStatusReady, models.TrackStatusDraft}, "draft"},
		"track failed":      {cover, []models.TrackStatus{models.TrackStatusFailed}, "failed"},
		"track in progress": {cover, []models.TrackStatus{models.TrackStatusProcessing}, "processing"},
	}

	for name, tc := range notPublishable {
		t.Run("error: "+name, func(t *testing.T) {
			t.Parallel()

			r := require.New(t)
			d := newDeps(t)
			album := buildAlbum(tc.cover)

			tracks := make([]*models.Track, 0, len(tc.tracks))
			for i, status := range tc.tracks {
				tracks = append(tracks, buildTrack(album.ID(), 1, i+1, status))
			}

			d.timeProvider.EXPECT().Now().Return(testNow()).Once()
			d.repo.EXPECT().GetAlbum(mock.Anything, mock.Anything).Return(dto.GetAlbumResult{Result: album}, nil).Once()
			d.repo.EXPECT().ListAlbumTracks(mock.Anything, mock.Anything).
				Return(dto.ListAlbumTracksResult{Items: tracks}, nil).Once()

			_, err := newUsecase(d).PublishAlbum(t.Context(), PublishAlbumIn{ID: album.ID()})
			r.ErrorIs(err, ErrAlbumNotPublishable)
			r.ErrorContains(err, tc.reason)
		})
	}
}
