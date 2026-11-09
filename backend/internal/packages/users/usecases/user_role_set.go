package usecases

import (
	"context"
	"errors"
	"fmt"
	"slices"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/view_models"
	"github.com/lyweze/femin-xd-lol/backend/pkg/ozzoext"
)

type SetUserRoleIn struct {
	ActorID uuid.UUID
	UserID  uuid.UUID
	Role    models.UserRole
}

func (i SetUserRoleIn) Validate() error {
	return validation.ValidateStruct(&i, //nolint:wrapcheck
		validation.Field(&i.ActorID, ozzoext.NotNilUUID),
		validation.Field(&i.UserID, ozzoext.NotNilUUID),
		validation.Field(&i.Role, validation.Required, validation.In(models.UserRoleUser, models.UserRoleAdmin)),
	)
}

type SetUserRoleOut struct {
	User view_models.User
}

func (u *UsersUsecases) SetUserRole(ctx context.Context, in SetUserRoleIn) (SetUserRoleOut, error) {
	if err := in.Validate(); err != nil {
		return SetUserRoleOut{}, errors.Join(ErrValidation, err)
	}

	if in.ActorID == in.UserID && in.Role != models.UserRoleAdmin {
		return SetUserRoleOut{}, ErrCannotDemoteSelf
	}

	now := u.timeProvider.Now()

	var out SetUserRoleOut

	err := u.repoHandler.WithTxRW(ctx, func(repo Repo) error {
		// Блокировка и проверка под ней нужны для двух админов, снимающих роль друг
		// с друга одновременно. Второй дождётся первого и уже не окажется в списке,
		// поэтому инициатор остаётся админом, и хотя бы один админ есть всегда.
		admins, err := repo.LockAdmins(ctx)
		if err != nil {
			return fmt.Errorf("failed to lock admins: %w", err)
		}

		if !slices.Contains(admins.IDs, in.ActorID) {
			return ErrActorNotAdmin
		}

		// may return:
		// - [ErrUserNotFound] if no user with such ID exists
		result, err := repo.UpdateUserRole(ctx, dto.UpdateUserRoleCommand{
			ID:        in.UserID,
			Role:      in.Role,
			UpdatedAt: now,
		})
		if err != nil {
			return fmt.Errorf("failed to update user role: %w", err)
		}

		presenter := &Presenter{}
		out.User = presenter.User(result.Result)

		return nil
	})
	if err != nil {
		return SetUserRoleOut{}, fmt.Errorf("failed to execute transaction: %w", err)
	}

	return out, nil
}
