package usecases

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/interfaces"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/dto"
)

type TimeProvider interface {
	Now() time.Time
}

type UUIDProvider interface {
	New() uuid.UUID
}

type PasswordHasher interface {
	Hash(password string) (string, error)
}

type Repo interface {
	CreateUser(ctx context.Context, cmd dto.CreateUserCommand) (dto.CreateUserResult, error)
}

type Usecases struct {
	repoHandler    interfaces.RepoHandler[Repo]
	timeProvider   TimeProvider
	uuidProvider   UUIDProvider
	passwordHasher PasswordHasher
}

type NewArgs struct {
	RepoHandler    interfaces.RepoHandler[Repo]
	TimeProvider   TimeProvider
	UUIDProvider   UUIDProvider
	PasswordHasher PasswordHasher
}

func New(args *NewArgs) *Usecases {
	return &Usecases{
		repoHandler:    args.RepoHandler,
		timeProvider:   args.TimeProvider,
		uuidProvider:   args.UUIDProvider,
		passwordHasher: args.PasswordHasher,
	}
}
