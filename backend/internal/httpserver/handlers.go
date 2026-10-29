package httpserver

import (
	"net/http"

	"github.com/lyweze/femin-xd-lol/backend/internal/packages/example/http_handlers"
)

// handlersFacade собирает хендлеры всех пакетов в один роутер.
type handlersFacade struct {
	example *http_handlers.HttpHandlers
}

func (h *handlersFacade) routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/v1/items", h.example.CreateItem)
	mux.HandleFunc("GET /api/v1/items/{id}", h.example.GetItem)

	return mux
}
