package example

import (
	"github.com/jackc/pgx/v5"
	"github.com/lyweze/femin-xd-lol/backend/internal/db"
	"github.com/lyweze/femin-xd-lol/backend/internal/di"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/repositories"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/http_handlers"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/repo"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/time_provider"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/uuid_provider"
	"github.com/samber/do"
)

func InvokeHttpHandlers(i *do.Injector) *http_handlers.HttpHandlers {
	return do.MustInvoke[*http_handlers.HttpHandlers](i)
}

func Provide(i *do.Injector) {
	do.Provide(i, func(i *do.Injector) (*http_handlers.HttpHandlers, error) {
		return http_handlers.New(&http_handlers.NewArgs{
			Usecases: do.MustInvoke[*usecases.Usecases](i),
			Logger:   di.InvokeLogger(i),
		}), nil
	})

	do.Provide(i, func(i *do.Injector) (*usecases.Usecases, error) {
		return usecases.New(&usecases.NewArgs{
			TimeProvider: time_provider.NewTimeProvider(),
			UUIDProvider: uuid_provider.NewUUIDProvider(),
			RepoHandler: repositories.NewRepoHandler(
				db.InvokeMaster(i),
				db.InvokeReplica(i),
				func(dbtx repositories.DBTX) usecases.Repo {
					return repo.NewPgxRepo(dbtx)
				},
				func(_ pgx.Tx) usecases.Outbox {
					return nil
				},
			),
		}), nil
	})
}
