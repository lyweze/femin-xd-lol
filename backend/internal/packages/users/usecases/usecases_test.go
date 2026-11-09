//go:build tests

package usecases

import (
	"testing"
	"time"

	"github.com/brianvoe/gofakeit/v7"
	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	mocks "github.com/lyweze/femin-xd-lol/backend/tests/mocks/packages/users/usecases"
	"github.com/lyweze/femin-xd-lol/backend/tests/stubs"
)

type deps struct {
	timeProvider   *mocks.MockTimeProvider
	uuidProvider   *mocks.MockUUIDProvider
	passwordHasher *mocks.MockPasswordHasher
	repo           *mocks.MockRepo
}

func newDeps(t *testing.T) *deps {
	return &deps{
		timeProvider:   mocks.NewMockTimeProvider(t),
		uuidProvider:   mocks.NewMockUUIDProvider(t),
		passwordHasher: mocks.NewMockPasswordHasher(t),
		repo:           mocks.NewMockRepo(t),
	}
}

func newUsecase(d *deps) *UsersUsecases {
	return New(&NewArgs{
		RepoHandler:    stubs.NewRepoHandlerStub[Repo](d.repo),
		TimeProvider:   d.timeProvider,
		UUIDProvider:   d.uuidProvider,
		PasswordHasher: d.passwordHasher,
	})
}

func buildUser(role models.UserRole) *models.User {
	now := time.Now().UTC().Truncate(time.Millisecond)

	user := models.NewUser(uuid.Must(uuid.NewV7()))
	user.SetEmail(gofakeit.Email())
	user.SetUsername(gofakeit.LetterN(10))
	user.SetRole(role)
	user.SetPasswordHash("hash")
	user.SetCreatedAt(now)
	user.SetUpdatedAt(now)

	return user
}
