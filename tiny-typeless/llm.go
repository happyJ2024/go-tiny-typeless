package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

// Transcriber interface defines the contract for audio transcription
type Transcriber interface {
	Transcribe(audioData []byte, mimeType string) (TranscriptionResult, error)
}

type TranscriptionResult struct {
	Text       string
	UsedTokens int64
}

// GeminiTranscriber implements Transcriber using Google's Gemini API
type GeminiTranscriber struct {
	apiKey string
	model  string
	proxy  string
	client *genai.Client
}

// NewGeminiTranscriber creates a new GeminiTranscriber
func NewGeminiTranscriber(apiKey, model, proxy string) (*GeminiTranscriber, error) {
	if err := applyProxyEnvironment(proxy); err != nil {
		return nil, err
	}

	client, err := genai.NewClient(
		context.Background(),
		option.WithAPIKey(apiKey),
	)
	if err != nil {
		return nil, err
	}

	return &GeminiTranscriber{
		apiKey: apiKey,
		model:  model,
		proxy:  proxy,
		client: client,
	}, nil
}

func applyProxyEnvironment(proxy string) error {
	if proxy == "" {
		_ = os.Unsetenv("HTTP_PROXY")
		_ = os.Unsetenv("HTTPS_PROXY")
		_ = os.Unsetenv("http_proxy")
		_ = os.Unsetenv("https_proxy")
		return nil
	}

	if _, err := url.Parse(proxy); err != nil {
		return fmt.Errorf("invalid proxy URL: %w", err)
	}

	if err := os.Setenv("HTTP_PROXY", proxy); err != nil {
		return fmt.Errorf("failed to set HTTP_PROXY: %w", err)
	}
	if err := os.Setenv("HTTPS_PROXY", proxy); err != nil {
		return fmt.Errorf("failed to set HTTPS_PROXY: %w", err)
	}
	_ = os.Setenv("http_proxy", proxy)
	_ = os.Setenv("https_proxy", proxy)

	return nil
}

func newHTTPClient(proxy string) (*http.Client, error) {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.Proxy = http.ProxyFromEnvironment

	if proxy != "" {
		proxyURL, err := url.Parse(proxy)
		if err != nil {
			return nil, fmt.Errorf("invalid proxy URL: %w", err)
		}
		transport.Proxy = http.ProxyURL(proxyURL)
	}

	return &http.Client{
		Transport: transport,
		Timeout:   2 * time.Minute,
	}, nil
}

func testProxyConnection(proxy string) (string, error) {
	client, err := newHTTPClient(proxy)
	if err != nil {
		return "", err
	}

	client.Timeout = 12 * time.Second

	req, err := http.NewRequest(http.MethodGet, "https://generativelanguage.googleapis.com/", nil)
	if err != nil {
		return "", fmt.Errorf("failed to create proxy test request: %w", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("proxy request failed: %w", err)
	}
	defer resp.Body.Close()

	_, _ = io.Copy(io.Discard, resp.Body)

	return fmt.Sprintf("Proxy reachable, gateway responded with status %s", resp.Status), nil
}

// Transcribe converts audio data to text using Gemini API
func (g *GeminiTranscriber) Transcribe(audioData []byte, mimeType string) (TranscriptionResult, error) {
	if g.client == nil {
		return TranscriptionResult{}, fmt.Errorf("gemini client is not initialized")
	}

	if mimeType == "" {
		mimeType = "audio/webm"
	}

	model := g.client.GenerativeModel(g.model)

	// Create a context for the request
	ctx := context.Background()

	// Send audio as generic Blob part, not ImageData.
	resp, err := model.GenerateContent(ctx,
		genai.Blob{MIMEType: mimeType, Data: audioData},
		genai.Text("Please transcribe this audio to text exactly as spoken. Provide only the transcribed text without any additional commentary."),
	)

	if err != nil {
		return TranscriptionResult{}, err
	}

	if len(resp.Candidates) == 0 {
		return TranscriptionResult{}, fmt.Errorf("no candidates returned from API")
	}

	if len(resp.Candidates[0].Content.Parts) == 0 {
		return TranscriptionResult{}, fmt.Errorf("no content parts returned")
	}

	var usedTokens int64
	if resp.UsageMetadata != nil {
		usedTokens = int64(resp.UsageMetadata.TotalTokenCount)
	}

	content := resp.Candidates[0].Content.Parts[0]
	if text, ok := content.(genai.Text); ok {
		return TranscriptionResult{
			Text:       string(text),
			UsedTokens: usedTokens,
		}, nil
	}

	return TranscriptionResult{}, fmt.Errorf("unexpected response type")
}

// Close closes the Gemini client
func (g *GeminiTranscriber) Close() error {
	if g.client != nil {
		return g.client.Close()
	}
	return nil
}
