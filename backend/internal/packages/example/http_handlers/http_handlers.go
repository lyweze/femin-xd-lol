package http_handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/usecases"
	"go.uber.org/zap"
)

const (
	handlerLogKey = "http_handler"
	inLogKey      = "in"
)

type ExampleHttpHandlers struct {
	usecases *usecases.ExampleUsecases
	logger   *zap.Logger
}

type NewArgs struct {
	Usecases *usecases.ExampleUsecases
	Logger   *zap.Logger
}

func New(args *NewArgs) *ExampleHttpHandlers {
	return &ExampleHttpHandlers{
		usecases: args.Usecases,
		logger:   args.Logger,
	}
}

func (h *ExampleHttpHandlers) isCtxError(err error) bool {
	return errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded)
}

type errorReply struct {
	Code    string `json:"code"`
	Message string `json:"message,omitempty"`
}

const (
	replyCodeValidationError = "VALIDATION_ERROR"
	replyCodeNotFound        = "NOT_FOUND"
	replyCodeInternalError   = "INTERNAL_ERROR"
)

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
