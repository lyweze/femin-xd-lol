//go:build tests

package httpserver

import (
	"net/http"
	"net/url"
	"strings"
	"sync"

	"github.com/google/uuid"
	g "github.com/lyweze/femin-xd-lol/backend/gen/serveradminhttp"
	"github.com/samber/lo"
)

func artistNames(items []g.AdminArtist) []string {
	return lo.Map(items, func(a g.AdminArtist, _ int) string { return a.Name })
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_AdminListArtists() {
	s.Run("ok: newest first, pages, search, deleted hidden", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())

		first := c.do(http.MethodPost, adminArtists, map[string]any{"name": "Alpha 100%"})
		second := s.createArtist(c)
		third := s.createArtist(c)
		firstArtist := decode[g.AdminArtistReply](s, first, http.StatusCreated).Artist

		page := decode[g.AdminListArtists200Reply](s, c.do(http.MethodGet, adminArtists+"?limit=2", nil), http.StatusOK)
		r.Equal([]string{third.Name, second.Name}, artistNames(page.Items))
		r.NotNil(page.NextCursor)

		rest := decode[g.AdminListArtists200Reply](s, c.do(http.MethodGet, adminArtists+"?limit=2&cursor="+*page.NextCursor, nil), http.StatusOK)
		r.Equal([]string{"Alpha 100%"}, artistNames(rest.Items))
		r.Nil(rest.NextCursor)

		found := decode[g.AdminListArtists200Reply](s, c.do(http.MethodGet, adminArtists+"?q="+url.QueryEscape("pha 100%"), nil), http.StatusOK)
		r.Equal([]string{"Alpha 100%"}, artistNames(found.Items))

		r.Equal(http.StatusNoContent, c.do(http.MethodDelete, adminArtists+"/"+firstArtist.Id.String(), nil).status)

		all := decode[g.AdminListArtists200Reply](s, c.do(http.MethodGet, adminArtists, nil), http.StatusOK)
		r.NotContains(artistNames(all.Items), "Alpha 100%")
	})

	s.Run("error: limit zero", func() {
		res := s.adminClient(s.newAPI()).do(http.MethodGet, adminArtists+"?limit=0", nil)

		s.Equal(http.StatusUnprocessableEntity, res.status, res.text())
		s.Equal("limit: must be between 1 and 100.", res.message())
	})
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_AdminCreateArtist() {
	s.Run("ok: trims name, bio defaults to empty, no avatar yet", func() {
		r := s.Require()

		artist := decode[g.AdminArtistReply](s, s.adminClient(s.newAPI()).
			do(http.MethodPost, adminArtists, map[string]any{"name": "  Femin  "}), http.StatusCreated).Artist

		r.Equal("Femin", artist.Name)
		r.Empty(artist.Bio)
		r.Nil(artist.Avatar)
	})

	for name, tc := range map[string]struct {
		body    map[string]any
		message string
	}{
		"empty name": {map[string]any{"name": "   "}, "name: cannot be blank."},
		"long name":  {map[string]any{"name": strings.Repeat("a", 256)}, "name: the length must be between 1 and 255."},
	} {
		s.Run("error: "+name, func() {
			res := s.adminClient(s.newAPI()).do(http.MethodPost, adminArtists, tc.body)

			s.Equal(http.StatusUnprocessableEntity, res.status, res.text())
			s.Equal(tc.message, res.message())
			s.Equal(0, s.queryInt("SELECT count(*) FROM artists"))
		})
	}
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_AdminGetArtist() {
	s.Run("ok", func() {
		c := s.adminClient(s.newAPI())
		artist := s.createArtist(c)

		got := decode[g.AdminArtistReply](s, c.do(http.MethodGet, adminArtists+"/"+artist.Id.String(), nil), http.StatusOK)

		s.Equal(artist, got.Artist)
	})

	s.Run("error: unknown artist", func() {
		res := s.adminClient(s.newAPI()).do(http.MethodGet, adminArtists+"/"+uuid.NewString(), nil)

		s.Equal(http.StatusNotFound, res.status)
		s.Equal("NOT_FOUND", res.code())
	})
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_AdminUpdateArtist() {
	s.Run("ok: changes only passed fields", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())
		artist := decode[g.AdminArtistReply](s, c.do(http.MethodPost, adminArtists, map[string]any{"name": "Old", "bio": "keep me"}), http.StatusCreated).Artist

		got := decode[g.AdminArtistReply](s, c.do(http.MethodPatch, adminArtists+"/"+artist.Id.String(), map[string]any{"name": "New"}), http.StatusOK).Artist

		r.Equal("New", got.Name)
		r.Equal("keep me", got.Bio)
		r.False(got.UpdatedAt.Before(artist.UpdatedAt))
	})

	s.Run("error: empty name", func() {
		c := s.adminClient(s.newAPI())
		artist := s.createArtist(c)

		res := c.do(http.MethodPatch, adminArtists+"/"+artist.Id.String(), map[string]any{"name": ""})

		s.Equal(http.StatusUnprocessableEntity, res.status, res.text())
	})

	s.Run("error: unknown artist", func() {
		res := s.adminClient(s.newAPI()).do(http.MethodPatch, adminArtists+"/"+uuid.NewString(), map[string]any{"name": "X"})

		s.Equal(http.StatusNotFound, res.status, res.text())
	})
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_AdminDeleteArtist() {
	s.Run("ok: then it is gone", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())
		artist := s.createArtist(c)

		r.Equal(http.StatusNoContent, c.do(http.MethodDelete, adminArtists+"/"+artist.Id.String(), nil).status)
		r.Equal(http.StatusNotFound, c.do(http.MethodGet, adminArtists+"/"+artist.Id.String(), nil).status)
		r.Equal(http.StatusNotFound, c.do(http.MethodDelete, adminArtists+"/"+artist.Id.String(), nil).status)
	})

	s.Run("error: artist has an album", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())
		artist := s.createArtist(c)
		s.createAlbum(c, artist.Id)

		res := c.do(http.MethodDelete, adminArtists+"/"+artist.Id.String(), nil)

		r.Equal(http.StatusConflict, res.status)
		r.Equal("artist has 1 albums and 0 tracks", res.message())
	})

	s.Run("error: artist is only a feat on a track", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())
		album := s.createAlbum(c)
		feat := s.createArtist(c)

		body := trackBody(album.Id, 1, album.Artists[0].Id)
		body["artists"] = []map[string]any{
			{"artist_id": album.Artists[0].Id, "role": "main"},
			{"artist_id": feat.Id, "role": "feat"},
		}
		r.Equal(http.StatusCreated, c.do(http.MethodPost, adminTracks, body).status)

		r.Equal(http.StatusConflict, c.do(http.MethodDelete, adminArtists+"/"+feat.Id.String(), nil).status)
	})

	s.Run("ok: deleted album no longer blocks the artist", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())
		artist := s.createArtist(c)
		album := s.createAlbum(c, artist.Id)

		r.Equal(http.StatusNoContent, c.do(http.MethodDelete, adminAlbums+"/"+album.Id.String(), nil).status)
		r.Equal(http.StatusNoContent, c.do(http.MethodDelete, adminArtists+"/"+artist.Id.String(), nil).status)
	})

	// Без блокировок альбом мог появиться у артиста, которого в этот момент удалили.
	s.Run("ok: racing delete and album creation never leave an album with a deleted artist", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())

		for round := range 15 {
			artist := s.createArtist(c)

			var wg sync.WaitGroup

			wg.Go(func() { c.do(http.MethodDelete, adminArtists+"/"+artist.Id.String(), nil) })
			wg.Go(func() {
				c.do(http.MethodPost, adminAlbums, map[string]any{"title": "Race", "type": "album", "artist_ids": []uuid.UUID{artist.Id}})
			})
			wg.Wait()

			r.Zero(s.queryInt(`
				SELECT count(*) FROM album_artists aa
				JOIN albums al ON al.id = aa.album_id AND al.deleted_at IS NULL
				JOIN artists a ON a.id = aa.artist_id AND a.deleted_at IS NOT NULL`), "round %d", round)
		}
	})
}
