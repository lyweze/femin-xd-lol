package usecases

import (
	"context"
	"errors"
	"fmt"
	"strings"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/view_models"
	"github.com/lyweze/femin-xd-lol/backend/pkg/ozzoext"
)

// UpdateArtistIn меняет только переданные поля.
type UpdateArtistIn struct {
	ID   uuid.UUID `json:"id"`
	Name *string   `json:"name"`
	Bio  *string   `json:"bio"`
}

func (i UpdateArtistIn) Validate() error {
	return validation.ValidateStruct(&i, //nolint:wrapcheck
		validation.Field(&i.ID, ozzoext.NotNilUUID),
		validation.Field(&i.Name, validation.NilOrNotEmpty, validation.RuneLength(1, titleMaxLen)),
	)
}

type UpdateArtistOut struct {
	Artist view_models.Artist
}

func (u *CatalogUsecases) UpdateArtist(ctx context.Context, in UpdateArtistIn) (UpdateArtistOut, error) {
	if in.Name != nil {
		in.Name = new(strings.TrimSpace(*in.Name))
	}

	if err := in.Validate(); err != nil {
		return UpdateArtistOut{}, errors.Join(ErrValidation, err)
	}

	// may return:
	// - [ErrArtistNotFound] if no artist with such ID exists
	result, err := u.repoHandler.GetRepoRW().UpdateArtist(ctx, dto.UpdateArtistCommand{
		ID:        in.ID,
		Name:      in.Name,
		Bio:       in.Bio,
		UpdatedAt: u.timeProvider.Now(),
	})
	if err != nil {
		return UpdateArtistOut{}, fmt.Errorf("failed to update artist: %w", err)
	}

	presenter := &Presenter{}

	return UpdateArtistOut{Artist: presenter.Artist(result.Result)}, nil
}
