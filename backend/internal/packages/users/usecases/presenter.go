package usecases

import (
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/view_models"
)

type Presenter struct{}

func (p *Presenter) User(user *models.User) view_models.User {
	return view_models.User{
		ID:        user.ID(),
		Email:     user.Email(),
		Username:  user.Username(),
		Role:      view_models.UserRole(user.Role()),
		CreatedAt: user.CreatedAt(),
		UpdatedAt: user.UpdatedAt(),
	}
}
