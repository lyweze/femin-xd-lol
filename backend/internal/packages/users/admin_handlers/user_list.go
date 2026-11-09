package admin_handlers

import (
	"context"
	"errors"
	"fmt"

	g "github.com/lyweze/femin-xd-lol/backend/gen/serveradminhttp"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/usecases"
)

func (h *AdminHandlers) AdminListUsers(ctx context.Context, req g.AdminListUsersRequestObject) (g.AdminListUsersResponseObject, error) { //nolint:lll
	in := usecases.ListUsersIn{
		Search: req.Params.Q,
		Limit:  req.Params.Limit,
		Cursor: req.Params.Cursor,
	}

	if req.Params.Role != nil {
		role := models.UserRole(*req.Params.Role)
		in.Role = &role
	}

	out, err := h.usecases.ListUsers(ctx, in)
	if err != nil {
		if errors.Is(err, usecases.ErrValidation) {
			return g.AdminListUsers422JSONResponse{
				ValidationErrorJSONResponse: g.ValidationErrorJSONResponse{Code: g.VALIDATIONERROR, Message: new(err.Error())},
			}, nil
		}

		return nil, fmt.Errorf("failed to list users: %w", err)
	}

	items := make([]g.AdminUser, 0, len(out.Items))
	for _, item := range out.Items {
		items = append(items, userToHttp(item))
	}

	return g.AdminListUsers200JSONResponse{
		Items:      items,
		NextCursor: out.NextCursor,
	}, nil
}
