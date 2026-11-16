package catalog

import (
	"github.com/lyweze/femin-xd-lol/backend/internal/db"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/admin_handlers"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/repo"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/repositories"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/time_provider"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/uuid_provider"
	"github.com/samber/do"
)

func InvokeAdminHandlers(i *do.Injector) *admin_handlers.AdminCatalogHandlers {
	return do.MustInvoke[*admin_handlers.AdminCatalogHandlers](i)
}

func Provide(i *do.Injector) {
	do.Provide(i, func(i *do.Injector) (*admin_handlers.AdminCatalogHandlers, error) {
		return admin_handlers.New(&admin_handlers.NewArgs{
			Usecases: do.MustInvoke[*usecases.CatalogUsecases](i),
		}), nil
	})

	do.Provide(i, func(i *do.Injector) (*usecases.CatalogUsecases, error) {
		return usecases.New(&usecases.NewArgs{
			TimeProvider: time_provider.NewTimeProvider(),
			UUIDProvider: uuid_provider.NewUUIDProvider(),
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
