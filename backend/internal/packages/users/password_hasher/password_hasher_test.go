package password_hasher_test

import (
	"testing"

	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/password_hasher"
	"github.com/stretchr/testify/require"
)

func TestHashAndVerify(t *testing.T) {
	t.Parallel()

	h := password_hasher.New()

	hash, err := h.Hash("correct horse")
	require.NoError(t, err)
	require.Contains(t, hash, "$argon2id$")
	require.NotContains(t, hash, "correct horse")

	ok, err := h.Verify("correct horse", hash)
	require.NoError(t, err)
	require.True(t, ok)

	ok, err = h.Verify("wrong horse", hash)
	require.NoError(t, err)
	require.False(t, ok)
}

func TestHashIsSalted(t *testing.T) {
	t.Parallel()

	h := password_hasher.New()

	first, err := h.Hash("same password")
	require.NoError(t, err)

	second, err := h.Hash("same password")
	require.NoError(t, err)

	require.NotEqual(t, first, second)
}

func TestVerifyInvalidHash(t *testing.T) {
	t.Parallel()

	_, err := password_hasher.New().Verify("password", "not-a-hash")
	require.ErrorIs(t, err, password_hasher.ErrInvalidHash)
}
