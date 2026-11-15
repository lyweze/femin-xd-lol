package usecases

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/view_models"
	"github.com/lyweze/femin-xd-lol/backend/pkg/ozzoext"
)

// UpdateAlbumIn меняет только переданные поля. ArtistIDs заменяет список целиком.
type UpdateAlbumIn struct {
	ID          uuid.UUID
	Title       *string
	Type        *models.AlbumType
	ReleaseDate *time.Time
	ArtistIDs   *[]uuid.UUID
}

func (i UpdateAlbumIn) Validate() error {
	return validation.ValidateStruct(&i, //nolint:wrapcheck
		validation.Field(&i.ID, ozzoext.NotNilUUID),
		validation.Field(&i.Title, validation.NilOrNotEmpty, validation.RuneLength(1, titleMaxLen)),
		validation.Field(&i.Type, validation.NilOrNotEmpty, validation.In(albumTypes...)),
		validation.Field(&i.ArtistIDs, validation.NilOrNotEmpty, validation.By(func(value any) error {
			ids, _ := value.(*[]uuid.UUID)
			if ids == nil {
				return nil
			}

			return uniqueIDs(*ids)
		})),
	)
}

type UpdateAlbumOut struct {
	Album view_models.Album
}

func (u *CatalogUsecases) UpdateAlbum(ctx context.Context, in UpdateAlbumIn) (UpdateAlbumOut, error) {
	if in.Title != nil {
		in.Title = new(strings.TrimSpace(*in.Title))
	}

	if err := in.Validate(); err != nil {
		return UpdateAlbumOut{}, errors.Join(ErrValidation, err)
	}

	now := u.timeProvider.Now()

	var out UpdateAlbumOut

	err := u.repoHandler.WithTxRW(ctx, func(repo Repo) error {
		// may return:
		// - [ErrAlbumNotFound] if no album with such ID exists
		if _, err := repo.GetAlbum(ctx, dto.GetAlbumQuery{ID: in.ID, Lock: dto.LockUpdate}); err != nil {
			return fmt.Errorf("failed to get album: %w", err)
		}

		if in.ArtistIDs != nil {
			if err := lockArtists(ctx, repo, *in.ArtistIDs); err != nil {
				return err
			}
		}

		result, err := repo.UpdateAlbum(ctx, dto.UpdateAlbumCommand{
			ID:          in.ID,
			Title:       in.Title,
			Type:        in.Type,
			ReleaseDate: in.ReleaseDate,
			ArtistIDs:   in.ArtistIDs,
			UpdatedAt:   now,
		})
		if err != nil {
			return fmt.Errorf("failed to update album: %w", err)
		}

		presenter := &Presenter{}
		out.Album = presenter.Album(result.Result)

		return nil
	})
	if err != nil {
		return UpdateAlbumOut{}, fmt.Errorf("failed to execute transaction: %w", err)
	}

	return out, nil
}
