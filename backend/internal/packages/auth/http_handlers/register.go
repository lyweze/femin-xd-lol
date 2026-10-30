package http_handlers

import (
	"context"
	"errors"
	"fmt"

	g "github.com/lyweze/femin-xd-lol/backend/gen/serverhttp"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/requestctx"
	users "github.com/lyweze/femin-xd-lol/backend/internal/packages/users/usecases"
)

func (h *AuthHttpHandlers) Register(ctx context.Context, req g.RegisterRequestObject) (g.RegisterResponseObject, error) {
	out, err := h.usecases.Register(ctx, usecases.RegisterIn{
		Email:    string(req.Body.Email),
		Username: req.Body.Username,
		Password: req.Body.Password,
		ClientIP: requestctx.ClientIP(ctx),
	})
	if err != nil {
		switch {
		case errors.Is(err, users.ErrValidation):
			return g.Register422JSONResponse{
				ValidationErrorJSONResponse: g.ValidationErrorJSONResponse{Code: g.VALIDATIONERROR, Message: new(err.Error())},
			}, nil
		case errors.Is(err, users.ErrUserAlreadyExists):
			return g.Register409JSONResponse{
				ConflictErrorJSONResponse: g.ConflictErrorJSONResponse{Code: g.CONFLICT, Message: new("email or username is already taken")},
			}, nil
		case errors.Is(err, usecases.ErrTooManyAttempts):
			return g.Register429JSONResponse{
				TooManyRequestsErrorJSONResponse: g.TooManyRequestsErrorJSONResponse{Code: g.TOOMANYREQUESTS},
			}, nil
		default:
			return nil, fmt.Errorf("failed to register: %w", err)
		}
	}

	return g.Register201JSONResponse{
		Body:    g.UserReply{User: userToHttp(out.User)},
		Headers: g.Register201ResponseHeaders{SetCookie: h.sessionCookie(out.Token)},
	}, nil
}
