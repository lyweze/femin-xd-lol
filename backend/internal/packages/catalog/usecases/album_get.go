package usecases

import (
	"context"
	"errors"
	"fmt"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/view_models"
	"github.com/lyweze/femin-xd-lol/backend/pkg/ozzoext"
)

type GetAlbumIn struct {
	ID uuid.UUID
}

func (i GetAlbumIn) Validate() error {
	return validation.ValidateStruct(&i, //nolint:wrapcheck
		validation.Field(&i.ID, ozzoext.NotNilUUID),
	)
}

type GetAlbumOut struct {
	Album  view_models.Album
	Tracks []view_models.Track
}

// GetAlbum отдаёт альбом и все его треки в любом статусе, по порядку.
func (u *CatalogUsecases) GetAlbum(ctx context.Context, in GetAlbumIn) (GetAlbumOut, error) {
	if err := in.Validate(); err != nil {
		return GetAlbumOut{}, errors.Join(ErrValidation, err)
	}

	var out GetAlbumOut

	err := u.repoHandler.WithTxRO(ctx, func(repo Repo) error {
		var err error

		out, err = getAlbumWithTracks(ctx, repo, in.ID)

		return err
	})
	if err != nil {
		return GetAlbumOut{}, fmt.Errorf("failed to execute transaction: %w", err)
	}

	return out, nil
}

// getAlbumWithTracks читает альбом и треки в той же транзакции, чтобы они не разошлись.
func getAlbumWithTracks(ctx context.Context, repo Repo, id uuid.UUID) (GetAlbumOut, error) {
	// may return:
	// - [ErrAlbumNotFound] if no album with such ID exists
	album, err := repo.GetAlbum(ctx, dto.GetAlbumQuery{ID: id, Lock: dto.LockNone})
	if err != nil {
		return GetAlbumOut{}, fmt.Errorf("failed to get album: %w", err)
	}

	tracks, err := repo.ListAlbumTracks(ctx, dto.ListAlbumTracksQuery{AlbumID: id})
	if err != nil {
		return GetAlbumOut{}, fmt.Errorf("failed to list album tracks: %w", err)
	}

	presenter := &Presenter{}

	return GetAlbumOut{
		Album:  presenter.Album(album.Result),
		Tracks: presenter.Tracks(tracks.Items),
	}, nil
}
