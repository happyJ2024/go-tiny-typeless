package main

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type legacyTokenStats struct {
	LastTranscriptionTokens  int64 `json:"last_transcription_tokens"`
	TotalTranscriptionTokens int64 `json:"total_transcription_tokens"`
}

func DefaultStatistics() Statistics {
	return Statistics{
		LastTranscriptionTokens:  0,
		TotalTranscriptionTokens: 0,
	}
}

func GetStatisticsPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	dataDir := filepath.Join(home, ".tiny-typeless")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return "", err
	}

	return filepath.Join(dataDir, "statistics.json"), nil
}

func LoadStatistics() (Statistics, error) {
	stats := DefaultStatistics()

	statsPath, err := GetStatisticsPath()
	if err != nil {
		return stats, err
	}

	data, err := os.ReadFile(statsPath)
	if err == nil {
		if err := json.Unmarshal(data, &stats); err != nil {
			return stats, err
		}
		return stats, nil
	}

	if !os.IsNotExist(err) {
		return stats, err
	}

	// Migrate one-time stats from old config.json if present.
	legacy, migrationErr := loadLegacyStatsFromConfig()
	if migrationErr == nil {
		stats = legacy
		_ = SaveStatistics(stats)
	}

	return stats, nil
}

func SaveStatistics(stats Statistics) error {
	statsPath, err := GetStatisticsPath()
	if err != nil {
		return err
	}

	data, err := json.MarshalIndent(stats, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(statsPath, data, 0644)
}

func loadLegacyStatsFromConfig() (Statistics, error) {
	stats := DefaultStatistics()

	configPath, err := GetConfigPath()
	if err != nil {
		return stats, err
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		return stats, err
	}

	legacy := legacyTokenStats{}
	if err := json.Unmarshal(data, &legacy); err != nil {
		return stats, err
	}

	stats.LastTranscriptionTokens = legacy.LastTranscriptionTokens
	stats.TotalTranscriptionTokens = legacy.TotalTranscriptionTokens

	return stats, nil
}
