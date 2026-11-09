//go:build tests

package httpserver

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/brianvoe/gofakeit/v7"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	auth_handlers "github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/http_handlers"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/middleware"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/rate_limiter"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/sessions"
	auth_usecases "github.com/lyweze/femin-xd-lol/backend/internal/packages/auth/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/repositories"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/time_provider"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/common/uuid_provider"
	example_handlers "github.com/lyweze/femin-xd-lol/backend/internal/packages/example/http_handlers"
	example_repo "github.com/lyweze/femin-xd-lol/backend/internal/packages/example/repo"
	example_usecases "github.com/lyweze/femin-xd-lol/backend/internal/packages/example/usecases"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/admin_handlers"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/password_hasher"
	users_repo "github.com/lyweze/femin-xd-lol/backend/internal/packages/users/repo"
	users_usecases "github.com/lyweze/femin-xd-lol/backend/internal/packages/users/usecases"
	"github.com/samber/lo"
	"github.com/stretchr/testify/suite"
	"github.com/valkey-io/valkey-go"
	"go.uber.org/zap"
)

const (
	testPassword   = "long enough password"
	sessionTTL     = 90 * 24 * time.Hour
	migrationsPath = "file://../../build/app/migrations"

	registerPath  = "/api/v1/auth/register"
	loginPath     = "/api/v1/auth/login"
	logoutPath    = "/api/v1/auth/logout"
	logoutAllPath = "/api/v1/auth/logout-all"
	mePath        = "/api/v1/me"
	adminUsers    = "/admin/v1/users"
)

// HttpHandlersTestSuite гоняет запросы через весь роутер на настоящих Postgres и Valkey.
// Тесты идут последовательно: окружение общее, и каждый подтест чистит его заново.
type HttpHandlersTestSuite struct {
	suite.Suite

	migrator *migrate.Migrate

	pool *pgxpool.Pool

	valkey        valkey.Client
	valkeyAddress string

	logger *zap.Logger
}

func TestHttpHandlers(t *testing.T) {
	suite.Run(t, new(HttpHandlersTestSuite))
}

func (s *HttpHandlersTestSuite) SetupSuite() {
	r := s.Require()

	databaseDSN := s.env("TEST_DATABASE_HTTP_DSN")
	s.valkeyAddress = s.env("TEST_VALKEY_ADDRESS")

	var err error

	s.migrator, err = migrate.New(migrationsPath, databaseDSN)
	r.NoError(err)

	if err := s.migrator.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		r.NoError(err, "failed to run migrations")
	}

	s.pool, err = pgxpool.New(context.Background(), databaseDSN)
	r.NoError(err)
	r.NoError(s.pool.Ping(context.Background()))

	s.valkey = s.newValkeyClient(s.valkeyAddress)

	showLogs, err := strconv.ParseBool(lo.CoalesceOrEmpty(os.Getenv("TEST_SHOW_LOGS"), "0"))
	r.NoError(err)

	s.logger = lo.Ternary(showLogs, lo.Must(zap.NewDevelopment()), zap.NewNop())
}

func (s *HttpHandlersTestSuite) TearDownSuite() {
	s.valkey.Close()
	s.pool.Close()

	s.Require().NoError(s.migrator.Drop())

	sourceErr, databaseErr := s.migrator.Close()
	s.Require().NoError(sourceErr)
	s.Require().NoError(databaseErr)
}

func (s *HttpHandlersTestSuite) SetupTest() {
	s.reset()
}

// SetupSubTest нужен, потому что suite вызывает SetupTest только на метод, а не на s.Run.
func (s *HttpHandlersTestSuite) SetupSubTest() {
	s.reset()
}

func (s *HttpHandlersTestSuite) reset() {
	r := s.Require()

	_, err := s.pool.Exec(context.Background(), "TRUNCATE users, items CASCADE")
	r.NoError(err)
	r.NoError(s.valkey.Do(context.Background(), s.valkey.B().Flushall().Build()).Error())
}

func (s *HttpHandlersTestSuite) env(name string) string {
	value, ok := os.LookupEnv(name)
	s.Require().True(ok, "%s (environment variable) is not set, run tests via make test", name)

	return value
}

