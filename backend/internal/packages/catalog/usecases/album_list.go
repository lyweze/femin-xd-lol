package usecases

import (
	"context"
	"errors"
	"fmt"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/view_models"
)

type ListAlbumsIn struct {
	Search   *string    `json:"q"`
	ArtistID *uuid.UUID `json:"artist_id"`
	Page     PageIn     `json:"page"`
}

func (i ListAlbumsIn) Validate() error {
	return validation.ValidateStruct(&i.Page, pageRules(&i.Page)...) //nolint:wrapcheck
}

type ListAlbumsOut struct {
	Items      []view_models.Album
	NextCursor *string
}

// ListAlbums отдаёт альбомы в любом состоянии, включая черновики.
func (u *CatalogUsecases) ListAlbums(ctx context.Context, in ListAlbumsIn) (ListAlbumsOut, error) {
	if err := in.Validate(); err != nil {
		return ListAlbumsOut{}, errors.Join(ErrValidation, err)
	}

	page, err := in.Page.toPage()
	if err != nil {
		return ListAlbumsOut{}, err
	}

	result, err := u.repoHandler.GetRepoRO().ListAlbums(ctx, dto.ListAlbumsQuery{
		Search:   in.Search,
		ArtistID: in.ArtistID,
		Page:     page,
	})
	if err != nil {
		return ListAlbumsOut{}, fmt.Errorf("failed to list albums: %w", err)
	}

	items, next := cutPage(result.Items, page)
	presenter := &Presenter{}

	return ListAlbumsOut{Items: presenter.Albums(items), NextCursor: next}, nil
}
