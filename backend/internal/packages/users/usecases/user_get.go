package usecases

import (
	"context"
	"errors"
	"fmt"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/view_models"
	"github.com/lyweze/femin-xd-lol/backend/pkg/ozzoext"
)

type GetUserIn struct {
	ID uuid.UUID
}

func (i GetUserIn) Validate() error {
	return validation.ValidateStruct(&i, //nolint:wrapcheck
		validation.Field(&i.ID, ozzoext.NotNilUUID),
	)
}

type GetUserOut struct {
	User view_models.User
}

func (u *UsersUsecases) GetUser(ctx context.Context, in GetUserIn) (GetUserOut, error) {
	if err := in.Validate(); err != nil {
		return GetUserOut{}, errors.Join(ErrValidation, err)
	}

	// Читаем с мастера: по этому результату проверяется роль администратора,
	// отставшая реплика вернула бы снятую роль.
	repo := u.repoHandler.GetRepoRW()

	// may return:
	// - [ErrUserNotFound] if no user with such ID exists
	result, err := repo.GetUser(ctx, dto.GetUserQuery{ID: in.ID})
	if err != nil {
		return GetUserOut{}, fmt.Errorf("failed to get user: %w", err)
	}

	presenter := &Presenter{}

	return GetUserOut{
		User: presenter.User(result.Result),
	}, nil
}
