# Project Guidelines

## Architecture
- Backend lives in Go files at the repo root.
- Frontend lives in `frontend/` (React + TypeScript + Vite).
- Wails binds exported Go methods from `app.go` to frontend calls under `frontend/wailsjs/go/main/App.js`.
- Keep boundaries clear:
  - Backend (`app.go`, `config.go`, `llm.go`) owns config persistence and transcription logic.
  - Frontend (`frontend/src/pages`, `frontend/src/components`, `frontend/src/hooks`) owns UI state and recording UX.

## Build And Test
- Working directory for backend/Wails commands: repo root.
- Working directory for frontend-only commands: `frontend/`.

- Primary dev command:
  - `wails dev`

- Primary build command:
  - `powershell -ExecutionPolicy Bypass -File .\build.ps1`

- Common build variants:
  - `powershell -ExecutionPolicy Bypass -File .\build.ps1 -Target windows`
  - `powershell -ExecutionPolicy Bypass -File .\build.ps1 -Target mac`
  - `powershell -ExecutionPolicy Bypass -File .\build.ps1 -Clean`

- Frontend build check:
  - `npm run build` (run in `frontend/`)

- Test status:
  - There is currently no automated test suite in this repo.

## Conventions
- Do not edit generated Wails bridge files directly:
  - `frontend/wailsjs/go/main/App.d.ts`
  - `frontend/wailsjs/go/main/App.js`
  - `frontend/wailsjs/go/models.ts`
  - `frontend/wailsjs/runtime/*`

- Keep backend error handling explicit and wrapped with context (`fmt.Errorf("...: %w", err)`).
- Use backend log helpers in `app.go` (`logInfo`, `logError`) for operational events.
- Frontend should call backend bindings from `frontend/wailsjs/go/main/App` and handle async errors with `try/catch`.
- Hooks/components that allocate browser resources (audio streams, animation frames, event subscriptions) must clean up in effect teardown.

## Environment Notes
- Ensure `wails` CLI is available on PATH before build/dev commands.
- Keep Wails CLI aligned with `go.mod` (build script supports `-UpdateWailsVersion`).
- macOS packaging generally needs macOS or a configured cross-compilation setup.

## Reference Docs
- Project usage and build details: `README.md`
- Build directory notes: `build/README.md`
- Workspace-level implementation summary: `../IMPLEMENTATION_COMPLETE.md`
- Workspace-level design/plan notes: `../tiny-typeless-plan.md`