//go:build tests

package httpserver

import (
	"net/http"
	"time"

	"github.com/google/uuid"
	g "github.com/lyweze/femin-xd-lol/backend/gen/serveradminhttp"
	"github.com/samber/lo"
)

func albumPath(id uuid.UUID, suffix string) string {
	return adminAlbums + "/" + id.String() + suffix
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_AdminCreateAlbum() {
	s.Run("ok: keeps artist order and the release date", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())
		first, second := s.createArtist(c), s.createArtist(c)

		album := decode[g.AdminAlbumReply](s, c.do(http.MethodPost, adminAlbums, map[string]any{
			"title":        " Xd ",
			"type":         "ep",
			"release_date": "2026-12-01",
			"artist_ids":   []uuid.UUID{second.Id, first.Id},
		}), http.StatusCreated).Album

		r.Equal("Xd", album.Title)
		r.Equal(g.Ep, album.Type)
		r.Equal([]uuid.UUID{second.Id, first.Id}, lo.Map(album.Artists, func(a g.ArtistRef, _ int) uuid.UUID { return a.Id }))
		r.NotNil(album.ReleaseDate)
		r.Equal("2026-12-01", album.ReleaseDate.String())
		r.Nil(album.PublishedAt)
		r.Nil(album.Cover)
		r.Zero(album.TrackCount)
	})

	s.Run("error: deleted artist", func() {
		c := s.adminClient(s.newAPI())
		artist := s.createArtist(c)
		s.Require().Equal(http.StatusNoContent, c.do(http.MethodDelete, adminArtists+"/"+artist.Id.String(), nil).status)

		res := c.do(http.MethodPost, adminAlbums, map[string]any{"title": "X", "type": "album", "artist_ids": []uuid.UUID{artist.Id}})

		s.Equal(http.StatusUnprocessableEntity, res.status)
		s.Equal("artist "+artist.Id.String()+" not found", res.message())
	})

	for name, body := range map[string]map[string]any{
		"unknown artist":   {"title": "X", "type": "album", "artist_ids": []uuid.UUID{uuid.New()}},
		"no artists":       {"title": "X", "type": "album", "artist_ids": []uuid.UUID{}},
		"duplicate artist": {"title": "X", "type": "album", "artist_ids": []uuid.UUID{{1}, {1}}},
		"unknown type":     {"title": "X", "type": "mixtape", "artist_ids": []uuid.UUID{uuid.New()}},
		"empty title":      {"title": "", "type": "album", "artist_ids": []uuid.UUID{uuid.New()}},
	} {
		s.Run("error: "+name, func() {
			res := s.adminClient(s.newAPI()).do(http.MethodPost, adminAlbums, body)

			s.Equal(http.StatusUnprocessableEntity, res.status, res.text())
			s.NotEmpty(res.message())
			s.NotContains(res.message(), "\n")
			s.NotContains(res.message(), "validation error")
			s.Zero(s.queryInt("SELECT count(*) FROM albums"))
		})
	}
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_AdminListAlbums() {
	s.Run("ok: filter by artist, track count, deleted hidden", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())
		artist := s.createArtist(c)
		mine := s.createAlbum(c, artist.Id)
		s.createAlbum(c)
		gone := s.createAlbum(c, artist.Id)
		s.createTrack(c, mine, 1)
		s.createTrack(c, mine, 2)

		r.Equal(http.StatusNoContent, c.do(http.MethodDelete, albumPath(gone.Id, ""), nil).status)

		list := decode[g.AdminListAlbums200Reply](s, c.do(http.MethodGet, adminAlbums+"?artist_id="+artist.Id.String(), nil), http.StatusOK)

		r.Len(list.Items, 1)
		r.Equal(mine.Id, list.Items[0].Id)
		r.Equal(2, list.Items[0].TrackCount)
	})

	s.Run("ok: pages", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())
		artist := s.createArtist(c)

		for range 3 {
			s.createAlbum(c, artist.Id)
		}

		first := decode[g.AdminListAlbums200Reply](s, c.do(http.MethodGet, adminAlbums+"?limit=2", nil), http.StatusOK)
		r.Len(first.Items, 2)
		r.NotNil(first.NextCursor)

		second := decode[g.AdminListAlbums200Reply](s, c.do(http.MethodGet, adminAlbums+"?limit=2&cursor="+*first.NextCursor, nil), http.StatusOK)
		r.Len(second.Items, 1)
		r.Nil(second.NextCursor)
	})
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_AdminGetAlbum() {
	s.Run("ok: tracks in disc and track order, any status", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())
		album := s.createAlbum(c)
		third := s.createTrack(c, album, 3)
		first := s.createTrack(c, album, 1)

		body := trackBody(album.Id, 1, album.Artists[0].Id)
		body["disc_no"] = 2
		secondDisc := decode[g.AdminTrackReply](s, c.do(http.MethodPost, adminTracks, body), http.StatusCreated).Track

		s.setTrackStatus(third.Id, "ready")

		got := decode[g.AdminGetAlbum200Reply](s, c.do(http.MethodGet, albumPath(album.Id, ""), nil), http.StatusOK)

		r.Equal([]uuid.UUID{first.Id, third.Id, secondDisc.Id}, lo.Map(got.Tracks, func(t g.AdminTrack, _ int) uuid.UUID { return t.Id }))
		r.Equal(3, got.Album.TrackCount)
	})

	s.Run("error: unknown album", func() {
		s.Equal(http.StatusNotFound, s.adminClient(s.newAPI()).do(http.MethodGet, albumPath(uuid.New(), ""), nil).status)
	})
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_AdminUpdateAlbum() {
	s.Run("ok: partial update keeps artists", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())
		album := s.createAlbum(c)

		got := decode[g.AdminAlbumReply](s, c.do(http.MethodPatch, albumPath(album.Id, ""), map[string]any{"title": "Renamed", "type": "single"}), http.StatusOK).Album

		r.Equal("Renamed", got.Title)
		r.Equal(g.Single, got.Type)
		r.Equal(album.Artists, got.Artists)
	})

	s.Run("ok: artist list is replaced", func() {
		c := s.adminClient(s.newAPI())
		album := s.createAlbum(c)
		other := s.createArtist(c)

		got := decode[g.AdminAlbumReply](s, c.do(http.MethodPatch, albumPath(album.Id, ""), map[string]any{"artist_ids": []uuid.UUID{other.Id}}), http.StatusOK).Album

		s.Equal([]g.ArtistRef{{Id: other.Id, Name: other.Name}}, got.Artists)
	})

	s.Run("error: empty artist list", func() {
		c := s.adminClient(s.newAPI())
		album := s.createAlbum(c)

		res := c.do(http.MethodPatch, albumPath(album.Id, ""), map[string]any{"artist_ids": []uuid.UUID{}})

		s.Equal(http.StatusUnprocessableEntity, res.status, res.text())
	})

	s.Run("error: unknown album", func() {
		res := s.adminClient(s.newAPI()).do(http.MethodPatch, albumPath(uuid.New(), ""), map[string]any{"title": "X"})

		s.Equal(http.StatusNotFound, res.status, res.text())
	})
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_AdminDeleteAlbum() {
	s.Run("ok: tracks go with it, likes stay", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())
		album := s.createAlbum(c)
		track := s.createTrack(c, album, 1)
		listener := s.createUser("user")

		s.exec("INSERT INTO liked_tracks (user_id, track_id, liked_at) VALUES ($1, $2, now())", listener.ID, track.Id)

		r.Equal(http.StatusNoContent, c.do(http.MethodDelete, albumPath(album.Id, ""), nil).status)
		r.Equal(http.StatusNotFound, c.do(http.MethodGet, albumPath(album.Id, ""), nil).status)
		r.Equal(http.StatusNotFound, c.do(http.MethodGet, adminTracks+"/"+track.Id.String(), nil).status)
		r.Equal(1, s.queryInt("SELECT count(*) FROM liked_tracks"))
	})

	s.Run("error: unknown album", func() {
		s.Equal(http.StatusNotFound, s.adminClient(s.newAPI()).do(http.MethodDelete, albumPath(uuid.New(), ""), nil).status)
	})
}