func (s *HttpHandlersTestSuite) newValkeyClient(address string) valkey.Client {
	client, err := valkey.NewClient(valkey.ClientOption{InitAddress: []string{address}}) //nolint:exhaustruct
	s.Require().NoError(err)

	return client
}

func (s *HttpHandlersTestSuite) newUsersUsecases() *users_usecases.UsersUsecases {
	return users_usecases.New(&users_usecases.NewArgs{
		TimeProvider:   time_provider.NewTimeProvider(),
		UUIDProvider:   uuid_provider.NewUUIDProvider(),
		PasswordHasher: password_hasher.New(),
		RepoHandler: repositories.NewRepoHandler(s.pool, s.pool, func(dbtx repositories.DBTX) users_usecases.Repo {
			return users_repo.NewPgxRepo(dbtx)
		}),
	})
}

type handlerOptions struct {
	limits         auth_usecases.Limits
	cookieSecure   bool
	clientIPHeader string
	valkey         valkey.Client
	valkeyTimeout  time.Duration
	logger         *zap.Logger
}

type handlerOption func(*handlerOptions)

func withLimits(fn func(l *auth_usecases.Limits)) handlerOption {
	return func(o *handlerOptions) { fn(&o.limits) }
}

func withSecureCookie() handlerOption {
	return func(o *handlerOptions) { o.cookieSecure = true }
}

func withClientIPHeader(header string) handlerOption {
	return func(o *handlerOptions) { o.clientIPHeader = header }
}

func withValkey(client valkey.Client, timeout time.Duration) handlerOption {
	return func(o *handlerOptions) {
		o.valkey = client
		o.valkeyTimeout = timeout
	}
}

func withLogger(logger *zap.Logger) handlerOption {
	return func(o *handlerOptions) { o.logger = logger }
}

// newAPI собирает те же компоненты, что и прод, меняются только лимиты и подключения.
func (s *HttpHandlersTestSuite) newAPI(opts ...handlerOption) *testAPI {
	o := handlerOptions{
		limits: auth_usecases.Limits{
			LoginPerEmail: 5,
			LoginPerIP:    1000,
			RegisterPerIP: 1000,
			Window:        15 * time.Minute,
		},
		cookieSecure:   false,
		clientIPHeader: "",
		valkey:         s.valkey,
		valkeyTimeout:  time.Second,
		logger:         s.logger,
	}

	for _, opt := range opts {
		opt(&o)
	}

	users := s.newUsersUsecases()

	authUsecases := auth_usecases.New(&auth_usecases.NewArgs{
		Users: users,
		Sessions: sessions.New(&sessions.NewArgs{
			Client:  o.valkey,
			TTL:     sessionTTL,
			Timeout: o.valkeyTimeout,
		}),
		RateLimiter: rate_limiter.New(&rate_limiter.NewArgs{
			Client:  o.valkey,
			Timeout: o.valkeyTimeout,
		}),
		Limits: o.limits,
	})

	facade := &handlersFacade{
		public: publicHandlers{AuthHttpHandlers: auth_handlers.New(&auth_handlers.NewArgs{
			Usecases:     authUsecases,
			SessionTTL:   sessionTTL,
			CookieSecure: o.cookieSecure,
		})},
		admin: adminHandlers{AdminHandlers: admin_handlers.New(&admin_handlers.NewArgs{
			Usecases: users,
		})},
		example: example_handlers.New(&example_handlers.NewArgs{
			Usecases: example_usecases.New(&example_usecases.NewArgs{
				TimeProvider: time_provider.NewTimeProvider(),
				UUIDProvider: uuid_provider.NewUUIDProvider(),
				RepoHandler: repositories.NewRepoHandler(s.pool, s.pool, func(dbtx repositories.DBTX) example_usecases.Repo {
					return example_repo.NewPgxRepo(dbtx)
				}),
			}),
			Logger: o.logger,
		}),
		middleware: middleware.New(&middleware.NewArgs{
			Usecases: authUsecases,
			Logger:   o.logger,
		}),
		logger:         o.logger,
		clientIPHeader: o.clientIPHeader,
	}

	return &testAPI{handler: facade.routes(), s: s}
}

type testUser struct {
	ID       uuid.UUID
	Email    string
	Username string
}

func randomEmail() string {
	return strings.ToLower(gofakeit.LetterN(12)) + "@femin.test"
}

