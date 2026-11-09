package usecases

import (
	"context"
	"errors"
	"fmt"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/view_models"
	"github.com/lyweze/femin-xd-lol/backend/pkg/ozzoext"
)

type GetItemIn struct {
	ID uuid.UUID
}

func (i GetItemIn) Validate() error {
	return validation.ValidateStruct(&i, //nolint:wrapcheck
		validation.Field(&i.ID, ozzoext.NotNilUUID),
	)
}

type GetItemOut struct {
	Item view_models.Item
}

func (u *ExampleUsecases) GetItem(ctx context.Context, in GetItemIn) (GetItemOut, error) {
	if err := in.Validate(); err != nil {
		return GetItemOut{}, errors.Join(ErrValidation, err)
	}

	repo := u.repoHandler.GetRepoRO()

	// may return:
	// - [ErrItemNotFound] if no item with such ID exists
	result, err := repo.GetItem(ctx, dto.GetItemQuery{ID: in.ID})
	if err != nil {
		return GetItemOut{}, fmt.Errorf("failed to get item: %w", err)
	}

	presenter := &Presenter{}

	return GetItemOut{
		Item: presenter.Item(result.Result),
	}, nil
}
