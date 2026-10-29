package usecases

import (
	"context"
	"errors"
	"fmt"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/view_models"
)

const (
	itemTitleMaxLen       = 255
	itemDescriptionMaxLen = 4096
)

type CreateItemIn struct {
	Title       string
	Description string
}

func (i CreateItemIn) Validate() error {
	return validation.ValidateStruct(&i, //nolint:wrapcheck
		validation.Field(&i.Title, validation.Required, validation.RuneLength(1, itemTitleMaxLen)),
		validation.Field(&i.Description, validation.RuneLength(0, itemDescriptionMaxLen)),
	)
}

type CreateItemOut struct {
	Item view_models.Item
}

func (u *Usecases) CreateItem(ctx context.Context, in CreateItemIn) (CreateItemOut, error) {
	if err := in.Validate(); err != nil {
		return CreateItemOut{}, errors.Join(ErrValidation, err)
	}

	now := u.timeProvider.Now()

	var out CreateItemOut

	err := u.repoHandler.WithTxRW(ctx, func(repo Repo, _ Outbox) error {
		result, err := repo.CreateItem(ctx, dto.CreateItemCommand{
			ID:          u.uuidProvider.New(),
			Title:       in.Title,
			Description: in.Description,
			CreatedAt:   now,
			UpdatedAt:   now,
		})
		if err != nil {
			return fmt.Errorf("failed to create item: %w", err)
		}

		presenter := &Presenter{}
		out.Item = presenter.Item(result.Result)

		return nil
	})
	if err != nil {
		return CreateItemOut{}, fmt.Errorf("failed to execute transaction: %w", err)
	}

	return out, nil
}
