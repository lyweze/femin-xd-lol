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

func newAlbumsSelect() *sqlbuilder.SelectBuilder {
	query := builder().NewSelectBuilder()
	query.Select(entities.AlbumCols...)
	query.From(entities.AlbumTableName)
	query.Where(query.IsNull(entities.AlbumDeletedAtCol))

	return query
}

// selectAlbums читает альбомы и дозагружает артистов и число треков двумя запросами на всю пачку.
func (r *PgxRepo) selectAlbums(ctx context.Context, sql string, args []any) ([]*models.Album, error) {
	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %w", err)
	}

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[entities.Album])
	if err != nil {
		return nil, fmt.Errorf("failed to collect rows: %w", err)
	}

	ids := make([]uuid.UUID, 0, len(items))
	for _, item := range items {
		ids = append(ids, item.ID)
	}

	artists, err := r.albumArtists(ctx, ids)
	if err != nil {
		return nil, err
	}

	counts, err := r.albumTrackCounts(ctx, ids)
	if err != nil {
		return nil, err
	}

	albums := make([]*models.Album, 0, len(items))

	for _, item := range items {
		album := models.NewAlbum(item.ID)
		album.SetTitle(item.Title)
		album.SetType(models.AlbumType(item.Type))
		album.SetReleaseDate(nullToPtr(item.ReleaseDate))
		album.SetCoverKey(nullToPtr(item.CoverKey))
		album.SetPublishedAt(nullToPtr(item.PublishedAt))
		album.SetArtists(append([]models.ArtistRef{}, artists[item.ID]...))
		album.SetTrackCount(counts[item.ID])
		album.SetCreatedAt(item.CreatedAt)
		album.SetUpdatedAt(item.UpdatedAt)

		albums = append(albums, album)
	}

	return albums, nil
}

func (r *PgxRepo) albumArtists(ctx context.Context, albumIDs []uuid.UUID) (map[uuid.UUID][]models.ArtistRef, error) {
	const sql = `
SELECT aa.album_id, a.id, a.name
FROM album_artists aa
JOIN artists a ON a.id = aa.artist_id
WHERE aa.album_id = ANY($1)
ORDER BY aa.album_id, aa.position`

	rows, err := r.db.Query(ctx, sql, albumIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to select album artists: %w", err)
	}
	defer rows.Close()

	result := make(map[uuid.UUID][]models.ArtistRef, len(albumIDs))

	for rows.Next() {
		var (
			albumID uuid.UUID
			artist  models.ArtistRef
		)

		if err := rows.Scan(&albumID, &artist.ID, &artist.Name); err != nil {
			return nil, fmt.Errorf("failed to scan album artist: %w", err)
		}

		result[albumID] = append(result[albumID], artist)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read album artists: %w", err)
	}

	return result, nil
}

func (r *PgxRepo) albumTrackCounts(ctx context.Context, albumIDs []uuid.UUID) (map[uuid.UUID]int, error) {
	const sql = `
SELECT album_id, count(*)
FROM tracks
WHERE album_id = ANY($1) AND deleted_at IS NULL
GROUP BY album_id`

	rows, err := r.db.Query(ctx, sql, albumIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to count album tracks: %w", err)
	}
	defer rows.Close()

	result := make(map[uuid.UUID]int, len(albumIDs))

	for rows.Next() {
		var (
			albumID uuid.UUID
			count   int
		)

		if err := rows.Scan(&albumID, &count); err != nil {
			return nil, fmt.Errorf("failed to scan track count: %w", err)
		}

		result[albumID] = count
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read track counts: %w", err)
	}

	return result, nil
}

