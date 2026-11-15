package usecases

import (
	"context"
	"errors"
	"fmt"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/view_models"
	"github.com/lyweze/femin-xd-lol/backend/pkg/ozzoext"
)

type GetTrackIn struct {
	ID uuid.UUID
}

func (i GetTrackIn) Validate() error {
	return validation.ValidateStruct(&i, //nolint:wrapcheck
		validation.Field(&i.ID, ozzoext.NotNilUUID),
	)
}

type GetTrackOut struct {
	Track view_models.Track
}

func (u *CatalogUsecases) GetTrack(ctx context.Context, in GetTrackIn) (GetTrackOut, error) {
	if err := in.Validate(); err != nil {
		return GetTrackOut{}, errors.Join(ErrValidation, err)
	}

	// may return:
	// - [ErrTrackNotFound] if no track with such ID exists
	result, err := u.repoHandler.GetRepoRO().GetTrack(ctx, dto.GetTrackQuery{ID: in.ID, Lock: dto.LockNone})
	if err != nil {
		return GetTrackOut{}, fmt.Errorf("failed to get track: %w", err)
	}

	presenter := &Presenter{}

	return GetTrackOut{Track: presenter.Track(result.Result)}, nil
}
