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
	Verify(password, hash string) (bool, error)
}

type Repo interface {
	CreateUser(ctx context.Context, cmd dto.CreateUserCommand) (dto.CreateUserResult, error)
	GetUser(ctx context.Context, q dto.GetUserQuery) (dto.GetUserResult, error)
	GetUserByEmail(ctx context.Context, q dto.GetUserByEmailQuery) (dto.GetUserByEmailResult, error)
	ListUsers(ctx context.Context, q dto.ListUsersQuery) (dto.ListUsersResult, error)
	UpdateUserRole(ctx context.Context, cmd dto.UpdateUserRoleCommand) (dto.UpdateUserRoleResult, error)

	// LockAdmins блокирует строки администраторов до конца транзакции.
	LockAdmins(ctx context.Context) (dto.LockAdminsResult, error)
}

type UsersUsecases struct {
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

func New(args *NewArgs) *UsersUsecases {
	return &UsersUsecases{
		repoHandler:    args.RepoHandler,
		timeProvider:   args.TimeProvider,
		uuidProvider:   args.UUIDProvider,
		passwordHasher: args.PasswordHasher,
	}
}
