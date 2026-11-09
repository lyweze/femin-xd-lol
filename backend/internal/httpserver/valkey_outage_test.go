//go:build tests

package httpserver

import (
	"io"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest/observer"
)

// tcpProxy стоит между клиентом и Valkey: Close обрывает связь и имитирует падение,
// не трогая настоящий Valkey, общий для всего suite.
type tcpProxy struct {
	listener net.Listener
	target   string

	mu    sync.Mutex
	conns []net.Conn
}

func (s *HttpHandlersTestSuite) newTCPProxy(target string) *tcpProxy {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	s.Require().NoError(err)

	p := &tcpProxy{listener: listener, target: target} //nolint:exhaustruct

	go p.accept()

	return p
}

func (p *tcpProxy) address() string {
	return p.listener.Addr().String()
}

func (p *tcpProxy) accept() {
	for {
		client, err := p.listener.Accept()
		if err != nil {
			return
		}

		server, err := net.Dial("tcp", p.target)
		if err != nil {
			client.Close()

			continue
		}

		p.mu.Lock()
		p.conns = append(p.conns, client, server)
		p.mu.Unlock()

		go func() { _, _ = io.Copy(server, client) }()
		go func() { _, _ = io.Copy(client, server) }()
	}
}

func (p *tcpProxy) close() {
	p.listener.Close()

	p.mu.Lock()
	defer p.mu.Unlock()

	for _, conn := range p.conns {
		conn.Close()
	}
}

func (s *HttpHandlersTestSuite) Test_ValkeyOutage() {
	const timeout = 300 * time.Millisecond

	s.Run("error: requests fail fast with 500, not 401", func() {
		r := s.Require()

		proxy := s.newTCPProxy(s.valkeyAddress)
		defer proxy.close()

		client := s.newValkeyClient(proxy.address())
		defer client.Close()

		api := s.newAPI(withValkey(client, timeout))
		user := s.createUser(models.UserRoleUser)
		c := api.login(user)

		r.Equal(http.StatusOK, c.do(http.MethodGet, mePath, nil).status)

		proxy.close()

		for _, request := range []struct {
			name string
			do   func() testResponse
		}{
			{"session check", func() testResponse { return c.do(http.MethodGet, mePath, nil) }},
			{"login", func() testResponse {
				return api.client().do(http.MethodPost, loginPath, loginBody(user.Email, testPassword))
			}},
			{"register", func() testResponse { return api.client().do(http.MethodPost, registerPath, registerBody()) }},
		} {
			started := time.Now()
			res := request.do()

			r.Equal(http.StatusInternalServerError, res.status, request.name)
			r.Equal("INTERNAL_ERROR", res.code(), request.name)
			r.Less(time.Since(started), 5*time.Second, request.name)
			r.NotContains(res.text(), "127.0.0.1", request.name)
		}
	})

	s.Run("ok: passwords and tokens do not reach the logs", func() {
		r := s.Require()

		proxy := s.newTCPProxy(s.valkeyAddress)
		defer proxy.close()

		client := s.newValkeyClient(proxy.address())
		defer client.Close()

		core, logs := observer.New(zap.DebugLevel)
		api := s.newAPI(withValkey(client, timeout), withLogger(zap.New(core)))
		user := s.createUser(models.UserRoleUser)
		c := api.login(user)

		proxy.close()

		c.do(http.MethodGet, mePath, nil)
		api.client().do(http.MethodPost, loginPath, loginBody(user.Email, testPassword))

		r.NotZero(logs.Len(), "failures must be logged")

		for _, entry := range logs.All() {
			text := entry.Message

			for _, field := range entry.ContextMap() {
				if value, ok := field.(string); ok {
					text += value
				}
			}

			r.NotContains(text, testPassword)
			r.NotContains(text, c.session)
		}
	})
}
