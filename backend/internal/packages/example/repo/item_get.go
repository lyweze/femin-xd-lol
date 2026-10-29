package repo

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/lyweze/femin-xd-lol/backend/internal/entities"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/usecases"
)

func (r *PgxRepo) GetItem(ctx context.Context, q dto.GetItemQuery) (dto.GetItemResult, error) {
	query := builder().NewSelectBuilder()
	query.Select(entities.ItemCols...)
	query.From(entities.ItemTableName)

	query.Where(
		query.Equal(entities.ItemIDCol, q.ID),
		query.IsNull(entities.ItemDeletedAtCol),
	)

	sql, args := query.Build()

	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return dto.GetItemResult{}, fmt.Errorf("failed to execute select: %w", err)
	}
	defer rows.Close()

	entity, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[entities.Item])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return dto.GetItemResult{}, errors.Join(usecases.ErrItemNotFound, err)
		}

		return dto.GetItemResult{}, fmt.Errorf("failed to collect row: %w", err)
	}

	return dto.GetItemResult{
		Result: itemToModel(entity),
	}, nil
}
