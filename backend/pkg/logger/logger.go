package logger

import (
	"log/slog"
	"os"
)

var Log *slog.Logger

func Init() {
	Log = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(Log)
}

func InfoContext(msg string, args ...any) {
	Log.Info(msg, args...)
}

func WarnContext(msg string, args ...any) {
	Log.Warn(msg, args...)
}

func ErrorContext(msg string, args ...any) {
	Log.Error(msg, args...)
}
