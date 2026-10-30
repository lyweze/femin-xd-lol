package users

import (
	"github.com/lyweze/femin-xd-lol/backend/internal/db"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/repositories"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/time_provider"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/uuid_provider"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/password_hasher"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/repo"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/usecases"
	"github.com/samber/do"
)

func InvokeUsecases(i *do.Injector) *usecases.Usecases {
	return do.MustInvoke[*usecases.Usecases](i)
}

func Provide(i *do.Injector) {
	do.Provide(i, func(i *do.Injector) (*usecases.Usecases, error) {
		return usecases.New(&usecases.NewArgs{
			TimeProvider:   time_provider.NewTimeProvider(),
			UUIDProvider:   uuid_provider.NewUUIDProvider(),
			PasswordHasher: password_hasher.New(),
			RepoHandler: repositories.NewRepoHandler(
				db.InvokeMaster(i),
				db.InvokeReplica(i),
				func(dbtx repositories.DBTX) usecases.Repo {
					return repo.NewPgxRepo(dbtx)
				},
			),
		}), nil
	})
}
