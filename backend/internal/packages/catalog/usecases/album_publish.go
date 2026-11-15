package usecases

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/view_models"
	"github.com/lyweze/femin-xd-lol/backend/pkg/ozzoext"
)

type PublishAlbumIn struct {
	ID uuid.UUID
	// PublishedAt в будущем откладывает релиз. Без неё альбом публикуется сразу.
	PublishedAt *time.Time
}

func (i PublishAlbumIn) Validate() error {
	return validation.ValidateStruct(&i, //nolint:wrapcheck
		validation.Field(&i.ID, ozzoext.NotNilUUID),
	)
}

type PublishAlbumOut struct {
	Album view_models.Album
}

func (u *CatalogUsecases) PublishAlbum(ctx context.Context, in PublishAlbumIn) (PublishAlbumOut, error) {
	if err := in.Validate(); err != nil {
		return PublishAlbumOut{}, errors.Join(ErrValidation, err)
	}

	now := u.timeProvider.Now()
	publishedAt := now

	if in.PublishedAt != nil {
		publishedAt = *in.PublishedAt
	}

	var out PublishAlbumOut

	err := u.repoHandler.WithTxRW(ctx, func(repo Repo) error {
		// Блокировка альбома не даёт добавить в него трек между проверкой и публикацией.
		//
		// may return:
		// - [ErrAlbumNotFound] if no album with such ID exists
		album, err := repo.GetAlbum(ctx, dto.GetAlbumQuery{ID: in.ID, Lock: dto.LockUpdate})
		if err != nil {
			return fmt.Errorf("failed to get album: %w", err)
		}

		tracks, err := repo.ListAlbumTracks(ctx, dto.ListAlbumTracksQuery{AlbumID: in.ID})
		if err != nil {
			return fmt.Errorf("failed to list album tracks: %w", err)
		}

		if err := publishable(album.Result, tracks.Items); err != nil {
			return errors.Join(ErrAlbumNotPublishable, err)
		}

		result, err := repo.SetAlbumPublishedAt(ctx, dto.SetAlbumPublishedAtCommand{
			ID:          in.ID,
			PublishedAt: &publishedAt,
			UpdatedAt:   now,
		})
		if err != nil {
			return fmt.Errorf("failed to publish album: %w", err)
		}

		presenter := &Presenter{}
		out.Album = presenter.Album(result.Result)

		return nil
	})
	if err != nil {
		return PublishAlbumOut{}, fmt.Errorf("failed to execute transaction: %w", err)
	}

	return out, nil
}

func publishable(album *models.Album, tracks []*models.Track) error {
	if album.CoverKey() == nil {
		return errors.New("album has no cover")
	}

	if len(tracks) == 0 {
		return errors.New("album has no tracks")
	}

	notReady := slices.IndexFunc(tracks, func(t *models.Track) bool { return t.Status() != models.TrackStatusReady })
	if notReady >= 0 {
		return fmt.Errorf("track %q is %s, every track must be ready", tracks[notReady].Title(), tracks[notReady].Status())
	}

	return nil
}

type UnpublishAlbumIn struct {
	ID uuid.UUID
}

func (i UnpublishAlbumIn) Validate() error {
	return validation.ValidateStruct(&i, //nolint:wrapcheck
		validation.Field(&i.ID, ozzoext.NotNilUUID),
	)
}

func (u *CatalogUsecases) UnpublishAlbum(ctx context.Context, in UnpublishAlbumIn) (PublishAlbumOut, error) {
	if err := in.Validate(); err != nil {
		return PublishAlbumOut{}, errors.Join(ErrValidation, err)
	}

	// may return:
	// - [ErrAlbumNotFound] if no album with such ID exists
	result, err := u.repoHandler.GetRepoRW().SetAlbumPublishedAt(ctx, dto.SetAlbumPublishedAtCommand{
		ID:          in.ID,
		PublishedAt: nil,
		UpdatedAt:   u.timeProvider.Now(),
	})
	if err != nil {
		return PublishAlbumOut{}, fmt.Errorf("failed to unpublish album: %w", err)
	}

	presenter := &Presenter{}

	return PublishAlbumOut{Album: presenter.Album(result.Result)}, nil
}
