package config

import (
	"fmt"
	"os"
)

type Config struct {
	DBHost      string
	DBPort      string
	DBUser      string
	DBPassword  string
	DBName      string
	RedisURL    string
	AIEngineURL string
	AppPort     string
	FrontendURL string
	JWTSecret   string
	Google      GoogleOAuthConfig
}

type GoogleOAuthConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
	FrontendURL  string
}

func Load() *Config {
	appPort := getEnv("APP_PORT", "3001")
	frontendURL := getEnv("FRONTEND_URL", "http://localhost:3000")

	return &Config{
		DBHost:      getEnv("DB_HOST", "localhost"),
		DBPort:      getEnv("DB_PORT", "5432"),
		DBUser:      getEnv("DB_USER", "seo_agents"),
		DBPassword:  getEnv("DB_PASSWORD", "seo_agents_secret"),
		DBName:      getEnv("DB_NAME", "seo_agents"),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379"),
		AIEngineURL: getEnv("AI_ENGINE_URL", "http://localhost:8000"),
		AppPort:     appPort,
		FrontendURL: frontendURL,
		JWTSecret:   getEnv("JWT_SECRET", "seo-agents-jwt-secret-change-me"),
		Google: GoogleOAuthConfig{
			ClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
			ClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
			RedirectURL:  getEnv("GOOGLE_REDIRECT_URL", fmt.Sprintf("http://localhost:%s/api/v1/auth/google/callback", appPort)),
			FrontendURL:  frontendURL,
		},
	}
}

func (c *Config) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable TimeZone=Asia/Bangkok",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName,
	)
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
