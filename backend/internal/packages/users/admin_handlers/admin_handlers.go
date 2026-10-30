package admin_handlers

import (
	"errors"

	g "github.com/lyweze/femin-xd-lol/backend/gen/serveradminhttp"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/view_models"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

var (
	_ g.StrictServerInterface = (*AdminHandlers)(nil)

	errNoSession = errors.New("no session in context")
)

type AdminHandlers struct {
	usecases *usecases.UsersUsecases
}

type NewArgs struct {
	Usecases *usecases.UsersUsecases
}

func New(args *NewArgs) *AdminHandlers {
	return &AdminHandlers{
		usecases: args.Usecases,
	}
}

func userToHttp(user view_models.User) g.AdminUser {
	return g.AdminUser{
		Id:        user.ID,
		Email:     openapi_types.Email(user.Email),
		Username:  user.Username,
		Role:      g.UserRole(user.Role),
		CreatedAt: user.CreatedAt,
	}
}
