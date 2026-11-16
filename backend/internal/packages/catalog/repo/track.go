package repo

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/huandu/go-sqlbuilder"
	"github.com/jackc/pgx/v5"
	"github.com/lyweze/femin-xd-lol/backend/internal/entities"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/repositories"
)

func newTracksSelect() *sqlbuilder.SelectBuilder {
	query := builder().NewSelectBuilder()
	query.Select(entities.TrackCols...)
	query.From(entities.TrackTableName)
	query.Where(query.IsNull(entities.TrackDeletedAtCol))

	return query
}

type trackDetails struct {
	artists   map[uuid.UUID][]models.TrackArtist
	files     map[uuid.UUID][]models.TrackFile
	languages map[uuid.UUID][]string
}

// selectTracks читает треки и дозагружает артистов, файлы и языки текстов тремя запросами на всю пачку.
func (r *PgxRepo) selectTracks(ctx context.Context, sql string, args []any) ([]*models.Track, error) {
	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %w", err)
	}

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[entities.Track])
	if err != nil {
		return nil, fmt.Errorf("failed to collect rows: %w", err)
	}

	ids := make([]uuid.UUID, 0, len(items))
	for _, item := range items {
		ids = append(ids, item.ID)
	}

	details, err := r.trackDetails(ctx, ids)
	if err != nil {
		return nil, err
	}

	tracks := make([]*models.Track, 0, len(items))

	for _, item := range items {
		track := models.NewTrack(item.ID)
		track.SetAlbumID(item.AlbumID)
		track.SetTitle(item.Title)
		track.SetDiscNo(item.DiscNo)
		track.SetTrackNo(item.TrackNo)
		track.SetDurationMs(nullToPtr(item.DurationMs))
		track.SetExplicit(item.Explicit)
		track.SetStatus(models.TrackStatus(item.Status))
		track.SetProcessingError(nullToPtr(item.ProcessingError))
		track.SetArtists(append([]models.TrackArtist{}, details.artists[item.ID]...))
		track.SetFiles(append([]models.TrackFile{}, details.files[item.ID]...))
		track.SetLyricsLanguages(append([]string{}, details.languages[item.ID]...))
		track.SetCreatedAt(item.CreatedAt)
		track.SetUpdatedAt(item.UpdatedAt)

		tracks = append(tracks, track)
	}

	return tracks, nil
}

func (r *PgxRepo) trackDetails(ctx context.Context, trackIDs []uuid.UUID) (trackDetails, error) {
	details := trackDetails{
		artists:   make(map[uuid.UUID][]models.TrackArtist, len(trackIDs)),
		files:     make(map[uuid.UUID][]models.TrackFile, len(trackIDs)),
		languages: make(map[uuid.UUID][]string, len(trackIDs)),
	}

	if len(trackIDs) == 0 {
		return details, nil
	}

	err := r.scanEach(ctx, `
SELECT ta.track_id, a.id, a.name, ta.role
FROM track_artists ta
JOIN artists a ON a.id = ta.artist_id
WHERE ta.track_id = ANY($1)
ORDER BY ta.track_id, ta.position`, trackIDs, func(rows pgx.Rows) error {
		var (
			trackID uuid.UUID
			artist  models.TrackArtist
		)

		if err := rows.Scan(&trackID, &artist.ID, &artist.Name, &artist.Role); err != nil {
			return err //nolint:wrapcheck
		}

		details.artists[trackID] = append(details.artists[trackID], artist)

		return nil
	})
	if err != nil {
		return trackDetails{}, fmt.Errorf("failed to load track artists: %w", err)
	}

	err = r.scanEach(ctx, `
SELECT track_id, kind, format, bitrate_kbps, size_bytes
FROM track_files
WHERE track_id = ANY($1)
ORDER BY track_id, kind, format, bitrate_kbps`, trackIDs, func(rows pgx.Rows) error {
		var (
			trackID uuid.UUID
			file    models.TrackFile
		)

		if err := rows.Scan(&trackID, &file.Kind, &file.Format, &file.BitrateKbps, &file.SizeBytes); err != nil {
			return err //nolint:wrapcheck
		}

		details.files[trackID] = append(details.files[trackID], file)

		return nil
	})
	if err != nil {
		return trackDetails{}, fmt.Errorf("failed to load track files: %w", err)
	}

	err = r.scanEach(ctx, `
SELECT track_id, language
FROM lyrics
WHERE track_id = ANY($1)
ORDER BY track_id, language`, trackIDs, func(rows pgx.Rows) error {
		var (
			trackID  uuid.UUID
			language string
		)

		if err := rows.Scan(&trackID, &language); err != nil {
			return err //nolint:wrapcheck
		}

		details.languages[trackID] = append(details.languages[trackID], language)

		return nil
	})
	if err != nil {
		return trackDetails{}, fmt.Errorf("failed to load lyrics languages: %w", err)
	}

	return details, nil
}

