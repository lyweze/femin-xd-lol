package usecases

import (
	"context"
	"errors"
	"fmt"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/lyweze/femin-xd-lol/backend/pkg/ozzoext"
)

type DeleteAlbumIn struct {
	ID uuid.UUID `json:"id"`
}

func (i DeleteAlbumIn) Validate() error {
	return validation.ValidateStruct(&i, //nolint:wrapcheck
		validation.Field(&i.ID, ozzoext.NotNilUUID),
	)
}

// DeleteAlbum мягко удаляет альбом вместе с треками. Лайки и записи в плейлистах остаются.
func (u *CatalogUsecases) DeleteAlbum(ctx context.Context, in DeleteAlbumIn) error {
	if err := in.Validate(); err != nil {
		return errors.Join(ErrValidation, err)
	}

	now := u.timeProvider.Now()

	err := u.repoHandler.WithTxRW(ctx, func(repo Repo) error {
		// Блокировка ждёт транзакции, которые прямо сейчас добавляют в альбом трек.
		//
		// may return:
		// - [ErrAlbumNotFound] if no album with such ID exists
		if _, err := repo.GetAlbum(ctx, dto.GetAlbumQuery{ID: in.ID, Lock: dto.LockUpdate}); err != nil {
			return fmt.Errorf("failed to get album: %w", err)
		}

		if err := repo.DeleteAlbum(ctx, dto.DeleteAlbumCommand{ID: in.ID, DeletedAt: now}); err != nil {
			return fmt.Errorf("failed to delete album: %w", err)
		}

		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to execute transaction: %w", err)
	}

	return nil
}
