package usecases

import (
	"context"
	"errors"
	"fmt"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/models"
	"github.com/lyweze/femin-xd-lol/backend/pkg/ozzoext"
)

type SetAlbumTrackOrderIn struct {
	AlbumID uuid.UUID              `json:"album_id"`
	Items   []models.TrackPosition `json:"items"`
}

func (i SetAlbumTrackOrderIn) Validate() error {
	return validation.ValidateStruct(&i, //nolint:wrapcheck
		validation.Field(&i.AlbumID, ozzoext.NotNilUUID),
		validation.Field(&i.Items, validation.By(validPositions)),
	)
}

// validPositions: номера в допустимых границах, без повторов треков и позиций.
func validPositions(value any) error {
	items, ok := value.([]models.TrackPosition)
	if !ok {
		return fmt.Errorf("invalid type: expected []models.TrackPosition, got %T", value)
	}

	type position struct{ disc, track int }

	tracks := make(map[uuid.UUID]struct{}, len(items))
	positions := make(map[position]struct{}, len(items))

	for _, item := range items {
		if item.DiscNo < 1 || item.DiscNo > positionMax || item.TrackNo < 1 || item.TrackNo > positionMax {
			return fmt.Errorf("disc_no and track_no must be between 1 and %d", positionMax)
		}

		if _, ok := tracks[item.TrackID]; ok {
			return fmt.Errorf("track %s is listed twice", item.TrackID)
		}

		p := position{item.DiscNo, item.TrackNo}
		if _, ok := positions[p]; ok {
			return fmt.Errorf("position %d-%d is used twice", item.DiscNo, item.TrackNo)
		}

		tracks[item.TrackID] = struct{}{}
		positions[p] = struct{}{}
	}

	return nil
}

// SetAlbumTrackOrder заменяет порядок целиком: в списке должны быть ровно все треки альбома.
func (u *CatalogUsecases) SetAlbumTrackOrder(ctx context.Context, in SetAlbumTrackOrderIn) (GetAlbumOut, error) {
	if err := in.Validate(); err != nil {
		return GetAlbumOut{}, errors.Join(ErrValidation, err)
	}

	now := u.timeProvider.Now()

	var out GetAlbumOut

	err := u.repoHandler.WithTxRW(ctx, func(repo Repo) error {
		// Блокировка альбома не даёт параллельно добавить трек, который не попал бы в порядок.
		//
		// may return:
		// - [ErrAlbumNotFound] if no album with such ID exists
		if _, err := repo.GetAlbum(ctx, dto.GetAlbumQuery{ID: in.AlbumID, Lock: dto.LockUpdate}); err != nil {
			return fmt.Errorf("failed to get album: %w", err)
		}

		tracks, err := repo.ListAlbumTracks(ctx, dto.ListAlbumTracksQuery{AlbumID: in.AlbumID})
		if err != nil {
			return fmt.Errorf("failed to list album tracks: %w", err)
		}

		if err := sameTracks(tracks.Items, in.Items); err != nil {
			return errors.Join(ErrValidation, err)
		}

		if err := repo.SetTrackPositions(ctx, dto.SetTrackPositionsCommand{Items: in.Items, UpdatedAt: now}); err != nil {
			return fmt.Errorf("failed to set track positions: %w", err)
		}

		out, err = getAlbumWithTracks(ctx, repo, in.AlbumID)

		return err
	})
	if err != nil {
		return GetAlbumOut{}, fmt.Errorf("failed to execute transaction: %w", err)
	}

	return out, nil
}

func sameTracks(tracks []*models.Track, items []models.TrackPosition) error {
	if len(tracks) != len(items) {
		return fmt.Errorf("album has %d tracks, order lists %d", len(tracks), len(items))
	}

	inAlbum := make(map[uuid.UUID]struct{}, len(tracks))
	for _, track := range tracks {
		inAlbum[track.ID()] = struct{}{}
	}

	for _, item := range items {
		if _, ok := inAlbum[item.TrackID]; !ok {
			return fmt.Errorf("track %s is not in this album", item.TrackID)
		}
	}

	return nil
}
