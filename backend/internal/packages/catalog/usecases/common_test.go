//go:build tests

package usecases

import (
	"testing"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/models"
	"github.com/stretchr/testify/require"
)

func TestPageIn(t *testing.T) {
	t.Parallel()

	t.Run("ok: default limit asks for one extra row", func(t *testing.T) {
		t.Parallel()

		page, err := PageIn{}.toPage()
		require.NoError(t, err)
		require.Equal(t, pageDefaultLimit+1, page.Limit)
		require.Nil(t, page.AfterID)
	})

	t.Run("ok: cursor becomes AfterID", func(t *testing.T) {
		t.Parallel()

		id := uuid.New()

		page, err := PageIn{Limit: new(5), Cursor: new(id.String())}.toPage()
		require.NoError(t, err)
		require.Equal(t, 6, page.Limit)
		require.Equal(t, &id, page.AfterID)
	})

	t.Run("error: bad cursor", func(t *testing.T) {
		t.Parallel()

		_, err := PageIn{Cursor: new("zzz")}.toPage()
		require.ErrorIs(t, err, ErrValidation)
	})

	t.Run("ok: cutPage keeps the limit and returns the last id", func(t *testing.T) {
		t.Parallel()

		r := require.New(t)

		items := []*models.Artist{buildArtist(), buildArtist(), buildArtist()}
		page, _ := PageIn{Limit: new(2)}.toPage()

		got, next := cutPage(items, page)
		r.Len(got, 2)
		r.NotNil(next)
		r.Equal(items[1].ID().String(), *next)

		got, next = cutPage(items[:2], page)
		r.Len(got, 2)
		r.Nil(next)
	})
}

func TestValidateTrackArtists(t *testing.T) {
	t.Parallel()

	a, b := uuid.New(), uuid.New()

	cases := map[string]struct {
		artists []models.TrackArtistInput
		ok      bool
	}{
		"ok: one main":             {[]models.TrackArtistInput{mainArtist(a)}, true},
		"ok: main and feat":        {[]models.TrackArtistInput{mainArtist(a), {ArtistID: b, Role: models.TrackArtistRoleFeat}}, true},
		"error: empty":             {nil, false},
		"error: only feat":         {[]models.TrackArtistInput{{ArtistID: a, Role: models.TrackArtistRoleFeat}}, false},
		"error: same artist twice": {[]models.TrackArtistInput{mainArtist(a), {ArtistID: a, Role: models.TrackArtistRoleFeat}}, false},
		"error: unknown role":      {[]models.TrackArtistInput{{ArtistID: a, Role: "producer"}}, false},
		"error: nil artist id":     {[]models.TrackArtistInput{mainArtist(uuid.Nil)}, false},
	}

	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			err := validateTrackArtists(tc.artists)
			if tc.ok {
				require.NoError(t, err)
			} else {
				require.Error(t, err)
			}
		})
	}
}
