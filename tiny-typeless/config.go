package main

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// Config represents the application configuration
type Config struct {
	Provider string `json:"provider"`
	APIKey   string `json:"api_key"`
	Model    string `json:"model"`
	Proxy    string `json:"proxy"`
}

// DefaultConfig returns the default configuration
func DefaultConfig() Config {
	return Config{
		Provider: "gemini",
		APIKey:   "",
		Model:    "gemini-2.0-flash",
		Proxy:    "",
	}
}

// GetConfigPath returns the path to the config file
func GetConfigPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	configDir := filepath.Join(home, ".tiny-typeless")
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return "", err
	}
	return filepath.Join(configDir, "config.json"), nil
}

// LoadConfig loads the configuration from disk
func LoadConfig() (Config, error) {
	cfg := DefaultConfig()

	configPath, err := GetConfigPath()
	if err != nil {
		return cfg, err
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		if os.IsNotExist(err) {
			return cfg, nil // Return default config if file doesn't exist
		}
		return cfg, err
	}

	if err := json.Unmarshal(data, &cfg); err != nil {
		return cfg, err
	}

	return cfg, nil
}

// SaveConfig saves the configuration to disk
func SaveConfig(cfg Config) error {
	configPath, err := GetConfigPath()
	if err != nil {
		return err
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(configPath, data, 0644)
}
