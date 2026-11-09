package repo

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/lyweze/femin-xd-lol/backend/internal/entities"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/usecases"
)

func (r *PgxRepo) LockAdmins(ctx context.Context) (dto.LockAdminsResult, error) {
	query := builder().NewSelectBuilder()
	query.Select(entities.UserIDCol)
	query.From(entities.UserTableName)

	query.Where(
		query.Equal(entities.UserRoleCol, string(models.UserRoleAdmin)),
		query.IsNull(entities.UserDeletedAtCol),
	)

	query.OrderBy(entities.UserIDCol)
	query.SQL("FOR UPDATE")

	sql, args := query.Build()

	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return dto.LockAdminsResult{}, fmt.Errorf("failed to execute select: %w", err)
	}
	defer rows.Close()

	ids, err := pgx.CollectRows(rows, pgx.RowTo[uuid.UUID])
	if err != nil {
		return dto.LockAdminsResult{}, fmt.Errorf("failed to collect rows: %w", err)
	}

	return dto.LockAdminsResult{IDs: ids}, nil
}

func (r *PgxRepo) UpdateUserRole(ctx context.Context, cmd dto.UpdateUserRoleCommand) (dto.UpdateUserRoleResult, error) {
	query := builder().NewUpdateBuilder()
	query.Update(entities.UserTableName)

	query.Set(
		query.Assign(entities.UserRoleCol, string(cmd.Role)),
		query.Assign(entities.UserUpdatedAtCol, cmd.UpdatedAt),
	)

	query.Where(
		query.Equal(entities.UserIDCol, cmd.ID),
		query.IsNull(entities.UserDeletedAtCol),
	)

	query.SQL("RETURNING " + strings.Join(entities.UserCols, ", "))

	sql, args := query.Build()

	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return dto.UpdateUserRoleResult{}, fmt.Errorf("failed to execute update: %w", err)
	}
	defer rows.Close()

	entity, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[entities.User])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return dto.UpdateUserRoleResult{}, errors.Join(usecases.ErrUserNotFound, err)
		}

		return dto.UpdateUserRoleResult{}, fmt.Errorf("failed to collect row: %w", err)
	}

	return dto.UpdateUserRoleResult{Result: userToModel(entity)}, nil
}