func (r *PgxRepo) ListAlbums(ctx context.Context, q dto.ListAlbumsQuery) (dto.ListAlbumsResult, error) {
	query := newAlbumsSelect()

	if q.Search != nil {
		query.Where(query.ILike(entities.AlbumTitleCol, repositories.ContainsPattern(*q.Search)))
	}

	if q.ArtistID != nil {
		query.Where(spf("%s IN (SELECT %s FROM %s WHERE %s = %s)",
			entities.AlbumIDCol,
			entities.AlbumArtistAlbumIDCol,
			entities.AlbumArtistTableName,
			entities.AlbumArtistArtistIDCol,
			query.Var(*q.ArtistID),
		))
	}

	applyPage(query, entities.AlbumIDCol, q.Page)

	sql, args := query.Build()

	albums, err := r.selectAlbums(ctx, sql, args)
	if err != nil {
		return dto.ListAlbumsResult{}, err
	}

	return dto.ListAlbumsResult{Items: albums}, nil
}

func (r *PgxRepo) GetAlbum(ctx context.Context, q dto.GetAlbumQuery) (dto.GetAlbumResult, error) {
	query := newAlbumsSelect()
	query.Where(query.Equal(entities.AlbumIDCol, q.ID))
	applyLock(query, entities.AlbumTableName, q.Lock)

	sql, args := query.Build()

	albums, err := r.selectAlbums(ctx, sql, args)
	if err != nil {
		return dto.GetAlbumResult{}, err
	}

	if len(albums) == 0 {
		return dto.GetAlbumResult{}, usecases.ErrAlbumNotFound
	}

	return dto.GetAlbumResult{Result: albums[0]}, nil
}

func (r *PgxRepo) getAlbumAfterWrite(ctx context.Context, id uuid.UUID) (*models.Album, error) {
	result, err := r.GetAlbum(ctx, dto.GetAlbumQuery{ID: id, Lock: dto.LockNone})
	if err != nil {
		return nil, err
	}

	return result.Result, nil
}

func (r *PgxRepo) setAlbumArtists(ctx context.Context, albumID uuid.UUID, artistIDs []uuid.UUID) error {
	if _, err := r.db.Exec(ctx, "DELETE FROM album_artists WHERE album_id = $1", albumID); err != nil {
		return fmt.Errorf("failed to clear album artists: %w", err)
	}

	const sql = `
INSERT INTO album_artists (album_id, artist_id, position)
SELECT $1, a.id, (a.ord - 1)::smallint
FROM unnest($2::uuid[]) WITH ORDINALITY AS a(id, ord)`

	if _, err := r.db.Exec(ctx, sql, albumID, artistIDs); err != nil {
		return fmt.Errorf("failed to insert album artists: %w", err)
	}

	return nil
}

func (r *PgxRepo) CreateAlbum(ctx context.Context, cmd dto.CreateAlbumCommand) (dto.CreateAlbumResult, error) {
	query := builder().NewInsertBuilder()
	query.InsertInto(entities.AlbumTableName)
	query.Cols(
		entities.AlbumIDCol,
		entities.AlbumTitleCol,
		entities.AlbumTypeCol,
		entities.AlbumReleaseDateCol,
		entities.AlbumCreatedAtCol,
		entities.AlbumUpdatedAtCol,
	)
	query.Values(cmd.ID, cmd.Title, string(cmd.Type), cmd.ReleaseDate, cmd.CreatedAt, cmd.UpdatedAt)

	sql, args := query.Build()

	if _, err := r.db.Exec(ctx, sql, args...); err != nil {
		return dto.CreateAlbumResult{}, fmt.Errorf("failed to insert album: %w", err)
	}

	if err := r.setAlbumArtists(ctx, cmd.ID, cmd.ArtistIDs); err != nil {
		return dto.CreateAlbumResult{}, err
	}

	album, err := r.getAlbumAfterWrite(ctx, cmd.ID)
	if err != nil {
		return dto.CreateAlbumResult{}, err
	}

	return dto.CreateAlbumResult{Result: album}, nil
}