func (r *PgxRepo) scanEach(ctx context.Context, sql string, ids []uuid.UUID, scan func(pgx.Rows) error) error {
	rows, err := r.db.Query(ctx, sql, ids)
	if err != nil {
		return fmt.Errorf("failed to execute query: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		if err := scan(rows); err != nil {
			return fmt.Errorf("failed to scan row: %w", err)
		}
	}

	if err := rows.Err(); err != nil {
		return fmt.Errorf("failed to read rows: %w", err)
	}

	return nil
}

func (r *PgxRepo) ListTracks(ctx context.Context, q dto.ListTracksQuery) (dto.ListTracksResult, error) {
	query := newTracksSelect()

	if q.Search != nil {
		query.Where(query.ILike(entities.TrackTitleCol, repositories.ContainsPattern(*q.Search)))
	}

	if q.AlbumID != nil {
		query.Where(query.Equal(entities.TrackAlbumIDCol, *q.AlbumID))
	}

	if q.Status != nil {
		query.Where(query.Equal(entities.TrackStatusCol, string(*q.Status)))
	}

	applyPage(query, entities.TrackIDCol, q.Page)

	sql, args := query.Build()

	tracks, err := r.selectTracks(ctx, sql, args)
	if err != nil {
		return dto.ListTracksResult{}, err
	}

	return dto.ListTracksResult{Items: tracks}, nil
}

func (r *PgxRepo) ListAlbumTracks(ctx context.Context, q dto.ListAlbumTracksQuery) (dto.ListAlbumTracksResult, error) {
	query := newTracksSelect()
	query.Where(query.Equal(entities.TrackAlbumIDCol, q.AlbumID))
	query.OrderBy(entities.TrackDiscNoCol, entities.TrackTrackNoCol, entities.TrackIDCol)

	sql, args := query.Build()

	tracks, err := r.selectTracks(ctx, sql, args)
	if err != nil {
		return dto.ListAlbumTracksResult{}, err
	}

	return dto.ListAlbumTracksResult{Items: tracks}, nil
}

func (r *PgxRepo) GetTrack(ctx context.Context, q dto.GetTrackQuery) (dto.GetTrackResult, error) {
	query := newTracksSelect()
	query.Where(query.Equal(entities.TrackIDCol, q.ID))
	applyLock(query, entities.TrackTableName, q.Lock)

	sql, args := query.Build()

	tracks, err := r.selectTracks(ctx, sql, args)
	if err != nil {
		return dto.GetTrackResult{}, err
	}

	if len(tracks) == 0 {
		return dto.GetTrackResult{}, usecases.ErrTrackNotFound
	}

	return dto.GetTrackResult{Result: tracks[0]}, nil
}

func (r *PgxRepo) setTrackArtists(ctx context.Context, trackID uuid.UUID, artists []models.TrackArtistInput) error {
	if _, err := r.db.Exec(ctx, "DELETE FROM track_artists WHERE track_id = $1", trackID); err != nil {
		return fmt.Errorf("failed to clear track artists: %w", err)
	}

	ids := make([]uuid.UUID, 0, len(artists))
	roles := make([]string, 0, len(artists))

	for _, artist := range artists {
		ids = append(ids, artist.ArtistID)
		roles = append(roles, string(artist.Role))
	}

	const sql = `
INSERT INTO track_artists (track_id, artist_id, role, position)
SELECT $1, a.id, a.role, (a.ord - 1)::smallint
FROM unnest($2::uuid[], $3::text[]) WITH ORDINALITY AS a(id, role, ord)`

	if _, err := r.db.Exec(ctx, sql, trackID, ids, roles); err != nil {
		return fmt.Errorf("failed to insert track artists: %w", err)
	}

	return nil
}

func (r *PgxRepo) getTrackAfterWrite(ctx context.Context, id uuid.UUID) (*models.Track, error) {
	result, err := r.GetTrack(ctx, dto.GetTrackQuery{ID: id, Lock: dto.LockNone})
	if err != nil {
		return nil, err
	}

	return result.Result, nil
}

