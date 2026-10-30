package http_handlers

import (
	"context"
	"errors"
	"fmt"

	g "github.com/lyweze/femin-xd-lol/backend/gen/serverhttp"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/requestctx"
)

func (h *AuthHttpHandlers) GetMe(ctx context.Context, _ g.GetMeRequestObject) (g.GetMeResponseObject, error) {
	userID, ok := requestctx.UserID(ctx)
	if !ok {
		return nil, errNoSession
	}

	out, err := h.usecases.GetMe(ctx, usecases.GetMeIn{UserID: userID})
	if err != nil {
		if errors.Is(err, usecases.ErrUnauthorized) {
			return g.GetMe401JSONResponse{
				UnauthorizedErrorJSONResponse: g.UnauthorizedErrorJSONResponse{Code: g.UNAUTHORIZED},
			}, nil
		}

		return nil, fmt.Errorf("failed to get current user: %w", err)
	}

	return g.GetMe200JSONResponse{
		User: userToHttp(out.User),
	}, nil
}
