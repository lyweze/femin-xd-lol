//go:build tests

package commands

import (
	"testing"

	"github.com/samber/do"
	"github.com/stretchr/testify/require"
)

// do различает сервисы по короткому имени типа без пакета, поэтому два одинаково
// названных типа из разных пакетов валят сервер паникой на старте. Юнит-тесты
// пакетов контейнер не собирают, такую ошибку видит только этот тест.
func TestProvideServeHasNoDuplicateServices(t *testing.T) {
	t.Parallel()

	require.NotPanics(t, func() {
		provideServe(do.New())
	})
}