func (r *PgxRepo) CreateTrack(ctx context.Context, cmd dto.CreateTrackCommand) (dto.CreateTrackResult, error) {
	query := builder().NewInsertBuilder()
	query.InsertInto(entities.TrackTableName)
	query.Cols(
		entities.TrackIDCol,
		entities.TrackAlbumIDCol,
		entities.TrackTitleCol,
		entities.TrackDiscNoCol,
		entities.TrackTrackNoCol,
		entities.TrackExplicitCol,
		entities.TrackStatusCol,
		entities.TrackCreatedAtCol,
		entities.TrackUpdatedAtCol,
	)
	query.Values(
		cmd.ID,
		cmd.AlbumID,
		cmd.Title,
		cmd.DiscNo,
		cmd.TrackNo,
		cmd.Explicit,
		string(models.TrackStatusDraft),
		cmd.CreatedAt,
		cmd.UpdatedAt,
	)

	sql, args := query.Build()

	if _, err := r.db.Exec(ctx, sql, args...); err != nil {
		return dto.CreateTrackResult{}, fmt.Errorf("failed to insert track: %w", err)
	}

	if err := r.setTrackArtists(ctx, cmd.ID, cmd.Artists); err != nil {
		return dto.CreateTrackResult{}, err
	}

	track, err := r.getTrackAfterWrite(ctx, cmd.ID)
	if err != nil {
		return dto.CreateTrackResult{}, err
	}

	return dto.CreateTrackResult{Result: track}, nil
}

func (r *PgxRepo) UpdateTrack(ctx context.Context, cmd dto.UpdateTrackCommand) (dto.UpdateTrackResult, error) {
	query := builder().NewUpdateBuilder()
	query.Update(entities.TrackTableName)

	assignments := []string{query.Assign(entities.TrackUpdatedAtCol, cmd.UpdatedAt)}

	if cmd.Title != nil {
		assignments = append(assignments, query.Assign(entities.TrackTitleCol, *cmd.Title))
	}

	if cmd.Explicit != nil {
		assignments = append(assignments, query.Assign(entities.TrackExplicitCol, *cmd.Explicit))
	}

	query.Set(assignments...)
	query.Where(query.Equal(entities.TrackIDCol, cmd.ID), query.IsNull(entities.TrackDeletedAtCol))

	if err := r.execOne(ctx, query, usecases.ErrTrackNotFound); err != nil {
		return dto.UpdateTrackResult{}, err
	}

	if cmd.Artists != nil {
		if err := r.setTrackArtists(ctx, cmd.ID, *cmd.Artists); err != nil {
			return dto.UpdateTrackResult{}, err
		}
	}

	track, err := r.getTrackAfterWrite(ctx, cmd.ID)
	if err != nil {
		return dto.UpdateTrackResult{}, err
	}

	return dto.UpdateTrackResult{Result: track}, nil
}

// SetTrackPositions обновляет все позиции одним запросом: уникального индекса на
// позицию нет, поэтому перестановка не упирается в промежуточные конфликты.
func (r *PgxRepo) SetTrackPositions(ctx context.Context, cmd dto.SetTrackPositionsCommand) error {
	ids := make([]uuid.UUID, 0, len(cmd.Items))
	discs := make([]int32, 0, len(cmd.Items))
	numbers := make([]int32, 0, len(cmd.Items))

	for _, item := range cmd.Items {
		ids = append(ids, item.TrackID)
		discs = append(discs, int32(item.DiscNo))      //nolint:gosec
		numbers = append(numbers, int32(item.TrackNo)) //nolint:gosec
	}

	const sql = `
UPDATE tracks t
SET disc_no = v.disc_no, track_no = v.track_no, updated_at = $4
FROM unnest($1::uuid[], $2::int[], $3::int[]) AS v(id, disc_no, track_no)
WHERE t.id = v.id AND t.deleted_at IS NULL`

	if _, err := r.db.Exec(ctx, sql, ids, discs, numbers, cmd.UpdatedAt); err != nil {
		return fmt.Errorf("failed to update track positions: %w", err)
	}

	return nil
}

func (r *PgxRepo) DeleteTrack(ctx context.Context, cmd dto.DeleteTrackCommand) error {
	tag, err := r.db.Exec(ctx,
		"UPDATE tracks SET deleted_at = $2, updated_at = $2 WHERE id = $1 AND deleted_at IS NULL",
		cmd.ID, cmd.DeletedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to delete track: %w", err)
	}

	if tag.RowsAffected() == 0 {
		return errors.Join(usecases.ErrTrackNotFound, pgx.ErrNoRows)
	}

	return nil
}
