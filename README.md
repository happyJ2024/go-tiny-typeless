# Tiny Typeless

Tiny Typeless is a desktop audio transcription app built with Go + Wails + React.
It records microphone input and transcribes speech to text using Google Gemini.

## Project Structure

```text
.
├─ tiny-typeless/                 # Main Wails application
│  ├─ app.go
│  ├─ config.go
│  ├─ llm.go
│  ├─ frontend/
│  └─ README.md                   # App-level development/build notes
├─ tiny-typeless-plan.md          # Product and architecture plan
├─ IMPLEMENTATION_COMPLETE.md     # Implementation summary
└─ README.md                      # This file (repo-level)
```

## Features

- Audio recording from microphone
- Real-time waveform visualization
- Speech-to-text transcription using Gemini models
- Configurable AI provider settings (model, API key)
- Optional network proxy support
- Usage statistics (last and cumulative token usage)

## Quick Start

### 1. Prerequisites

- Go 1.26+
- Node.js 18+
- Wails CLI v2

Install Wails CLI:

```powershell
go install github.com/wailsapp/wails/v2/cmd/wails@v2.11.0
```

### 2. Run in Development Mode

From [tiny-typeless](tiny-typeless):

```powershell
wails dev
```

### 3. Build

From [tiny-typeless](tiny-typeless):

```powershell
powershell -ExecutionPolicy Bypass -File .\build.ps1
```

More build options are documented in [tiny-typeless/README.md](tiny-typeless/README.md).

## Configuration

At runtime, user configuration and statistics are stored under:

- `~/.tiny-typeless/config.json`
- `~/.tiny-typeless/statistics.json`

## Documentation

- App development and build notes: [tiny-typeless/README.md](tiny-typeless/README.md)
- Architecture/plan notes: [tiny-typeless-plan.md](tiny-typeless-plan.md)
- Implementation summary: [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)

## Copyright

Copyright (c) 2026 Tiny Typeless Contributors.

## License

This project is open sourced under the MIT License.
See [LICENSE](LICENSE) for full text.
