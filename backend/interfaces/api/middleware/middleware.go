package middleware

import (
	"log/slog"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/requestid"

	"seo-agents-backend/pkg/auth"
	"seo-agents-backend/pkg/utils"
)

func Setup(app *fiber.App, frontendURL string) {
	app.Use(requestid.New())

	app.Use(func(c *fiber.Ctx) error {
		start := time.Now()
		err := c.Next()
		slog.Info("Request",
			"method", c.Method(),
			"path", c.Path(),
			"status", c.Response().StatusCode(),
			"duration", time.Since(start).String(),
			"request_id", c.Locals("requestid"),
		)
		return err
	})

	app.Use(cors.New(cors.Config{
		AllowOrigins: frontendURL,
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization",
	}))
}

// AuthMiddleware ตรวจ JWT token จาก Authorization header
func AuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get("Authorization")
		if header == "" {
			return utils.UnauthorizedResponse(c, "Missing authorization header")
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			return utils.UnauthorizedResponse(c, "Invalid authorization format")
		}

		claims, err := auth.ValidateToken(parts[1])
		if err != nil {
			return utils.UnauthorizedResponse(c, "Invalid or expired token")
		}

		c.Locals("userId", claims.UserID)
		c.Locals("email", claims.Email)
		return c.Next()
	}
}
