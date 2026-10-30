package http_handlers

import (
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/usecases"
	"go.uber.org/zap"
)

type getItemReply struct {
	Item itemReply `json:"item"`
}

func (h *ExampleHttpHandlers) GetItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	log := h.logger.With(zap.String(handlerLogKey, "GetItem"))

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeJSON(w, http.StatusUnprocessableEntity, errorReply{Code: replyCodeValidationError, Message: "invalid id"})

		return
	}

	in := usecases.GetItemIn{
		ID: id,
	}

	out, err := h.usecases.GetItem(ctx, in)
	if err != nil {
		switch {
		case h.isCtxError(err):
			log.Warn("context cancelled", zap.Error(err))
		case errors.Is(err, usecases.ErrValidation):
			log.Warn("failed to validate input", zap.Error(err), zap.Any(inLogKey, in))
			writeJSON(w, http.StatusUnprocessableEntity, errorReply{Code: replyCodeValidationError, Message: err.Error()})
		case errors.Is(err, usecases.ErrItemNotFound):
			log.Warn("item not found", zap.Error(err), zap.Any(inLogKey, in))
			writeJSON(w, http.StatusNotFound, errorReply{Code: replyCodeNotFound})
		default:
			log.Error("failed to get item", zap.Error(err), zap.Any(inLogKey, in))
			writeJSON(w, http.StatusInternalServerError, errorReply{Code: replyCodeInternalError})
		}

		return
	}

	writeJSON(w, http.StatusOK, getItemReply{
		Item: itemToHttp(out.Item),
	})
}
