package httpserver

import (
	"encoding/json"
	"net/http"

	"github.com/lyweze/femin-xd-lol/backend/gen/serveradminhttp"
	"github.com/lyweze/femin-xd-lol/backend/gen/serverhttp"
	auth_handlers "github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/http_handlers"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/middleware"
	example_handlers "github.com/lyweze/femin-xd-lol/backend/internal/packages/example/http_handlers"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/admin_handlers"
	"go.uber.org/zap"
)

const (
	maxRequestBodyBytes = 1 << 20 // 1 MB

	codeValidationError = "VALIDATION_ERROR"
	codeInternalError   = "INTERNAL_ERROR"
)

// Публичный API собирается из пакетов по мере их готовности: новый пакет
// встраивается сюда и его тег добавляется в docs/openapi/codegen/public.yaml.
type publicHandlers struct {
	*auth_handlers.AuthHttpHandlers
}

type adminHandlers struct {
	*admin_handlers.AdminHandlers
}

var (
	_ serverhttp.StrictServerInterface      = publicHandlers{}
	_ serveradminhttp.StrictServerInterface = adminHandlers{}
)

// publicRoutes единственные маршруты без сессии. Всё остальное закрыто по умолчанию.
//
//nolint:gochecknoglobals
var publicRoutes = map[string]struct{}{
	"POST /api/v1/auth/register": {},
	"POST /api/v1/auth/login":    {},
}

func isPublicRoute(r *http.Request) bool {
	_, ok := publicRoutes[r.Pattern]

	return ok
}

func neverPublic(_ *http.Request) bool {
	return false
}

// handlersFacade собирает хендлеры всех пакетов в один роутер.
type handlersFacade struct {
	public     publicHandlers
	admin      adminHandlers
	example    *example_handlers.ExampleHttpHandlers
	middleware *middleware.Middleware
	logger     *zap.Logger

	clientIPHeader string
}

func (h *handlersFacade) routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/v1/items", h.example.CreateItem)
	mux.HandleFunc("GET /api/v1/items/{id}", h.example.GetItem)

	// В сгенерированном коде последний middleware внешний: порядок выполнения
	// обратный списку, поэтому сессия проверяется первой.
	serverhttp.HandlerWithOptions(
		serverhttp.NewStrictHandlerWithOptions(h.public, nil, serverhttp.StrictHTTPServerOptions{
			RequestErrorHandlerFunc:  h.requestError,
			ResponseErrorHandlerFunc: h.responseError,
		}),
		serverhttp.StdHTTPServerOptions{ //nolint:exhaustruct
			BaseRouter: mux,
			Middlewares: []serverhttp.MiddlewareFunc{
				limitBody,
				h.middleware.RequireSession(isPublicRoute),
			},
			ErrorHandlerFunc: h.requestError,
		},
	)

	serveradminhttp.HandlerWithOptions(
		serveradminhttp.NewStrictHandlerWithOptions(h.admin, nil, serveradminhttp.StrictHTTPServerOptions{
			RequestErrorHandlerFunc:  h.requestError,
			ResponseErrorHandlerFunc: h.responseError,
		}),
		serveradminhttp.StdHTTPServerOptions{ //nolint:exhaustruct
			BaseRouter: mux,
			Middlewares: []serveradminhttp.MiddlewareFunc{
				limitBody,
				h.middleware.RequireAdmin,
				h.middleware.RequireSession(neverPublic),
			},
			ErrorHandlerFunc: h.requestError,
		},
	)

	return middleware.ClientIP(h.clientIPHeader)(mux)
}

func limitBody(next http.Handler) http.Handler {
	return http.MaxBytesHandler(next, maxRequestBodyBytes)
}

func (h *handlersFacade) requestError(w http.ResponseWriter, _ *http.Request, err error) {
	writeError(w, http.StatusUnprocessableEntity, codeValidationError, err.Error())
}

func (h *handlersFacade) responseError(w http.ResponseWriter, r *http.Request, err error) {
	h.logger.Error("failed to handle request", zap.Error(err), zap.String("path", r.URL.Path))
	writeError(w, http.StatusInternalServerError, codeInternalError, "")
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	body := map[string]string{"code": code}
	if message != "" {
		body["message"] = message
	}

	_ = json.NewEncoder(w).Encode(body)
}
