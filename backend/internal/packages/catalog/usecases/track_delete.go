package usecases

import (
	"context"
	"errors"
	"fmt"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/lyweze/femin-xd-lol/backend/pkg/ozzoext"
)

type DeleteTrackIn struct {
	ID uuid.UUID
}

func (i DeleteTrackIn) Validate() error {
	return validation.ValidateStruct(&i, //nolint:wrapcheck
		validation.Field(&i.ID, ozzoext.NotNilUUID),
	)
}

// DeleteTrack мягко удаляет трек. Лайки и записи в плейлистах остаются.
func (u *CatalogUsecases) DeleteTrack(ctx context.Context, in DeleteTrackIn) error {
	if err := in.Validate(); err != nil {
		return errors.Join(ErrValidation, err)
	}

	// may return:
	// - [ErrTrackNotFound] if no track with such ID exists
	err := u.repoHandler.GetRepoRW().DeleteTrack(ctx, dto.DeleteTrackCommand{ID: in.ID, DeletedAt: u.timeProvider.Now()})
	if err != nil {
		return fmt.Errorf("failed to delete track: %w", err)
	}

	return nil
}
