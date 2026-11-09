package admin_handlers

import (
	"context"
	"errors"
	"fmt"

	g "github.com/lyweze/femin-xd-lol/backend/gen/serveradminhttp"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/usecases"
)

func (h *AdminHandlers) AdminCreateUser(ctx context.Context, req g.AdminCreateUserRequestObject) (g.AdminCreateUserResponseObject, error) { //nolint:lll
	out, err := h.usecases.CreateUser(ctx, usecases.CreateUserIn{
		Email:    string(req.Body.Email),
		Username: req.Body.Username,
		Password: req.Body.Password,
		Role:     models.UserRole(req.Body.Role),
	})
	if err != nil {
		switch {
		case errors.Is(err, usecases.ErrValidation):
			return g.AdminCreateUser422JSONResponse{
				ValidationErrorJSONResponse: g.ValidationErrorJSONResponse{Code: g.VALIDATIONERROR, Message: new(err.Error())},
			}, nil
		case errors.Is(err, usecases.ErrUserAlreadyExists):
			return g.AdminCreateUser409JSONResponse{
				ConflictErrorJSONResponse: g.ConflictErrorJSONResponse{Code: g.CONFLICT, Message: new("email or username is already taken")},
			}, nil
		default:
			return nil, fmt.Errorf("failed to create user: %w", err)
		}
	}

	return g.AdminCreateUser201JSONResponse{
		User: userToHttp(out.User),
	}, nil
}
