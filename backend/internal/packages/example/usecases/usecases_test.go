//go:build tests

package usecases

import (
	"testing"

	mocks "github.com/lyweze/femin-xd-lol/backend/tests/mocks/packages/example/usecases"
	"github.com/lyweze/femin-xd-lol/backend/tests/stubs"
)

type deps struct {
	timeProvider *mocks.MockTimeProvider
	uuidProvider *mocks.MockUUIDProvider
	repo         *mocks.MockRepo
}

func newDeps(t *testing.T) *deps {
	return &deps{
		timeProvider: mocks.NewMockTimeProvider(t),
		uuidProvider: mocks.NewMockUUIDProvider(t),
		repo:         mocks.NewMockRepo(t),
	}
}

func newUsecase(d *deps) *ExampleUsecases {
	return New(&NewArgs{
		RepoHandler:  stubs.NewRepoHandlerStub[Repo](d.repo),
		TimeProvider: d.timeProvider,
		UUIDProvider: d.uuidProvider,
	})
}
