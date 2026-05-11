package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/nikitalbnv/stochi/apps/engine/internal/auth"
	"github.com/nikitalbnv/stochi/apps/engine/internal/config"
	"github.com/nikitalbnv/stochi/apps/engine/internal/db"
	"github.com/nikitalbnv/stochi/apps/engine/internal/handlers"
)

func main() {
	cfg := config.Load()
	setupLogger(cfg)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Connect to database
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	slog.Info("connected to database")

	// Create middleware and handlers
	authMiddleware := auth.NewMiddleware(cfg.InternalKey)
	handler := handlers.NewHandler(pool, authMiddleware)

	// Setup routes
	mux := http.NewServeMux()

	// Health check (unauthenticated)
	mux.HandleFunc("GET /health", handler.Health)

	// Protected API endpoints
	mux.HandleFunc("POST /api/analyze", authMiddleware.Protect(handler.Analyze))
	mux.HandleFunc("POST /api/timing", authMiddleware.Protect(handler.CheckTiming))

	// Create server
	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      requestLoggingMiddleware(corsMiddleware(mux, cfg.AllowedOrigins)),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		slog.Info("shutting down server")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := server.Shutdown(ctx); err != nil {
			slog.Error("server shutdown error", "error", err)
		}
	}()

	slog.Info("server starting", "port", cfg.Port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("server error", "error", err)
		os.Exit(1)
	}

	slog.Info("server stopped")
}

func setupLogger(cfg *config.Config) {
	level := new(slog.LevelVar)
	switch strings.ToLower(cfg.LogLevel) {
	case "debug":
		level.Set(slog.LevelDebug)
	case "warn":
		level.Set(slog.LevelWarn)
	case "error":
		level.Set(slog.LevelError)
	default:
		level.Set(slog.LevelInfo)
	}

	options := &slog.HandlerOptions{Level: level}
	attrs := []slog.Attr{
		slog.String("service", cfg.ServiceName),
		slog.String("environment", os.Getenv("ENVIRONMENT")),
	}

	var handler slog.Handler
	if strings.ToLower(cfg.LogFormat) == "pretty" {
		handler = slog.NewTextHandler(os.Stdout, options).WithAttrs(attrs)
	} else {
		handler = slog.NewJSONHandler(os.Stdout, options).WithAttrs(attrs)
	}

	slog.SetDefault(slog.New(handler))
}

type statusRecorder struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func (r *statusRecorder) Write(body []byte) (int, error) {
	if r.status == 0 {
		r.WriteHeader(http.StatusOK)
	}
	n, err := r.ResponseWriter.Write(body)
	r.bytes += n
	return n, err
}

func requestLoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		recorder := &statusRecorder{ResponseWriter: w}

		next.ServeHTTP(recorder, r)

		status := recorder.status
		if status == 0 {
			status = http.StatusOK
		}

		slog.Info(
			"http request completed",
			"method", r.Method,
			"path", r.URL.Path,
			"status", status,
			"bytes", recorder.bytes,
			"duration_ms", time.Since(start).Milliseconds(),
		)
	})
}

// corsMiddleware adds CORS headers for cross-origin requests
func corsMiddleware(next http.Handler, allowedOrigins []string) http.Handler {
	allowedOriginSet := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		allowedOriginSet[origin] = struct{}{}
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			_, isAllowed := allowedOriginSet[origin]
			if isAllowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Internal-Key, X-User-ID")
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			} else {
				slog.Warn("cors rejected origin", "origin", origin, "method", r.Method, "path", r.URL.Path)
				if r.Method == http.MethodOptions {
					w.WriteHeader(http.StatusForbidden)
					return
				}
			}
		}

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
