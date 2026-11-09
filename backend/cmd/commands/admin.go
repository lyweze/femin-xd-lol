package commands

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/lyweze/femin-xd-lol/backend/cmd"
	"github.com/lyweze/femin-xd-lol/backend/internal/db"
	"github.com/lyweze/femin-xd-lol/backend/internal/di"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/models"
	"github.com/lyweze/femin-xd-lol/backend/internal/packages/users/usecases"
	"github.com/samber/do"
	"github.com/spf13/cobra"
	"golang.org/x/term"
)

func init() { //nolint:gochecknoinits
	AdminCreate.Flags().String("email", "", "email администратора")
	AdminCreate.Flags().String("username", "", "имя пользователя")
	cobra.CheckErr(AdminCreate.MarkFlagRequired("email"))
	cobra.CheckErr(AdminCreate.MarkFlagRequired("username"))

	Admin.AddCommand(AdminCreate)
	cmd.RootCMD.AddCommand(Admin)
}

var Admin = &cobra.Command{ //nolint:exhaustruct,gochecknoglobals
	Use:   "admin",
	Short: "Управление администраторами",
}

// AdminCreate нужна для первого администратора: без него в админку некому войти.
// Пароль намеренно не флаг, иначе он останется в истории шелла и в списке процессов.
var AdminCreate = &cobra.Command{ //nolint:exhaustruct,gochecknoglobals
	Use:   "create",
	Short: "Создать администратора",
	Long:  "Создаёт администратора. Пароль спрашивается в терминале или читается первой строкой из stdin.",
	RunE:  runAdminCreate,
}

func runAdminCreate(c *cobra.Command, _ []string) error {
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	email, err := c.Flags().GetString("email")
	if err != nil {
		return fmt.Errorf("failed to read email flag: %w", err)
	}

	username, err := c.Flags().GetString("username")
	if err != nil {
		return fmt.Errorf("failed to read username flag: %w", err)
	}

	password, err := readPassword(c)
	if err != nil {
		return err
	}

	container := do.New()

	di.Provide(container)
	db.ProvideServe(container)
	users.Provide(container)

	config := di.InvokeConfig(container)

	defer func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), config.ShutdownTimeout)
		defer cancel()

		di.Shutdown(container, shutdownCtx)
	}()

	out, err := users.InvokeUsecases(container).CreateUser(ctx, usecases.CreateUserIn{
		Email:    email,
		Username: username,
		Password: password,
		Role:     models.UserRoleAdmin,
	})
	if err != nil {
		return fmt.Errorf("failed to create admin: %w", err)
	}

	c.Printf("admin created: %s (%s)\n", out.User.Email, out.User.ID)

	return nil
}

func readPassword(c *cobra.Command) (string, error) {
	fd := int(os.Stdin.Fd())

	if !term.IsTerminal(fd) {
		line, err := bufio.NewReader(os.Stdin).ReadString('\n')
		if err != nil && line == "" {
			return "", fmt.Errorf("failed to read password from stdin: %w", err)
		}

		return strings.TrimRight(line, "\r\n"), nil
	}

	first, err := promptPassword(c, fd, "Пароль: ")
	if err != nil {
		return "", err
	}

	second, err := promptPassword(c, fd, "Повторите пароль: ")
	if err != nil {
		return "", err
	}

	if first != second {
		return "", errors.New("passwords do not match")
	}

	return first, nil
}

func promptPassword(c *cobra.Command, fd int, prompt string) (string, error) {
	c.Print(prompt)

	password, err := term.ReadPassword(fd)

	c.Println()

	if err != nil {
		return "", fmt.Errorf("failed to read password: %w", err)
	}

	return string(password), nil
}
