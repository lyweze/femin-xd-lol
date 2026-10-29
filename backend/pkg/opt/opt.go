package opt

import "github.com/samber/lo"

type Optional[T any] struct {
	value T
	set   bool
}

func New[T any](v T) Optional[T] {
	return Optional[T]{
		value: v,
		set:   true,
	}
}

func New2[T any](v T, set bool) Optional[T] {
	return Optional[T]{
		value: v,
		set:   set,
	}
}

func NewPtr[T any](v *T) Optional[T] {
	return Optional[T]{value: lo.FromPtr(v), set: v != nil}
}

func NewPtrOr[T any](v *T, defaultValue T) Optional[T] {
	if v == nil {
		return Optional[T]{value: defaultValue, set: true}
	}

	return Optional[T]{value: *v, set: true}
}

func (o Optional[T]) Get() (T, bool) {
	if !o.set {
		return *new(T), false
	}

	return o.value, true
}

func (o Optional[T]) GetOr(defaultValue T) T {
	if !o.set {
		return defaultValue
	}

	return o.value
}

func (o Optional[T]) MustGet() T {
	if !o.set {
		panic("value is not set")
	}

	return o.value
}
