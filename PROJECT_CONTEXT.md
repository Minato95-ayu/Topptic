# Topptic Project Context

This file is the single source of truth for the Topptic project. Keep it updated whenever architecture, scope, setup, or implementation status changes.

## Project Identity

Topptic is a local-first app development engine with a professional desktop UI, Monaco editor, and AI assistant panel.

## Current Goal

Build a Tauri v2 desktop app using a Next.js frontend and a Rust backend command layer.

The backend should act as the stable integration boundary for:
- AI chat and code assistance
- File read/write operations
- Project listing and management
- Code formatting hooks
- Build command orchestration

## Tech Stack

- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS
- Desktop shell: Tauri v2
- Backend: Rust Tauri commands
- Editor: Monaco Editor
- AI engine target: Ollama or llama.cpp through a local Rust HTTP bridge
- Database target: SQLite, currently mocked

## Current Implementation Status

Implemented:
- Next.js app scaffold
- Tauri v2 scaffold
- Tailwind styling
- Sidebar
- Monaco editor panel
- AI chat panel
- Typed frontend backend bridge
- Rust Tauri commands for:
  - backend status
  - project listing
  - file listing
  - AI chat
  - AI code suggestions
  - file read
  - file write
  - code formatting
  - local build command execution
- Rust backend modules:
  - `src-tauri/src/commands.rs`
  - `src-tauri/src/fs_ops.rs`
  - `src-tauri/src/ai.rs`
  - `src-tauri/src/build_runner.rs`
  - `src-tauri/src/models.rs`
- Ollama and llama.cpp integration behind Rust AI commands with mock fallback

Verified:
- `npm install` completed
- `npm run build` passed
- Next dev server runs at `http://localhost:3000`
- `npx tauri --version` works

Blocked:
- Full Tauri desktop compile cannot run until Rust/Cargo/rustup and Visual Studio Build Tools with MSVC are installed on the machine.

## Important Files

- `package.json`: npm scripts and frontend/Tauri JS dependencies
- `next.config.mjs`: Next static export configuration for Tauri
- `tailwind.config.js`: existing Tailwind theme configuration
- `app/lib/backend.ts`: typed frontend bridge to Tauri commands with browser fallbacks
- `app/components/ai/ChatPanel.tsx`: AI chat UI connected to backend bridge
- `app/components/editor/EditorPanel.tsx`: Monaco editor connected to save/format hooks
- `app/components/Sidebar.tsx`: backend status and project navigation
- `src-tauri/src/lib.rs`: Rust command layer
- `src-tauri/src/commands.rs`: Tauri command handlers
- `src-tauri/src/fs_ops.rs`: workspace-scoped local file IO
- `src-tauri/src/ai.rs`: offline AI bridge for Ollama and llama.cpp
- `src-tauri/src/build_runner.rs`: local terminal build command runner
- `src-tauri/src/models.rs`: Rust request/response DTOs
- `src-tauri/tauri.conf.json`: Tauri v2 app configuration

## Architecture Rule

Frontend components should not directly know backend details.

Use `app/lib/backend.ts` as the frontend boundary. Backend command names and Tauri invoke logic should stay there.

Rust commands in `src-tauri/src/lib.rs` are the desktop/backend boundary.

## Current Backend Commands

- `get_backend_status`
- `list_projects`
- `list_files`
- `ai_chat`
- `ai_suggest`
- `read_file`
- `write_file`
- `format_code`
- `run_build`

## AI Integration

AI implementation can change, but UI should keep using:

```ts
sendChatMessage({ message, codeContext })
```

The Rust `ai_chat` command now tries to call Ollama at `127.0.0.1:11434` using `/api/generate`.
The Rust `ai_suggest` command takes current Monaco code and sends it to local AI for bug fixes, code suggestions, or improvements.

Fallback order:
- Ollama on `127.0.0.1:11434`
- llama.cpp server on `127.0.0.1:8080`
- mock response if neither local server is reachable

Default model:

```bash
llama3.2
```

Override with:

```bash
TOPPTIC_OLLAMA_MODEL=your-model-name
```

If Ollama is not running or returns an error, `ai_chat` falls back to a local mock response so the UI remains usable.

Future provider changes should stay behind the same frontend APIs and Rust commands.

## File System Direction

All editor file operations should go through Tauri commands.

Current write/read behavior is scoped to a local `workspace` folder created under the Tauri current directory. Paths must remain relative and inside that workspace.

## Database Direction

Project listing is currently mocked in Rust.

Next step is to replace `list_projects` with SQLite-backed storage while keeping the frontend API unchanged.

## Build System Direction

`run_build` executes a local terminal command inside the workspace, with no internet requirement.

Default command inference:
- `Cargo.toml` -> `cargo build --release`
- `package.json` -> `npm run build`
- no known build file -> local message via `cmd /C echo ...`

The frontend can also pass an explicit command and args.

## Setup Notes

Frontend:

```bash
npm install
npm run dev
npm run build
```

Tauri:

```bash
npm run tauri:dev
npm run tauri:build
```

Tauri requires:
- Rust via rustup
- Cargo
- Visual Studio Build Tools with MSVC and Windows SDK on Windows
- WebView2 Runtime

## Known Issues

- npm reports dependency audit findings. Do not run `npm audit fix --force` without reviewing breaking changes.
- Tauri desktop build is blocked until Rust and MSVC tooling are installed.
- SQLite is integration-ready but not fully implemented.
- Ollama integration requires the Ollama server to be running locally and the configured model to be pulled.
- llama.cpp integration expects a local OpenAI-style/server completion endpoint at `127.0.0.1:8080/completion`.

## Working Agreement

When continuing this project:
- Read this file first.
- Update this file after meaningful changes.
- Keep frontend APIs stable where possible.
- Prefer changing implementation behind `app/lib/backend.ts` and Rust commands instead of spreading backend logic through components.
- Treat this file as the project brain, even if the AI assistant or model changes.
