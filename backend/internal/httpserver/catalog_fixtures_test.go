//go:build tests

package httpserver

import (
	"encoding/json"
	"net/http"

	"github.com/brianvoe/gofakeit/v7"
	"github.com/google/uuid"
	g "github.com/lyweze/femin-xd-lol/backend/gen/serveradminhttp"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
)

// decode разбирает тело ответа и падает, если статус не тот.
func decode[T any](s *HttpHandlersTestSuite, res testResponse, status int) T {
	s.T().Helper()

	r := s.Require()
	r.Equal(status, res.status, res.text())

	var out T
	r.NoError(json.Unmarshal(res.body, &out), res.text())

	return out
}

func (s *HttpHandlersTestSuite) adminClient(api *testAPI) *testClient {
	return api.login(s.createUser(models.UserRoleAdmin))
}

func (s *HttpHandlersTestSuite) createArtist(c *testClient) g.AdminArtist {
	res := c.do(http.MethodPost, adminArtists, map[string]any{"name": gofakeit.Name()})

	return decode[g.AdminArtistReply](s, res, http.StatusCreated).Artist
}

func (s *HttpHandlersTestSuite) createAlbum(c *testClient, artistIDs ...uuid.UUID) g.AdminAlbum {
	if len(artistIDs) == 0 {
		artistIDs = []uuid.UUID{s.createArtist(c).Id}
	}

	res := c.do(http.MethodPost, adminAlbums, map[string]any{
		"title":      gofakeit.Word(),
		"type":       "album",
		"artist_ids": artistIDs,
	})

	return decode[g.AdminAlbumReply](s, res, http.StatusCreated).Album
}

func trackBody(albumID uuid.UUID, trackNo int, artistID uuid.UUID) map[string]any {
	return map[string]any{
		"album_id": albumID,
		"title":    gofakeit.Word(),
		"track_no": trackNo,
		"artists":  []map[string]any{{"artist_id": artistID, "role": "main"}},
	}
}

func (s *HttpHandlersTestSuite) createTrack(c *testClient, album g.AdminAlbum, trackNo int) g.AdminTrack {
	res := c.do(http.MethodPost, adminTracks, trackBody(album.Id, trackNo, album.Artists[0].Id))

	return decode[g.AdminTrackReply](s, res, http.StatusCreated).Track
}

// setCover и setTrackStatus делают то, что потом будут делать загрузка и worker.
func (s *HttpHandlersTestSuite) setCover(albumID uuid.UUID) {
	s.exec("UPDATE albums SET cover_key = 'covers/' || id WHERE id = $1", albumID)
}

func (s *HttpHandlersTestSuite) setTrackStatus(trackID uuid.UUID, status string) {
	s.exec("UPDATE tracks SET status = $2 WHERE id = $1", trackID, status)
}
