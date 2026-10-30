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

func (h *AuthHttpHandlers) Login(ctx context.Context, req g.LoginRequestObject) (g.LoginResponseObject, error) {
	out, err := h.usecases.Login(ctx, usecases.LoginIn{
		Email:    string(req.Body.Email),
		Password: req.Body.Password,
		ClientIP: requestctx.ClientIP(ctx),
	})
	if err != nil {
		switch {
		case errors.Is(err, users.ErrInvalidCredentials):
			return g.Login401JSONResponse{
				UnauthorizedErrorJSONResponse: g.UnauthorizedErrorJSONResponse{Code: g.UNAUTHORIZED},
			}, nil
		case errors.Is(err, usecases.ErrTooManyAttempts):
			return g.Login429JSONResponse{
				TooManyRequestsErrorJSONResponse: g.TooManyRequestsErrorJSONResponse{Code: g.TOOMANYREQUESTS},
			}, nil
		default:
			return nil, fmt.Errorf("failed to login: %w", err)
		}
	}

	return g.Login200JSONResponse{
		Body:    g.UserReply{User: userToHttp(out.User)},
		Headers: g.Login200ResponseHeaders{SetCookie: h.sessionCookie(out.Token)},
	}, nil
}
