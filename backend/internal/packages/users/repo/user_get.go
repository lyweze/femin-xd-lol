package repo

import (
	"context"
	"errors"
	"fmt"

	"github.com/huandu/go-sqlbuilder"
	"github.com/jackc/pgx/v5"
	"github.com/lyweze/femin-xd-lol/backend/internal/entities"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/usecases"
)

func (r *PgxRepo) GetUser(ctx context.Context, q dto.GetUserQuery) (dto.GetUserResult, error) {
	query := builder().NewSelectBuilder()
	query.Select(entities.UserCols...)
	query.From(entities.UserTableName)

	query.Where(
		query.Equal(entities.UserIDCol, q.ID),
		query.IsNull(entities.UserDeletedAtCol),
	)

	user, err := r.getOne(ctx, query)
	if err != nil {
		return dto.GetUserResult{}, err
	}

	return dto.GetUserResult{Result: user}, nil
}

func (r *PgxRepo) GetUserByEmail(ctx context.Context, q dto.GetUserByEmailQuery) (dto.GetUserByEmailResult, error) {
	query := builder().NewSelectBuilder()
	query.Select(entities.UserCols...)
	query.From(entities.UserTableName)

	query.Where(
		spf("lower(%s) = lower(%s)", entities.UserEmailCol, query.Var(q.Email)),
		query.IsNull(entities.UserDeletedAtCol),
	)

	user, err := r.getOne(ctx, query)
	if err != nil {
		return dto.GetUserByEmailResult{}, err
	}

	return dto.GetUserByEmailResult{Result: user}, nil
}

func (r *PgxRepo) getOne(ctx context.Context, query *sqlbuilder.SelectBuilder) (*models.User, error) {
	sql, args := query.Build()

	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to execute select: %w", err)
	}
	defer rows.Close()

	entity, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[entities.User])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.Join(usecases.ErrUserNotFound, err)
		}

		return nil, fmt.Errorf("failed to collect row: %w", err)
	}

	return userToModel(entity), nil
}
