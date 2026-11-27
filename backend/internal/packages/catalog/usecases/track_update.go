package usecases

import (
	"context"
	"errors"
	"fmt"
	"strings"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/view_models"
	"github.com/lyweze/femin-xd-lol/backend/pkg/ozzoext"
)

// UpdateTrackIn меняет только переданные поля. Artists заменяет список целиком.
// Порядок в альбоме меняется через SetAlbumTrackOrder.
type UpdateTrackIn struct {
	ID       uuid.UUID                  `json:"id"`
	Title    *string                    `json:"title"`
	Explicit *bool                      `json:"explicit"`
	Artists  *[]models.TrackArtistInput `json:"artists"`
}

func (i UpdateTrackIn) Validate() error {
	return validation.ValidateStruct(&i, //nolint:wrapcheck
		validation.Field(&i.ID, ozzoext.NotNilUUID),
		validation.Field(&i.Title, validation.NilOrNotEmpty, validation.RuneLength(1, titleMaxLen)),
		validation.Field(&i.Artists, validation.By(func(value any) error {
			artists, _ := value.(*[]models.TrackArtistInput)
			if artists == nil {
				return nil
			}

			return validateTrackArtists(*artists)
		})),
	)
}

type UpdateTrackOut struct {
	Track view_models.Track
}

func (u *CatalogUsecases) UpdateTrack(ctx context.Context, in UpdateTrackIn) (UpdateTrackOut, error) {
	if in.Title != nil {
		in.Title = new(strings.TrimSpace(*in.Title))
	}

	if err := in.Validate(); err != nil {
		return UpdateTrackOut{}, errors.Join(ErrValidation, err)
	}

	now := u.timeProvider.Now()

	var out UpdateTrackOut

	err := u.repoHandler.WithTxRW(ctx, func(repo Repo) error {
		// may return:
		// - [ErrTrackNotFound] if no track with such ID exists
		if _, err := repo.GetTrack(ctx, dto.GetTrackQuery{ID: in.ID, Lock: dto.LockUpdate}); err != nil {
			return fmt.Errorf("failed to get track: %w", err)
		}

		if in.Artists != nil {
			if err := lockArtists(ctx, repo, trackArtistIDs(*in.Artists)); err != nil {
				return err
			}
		}

		result, err := repo.UpdateTrack(ctx, dto.UpdateTrackCommand{
			ID:        in.ID,
			Title:     in.Title,
			Explicit:  in.Explicit,
			Artists:   in.Artists,
			UpdatedAt: now,
		})
		if err != nil {
			return fmt.Errorf("failed to update track: %w", err)
		}

		presenter := &Presenter{}
		out.Track = presenter.Track(result.Result)

		return nil
	})
	if err != nil {
		return UpdateTrackOut{}, fmt.Errorf("failed to execute transaction: %w", err)
	}

	return out, nil
}