func positions(tracks ...g.AdminTrack) []map[string]any {
	return lo.Map(tracks, func(t g.AdminTrack, i int) map[string]any {
		return map[string]any{"track_id": t.Id, "disc_no": 1, "track_no": i + 1}
	})
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_AdminSetAlbumTrackOrder() {
	s.Run("ok: swaps tracks in one request", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())
		album := s.createAlbum(c)
		first, second := s.createTrack(c, album, 1), s.createTrack(c, album, 2)

		got := decode[g.AdminGetAlbum200Reply](s, c.do(http.MethodPut, albumPath(album.Id, "/track-order"),
			map[string]any{"items": positions(second, first)}), http.StatusOK)

		r.Equal([]uuid.UUID{second.Id, first.Id}, lo.Map(got.Tracks, func(t g.AdminTrack, _ int) uuid.UUID { return t.Id }))
		r.Equal(1, got.Tracks[0].TrackNo)
	})

	s.Run("error: order misses a track", func() {
		c := s.adminClient(s.newAPI())
		album := s.createAlbum(c)
		first := s.createTrack(c, album, 1)
		s.createTrack(c, album, 2)

		res := c.do(http.MethodPut, albumPath(album.Id, "/track-order"), map[string]any{"items": positions(first)})

		s.Equal(http.StatusUnprocessableEntity, res.status, res.text())
	})

	s.Run("error: track from another album", func() {
		c := s.adminClient(s.newAPI())
		album, other := s.createAlbum(c), s.createAlbum(c)
		mine, foreign := s.createTrack(c, album, 1), s.createTrack(c, other, 1)

		res := c.do(http.MethodPut, albumPath(album.Id, "/track-order"), map[string]any{"items": []map[string]any{
			{"track_id": mine.Id, "disc_no": 1, "track_no": 1},
			{"track_id": foreign.Id, "disc_no": 1, "track_no": 2},
		}})

		s.Equal(http.StatusUnprocessableEntity, res.status, res.text())
		s.Equal(1, s.queryInt("SELECT track_no FROM tracks WHERE id = $1", foreign.Id))
	})

	s.Run("error: duplicate position", func() {
		c := s.adminClient(s.newAPI())
		album := s.createAlbum(c)
		first, second := s.createTrack(c, album, 1), s.createTrack(c, album, 2)

		res := c.do(http.MethodPut, albumPath(album.Id, "/track-order"), map[string]any{"items": []map[string]any{
			{"track_id": first.Id, "disc_no": 1, "track_no": 1},
			{"track_id": second.Id, "disc_no": 1, "track_no": 1},
		}})

		s.Equal(http.StatusUnprocessableEntity, res.status, res.text())
	})

	s.Run("error: unknown album", func() {
		res := s.adminClient(s.newAPI()).do(http.MethodPut, albumPath(uuid.New(), "/track-order"), map[string]any{"items": []map[string]any{}})

		s.Equal(http.StatusNotFound, res.status, res.text())
	})
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_AdminPublishAlbum() {
	s.Run("error: no cover", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())
		album := s.createAlbum(c)
		track := s.createTrack(c, album, 1)
		s.setTrackStatus(track.Id, "ready")

		res := c.do(http.MethodPost, albumPath(album.Id, "/publish"), nil)

		r.Equal(http.StatusConflict, res.status, res.text())
		r.Equal("album has no cover", res.message())
	})

	s.Run("error: no tracks", func() {
		c := s.adminClient(s.newAPI())
		album := s.createAlbum(c)
		s.setCover(album.Id)

		res := c.do(http.MethodPost, albumPath(album.Id, "/publish"), nil)

		s.Equal(http.StatusConflict, res.status)
		s.Equal("album has no tracks", res.message())
	})

	s.Run("error: track not ready", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())
		album := s.createAlbum(c)
		s.setCover(album.Id)
		ready, draft := s.createTrack(c, album, 1), s.createTrack(c, album, 2)
		s.setTrackStatus(ready.Id, "ready")

		res := c.do(http.MethodPost, albumPath(album.Id, "/publish"), nil)

		r.Equal(http.StatusConflict, res.status)
		r.Equal(`track "`+draft.Title+`" is draft, every track must be ready`, res.message())
		r.Zero(s.queryInt("SELECT count(*) FROM albums WHERE published_at IS NOT NULL"))
	})

	s.Run("ok: publish now, then unpublish", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())
		album := s.createAlbum(c)
		s.setCover(album.Id)
		s.setTrackStatus(s.createTrack(c, album, 1).Id, "ready")

		before := time.Now().Add(-time.Second)
		published := decode[g.AdminAlbumReply](s, c.do(http.MethodPost, albumPath(album.Id, "/publish"), nil), http.StatusOK).Album

		r.NotNil(published.PublishedAt)
		r.True(published.PublishedAt.After(before))

		unpublished := decode[g.AdminAlbumReply](s, c.do(http.MethodPost, albumPath(album.Id, "/unpublish"), nil), http.StatusOK).Album
		r.Nil(unpublished.PublishedAt)
	})

	s.Run("ok: date in the future is kept", func() {
		c := s.adminClient(s.newAPI())
		album := s.createAlbum(c)
		s.setCover(album.Id)
		s.setTrackStatus(s.createTrack(c, album, 1).Id, "ready")

		at := time.Date(2030, 1, 1, 0, 0, 0, 0, time.UTC)
		published := decode[g.AdminAlbumReply](s, c.do(http.MethodPost, albumPath(album.Id, "/publish"), map[string]any{"published_at": at}), http.StatusOK).Album

		s.True(published.PublishedAt.Equal(at), published.PublishedAt)
	})

	s.Run("error: unknown album", func() {
		c := s.adminClient(s.newAPI())

		s.Equal(http.StatusNotFound, c.do(http.MethodPost, albumPath(uuid.New(), "/publish"), nil).status)
		s.Equal(http.StatusNotFound, c.do(http.MethodPost, albumPath(uuid.New(), "/unpublish"), nil).status)
	})
}
