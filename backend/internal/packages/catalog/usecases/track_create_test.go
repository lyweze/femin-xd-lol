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

func TestCatalogUsecases_CreateTrack(t *testing.T) {
	t.Parallel()

	t.Run("ok: locks the album and creates a draft", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		d := newDeps(t)

		album := buildAlbum(nil)
		artist := buildArtist()
		existing := buildTrack(album.ID(), 1, 1, models.TrackStatusReady)
		created := buildTrack(album.ID(), 1, 2, models.TrackStatusDraft)
		artists := []models.TrackArtistInput{mainArtist(artist.ID())}

		d.timeProvider.EXPECT().Now().Return(testNow()).Once()
		d.uuidProvider.EXPECT().New().Return(created.ID()).Once()
		d.repo.EXPECT().GetAlbum(mock.Anything, dto.GetAlbumQuery{ID: album.ID(), Lock: dto.LockUpdate}).
			Return(dto.GetAlbumResult{Result: album}, nil).Once()
		d.repo.EXPECT().ListAlbumTracks(mock.Anything, mock.Anything).
			Return(dto.ListAlbumTracksResult{Items: []*models.Track{existing}}, nil).Once()
		d.repo.EXPECT().GetArtists(mock.Anything, dto.GetArtistsQuery{IDs: []uuid.UUID{artist.ID()}, Lock: dto.LockShare}).
			Return(dto.GetArtistsResult{Items: []*models.Artist{artist}}, nil).Once()
		d.repo.EXPECT().CreateTrack(mock.Anything, dto.CreateTrackCommand{
			ID:        created.ID(),
			AlbumID:   album.ID(),
			Title:     "Lol",
			DiscNo:    1,
			TrackNo:   2,
			Artists:   artists,
			CreatedAt: testNow(),
			UpdatedAt: testNow(),
		}).Return(dto.CreateTrackResult{Result: created}, nil).Once()

		out, err := newUsecase(d).CreateTrack(t.Context(), CreateTrackIn{
			AlbumID: album.ID(), Title: "Lol", DiscNo: 1, TrackNo: 2, Artists: artists,
		})
		r.NoError(err)
		r.Equal("draft", out.Track.Status)
	})

	t.Run("ok: same number on another disc is free", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)
		album := buildAlbum(nil)
		artist := buildArtist()

		d.timeProvider.EXPECT().Now().Return(testNow()).Once()
		d.uuidProvider.EXPECT().New().Return(uuid.New()).Once()
		d.repo.EXPECT().GetAlbum(mock.Anything, mock.Anything).Return(dto.GetAlbumResult{Result: album}, nil).Once()
		d.repo.EXPECT().ListAlbumTracks(mock.Anything, mock.Anything).
			Return(dto.ListAlbumTracksResult{Items: []*models.Track{buildTrack(album.ID(), 1, 1, models.TrackStatusReady)}}, nil).Once()
		d.repo.EXPECT().GetArtists(mock.Anything, mock.Anything).
			Return(dto.GetArtistsResult{Items: []*models.Artist{artist}}, nil).Once()
		d.repo.EXPECT().CreateTrack(mock.Anything, mock.Anything).
			Return(dto.CreateTrackResult{Result: buildTrack(album.ID(), 2, 1, models.TrackStatusDraft)}, nil).Once()

		_, err := newUsecase(d).CreateTrack(t.Context(), CreateTrackIn{
			AlbumID: album.ID(), Title: "Lol", DiscNo: 2, TrackNo: 1, Artists: []models.TrackArtistInput{mainArtist(artist.ID())},
		})
		require.NoError(t, err)
	})

	t.Run("error: position taken", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		d := newDeps(t)
		album := buildAlbum(nil)

		d.timeProvider.EXPECT().Now().Return(testNow()).Once()
		d.repo.EXPECT().GetAlbum(mock.Anything, mock.Anything).Return(dto.GetAlbumResult{Result: album}, nil).Once()
		d.repo.EXPECT().ListAlbumTracks(mock.Anything, mock.Anything).
			Return(dto.ListAlbumTracksResult{Items: []*models.Track{buildTrack(album.ID(), 1, 3, models.TrackStatusDraft)}}, nil).Once()

		_, err := newUsecase(d).CreateTrack(t.Context(), CreateTrackIn{
			AlbumID: album.ID(), Title: "Lol", DiscNo: 1, TrackNo: 3, Artists: []models.TrackArtistInput{mainArtist(uuid.New())},
		})
		r.ErrorIs(err, ErrValidation)
		r.ErrorContains(err, "1-3")
	})

	t.Run("error: unknown album is a validation error, not 404", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)
		d := newDeps(t)

		d.timeProvider.EXPECT().Now().Return(testNow()).Once()
		d.repo.EXPECT().GetAlbum(mock.Anything, mock.Anything).Return(dto.GetAlbumResult{}, ErrAlbumNotFound).Once()

		_, err := newUsecase(d).CreateTrack(t.Context(), CreateTrackIn{
			AlbumID: uuid.New(), Title: "Lol", DiscNo: 1, TrackNo: 1, Artists: []models.TrackArtistInput{mainArtist(uuid.New())},
		})
		r.ErrorIs(err, ErrValidation)
	})

	t.Run("error: unknown artist", func(t *testing.T) {
		t.Parallel()

		d := newDeps(t)
		album := buildAlbum(nil)

		d.timeProvider.EXPECT().Now().Return(testNow()).Once()
		d.repo.EXPECT().GetAlbum(mock.Anything, mock.Anything).Return(dto.GetAlbumResult{Result: album}, nil).Once()
		d.repo.EXPECT().ListAlbumTracks(mock.Anything, mock.Anything).Return(dto.ListAlbumTracksResult{}, nil).Once()
		d.repo.EXPECT().GetArtists(mock.Anything, mock.Anything).Return(dto.GetArtistsResult{}, nil).Once()

		_, err := newUsecase(d).CreateTrack(t.Context(), CreateTrackIn{
			AlbumID: album.ID(), Title: "Lol", DiscNo: 1, TrackNo: 1, Artists: []models.TrackArtistInput{mainArtist(uuid.New())},
		})
		require.ErrorIs(t, err, ErrValidation)
	})

	validation := map[string]CreateTrackIn{
		"empty title":    {AlbumID: uuid.New(), Title: " ", DiscNo: 1, TrackNo: 1, Artists: []models.TrackArtistInput{mainArtist(uuid.New())}},
		"zero number":    {AlbumID: uuid.New(), Title: "Lol", DiscNo: 1, TrackNo: 0, Artists: []models.TrackArtistInput{mainArtist(uuid.New())}},
		"zero disc":      {AlbumID: uuid.New(), Title: "Lol", DiscNo: 0, TrackNo: 1, Artists: []models.TrackArtistInput{mainArtist(uuid.New())}},
		"no main artist": {AlbumID: uuid.New(), Title: "Lol", DiscNo: 1, TrackNo: 1, Artists: []models.TrackArtistInput{{ArtistID: uuid.New(), Role: models.TrackArtistRoleFeat}}},
		"nil album":      {AlbumID: uuid.Nil, Title: "Lol", DiscNo: 1, TrackNo: 1, Artists: []models.TrackArtistInput{mainArtist(uuid.New())}},
	}

	for name, in := range validation {
		t.Run("error: "+name, func(t *testing.T) {
			t.Parallel()

			_, err := newUsecase(newDeps(t)).CreateTrack(t.Context(), in)
			require.ErrorIs(t, err, ErrValidation)
		})
	}
}
