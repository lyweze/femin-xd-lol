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
)

type CreateAlbumIn struct {
	Title       string
	Type        models.AlbumType
	ReleaseDate *time.Time
	// ArtistIDs в порядке показа.
	ArtistIDs []uuid.UUID
}

func (i CreateAlbumIn) Validate() error {
	return validation.ValidateStruct(&i, //nolint:wrapcheck
		validation.Field(&i.Title, validation.Required, validation.RuneLength(1, titleMaxLen)),
		validation.Field(&i.Type, validation.Required, validation.In(albumTypes...)),
		validation.Field(&i.ArtistIDs, validation.Required, validation.By(uniqueIDs)),
	)
}

type CreateAlbumOut struct {
	Album view_models.Album
}

func (u *CatalogUsecases) CreateAlbum(ctx context.Context, in CreateAlbumIn) (CreateAlbumOut, error) {
	in.Title = strings.TrimSpace(in.Title)

	if err := in.Validate(); err != nil {
		return CreateAlbumOut{}, errors.Join(ErrValidation, err)
	}

	now := u.timeProvider.Now()

	var out CreateAlbumOut

	err := u.repoHandler.WithTxRW(ctx, func(repo Repo) error {
		if err := lockArtists(ctx, repo, in.ArtistIDs); err != nil {
			return err
		}

		result, err := repo.CreateAlbum(ctx, dto.CreateAlbumCommand{
			ID:          u.uuidProvider.New(),
			Title:       in.Title,
			Type:        in.Type,
			ReleaseDate: in.ReleaseDate,
			ArtistIDs:   in.ArtistIDs,
			CreatedAt:   now,
			UpdatedAt:   now,
		})
		if err != nil {
			return fmt.Errorf("failed to create album: %w", err)
		}

		presenter := &Presenter{}
		out.Album = presenter.Album(result.Result)

		return nil
	})
	if err != nil {
		return CreateAlbumOut{}, fmt.Errorf("failed to execute transaction: %w", err)
	}

	return out, nil
}
