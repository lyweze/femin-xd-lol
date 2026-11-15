package usecases

import (
	"context"
	"errors"
	"fmt"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/view_models"
)

type ListTracksIn struct {
	Search  *string
	AlbumID *uuid.UUID
	Status  *models.TrackStatus
	Page    PageIn
}

func (i ListTracksIn) Validate() error {
	if err := validation.ValidateStruct(&i,
		validation.Field(&i.Status, validation.NilOrNotEmpty, validation.In(trackStatuses...)),
	); err != nil {
		return err //nolint:wrapcheck
	}

	return validation.ValidateStruct(&i.Page, pageRules(&i.Page)...) //nolint:wrapcheck
}

type ListTracksOut struct {
	Items      []view_models.Track
	NextCursor *string
}

func (u *CatalogUsecases) ListTracks(ctx context.Context, in ListTracksIn) (ListTracksOut, error) {
	if err := in.Validate(); err != nil {
		return ListTracksOut{}, errors.Join(ErrValidation, err)
	}

	page, err := in.Page.toPage()
	if err != nil {
		return ListTracksOut{}, err
	}

	result, err := u.repoHandler.GetRepoRO().ListTracks(ctx, dto.ListTracksQuery{
		Search:  in.Search,
		AlbumID: in.AlbumID,
		Status:  in.Status,
		Page:    page,
	})
	if err != nil {
		return ListTracksOut{}, fmt.Errorf("failed to list tracks: %w", err)
	}

	items, next := cutPage(result.Items, page)
	presenter := &Presenter{}

	return ListTracksOut{Items: presenter.Tracks(items), NextCursor: next}, nil
}
