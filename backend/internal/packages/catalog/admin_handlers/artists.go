package admin_handlers

import (
	"context"
	"errors"
	"fmt"

	g "github.com/lyweze/femin-xd-lol/backend/gen/serveradminhttp"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/usecases"
)

func (h *AdminCatalogHandlers) AdminListArtists(ctx context.Context, req g.AdminListArtistsRequestObject) (g.AdminListArtistsResponseObject, error) { //nolint:lll
	out, err := h.usecases.ListArtists(ctx, usecases.ListArtistsIn{
		Search: req.Params.Q,
		Page:   pageIn(req.Params.Limit, req.Params.Cursor),
	})
	if err != nil {
		if isValidation(err) {
			return g.AdminListArtists422JSONResponse{ValidationErrorJSONResponse: validationError(err)}, nil
		}

		return nil, fmt.Errorf("failed to list artists: %w", err)
	}

	items := make([]g.AdminArtist, 0, len(out.Items))
	for _, item := range out.Items {
		items = append(items, artistToHttp(item))
	}

	return g.AdminListArtists200JSONResponse{Items: items, NextCursor: out.NextCursor}, nil
}

func (h *AdminCatalogHandlers) AdminCreateArtist(ctx context.Context, req g.AdminCreateArtistRequestObject) (g.AdminCreateArtistResponseObject, error) { //nolint:lll
	in := usecases.CreateArtistIn{Name: req.Body.Name}
	if req.Body.Bio != nil {
		in.Bio = *req.Body.Bio
	}

	out, err := h.usecases.CreateArtist(ctx, in)
	if err != nil {
		if isValidation(err) {
			return g.AdminCreateArtist422JSONResponse{ValidationErrorJSONResponse: validationError(err)}, nil
		}

		return nil, fmt.Errorf("failed to create artist: %w", err)
	}

	return g.AdminCreateArtist201JSONResponse{Artist: artistToHttp(out.Artist)}, nil
}

func (h *AdminCatalogHandlers) AdminGetArtist(ctx context.Context, req g.AdminGetArtistRequestObject) (g.AdminGetArtistResponseObject, error) { //nolint:lll
	out, err := h.usecases.GetArtist(ctx, usecases.GetArtistIn{ID: req.ArtistId})
	if err != nil {
		if errors.Is(err, usecases.ErrArtistNotFound) || isValidation(err) {
			return g.AdminGetArtist404JSONResponse{NotFoundErrorJSONResponse: notFound()}, nil
		}

		return nil, fmt.Errorf("failed to get artist: %w", err)
	}

	return g.AdminGetArtist200JSONResponse{Artist: artistToHttp(out.Artist)}, nil
}

func (h *AdminCatalogHandlers) AdminUpdateArtist(ctx context.Context, req g.AdminUpdateArtistRequestObject) (g.AdminUpdateArtistResponseObject, error) { //nolint:lll
	out, err := h.usecases.UpdateArtist(ctx, usecases.UpdateArtistIn{
		ID:   req.ArtistId,
		Name: req.Body.Name,
		Bio:  req.Body.Bio,
	})
	if err != nil {
		switch {
		case errors.Is(err, usecases.ErrArtistNotFound):
			return g.AdminUpdateArtist404JSONResponse{NotFoundErrorJSONResponse: notFound()}, nil
		case isValidation(err):
			return g.AdminUpdateArtist422JSONResponse{ValidationErrorJSONResponse: validationError(err)}, nil
		default:
			return nil, fmt.Errorf("failed to update artist: %w", err)
		}
	}

	return g.AdminUpdateArtist200JSONResponse{Artist: artistToHttp(out.Artist)}, nil
}

func (h *AdminCatalogHandlers) AdminDeleteArtist(ctx context.Context, req g.AdminDeleteArtistRequestObject) (g.AdminDeleteArtistResponseObject, error) { //nolint:lll
	err := h.usecases.DeleteArtist(ctx, usecases.DeleteArtistIn{ID: req.ArtistId})
	if err != nil {
		switch {
		case errors.Is(err, usecases.ErrArtistNotFound) || isValidation(err):
			return g.AdminDeleteArtist404JSONResponse{NotFoundErrorJSONResponse: notFound()}, nil
		case errors.Is(err, usecases.ErrArtistInUse):
			return g.AdminDeleteArtist409JSONResponse{ConflictErrorJSONResponse: conflict(err, usecases.ErrArtistInUse)}, nil
		default:
			return nil, fmt.Errorf("failed to delete artist: %w", err)
		}
	}

	return g.AdminDeleteArtist204Response{}, nil
}
