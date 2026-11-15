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

type GetArtistIn struct {
	ID uuid.UUID
}

func (i GetArtistIn) Validate() error {
	return validation.ValidateStruct(&i, //nolint:wrapcheck
		validation.Field(&i.ID, ozzoext.NotNilUUID),
	)
}

type GetArtistOut struct {
	Artist view_models.Artist
}

func (u *CatalogUsecases) GetArtist(ctx context.Context, in GetArtistIn) (GetArtistOut, error) {
	if err := in.Validate(); err != nil {
		return GetArtistOut{}, errors.Join(ErrValidation, err)
	}

	// may return:
	// - [ErrArtistNotFound] if no artist with such ID exists
	result, err := u.repoHandler.GetRepoRO().GetArtist(ctx, dto.GetArtistQuery{ID: in.ID, Lock: dto.LockNone})
	if err != nil {
		return GetArtistOut{}, fmt.Errorf("failed to get artist: %w", err)
	}

	presenter := &Presenter{}

	return GetArtistOut{Artist: presenter.Artist(result.Result)}, nil
}
