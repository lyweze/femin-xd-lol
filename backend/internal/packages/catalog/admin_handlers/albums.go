package admin_handlers

import (
	"context"
	"errors"
	"fmt"

	g "github.com/lyweze/femin-xd-lol/backend/gen/serveradminhttp"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/usecases"
)

func (h *AdminCatalogHandlers) AdminListAlbums(ctx context.Context, req g.AdminListAlbumsRequestObject) (g.AdminListAlbumsResponseObject, error) { //nolint:lll
	out, err := h.usecases.ListAlbums(ctx, usecases.ListAlbumsIn{
		Search:   req.Params.Q,
		ArtistID: req.Params.ArtistId,
		Page:     pageIn(req.Params.Limit, req.Params.Cursor),
	})
	if err != nil {
		if isValidation(err) {
			return g.AdminListAlbums422JSONResponse{ValidationErrorJSONResponse: validationError(err)}, nil
		}

		return nil, fmt.Errorf("failed to list albums: %w", err)
	}

	items := make([]g.AdminAlbum, 0, len(out.Items))
	for _, item := range out.Items {
		items = append(items, albumToHttp(item))
	}

	return g.AdminListAlbums200JSONResponse{Items: items, NextCursor: out.NextCursor}, nil
}

func (h *AdminCatalogHandlers) AdminCreateAlbum(ctx context.Context, req g.AdminCreateAlbumRequestObject) (g.AdminCreateAlbumResponseObject, error) { //nolint:lll
	out, err := h.usecases.CreateAlbum(ctx, usecases.CreateAlbumIn{
		Title:       req.Body.Title,
		Type:        models.AlbumType(req.Body.Type),
		ReleaseDate: dateToTime(req.Body.ReleaseDate),
		ArtistIDs:   req.Body.ArtistIds,
	})
	if err != nil {
		if isValidation(err) {
			return g.AdminCreateAlbum422JSONResponse{ValidationErrorJSONResponse: validationError(err)}, nil
		}

		return nil, fmt.Errorf("failed to create album: %w", err)
	}

	return g.AdminCreateAlbum201JSONResponse{Album: albumToHttp(out.Album)}, nil
}

func (h *AdminCatalogHandlers) AdminGetAlbum(ctx context.Context, req g.AdminGetAlbumRequestObject) (g.AdminGetAlbumResponseObject, error) { //nolint:lll
	out, err := h.usecases.GetAlbum(ctx, usecases.GetAlbumIn{ID: req.AlbumId})
	if err != nil {
		if errors.Is(err, usecases.ErrAlbumNotFound) || isValidation(err) {
			return g.AdminGetAlbum404JSONResponse{NotFoundErrorJSONResponse: notFound()}, nil
		}

		return nil, fmt.Errorf("failed to get album: %w", err)
	}

	return g.AdminGetAlbum200JSONResponse(albumWithTracksToHttp(out)), nil
}

func (h *AdminCatalogHandlers) AdminUpdateAlbum(ctx context.Context, req g.AdminUpdateAlbumRequestObject) (g.AdminUpdateAlbumResponseObject, error) { //nolint:lll
	in := usecases.UpdateAlbumIn{
		ID:          req.AlbumId,
		Title:       req.Body.Title,
		ReleaseDate: dateToTime(req.Body.ReleaseDate),
		ArtistIDs:   req.Body.ArtistIds,
	}

	if req.Body.Type != nil {
		in.Type = new(models.AlbumType(*req.Body.Type))
	}

	out, err := h.usecases.UpdateAlbum(ctx, in)
	if err != nil {
		switch {
		case errors.Is(err, usecases.ErrAlbumNotFound):
			return g.AdminUpdateAlbum404JSONResponse{NotFoundErrorJSONResponse: notFound()}, nil
		case isValidation(err):
			return g.AdminUpdateAlbum422JSONResponse{ValidationErrorJSONResponse: validationError(err)}, nil
		default:
			return nil, fmt.Errorf("failed to update album: %w", err)
		}
	}

	return g.AdminUpdateAlbum200JSONResponse{Album: albumToHttp(out.Album)}, nil
}