func randomUsername() string {
	return strings.ToLower(gofakeit.LetterN(12))
}

func (s *HttpHandlersTestSuite) createUser(role models.UserRole) testUser {
	out, err := s.newUsersUsecases().CreateUser(context.Background(), users_usecases.CreateUserIn{
		Email:    randomEmail(),
		Username: randomUsername(),
		Password: testPassword,
		Role:     role,
	})
	s.Require().NoError(err)

	return testUser{ID: out.User.ID, Email: out.User.Email, Username: out.User.Username}
}

func (s *HttpHandlersTestSuite) exec(sql string, args ...any) {
	_, err := s.pool.Exec(context.Background(), sql, args...)
	s.Require().NoError(err)
}

func (s *HttpHandlersTestSuite) queryInt(sql string, args ...any) int {
	var value int
	s.Require().NoError(s.pool.QueryRow(context.Background(), sql, args...).Scan(&value))

	return value
}

func (s *HttpHandlersTestSuite) queryString(sql string, args ...any) string {
	var value string
	s.Require().NoError(s.pool.QueryRow(context.Background(), sql, args...).Scan(&value))

	return value
}

func (s *HttpHandlersTestSuite) valkeyKeys() []string {
	keys, err := s.valkey.Do(context.Background(), s.valkey.B().Keys().Pattern("*").Build()).AsStrSlice()
	s.Require().NoError(err)

	return keys
}

func (s *HttpHandlersTestSuite) valkeyTTL(key string) time.Duration {
	seconds, err := s.valkey.Do(context.Background(), s.valkey.B().Ttl().Key(key).Build()).AsInt64()
	s.Require().NoError(err)

	return time.Duration(seconds) * time.Second
}

// testAPI отправляет запросы прямо в роутер, поэтому проверяется и middleware.
type testAPI struct {
	handler http.Handler
	s       *HttpHandlersTestSuite
}

// testClient браузер с cookie: сессия держится между запросами.
type testClient struct {
	api     *testAPI
	session string
	headers map[string]string
}

func (a *testAPI) client() *testClient {
	return &testClient{api: a, session: "", headers: nil}
}

// login открывает клиенту сессию и падает, если вход не удался.
func (a *testAPI) login(user testUser) *testClient {
	c := a.client()

	res := c.do(http.MethodPost, loginPath, map[string]string{"email": user.Email, "password": testPassword})
	a.s.Require().Equal(http.StatusOK, res.status, res.text())

	return c
}

type testResponse struct {
	status  int
	body    []byte
	cookies []*http.Cookie
}

func (r testResponse) text() string {
	return string(r.body)
}

func (r testResponse) code() string {
	var reply struct {
		Code string `json:"code"`
	}

	_ = json.Unmarshal(r.body, &reply)

	return reply.Code
}

func (r testResponse) sessionCookie() *http.Cookie {
	for _, cookie := range r.cookies {
		if cookie.Name == middleware.SessionCookieName {
			return cookie
		}
	}

	return nil
}

// rawBody отправляется как есть, для битого JSON и слишком большого тела.
type rawBody string

// do безопасен для вызова из горутин: не трогает s.Require.
func (c *testClient) do(method, path string, body any) testResponse {
	var reader io.Reader

	switch b := body.(type) {
	case nil:
	case rawBody:
		reader = strings.NewReader(string(b))
	default:
		reader = strings.NewReader(string(lo.Must(json.Marshal(b))))
	}

	req := httptest.NewRequest(method, path, reader)
	req.Header.Set("Content-Type", "application/json")

	if c.session != "" {
		req.AddCookie(&http.Cookie{Name: middleware.SessionCookieName, Value: c.session}) //nolint:exhaustruct
	}

	for name, value := range c.headers {
		req.Header.Set(name, value)
	}

	w := httptest.NewRecorder()
	c.api.handler.ServeHTTP(w, req)

	res := w.Result()
	defer res.Body.Close()

	out := testResponse{status: res.StatusCode, body: w.Body.Bytes(), cookies: res.Cookies()}

	if cookie := out.sessionCookie(); cookie != nil {
		c.session = lo.Ternary(cookie.MaxAge < 0, "", cookie.Value)
	}

	return out
}
