package usecases

import (
	"context"
	"errors"
	"fmt"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/view_models"
)

const (
	usersPageDefaultLimit = 20
	usersPageMaxLimit     = 100
)

type ListUsersIn struct {
	Search *string
	Role   *models.UserRole
	Limit  *int
	Cursor *string
}

func (i ListUsersIn) Validate() error {
	return validation.ValidateStruct(&i, //nolint:wrapcheck
		validation.Field(&i.Role, validation.In(models.UserRoleUser, models.UserRoleAdmin)),
		// Min(1) здесь не подходит: ozzo считает ноль пустым значением и пропускает его.
		validation.Field(&i.Limit, validation.By(limitInRange)),
	)
}

func limitInRange(value any) error {
	limit, ok := value.(*int)
	if !ok {
		return fmt.Errorf("invalid type: expected *int, got %T", value)
	}

	if limit != nil && (*limit < 1 || *limit > usersPageMaxLimit) {
		return fmt.Errorf("must be between 1 and %d", usersPageMaxLimit)
	}

	return nil
}

type ListUsersOut struct {
	Items      []view_models.User
	NextCursor *string
}

func (u *UsersUsecases) ListUsers(ctx context.Context, in ListUsersIn) (ListUsersOut, error) {
	if err := in.Validate(); err != nil {
		return ListUsersOut{}, errors.Join(ErrValidation, err)
	}

	// Курсор это id последней строки: UUIDv7 растёт со временем, поэтому порядок
	// по id совпадает с порядком по дате создания.
	var afterID *uuid.UUID

	if in.Cursor != nil {
		id, err := uuid.Parse(*in.Cursor)
		if err != nil {
			return ListUsersOut{}, errors.Join(ErrValidation, fmt.Errorf("invalid cursor: %w", err))
		}

		afterID = &id
	}

	limit := usersPageDefaultLimit
	if in.Limit != nil {
		limit = *in.Limit
	}

	repo := u.repoHandler.GetRepoRO()

	// Просим на одну строку больше, чтобы понять, есть ли следующая страница.
	result, err := repo.ListUsers(ctx, dto.ListUsersQuery{
		Search:  in.Search,
		Role:    in.Role,
		AfterID: afterID,
		Limit:   limit + 1,
	})
	if err != nil {
		return ListUsersOut{}, fmt.Errorf("failed to list users: %w", err)
	}

	users := result.Items

	var nextCursor *string

	if len(users) > limit {
		users = users[:limit]
		cursor := users[limit-1].ID().String()
		nextCursor = &cursor
	}

	presenter := &Presenter{}

	items := make([]view_models.User, 0, len(users))
	for _, user := range users {
		items = append(items, presenter.User(user))
	}

	return ListUsersOut{
		Items:      items,
		NextCursor: nextCursor,
	}, nil
}
