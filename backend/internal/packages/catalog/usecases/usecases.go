package usecases

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/dto"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/interfaces"
)

type TimeProvider interface {
	Now() time.Time
}

type UUIDProvider interface {
	New() uuid.UUID
}

type Repo interface {
	ListArtists(ctx context.Context, q dto.ListArtistsQuery) (dto.ListArtistsResult, error)
	GetArtist(ctx context.Context, q dto.GetArtistQuery) (dto.GetArtistResult, error)
	GetArtists(ctx context.Context, q dto.GetArtistsQuery) (dto.GetArtistsResult, error)
	CreateArtist(ctx context.Context, cmd dto.CreateArtistCommand) (dto.CreateArtistResult, error)
	UpdateArtist(ctx context.Context, cmd dto.UpdateArtistCommand) (dto.UpdateArtistResult, error)
	CountArtistUsage(ctx context.Context, q dto.CountArtistUsageQuery) (dto.CountArtistUsageResult, error)
	DeleteArtist(ctx context.Context, cmd dto.DeleteArtistCommand) error

	ListAlbums(ctx context.Context, q dto.ListAlbumsQuery) (dto.ListAlbumsResult, error)
	GetAlbum(ctx context.Context, q dto.GetAlbumQuery) (dto.GetAlbumResult, error)
	CreateAlbum(ctx context.Context, cmd dto.CreateAlbumCommand) (dto.CreateAlbumResult, error)
	UpdateAlbum(ctx context.Context, cmd dto.UpdateAlbumCommand) (dto.UpdateAlbumResult, error)
	SetAlbumPublishedAt(ctx context.Context, cmd dto.SetAlbumPublishedAtCommand) (dto.SetAlbumPublishedAtResult, error)
	DeleteAlbum(ctx context.Context, cmd dto.DeleteAlbumCommand) error

	ListTracks(ctx context.Context, q dto.ListTracksQuery) (dto.ListTracksResult, error)
	ListAlbumTracks(ctx context.Context, q dto.ListAlbumTracksQuery) (dto.ListAlbumTracksResult, error)
	GetTrack(ctx context.Context, q dto.GetTrackQuery) (dto.GetTrackResult, error)
	CreateTrack(ctx context.Context, cmd dto.CreateTrackCommand) (dto.CreateTrackResult, error)
	UpdateTrack(ctx context.Context, cmd dto.UpdateTrackCommand) (dto.UpdateTrackResult, error)
	SetTrackPositions(ctx context.Context, cmd dto.SetTrackPositionsCommand) error
	DeleteTrack(ctx context.Context, cmd dto.DeleteTrackCommand) error
}

type CatalogUsecases struct {
	repoHandler  interfaces.RepoHandler[Repo]
	timeProvider TimeProvider
	uuidProvider UUIDProvider
}

type NewArgs struct {
	RepoHandler  interfaces.RepoHandler[Repo]
	TimeProvider TimeProvider
	UUIDProvider UUIDProvider
}

func New(args *NewArgs) *CatalogUsecases {
	return &CatalogUsecases{
		repoHandler:  args.RepoHandler,
		timeProvider: args.TimeProvider,
		uuidProvider: args.UUIDProvider,
	}
}
