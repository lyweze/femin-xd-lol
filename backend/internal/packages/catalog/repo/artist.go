package repo

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/huandu/go-sqlbuilder"
	"github.com/jackc/pgx/v5"
	"github.com/lyweze/femin-xd-lol/backend/internal/entities"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/repositories"
)

func artistToModel(entity entities.Artist) *models.Artist {
	artist := models.NewArtist(entity.ID)
	artist.SetName(entity.Name)
	artist.SetBio(entity.Bio)
	artist.SetAvatarKey(nullToPtr(entity.AvatarKey))
	artist.SetCreatedAt(entity.CreatedAt)
	artist.SetUpdatedAt(entity.UpdatedAt)

	return artist
}

func (r *PgxRepo) selectArtists(ctx context.Context, sql string, args []any) ([]*models.Artist, error) {
	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %w", err)
	}
	defer rows.Close()

	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[entities.Artist])
	if err != nil {
		return nil, fmt.Errorf("failed to collect rows: %w", err)
	}

	artists := make([]*models.Artist, 0, len(items))
	for _, item := range items {
		artists = append(artists, artistToModel(item))
	}

	return artists, nil
}

func newArtistsSelect() *sqlbuilder.SelectBuilder {
	query := builder().NewSelectBuilder()
	query.Select(entities.ArtistCols...)
	query.From(entities.ArtistTableName)
	query.Where(query.IsNull(entities.ArtistDeletedAtCol))

	return query
}

func (r *PgxRepo) ListArtists(ctx context.Context, q dto.ListArtistsQuery) (dto.ListArtistsResult, error) {
	query := newArtistsSelect()

	if q.Search != nil {
		query.Where(query.ILike(entities.ArtistNameCol, repositories.ContainsPattern(*q.Search)))
	}

	applyPage(query, entities.ArtistIDCol, q.Page)

	sql, args := query.Build()

	artists, err := r.selectArtists(ctx, sql, args)
	if err != nil {
		return dto.ListArtistsResult{}, err
	}

	return dto.ListArtistsResult{Items: artists}, nil
}

func (r *PgxRepo) GetArtist(ctx context.Context, q dto.GetArtistQuery) (dto.GetArtistResult, error) {
	query := newArtistsSelect()
	query.Where(query.Equal(entities.ArtistIDCol, q.ID))
	applyLock(query, entities.ArtistTableName, q.Lock)

	sql, args := query.Build()

	artists, err := r.selectArtists(ctx, sql, args)
	if err != nil {
		return dto.GetArtistResult{}, err
	}

	if len(artists) == 0 {
		return dto.GetArtistResult{}, usecases.ErrArtistNotFound
	}

	return dto.GetArtistResult{Result: artists[0]}, nil
}

func (r *PgxRepo) GetArtists(ctx context.Context, q dto.GetArtistsQuery) (dto.GetArtistsResult, error) {
	query := newArtistsSelect()
	query.Where(spf("%s = ANY(%s)", entities.ArtistIDCol, query.Var(q.IDs)))
	// Один порядок блокировок во всех транзакциях, чтобы они не ждали друг друга по кругу.
	query.OrderBy(entities.ArtistIDCol)
	applyLock(query, entities.ArtistTableName, q.Lock)

	sql, args := query.Build()

	artists, err := r.selectArtists(ctx, sql, args)
	if err != nil {
		return dto.GetArtistsResult{}, err
	}

	return dto.GetArtistsResult{Items: artists}, nil
}

func (r *PgxRepo) CreateArtist(ctx context.Context, cmd dto.CreateArtistCommand) (dto.CreateArtistResult, error) {
	query := builder().NewInsertBuilder()
	query.InsertInto(entities.ArtistTableName)
	query.Cols(
		entities.ArtistIDCol,
		entities.ArtistNameCol,
		entities.ArtistBioCol,
		entities.ArtistCreatedAtCol,
		entities.ArtistUpdatedAtCol,
	)
	query.Values(cmd.ID, cmd.Name, cmd.Bio, cmd.CreatedAt, cmd.UpdatedAt)
	query.SQL("RETURNING " + strings.Join(entities.ArtistCols, ", "))

	sql, args := query.Build()

	artists, err := r.selectArtists(ctx, sql, args)
	if err != nil {
		return dto.CreateArtistResult{}, err
	}

	return dto.CreateArtistResult{Result: artists[0]}, nil
}

func (r *PgxRepo) UpdateArtist(ctx context.Context, cmd dto.UpdateArtistCommand) (dto.UpdateArtistResult, error) {
	query := builder().NewUpdateBuilder()
	query.Update(entities.ArtistTableName)

	assignments := []string{query.Assign(entities.ArtistUpdatedAtCol, cmd.UpdatedAt)}

	if cmd.Name != nil {
		assignments = append(assignments, query.Assign(entities.ArtistNameCol, *cmd.Name))
	}

	if cmd.Bio != nil {
		assignments = append(assignments, query.Assign(entities.ArtistBioCol, *cmd.Bio))
	}

	query.Set(assignments...)
	query.Where(query.Equal(entities.ArtistIDCol, cmd.ID), query.IsNull(entities.ArtistDeletedAtCol))
	query.SQL("RETURNING " + strings.Join(entities.ArtistCols, ", "))

	sql, args := query.Build()

	artists, err := r.selectArtists(ctx, sql, args)
	if err != nil {
		return dto.UpdateArtistResult{}, err
	}

	if len(artists) == 0 {
		return dto.UpdateArtistResult{}, usecases.ErrArtistNotFound
	}

	return dto.UpdateArtistResult{Result: artists[0]}, nil
}

func (r *PgxRepo) CountArtistUsage(ctx context.Context, q dto.CountArtistUsageQuery) (dto.CountArtistUsageResult, error) {
	const sql = `
SELECT
	(SELECT count(*) FROM album_artists aa JOIN albums al ON al.id = aa.album_id
	 WHERE aa.artist_id = $1 AND al.deleted_at IS NULL),
	(SELECT count(*) FROM track_artists ta JOIN tracks t ON t.id = ta.track_id
	 WHERE ta.artist_id = $1 AND t.deleted_at IS NULL)`

	var result dto.CountArtistUsageResult

	if err := r.db.QueryRow(ctx, sql, q.ID).Scan(&result.Albums, &result.Tracks); err != nil {
		return dto.CountArtistUsageResult{}, fmt.Errorf("failed to count artist usage: %w", err)
	}

	return result, nil
}

func (r *PgxRepo) DeleteArtist(ctx context.Context, cmd dto.DeleteArtistCommand) error {
	tag, err := r.db.Exec(ctx,
		"UPDATE artists SET deleted_at = $2, updated_at = $2 WHERE id = $1 AND deleted_at IS NULL",
		cmd.ID, cmd.DeletedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to delete artist: %w", err)
	}

	if tag.RowsAffected() == 0 {
		return errors.Join(usecases.ErrArtistNotFound, pgx.ErrNoRows)
	}

	return nil
}
