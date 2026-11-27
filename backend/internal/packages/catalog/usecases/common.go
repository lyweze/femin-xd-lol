package usecases

import (
	"context"
	"errors"
	"fmt"
	"slices"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/models"
	"github.com/lyweze/femin-xd-lol/backend/pkg/ozzoext"
)

const (
	titleMaxLen = 255

	pageDefaultLimit = 20
	pageMaxLimit     = 100

	// positionMax верхняя граница SMALLINT в БД, выше Postgres вернёт ошибку.
	positionMax = 32767
)

// PageIn общие параметры списков.
type PageIn struct {
	Limit  *int    `json:"limit"`
	Cursor *string `json:"cursor"`
}

func pageRules(p *PageIn) []*validation.FieldRules {
	return []*validation.FieldRules{
		validation.Field(&p.Limit, ozzoext.IntPtrRange(1, pageMaxLimit)),
	}
}

// toPage просит у repo на строку больше, чтобы понять, есть ли следующая страница.
func (p PageIn) toPage() (dto.Page, error) {
	page := dto.Page{AfterID: nil, Limit: pageDefaultLimit + 1}

	if p.Limit != nil {
		page.Limit = *p.Limit + 1
	}

	if p.Cursor != nil {
		id, err := uuid.Parse(*p.Cursor)
		if err != nil {
			return dto.Page{}, errors.Join(ErrValidation, fmt.Errorf("invalid cursor: %w", err))
		}

		page.AfterID = &id
	}

	return page, nil
}

// cutPage отрезает лишнюю строку и возвращает курсор, если она была.
func cutPage[T interface{ ID() uuid.UUID }](items []T, page dto.Page) ([]T, *string) {
	limit := page.Limit - 1
	if len(items) <= limit {
		return items, nil
	}

	items = items[:limit]
	cursor := items[limit-1].ID().String()

	return items, &cursor
}

var albumTypes = []any{ //nolint:gochecknoglobals
	models.AlbumTypeAlbum,
	models.AlbumTypeEP,
	models.AlbumTypeSingle,
	models.AlbumTypeCompilation,
}

var trackStatuses = []any{ //nolint:gochecknoglobals
	models.TrackStatusDraft,
	models.TrackStatusProcessing,
	models.TrackStatusReady,
	models.TrackStatusFailed,
}

var errDuplicateIDs = validation.NewError("validation_duplicate_ids", "ids must be unique")

func uniqueIDs(value any) error {
	ids, ok := value.([]uuid.UUID)
	if !ok {
		return fmt.Errorf("invalid type: expected []uuid.UUID, got %T", value)
	}

	seen := make(map[uuid.UUID]struct{}, len(ids))
	for _, id := range ids {
		if _, ok := seen[id]; ok {
			return errDuplicateIDs
		}

		seen[id] = struct{}{}
	}

	return nil
}

// validateTrackArtists: артисты без повторов, роль из списка и хотя бы один основной.
func validateTrackArtists(artists []models.TrackArtistInput) error {
	if len(artists) == 0 {
		return errors.New("at least one artist is required")
	}

	ids := make([]uuid.UUID, 0, len(artists))

	for _, artist := range artists {
		if artist.ArtistID == uuid.Nil {
			return ozzoext.ErrUUIDNil
		}

		if artist.Role != models.TrackArtistRoleMain && artist.Role != models.TrackArtistRoleFeat {
			return fmt.Errorf("unknown artist role %q", artist.Role)
		}

		ids = append(ids, artist.ArtistID)
	}

	if err := uniqueIDs(ids); err != nil {
		return err
	}

	if !slices.ContainsFunc(artists, func(a models.TrackArtistInput) bool { return a.Role == models.TrackArtistRoleMain }) {
		return errors.New("track needs at least one main artist")
	}

	return nil
}

func trackArtistIDs(artists []models.TrackArtistInput) []uuid.UUID {
	ids := make([]uuid.UUID, 0, len(artists))
	for _, artist := range artists {
		ids = append(ids, artist.ArtistID)
	}

	return ids
}

// lockArtists блокирует артистов на чтение, чтобы их не удалили до конца транзакции.
// Неизвестный или удалённый артист это ошибка запроса, а не 404: id пришли в теле.
func lockArtists(ctx context.Context, repo Repo, ids []uuid.UUID) error {
	result, err := repo.GetArtists(ctx, dto.GetArtistsQuery{IDs: ids, Lock: dto.LockShare})
	if err != nil {
		return fmt.Errorf("failed to get artists: %w", err)
	}

	if len(result.Items) != len(ids) {
		found := make(map[uuid.UUID]struct{}, len(result.Items))
		for _, artist := range result.Items {
			found[artist.ID()] = struct{}{}
		}

		for _, id := range ids {
			if _, ok := found[id]; !ok {
				return errors.Join(ErrValidation, fmt.Errorf("artist %s not found", id))
			}
		}
	}

	return nil
}
