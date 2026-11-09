package admin_handlers

import (
	"context"
	"errors"
	"fmt"

	g "github.com/lyweze/femin-xd-lol/backend/gen/serveradminhttp"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/requestctx"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/usecases"
)

func (h *AdminHandlers) AdminSetUserRole(ctx context.Context, req g.AdminSetUserRoleRequestObject) (g.AdminSetUserRoleResponseObject, error) { //nolint:lll
	actorID, ok := requestctx.UserID(ctx)
	if !ok {
		return nil, errNoSession
	}

	out, err := h.usecases.SetUserRole(ctx, usecases.SetUserRoleIn{
		ActorID: actorID,
		UserID:  req.UserId,
		Role:    models.UserRole(req.Body.Role),
	})
	if err != nil {
		switch {
		case errors.Is(err, usecases.ErrValidation):
			return g.AdminSetUserRole422JSONResponse{
				ValidationErrorJSONResponse: g.ValidationErrorJSONResponse{Code: g.VALIDATIONERROR, Message: new(err.Error())},
			}, nil
		case errors.Is(err, usecases.ErrUserNotFound):
			return g.AdminSetUserRole404JSONResponse{
				NotFoundErrorJSONResponse: g.NotFoundErrorJSONResponse{Code: g.NOTFOUND},
			}, nil
		case errors.Is(err, usecases.ErrCannotDemoteSelf):
			return g.AdminSetUserRole409JSONResponse{
				ConflictErrorJSONResponse: g.ConflictErrorJSONResponse{Code: g.CONFLICT, Message: new("cannot remove own admin role")},
			}, nil
		case errors.Is(err, usecases.ErrActorNotAdmin):
			return g.AdminSetUserRole403JSONResponse{
				ForbiddenErrorJSONResponse: g.ForbiddenErrorJSONResponse{Code: g.FORBIDDEN},
			}, nil
		default:
			return nil, fmt.Errorf("failed to set user role: %w", err)
		}
	}

	return g.AdminSetUserRole200JSONResponse{
		User: userToHttp(out.User),
	}, nil
}
