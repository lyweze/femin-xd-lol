package repo

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/lyweze/femin-xd-lol/backend/internal/entities"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/dto"
)

func (r *PgxRepo) CreateItem(ctx context.Context, cmd dto.CreateItemCommand) (dto.CreateItemResult, error) {
	query := builder().NewInsertBuilder()
	query.InsertInto(entities.ItemTableName)
	query.Cols(
		entities.ItemIDCol,
		entities.ItemTitleCol,
		entities.ItemDescriptionCol,
		entities.ItemCreatedAtCol,
		entities.ItemUpdatedAtCol,
	)
	query.Values(
		cmd.ID,
		cmd.Title,
		cmd.Description,
		cmd.CreatedAt,
		cmd.UpdatedAt,
	)
	query.SQL("RETURNING " + strings.Join(entities.ItemCols, ", "))

	sql, args := query.Build()

	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return dto.CreateItemResult{}, fmt.Errorf("failed to execute insert: %w", err)
	}
	defer rows.Close()

	entity, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[entities.Item])
	if err != nil {
		return dto.CreateItemResult{}, fmt.Errorf("failed to collect row: %w", err)
	}

	return dto.CreateItemResult{
		Result: itemToModel(entity),
	}, nil
}
