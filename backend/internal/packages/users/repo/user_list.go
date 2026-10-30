package repo

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/lyweze/femin-xd-lol/backend/internal/entities"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
)

//nolint:gochecknoglobals
var likeEscaper = strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)

func (r *PgxRepo) ListUsers(ctx context.Context, q dto.ListUsersQuery) (dto.ListUsersResult, error) {
	query := builder().NewSelectBuilder()
	query.Select(entities.UserCols...)
	query.From(entities.UserTableName)

	query.Where(query.IsNull(entities.UserDeletedAtCol))

	if q.Search != nil {
		pattern := "%" + likeEscaper.Replace(*q.Search) + "%"

		query.Where(query.Or(
			query.ILike(entities.UserEmailCol, pattern),
			query.ILike(entities.UserUsernameCol, pattern),
		))
	}

	if q.Role != nil {
		query.Where(query.Equal(entities.UserRoleCol, string(*q.Role)))
	}

	if q.AfterID != nil {
		query.Where(query.LessThan(entities.UserIDCol, *q.AfterID))
	}

	query.OrderBy(entities.UserIDCol).Desc()
	query.Limit(q.Limit)

	sql, args := query.Build()

	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return dto.ListUsersResult{}, fmt.Errorf("failed to execute select: %w", err)
	}
	defer rows.Close()

	entitiesList, err := pgx.CollectRows(rows, pgx.RowToStructByName[entities.User])
	if err != nil {
		return dto.ListUsersResult{}, fmt.Errorf("failed to collect rows: %w", err)
	}

	items := make([]*models.User, 0, len(entitiesList))
	for _, entity := range entitiesList {
		items = append(items, userToModel(entity))
	}

	return dto.ListUsersResult{Items: items}, nil
}
