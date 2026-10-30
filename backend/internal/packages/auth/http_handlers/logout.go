package http_handlers

import (
	"context"
	"fmt"

	g "github.com/lyweze/femin-xd-lol/backend/gen/serverhttp"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/requestctx"
)

func (h *AuthHttpHandlers) Logout(ctx context.Context, _ g.LogoutRequestObject) (g.LogoutResponseObject, error) {
	userID, ok := requestctx.UserID(ctx)
	if !ok {
		return nil, errNoSession
	}

	token, ok := requestctx.SessionToken(ctx)
	if !ok {
		return nil, errNoSession
	}

	if err := h.usecases.Logout(ctx, usecases.LogoutIn{UserID: userID, Token: token}); err != nil {
		return nil, fmt.Errorf("failed to logout: %w", err)
	}

	return g.Logout204Response{
		Headers: g.Logout204ResponseHeaders{SetCookie: h.clearedCookie()},
	}, nil
}

func (h *AuthHttpHandlers) LogoutAll(ctx context.Context, _ g.LogoutAllRequestObject) (g.LogoutAllResponseObject, error) {
	userID, ok := requestctx.UserID(ctx)
	if !ok {
		return nil, errNoSession
	}

	if err := h.usecases.LogoutAll(ctx, usecases.LogoutAllIn{UserID: userID}); err != nil {
		return nil, fmt.Errorf("failed to logout from all devices: %w", err)
	}

	return g.LogoutAll204Response{
		Headers: g.LogoutAll204ResponseHeaders{SetCookie: h.clearedCookie()},
	}, nil
}
