package time_provider

import "time"

type TimeProvider struct {
}

func NewTimeProvider() *TimeProvider {
	return &TimeProvider{}
}

func (p *TimeProvider) Now() time.Time {
	return time.Now().UTC().Truncate(time.Millisecond)
}
