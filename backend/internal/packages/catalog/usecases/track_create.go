package usecases

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/view_models"
	"github.com/lyweze/femin-xd-lol/backend/pkg/ozzoext"
)

type CreateTrackIn struct {
	AlbumID  uuid.UUID
	Title    string
	DiscNo   int
	TrackNo  int
	Explicit bool
	// Artists в порядке показа.
	Artists []models.TrackArtistInput
}

func (i CreateTrackIn) Validate() error {
	return validation.ValidateStruct(&i, //nolint:wrapcheck
		validation.Field(&i.AlbumID, ozzoext.NotNilUUID),
		validation.Field(&i.Title, validation.Required, validation.RuneLength(1, titleMaxLen)),
		validation.Field(&i.DiscNo, validation.Required, validation.Min(1), validation.Max(positionMax)),
		validation.Field(&i.TrackNo, validation.Required, validation.Min(1), validation.Max(positionMax)),
		validation.Field(&i.Artists, validation.By(func(value any) error {
			artists, _ := value.([]models.TrackArtistInput)

			return validateTrackArtists(artists)
		})),
	)
}

type CreateTrackOut struct {
	Track view_models.Track
}

// CreateTrack создаёт карточку в статусе draft, аудио загружается отдельно.
func (u *CatalogUsecases) CreateTrack(ctx context.Context, in CreateTrackIn) (CreateTrackOut, error) {
	in.Title = strings.TrimSpace(in.Title)

	if err := in.Validate(); err != nil {
		return CreateTrackOut{}, errors.Join(ErrValidation, err)
	}

	now := u.timeProvider.Now()

	var out CreateTrackOut

	err := u.repoHandler.WithTxRW(ctx, func(repo Repo) error {
		// Блокировка альбома делает проверку свободной позиции надёжной: два трека
		// с одним номером не создадутся параллельно, а альбом не удалят под нами.
		if _, err := repo.GetAlbum(ctx, dto.GetAlbumQuery{ID: in.AlbumID, Lock: dto.LockUpdate}); err != nil {
			if errors.Is(err, ErrAlbumNotFound) {
				return errors.Join(ErrValidation, fmt.Errorf("album %s not found", in.AlbumID))
			}

			return fmt.Errorf("failed to get album: %w", err)
		}

		tracks, err := repo.ListAlbumTracks(ctx, dto.ListAlbumTracksQuery{AlbumID: in.AlbumID})
		if err != nil {
			return fmt.Errorf("failed to list album tracks: %w", err)
		}

		if slices.ContainsFunc(tracks.Items, func(t *models.Track) bool {
			return t.DiscNo() == in.DiscNo && t.TrackNo() == in.TrackNo
		}) {
			return errors.Join(ErrValidation, fmt.Errorf("position %d-%d is already taken", in.DiscNo, in.TrackNo))
		}

		if err := lockArtists(ctx, repo, trackArtistIDs(in.Artists)); err != nil {
			return err
		}

		result, err := repo.CreateTrack(ctx, dto.CreateTrackCommand{
			ID:        u.uuidProvider.New(),
			AlbumID:   in.AlbumID,
			Title:     in.Title,
			DiscNo:    in.DiscNo,
			TrackNo:   in.TrackNo,
			Explicit:  in.Explicit,
			Artists:   in.Artists,
			CreatedAt: now,
			UpdatedAt: now,
		})
		if err != nil {
			return fmt.Errorf("failed to create track: %w", err)
		}

		presenter := &Presenter{}
		out.Track = presenter.Track(result.Result)

		return nil
	})
	if err != nil {
		return CreateTrackOut{}, fmt.Errorf("failed to execute transaction: %w", err)
	}

	return out, nil
}
