package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type LogEntry struct {
	Timestamp string `json:"timestamp"`
	Level     string `json:"level"`
	Source    string `json:"source"`
	Message   string `json:"message"`
}

type Statistics struct {
	LastTranscriptionTokens  int64 `json:"last_transcription_tokens"`
	TotalTranscriptionTokens int64 `json:"total_transcription_tokens"`
}

// App struct
type App struct {
	ctx          context.Context
	transcriber  Transcriber
	currentModel string
	logs         []LogEntry
	mu           sync.Mutex
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.logInfo("backend", "application started")

	cfg, err := LoadConfig()
	if err != nil {
		a.logError("backend", "failed to load config on startup: %v", err)
		return
	}

	if cfg.APIKey != "" {
		if err := a.initTranscriber(cfg); err != nil {
			a.logError("backend", "failed to initialize transcriber from saved settings: %v", err)
			return
		}
		a.logInfo("backend", "transcriber initialized from saved settings")
	}
}

// GetSettings returns the current configuration
func (a *App) GetSettings() (Config, error) {
	cfg, err := LoadConfig()
	if err != nil {
		a.logError("backend", "failed to load settings: %v", err)
		return cfg, err
	}

	a.logInfo("backend", "settings loaded")
	return cfg, nil
}

func (a *App) GetStatistics() (Statistics, error) {
	stats, err := LoadStatistics()
	if err != nil {
		a.logError("backend", "failed to load statistics: %v", err)
		return Statistics{}, err
	}

	return stats, nil
}

func (a *App) ResetStatistics() error {
	if err := SaveStatistics(DefaultStatistics()); err != nil {
		a.logError("backend", "failed to reset statistics: %v", err)
		return err
	}

	a.logInfo("backend", "statistics reset")
	return nil
}

func (a *App) GetLogs() []LogEntry {
	a.mu.Lock()
	defer a.mu.Unlock()

	logs := make([]LogEntry, len(a.logs))
	copy(logs, a.logs)
	return logs
}

func (a *App) TestProxyConnection(proxy string) (string, error) {
	if proxy == "" {
		return "", fmt.Errorf("proxy is empty")
	}

	a.logInfo("backend", "testing proxy connection")
	message, err := testProxyConnection(proxy)
	if err != nil {
		a.logError("backend", "proxy test failed: %v", err)
		return "", err
	}

	a.logInfo("backend", "%s", message)
	return message, nil
}

// SaveSettings saves the configuration to disk and initializes the transcriber
func (a *App) SaveSettings(cfg Config) error {
	// Save config to disk
	if err := SaveConfig(cfg); err != nil {
		a.logError("backend", "failed to save settings: %v", err)
		return err
	}

	// Initialize transcriber with new config
	if cfg.Provider == "gemini" {
		if err := a.initTranscriber(cfg); err != nil {
			a.logError("backend", "failed to initialize transcriber: %v", err)
			return err
		}
		a.logInfo("backend", "settings saved, provider=%s model=%s proxy=%t", cfg.Provider, cfg.Model, cfg.Proxy != "")
	}

	return nil
}

// TranscribeAudio transcribes audio data to text
// audioBase64 should be base64-encoded audio data
func (a *App) TranscribeAudio(audioBase64 string, mimeType string) (string, error) {
	if a.transcriber == nil {
		err := fmt.Errorf("transcriber not initialized - please configure settings first")
		a.logError("backend", "%v", err)
		return "", err
	}

	if mimeType == "" {
		mimeType = "audio/webm"
	}

	// Decode base64 audio data
	audioData, err := base64.StdEncoding.DecodeString(audioBase64)
	if err != nil {
		wrappedErr := fmt.Errorf("failed to decode audio data: %w", err)
		a.logError("backend", "%v", wrappedErr)
		return "", wrappedErr
	}

	a.logInfo("backend", "starting transcription for %d bytes of audio (%s)", len(audioData), mimeType)

	// Call transcriber
	result, err := a.transcriber.Transcribe(audioData, mimeType)
	if err != nil {
		wrappedErr := fmt.Errorf("transcription failed: %w", err)
		a.logError("backend", "%v", wrappedErr)
		return "", wrappedErr
	}

	if err := a.updateTokenStats(result.UsedTokens); err != nil {
		a.logError("backend", "failed to update token statistics: %v", err)
	}

	a.logInfo("backend", "transcription completed successfully (tokens=%d)", result.UsedTokens)

	return result.Text, nil
}

// Greet returns a greeting for the given name (legacy method for testing)
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

func (a *App) initTranscriber(cfg Config) error {
	if cfg.APIKey == "" {
		return fmt.Errorf("API key is required")
	}

	transcriber, err := NewGeminiTranscriber(cfg.APIKey, cfg.Model, cfg.Proxy)
	if err != nil {
		return err
	}

	if a.transcriber != nil {
		if gt, ok := a.transcriber.(*GeminiTranscriber); ok {
			_ = gt.Close()
		}
	}

	a.transcriber = transcriber
	a.currentModel = cfg.Model
	return nil
}

func (a *App) appendLog(level, source, message string) {
	entry := LogEntry{
		Timestamp: time.Now().Format(time.RFC3339),
		Level:     level,
		Source:    source,
		Message:   message,
	}

	a.mu.Lock()
	a.logs = append(a.logs, entry)
	if len(a.logs) > 300 {
		a.logs = a.logs[len(a.logs)-300:]
	}
	a.mu.Unlock()

	if a.ctx != nil {
		runtime.EventsEmit(a.ctx, "app:log", entry)
	}
}

func (a *App) logInfo(source, format string, args ...interface{}) {
	a.appendLog("info", source, fmt.Sprintf(format, args...))
}

func (a *App) logError(source, format string, args ...interface{}) {
	a.appendLog("error", source, fmt.Sprintf(format, args...))
}

func (a *App) updateTokenStats(usedTokens int64) error {
	if usedTokens < 0 {
		usedTokens = 0
	}

	stats, err := LoadStatistics()
	if err != nil {
		return err
	}

	stats.LastTranscriptionTokens = usedTokens
	stats.TotalTranscriptionTokens += usedTokens

	return SaveStatistics(stats)
}
