package http_handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/usecases"
	"go.uber.org/zap"
)

type createItemRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

type createItemReply struct {
	Item itemReply `json:"item"`
}

func (h *ExampleHttpHandlers) CreateItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	log := h.logger.With(zap.String(handlerLogKey, "CreateItem"))

	var req createItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorReply{Code: replyCodeValidationError, Message: "invalid json"})

		return
	}

	in := usecases.CreateItemIn{
		Title:       req.Title,
		Description: req.Description,
	}

	out, err := h.usecases.CreateItem(ctx, in)
	if err != nil {
		switch {
		case h.isCtxError(err):
			log.Warn("context cancelled", zap.Error(err))
		case errors.Is(err, usecases.ErrValidation):
			log.Warn("failed to validate input", zap.Error(err), zap.Any(inLogKey, in))
			writeJSON(w, http.StatusUnprocessableEntity, errorReply{Code: replyCodeValidationError, Message: err.Error()})
		default:
			log.Error("failed to create item", zap.Error(err), zap.Any(inLogKey, in))
			writeJSON(w, http.StatusInternalServerError, errorReply{Code: replyCodeInternalError})
		}

		return
	}

	writeJSON(w, http.StatusCreated, createItemReply{
		Item: itemToHttp(out.Item),
	})
}
