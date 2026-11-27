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

type DeleteArtistIn struct {
	ID uuid.UUID `json:"id"`
}

func (i DeleteArtistIn) Validate() error {
	return validation.ValidateStruct(&i, //nolint:wrapcheck
		validation.Field(&i.ID, ozzoext.NotNilUUID),
	)
}

func (u *CatalogUsecases) DeleteArtist(ctx context.Context, in DeleteArtistIn) error {
	if err := in.Validate(); err != nil {
		return errors.Join(ErrValidation, err)
	}

	now := u.timeProvider.Now()

	err := u.repoHandler.WithTxRW(ctx, func(repo Repo) error {
		// Блокировка на запись ждёт транзакции, которые прямо сейчас привязывают
		// этого артиста к альбому или треку: они держат его FOR SHARE.
		//
		// may return:
		// - [ErrArtistNotFound] if no artist with such ID exists
		if _, err := repo.GetArtist(ctx, dto.GetArtistQuery{ID: in.ID, Lock: dto.LockUpdate}); err != nil {
			return fmt.Errorf("failed to get artist: %w", err)
		}

		usage, err := repo.CountArtistUsage(ctx, dto.CountArtistUsageQuery{ID: in.ID})
		if err != nil {
			return fmt.Errorf("failed to count artist usage: %w", err)
		}

		if usage.Albums > 0 || usage.Tracks > 0 {
			return errors.Join(ErrArtistInUse, fmt.Errorf("artist has %d albums and %d tracks", usage.Albums, usage.Tracks))
		}

		if err := repo.DeleteArtist(ctx, dto.DeleteArtistCommand{ID: in.ID, DeletedAt: now}); err != nil {
			return fmt.Errorf("failed to delete artist: %w", err)
		}

		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to execute transaction: %w", err)
	}

	return nil
}
