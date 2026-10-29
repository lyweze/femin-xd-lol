package usecases

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/interfaces"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/dto"
)

type TimeProvider interface {
	Now() time.Time
}

type UUIDProvider interface {
	New() uuid.UUID
}

type Repo interface {
	GetItem(ctx context.Context, q dto.GetItemQuery) (dto.GetItemResult, error)
	CreateItem(ctx context.Context, cmd dto.CreateItemCommand) (dto.CreateItemResult, error)
}

type Outbox any

type Usecases struct {
	repoHandler  interfaces.RepoHandlerOutbox[Repo, Outbox]
	timeProvider TimeProvider
	uuidProvider UUIDProvider
}

type NewArgs struct {
	RepoHandler  interfaces.RepoHandlerOutbox[Repo, Outbox]
	TimeProvider TimeProvider
	UUIDProvider UUIDProvider
}

func New(args *NewArgs) *Usecases {
	return &Usecases{
		repoHandler:  args.RepoHandler,
		timeProvider: args.TimeProvider,
		uuidProvider: args.UUIDProvider,
	}
}
