package repo

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/lyweze/femin-xd-lol/backend/internal/entities"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/usecases"
)

func (r *PgxRepo) CreateUser(ctx context.Context, cmd dto.CreateUserCommand) (dto.CreateUserResult, error) {
	query := builder().NewInsertBuilder()
	query.InsertInto(entities.UserTableName)
	query.Cols(
		entities.UserIDCol,
		entities.UserEmailCol,
		entities.UserUsernameCol,
		entities.UserPasswordHashCol,
		entities.UserRoleCol,
		entities.UserCreatedAtCol,
		entities.UserUpdatedAtCol,
	)
	query.Values(
		cmd.ID,
		cmd.Email,
		cmd.Username,
		cmd.PasswordHash,
		string(cmd.Role),
		cmd.CreatedAt,
		cmd.UpdatedAt,
	)
	query.SQL("RETURNING " + strings.Join(entities.UserCols, ", "))

	sql, args := query.Build()

	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return dto.CreateUserResult{}, fmt.Errorf("failed to execute insert: %w", err)
	}
	defer rows.Close()

	entity, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[entities.User])
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgUniqueViolation {
			return dto.CreateUserResult{}, errors.Join(usecases.ErrUserAlreadyExists, err)
		}

		return dto.CreateUserResult{}, fmt.Errorf("failed to collect row: %w", err)
	}

	return dto.CreateUserResult{
		Result: userToModel(entity),
	}, nil
}