func (h *AdminCatalogHandlers) AdminDeleteAlbum(ctx context.Context, req g.AdminDeleteAlbumRequestObject) (g.AdminDeleteAlbumResponseObject, error) { //nolint:lll
	if err := h.usecases.DeleteAlbum(ctx, usecases.DeleteAlbumIn{ID: req.AlbumId}); err != nil {
		if errors.Is(err, usecases.ErrAlbumNotFound) || isValidation(err) {
			return g.AdminDeleteAlbum404JSONResponse{NotFoundErrorJSONResponse: notFound()}, nil
		}

		return nil, fmt.Errorf("failed to delete album: %w", err)
	}

	return g.AdminDeleteAlbum204Response{}, nil
}

func (h *AdminCatalogHandlers) AdminSetAlbumTrackOrder(ctx context.Context, req g.AdminSetAlbumTrackOrderRequestObject) (g.AdminSetAlbumTrackOrderResponseObject, error) { //nolint:lll
	items := make([]models.TrackPosition, 0, len(req.Body.Items))
	for _, item := range req.Body.Items {
		items = append(items, models.TrackPosition{TrackID: item.TrackId, DiscNo: item.DiscNo, TrackNo: item.TrackNo})
	}

	out, err := h.usecases.SetAlbumTrackOrder(ctx, usecases.SetAlbumTrackOrderIn{AlbumID: req.AlbumId, Items: items})
	if err != nil {
		switch {
		case errors.Is(err, usecases.ErrAlbumNotFound):
			return g.AdminSetAlbumTrackOrder404JSONResponse{NotFoundErrorJSONResponse: notFound()}, nil
		case isValidation(err):
			return g.AdminSetAlbumTrackOrder422JSONResponse{ValidationErrorJSONResponse: validationError(err)}, nil
		default:
			return nil, fmt.Errorf("failed to set album track order: %w", err)
		}
	}

	return g.AdminSetAlbumTrackOrder200JSONResponse(albumWithTracksToHttp(out)), nil
}

func (h *AdminCatalogHandlers) AdminPublishAlbum(ctx context.Context, req g.AdminPublishAlbumRequestObject) (g.AdminPublishAlbumResponseObject, error) { //nolint:lll
	in := usecases.PublishAlbumIn{ID: req.AlbumId}
	if req.Body != nil {
		in.PublishedAt = req.Body.PublishedAt
	}

	out, err := h.usecases.PublishAlbum(ctx, in)
	if err != nil {
		switch {
		case errors.Is(err, usecases.ErrAlbumNotFound):
			return g.AdminPublishAlbum404JSONResponse{NotFoundErrorJSONResponse: notFound()}, nil
		case errors.Is(err, usecases.ErrAlbumNotPublishable):
			return g.AdminPublishAlbum409JSONResponse{ConflictErrorJSONResponse: conflict(err)}, nil
		case isValidation(err):
			return g.AdminPublishAlbum422JSONResponse{ValidationErrorJSONResponse: validationError(err)}, nil
		default:
			return nil, fmt.Errorf("failed to publish album: %w", err)
		}
	}

	return g.AdminPublishAlbum200JSONResponse{Album: albumToHttp(out.Album)}, nil
}

func (h *AdminCatalogHandlers) AdminUnpublishAlbum(ctx context.Context, req g.AdminUnpublishAlbumRequestObject) (g.AdminUnpublishAlbumResponseObject, error) { //nolint:lll
	out, err := h.usecases.UnpublishAlbum(ctx, usecases.UnpublishAlbumIn{ID: req.AlbumId})
	if err != nil {
		if errors.Is(err, usecases.ErrAlbumNotFound) || isValidation(err) {
			return g.AdminUnpublishAlbum404JSONResponse{NotFoundErrorJSONResponse: notFound()}, nil
		}

		return nil, fmt.Errorf("failed to unpublish album: %w", err)
	}

	return g.AdminUnpublishAlbum200JSONResponse{Album: albumToHttp(out.Album)}, nil
}
