//go:build tests

package errreason

import (
	"errors"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
)

var (
	errValidation = errors.New("validation error")
	errConflict   = errors.New("conflict")
)

func TestOf(t *testing.T) {
	t.Parallel()

	cases := map[string]struct {
		err  error
		kind error
		want string
	}{
		"ok: reason next to kind, wrappers dropped": {
			err:  fmt.Errorf("failed to execute transaction: %w", errors.Join(errConflict, errors.New("album has no cover"))),
			kind: errConflict,
			want: "album has no cover",
		},
		"ok: deeply wrapped": {
			err: fmt.Errorf("handler: %w", fmt.Errorf("tx: %w",
				fmt.Errorf("usecase: %w", errors.Join(errValidation, errors.New("title: cannot be blank."))))),
			kind: errValidation,
			want: "title: cannot be blank.",
		},
		"ok: several reasons": {
			err:  errors.Join(errValidation, errors.New("a"), errors.New("b")),
			kind: errValidation,
			want: "a; b",
		},
		"ok: kind without reason": {
			err:  fmt.Errorf("wrapped: %w", errConflict),
			kind: errConflict,
			want: "conflict",
		},
		"ok: other kinds are not mistaken for this one": {
			err:  errors.Join(errConflict, errors.New("not this")),
			kind: errValidation,
			want: "validation error",
		},
		"ok: join nested inside another join": {
			err:  errors.Join(errors.New("noise"), fmt.Errorf("x: %w", errors.Join(errValidation, errors.New("deep")))),
			kind: errValidation,
			want: "deep",
		},
	}

	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			require.Equal(t, tc.want, Of(tc.err, tc.kind))
		})
	}
}
