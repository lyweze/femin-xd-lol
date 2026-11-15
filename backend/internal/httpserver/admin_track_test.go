//go:build tests

package httpserver

import (
	"net/http"
	"slices"
	"sync"

	"github.com/google/uuid"
	g "github.com/lyweze/femin-xd-lol/backend/gen/serveradminhttp"
	"github.com/samber/lo"
)

func trackPath(id uuid.UUID) string {
	return adminTracks + "/" + id.String()
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_AdminCreateTrack() {
	s.Run("ok: draft with defaults and artists in order", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())
		album := s.createAlbum(c)
		feat := s.createArtist(c)

		body := trackBody(album.Id, 1, album.Artists[0].Id)
		body["artists"] = []map[string]any{
			{"artist_id": feat.Id, "role": "feat"},
			{"artist_id": album.Artists[0].Id, "role": "main"},
		}

		track := decode[g.AdminTrackReply](s, c.do(http.MethodPost, adminTracks, body), http.StatusCreated).Track

		r.Equal(g.Draft, track.Status)
		r.Equal(1, track.DiscNo)
		r.False(track.Explicit)
		r.Nil(track.DurationMs)
		r.Empty(track.Files)
		r.Empty(track.LyricsLanguages)
		r.Equal([]g.AdminTrackArtist{
			{Id: feat.Id, Name: feat.Name, Role: g.Feat},
			{Id: album.Artists[0].Id, Name: album.Artists[0].Name, Role: g.Main},
		}, track.Artists)
	})

	s.Run("ok: same number on another disc", func() {
		c := s.adminClient(s.newAPI())
		album := s.createAlbum(c)
		s.createTrack(c, album, 1)

		body := trackBody(album.Id, 1, album.Artists[0].Id)
		body["disc_no"] = 2

		s.Equal(http.StatusCreated, c.do(http.MethodPost, adminTracks, body).status)
	})

	s.Run("error: position taken", func() {
		c := s.adminClient(s.newAPI())
		album := s.createAlbum(c)
		s.createTrack(c, album, 1)

		res := c.do(http.MethodPost, adminTracks, trackBody(album.Id, 1, album.Artists[0].Id))

		s.Equal(http.StatusUnprocessableEntity, res.status)
		s.Contains(res.text(), "already taken")
	})

	s.Run("error: deleted album", func() {
		c := s.adminClient(s.newAPI())
		album := s.createAlbum(c)
		s.Require().Equal(http.StatusNoContent, c.do(http.MethodDelete, albumPath(album.Id, ""), nil).status)

		s.Equal(http.StatusUnprocessableEntity, c.do(http.MethodPost, adminTracks, trackBody(album.Id, 1, album.Artists[0].Id)).status)
	})

	s.Run("error: invalid input", func() {
		c := s.adminClient(s.newAPI())
		album := s.createAlbum(c)
		artist := album.Artists[0].Id

		cases := map[string]map[string]any{
			"unknown album":  trackBody(uuid.New(), 1, artist),
			"unknown artist": trackBody(album.Id, 1, uuid.New()),
			"zero number":    trackBody(album.Id, 0, artist),
			"only feat": lo.Assign(trackBody(album.Id, 1, artist), map[string]any{
				"artists": []map[string]any{{"artist_id": artist, "role": "feat"}},
			}),
			"artist twice": lo.Assign(trackBody(album.Id, 1, artist), map[string]any{
				"artists": []map[string]any{{"artist_id": artist, "role": "main"}, {"artist_id": artist, "role": "feat"}},
			}),
			"no artists": lo.Assign(trackBody(album.Id, 1, artist), map[string]any{"artists": []map[string]any{}}),
		}

		for name, body := range cases {
			res := c.do(http.MethodPost, adminTracks, body)

			s.Equal(http.StatusUnprocessableEntity, res.status, "%s: %s", name, res.text())
		}

		s.Zero(s.queryInt("SELECT count(*) FROM tracks"))
	})

	// Без блокировки альбома оба запроса видят свободную позицию и создают дубль.
	s.Run("ok: racing creates on one position make exactly one track", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())
		album := s.createAlbum(c)

		for round := range 15 {
			statuses := make([]int, 2)

			var wg sync.WaitGroup

			for i := range statuses {
				wg.Go(func() {
					statuses[i] = c.do(http.MethodPost, adminTracks, trackBody(album.Id, round+1, album.Artists[0].Id)).status
				})
			}

			wg.Wait()
			slices.Sort(statuses)

			r.Equal([]int{http.StatusCreated, http.StatusUnprocessableEntity}, statuses, "round %d", round)
		}

		r.Equal(15, s.queryInt("SELECT count(*) FROM tracks WHERE album_id = $1", album.Id))
	})
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_AdminListTracks() {
	s.Run("ok: filters by album and status, pages", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())
		album, other := s.createAlbum(c), s.createAlbum(c)
		failed := s.createTrack(c, album, 1)
		s.createTrack(c, album, 2)
		s.createTrack(c, other, 1)
		s.exec("UPDATE tracks SET status = 'failed', processing_error = 'bad file' WHERE id = $1", failed.Id)

		byStatus := decode[g.AdminListTracks200Reply](s, c.do(http.MethodGet, adminTracks+"?status=failed", nil), http.StatusOK)
		r.Len(byStatus.Items, 1)
		r.Equal(failed.Id, byStatus.Items[0].Id)
		r.Equal(lo.ToPtr("bad file"), byStatus.Items[0].ProcessingError)

		byAlbum := decode[g.AdminListTracks200Reply](s, c.do(http.MethodGet, adminTracks+"?album_id="+album.Id.String()+"&limit=1", nil), http.StatusOK)
		r.Len(byAlbum.Items, 1)
		r.NotNil(byAlbum.NextCursor)

		rest := decode[g.AdminListTracks200Reply](s, c.do(http.MethodGet, adminTracks+"?album_id="+album.Id.String()+"&limit=1&cursor="+*byAlbum.NextCursor, nil), http.StatusOK)
		r.Len(rest.Items, 1)
		r.Nil(rest.NextCursor)
	})

	s.Run("error: unknown status", func() {
		res := s.adminClient(s.newAPI()).do(http.MethodGet, adminTracks+"?status=lost", nil)

		s.Equal(http.StatusUnprocessableEntity, res.status, res.text())
	})
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_AdminGetTrack() {
	s.Run("ok: files and lyrics languages", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())
		track := s.createTrack(c, s.createAlbum(c), 1)

		s.exec(`INSERT INTO track_files (id, track_id, kind, format, bitrate_kbps, object_key, size_bytes, created_at)
			VALUES (gen_random_uuid(), $1, 'source', 'flac', NULL, 'k1', 100, now()),
			       (gen_random_uuid(), $1, 'stream', 'aac', 256, 'k2', 50, now())`, track.Id)
		s.exec(`INSERT INTO lyrics (track_id, language, synced, lines, plain_text, created_at, updated_at)
			VALUES ($1, 'ru', true, '[]', '', now(), now()), ($1, 'en', false, '[]', '', now(), now())`, track.Id)

		got := decode[g.AdminTrackReply](s, c.do(http.MethodGet, trackPath(track.Id), nil), http.StatusOK).Track

		r.Equal([]string{"en", "ru"}, got.LyricsLanguages)
		r.Len(got.Files, 2)
		r.Equal(g.Source, got.Files[0].Kind)
		r.Nil(got.Files[0].BitrateKbps)
		r.Equal(lo.ToPtr(256), got.Files[1].BitrateKbps)
	})

	s.Run("error: unknown track", func() {
		s.Equal(http.StatusNotFound, s.adminClient(s.newAPI()).do(http.MethodGet, trackPath(uuid.New()), nil).status)
	})
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_AdminUpdateTrack() {
	s.Run("ok: partial update, artists replaced only when passed", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())
		album := s.createAlbum(c)
		track := s.createTrack(c, album, 1)

		got := decode[g.AdminTrackReply](s, c.do(http.MethodPatch, trackPath(track.Id), map[string]any{"explicit": true}), http.StatusOK).Track
		r.True(got.Explicit)
		r.Equal(track.Title, got.Title)
		r.Equal(track.Artists, got.Artists)

		other := s.createArtist(c)
		got = decode[g.AdminTrackReply](s, c.do(http.MethodPatch, trackPath(track.Id), map[string]any{
			"artists": []map[string]any{{"artist_id": other.Id, "role": "main"}},
		}), http.StatusOK).Track
		r.Equal([]g.AdminTrackArtist{{Id: other.Id, Name: other.Name, Role: g.Main}}, got.Artists)
	})

	s.Run("error: empty artists", func() {
		c := s.adminClient(s.newAPI())
		track := s.createTrack(c, s.createAlbum(c), 1)

		res := c.do(http.MethodPatch, trackPath(track.Id), map[string]any{"artists": []map[string]any{}})

		s.Equal(http.StatusUnprocessableEntity, res.status, res.text())
	})

	s.Run("error: unknown track", func() {
		res := s.adminClient(s.newAPI()).do(http.MethodPatch, trackPath(uuid.New()), map[string]any{"title": "X"})

		s.Equal(http.StatusNotFound, res.status, res.text())
	})
}

func (s *HttpHandlersTestSuite) Test_handlersFacade_AdminDeleteTrack() {
	s.Run("ok: album count drops", func() {
		r := s.Require()
		c := s.adminClient(s.newAPI())
		album := s.createAlbum(c)
		track := s.createTrack(c, album, 1)
		s.createTrack(c, album, 2)

		r.Equal(http.StatusNoContent, c.do(http.MethodDelete, trackPath(track.Id), nil).status)
		r.Equal(http.StatusNotFound, c.do(http.MethodGet, trackPath(track.Id), nil).status)

		got := decode[g.AdminGetAlbum200Reply](s, c.do(http.MethodGet, albumPath(album.Id, ""), nil), http.StatusOK)
		r.Equal(1, got.Album.TrackCount)
		r.Len(got.Tracks, 1)
	})

	s.Run("error: unknown track", func() {
		s.Equal(http.StatusNotFound, s.adminClient(s.newAPI()).do(http.MethodDelete, trackPath(uuid.New()), nil).status)
	})
}