func (r *PgxRepo) UpdateAlbum(ctx context.Context, cmd dto.UpdateAlbumCommand) (dto.UpdateAlbumResult, error) {
	query := builder().NewUpdateBuilder()
	query.Update(entities.AlbumTableName)

	assignments := []string{query.Assign(entities.AlbumUpdatedAtCol, cmd.UpdatedAt)}

	if cmd.Title != nil {
		assignments = append(assignments, query.Assign(entities.AlbumTitleCol, *cmd.Title))
	}

	if cmd.Type != nil {
		assignments = append(assignments, query.Assign(entities.AlbumTypeCol, string(*cmd.Type)))
	}

	if cmd.ReleaseDate != nil {
		assignments = append(assignments, query.Assign(entities.AlbumReleaseDateCol, *cmd.ReleaseDate))
	}

	query.Set(assignments...)
	query.Where(query.Equal(entities.AlbumIDCol, cmd.ID), query.IsNull(entities.AlbumDeletedAtCol))

	if err := r.execOne(ctx, query, usecases.ErrAlbumNotFound); err != nil {
		return dto.UpdateAlbumResult{}, err
	}

	if cmd.ArtistIDs != nil {
		if err := r.setAlbumArtists(ctx, cmd.ID, *cmd.ArtistIDs); err != nil {
			return dto.UpdateAlbumResult{}, err
		}
	}

	album, err := r.getAlbumAfterWrite(ctx, cmd.ID)
	if err != nil {
		return dto.UpdateAlbumResult{}, err
	}

	return dto.UpdateAlbumResult{Result: album}, nil
}

func (r *PgxRepo) SetAlbumPublishedAt(ctx context.Context, cmd dto.SetAlbumPublishedAtCommand) (dto.SetAlbumPublishedAtResult, error) { //nolint:lll
	query := builder().NewUpdateBuilder()
	query.Update(entities.AlbumTableName)
	query.Set(
		query.Assign(entities.AlbumPublishedAtCol, cmd.PublishedAt),
		query.Assign(entities.AlbumUpdatedAtCol, cmd.UpdatedAt),
	)
	query.Where(query.Equal(entities.AlbumIDCol, cmd.ID), query.IsNull(entities.AlbumDeletedAtCol))

	if err := r.execOne(ctx, query, usecases.ErrAlbumNotFound); err != nil {
		return dto.SetAlbumPublishedAtResult{}, err
	}

	album, err := r.getAlbumAfterWrite(ctx, cmd.ID)
	if err != nil {
		return dto.SetAlbumPublishedAtResult{}, err
	}

	return dto.SetAlbumPublishedAtResult{Result: album}, nil
}

func (r *PgxRepo) DeleteAlbum(ctx context.Context, cmd dto.DeleteAlbumCommand) error {
	tag, err := r.db.Exec(ctx,
		"UPDATE albums SET deleted_at = $2, updated_at = $2 WHERE id = $1 AND deleted_at IS NULL",
		cmd.ID, cmd.DeletedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to delete album: %w", err)
	}

	if tag.RowsAffected() == 0 {
		return errors.Join(usecases.ErrAlbumNotFound, pgx.ErrNoRows)
	}

	if _, err := r.db.Exec(ctx,
		"UPDATE tracks SET deleted_at = $2, updated_at = $2 WHERE album_id = $1 AND deleted_at IS NULL",
		cmd.ID, cmd.DeletedAt,
	); err != nil {
		return fmt.Errorf("failed to delete album tracks: %w", err)
	}

	return nil
}

// execOne выполняет UPDATE и возвращает notFound, если строка не нашлась.
func (r *PgxRepo) execOne(ctx context.Context, query *sqlbuilder.UpdateBuilder, notFound error) error {
	sql, args := query.Build()

	tag, err := r.db.Exec(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("failed to execute update: %w", err)
	}

	if tag.RowsAffected() == 0 {
		return errors.Join(notFound, pgx.ErrNoRows)
	}

	return nil
}
