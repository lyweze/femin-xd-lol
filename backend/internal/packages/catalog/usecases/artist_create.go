package usecases

import (
	"context"
	"errors"
	"fmt"
	"strings"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/view_models"
)

type CreateArtistIn struct {
	Name string
	Bio  string
}

func (i CreateArtistIn) Validate() error {
	return validation.ValidateStruct(&i, //nolint:wrapcheck
		validation.Field(&i.Name, validation.Required, validation.RuneLength(1, titleMaxLen)),
	)
}

type CreateArtistOut struct {
	Artist view_models.Artist
}

func (u *CatalogUsecases) CreateArtist(ctx context.Context, in CreateArtistIn) (CreateArtistOut, error) {
	in.Name = strings.TrimSpace(in.Name)

	if err := in.Validate(); err != nil {
		return CreateArtistOut{}, errors.Join(ErrValidation, err)
	}

	now := u.timeProvider.Now()

	result, err := u.repoHandler.GetRepoRW().CreateArtist(ctx, dto.CreateArtistCommand{
		ID:        u.uuidProvider.New(),
		Name:      in.Name,
		Bio:       in.Bio,
		CreatedAt: now,
		UpdatedAt: now,
	})
	if err != nil {
		return CreateArtistOut{}, fmt.Errorf("failed to create artist: %w", err)
	}

	presenter := &Presenter{}

	return CreateArtistOut{Artist: presenter.Artist(result.Result)}, nil
}
