package admin_handlers

import (
	"context"
	"errors"
	"fmt"

	g "github.com/lyweze/femin-xd-lol/backend/gen/serveradminhttp"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/catalog/usecases"
)

func (h *AdminCatalogHandlers) AdminListTracks(ctx context.Context, req g.AdminListTracksRequestObject) (g.AdminListTracksResponseObject, error) { //nolint:lll
	in := usecases.ListTracksIn{
		Search:  req.Params.Q,
		AlbumID: req.Params.AlbumId,
		Page:    pageIn(req.Params.Limit, req.Params.Cursor),
	}

	if req.Params.Status != nil {
		in.Status = new(models.TrackStatus(*req.Params.Status))
	}

	out, err := h.usecases.ListTracks(ctx, in)
	if err != nil {
		if isValidation(err) {
			return g.AdminListTracks422JSONResponse{ValidationErrorJSONResponse: validationError(err)}, nil
		}

		return nil, fmt.Errorf("failed to list tracks: %w", err)
	}

	items := make([]g.AdminTrack, 0, len(out.Items))
	for _, item := range out.Items {
		items = append(items, trackToHttp(item))
	}

	return g.AdminListTracks200JSONResponse{Items: items, NextCursor: out.NextCursor}, nil
}

func (h *AdminCatalogHandlers) AdminCreateTrack(ctx context.Context, req g.AdminCreateTrackRequestObject) (g.AdminCreateTrackResponseObject, error) { //nolint:lll
	in := usecases.CreateTrackIn{
		AlbumID: req.Body.AlbumId,
		Title:   req.Body.Title,
		DiscNo:  1,
		TrackNo: req.Body.TrackNo,
		Artists: trackArtistsFromHttp(req.Body.Artists),
	}

	if req.Body.DiscNo != nil {
		in.DiscNo = *req.Body.DiscNo
	}

	if req.Body.Explicit != nil {
		in.Explicit = *req.Body.Explicit
	}

	out, err := h.usecases.CreateTrack(ctx, in)
	if err != nil {
		if isValidation(err) {
			return g.AdminCreateTrack422JSONResponse{ValidationErrorJSONResponse: validationError(err)}, nil
		}

		return nil, fmt.Errorf("failed to create track: %w", err)
	}

	return g.AdminCreateTrack201JSONResponse{Track: trackToHttp(out.Track)}, nil
}

func (h *AdminCatalogHandlers) AdminGetTrack(ctx context.Context, req g.AdminGetTrackRequestObject) (g.AdminGetTrackResponseObject, error) { //nolint:lll
	out, err := h.usecases.GetTrack(ctx, usecases.GetTrackIn{ID: req.TrackId})
	if err != nil {
		if errors.Is(err, usecases.ErrTrackNotFound) || isValidation(err) {
			return g.AdminGetTrack404JSONResponse{NotFoundErrorJSONResponse: notFound()}, nil
		}

		return nil, fmt.Errorf("failed to get track: %w", err)
	}

	return g.AdminGetTrack200JSONResponse{Track: trackToHttp(out.Track)}, nil
}

func (h *AdminCatalogHandlers) AdminUpdateTrack(ctx context.Context, req g.AdminUpdateTrackRequestObject) (g.AdminUpdateTrackResponseObject, error) { //nolint:lll
	in := usecases.UpdateTrackIn{
		ID:       req.TrackId,
		Title:    req.Body.Title,
		Explicit: req.Body.Explicit,
	}

	if req.Body.Artists != nil {
		in.Artists = new(trackArtistsFromHttp(*req.Body.Artists))
	}

	out, err := h.usecases.UpdateTrack(ctx, in)
	if err != nil {
		switch {
		case errors.Is(err, usecases.ErrTrackNotFound):
			return g.AdminUpdateTrack404JSONResponse{NotFoundErrorJSONResponse: notFound()}, nil
		case isValidation(err):
			return g.AdminUpdateTrack422JSONResponse{ValidationErrorJSONResponse: validationError(err)}, nil
		default:
			return nil, fmt.Errorf("failed to update track: %w", err)
		}
	}

	return g.AdminUpdateTrack200JSONResponse{Track: trackToHttp(out.Track)}, nil
}

func (h *AdminCatalogHandlers) AdminDeleteTrack(ctx context.Context, req g.AdminDeleteTrackRequestObject) (g.AdminDeleteTrackResponseObject, error) { //nolint:lll
	if err := h.usecases.DeleteTrack(ctx, usecases.DeleteTrackIn{ID: req.TrackId}); err != nil {
		if errors.Is(err, usecases.ErrTrackNotFound) || isValidation(err) {
			return g.AdminDeleteTrack404JSONResponse{NotFoundErrorJSONResponse: notFound()}, nil
		}

		return nil, fmt.Errorf("failed to delete track: %w", err)
	}

	return g.AdminDeleteTrack204Response{}, nil
}
