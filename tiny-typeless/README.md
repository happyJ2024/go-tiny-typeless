# Tiny Typeless

## About

Tiny Typeless is a Wails desktop app for recording audio and transcribing it with Google Gemini.

Current toolchain:
- Go `1.26.1`
- Wails `v2.11.0`
- React + TypeScript + Vite

Project settings are configured in `wails.json`.

## Live Development

To run in live development mode:

```bash
wails dev
```

This starts the Wails backend and the Vite dev server with hot reload.

## Building

Use the unified build script from the project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\build.ps1
```

This script prefers `wails build` and builds:
- Windows: `windows/amd64`
- macOS: `darwin/universal`

Common build commands:

```powershell
# Build Windows and macOS
powershell -ExecutionPolicy Bypass -File .\build.ps1

# Build only Windows
powershell -ExecutionPolicy Bypass -File .\build.ps1 -Target windows

# Build only macOS
powershell -ExecutionPolicy Bypass -File .\build.ps1 -Target mac

# Clean build
powershell -ExecutionPolicy Bypass -File .\build.ps1 -Clean
```

Optional flags:
- `-NoPackage`: Skip platform packaging
- `-SkipFrontend`: Skip frontend build
- `-UpdateWailsVersion`: Sync `go.mod` Wails version to the installed CLI version
- `-VerboseBuild`: Use verbose Wails build output

## Output

Wails writes build artifacts to the standard build output directory:

```text
build/bin/
```

## Notes

- macOS packaging typically needs to run on macOS or on a machine with a valid macOS cross-compilation environment.
- If you update the global Wails CLI, keep it aligned with the version in `go.mod`.
