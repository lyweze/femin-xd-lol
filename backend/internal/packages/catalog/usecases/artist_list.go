package usecases

import (
	"context"
	"errors"
	"fmt"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/view_models"
)

type ListArtistsIn struct {
	Search *string `json:"q"`
	Page   PageIn  `json:"page"`
}

func (i ListArtistsIn) Validate() error {
	return validation.ValidateStruct(&i.Page, pageRules(&i.Page)...) //nolint:wrapcheck
}

type ListArtistsOut struct {
	Items      []view_models.Artist
	NextCursor *string
}

func (u *CatalogUsecases) ListArtists(ctx context.Context, in ListArtistsIn) (ListArtistsOut, error) {
	if err := in.Validate(); err != nil {
		return ListArtistsOut{}, errors.Join(ErrValidation, err)
	}

	page, err := in.Page.toPage()
	if err != nil {
		return ListArtistsOut{}, err
	}

	result, err := u.repoHandler.GetRepoRO().ListArtists(ctx, dto.ListArtistsQuery{Search: in.Search, Page: page})
	if err != nil {
		return ListArtistsOut{}, fmt.Errorf("failed to list artists: %w", err)
	}

	items, next := cutPage(result.Items, page)
	presenter := &Presenter{}

	return ListArtistsOut{Items: presenter.Artists(items), NextCursor: next}, nil
}
