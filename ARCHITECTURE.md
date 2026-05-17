# Topptic System Architecture 🏗️

Topptic is built with a hybrid desktop architecture designed to maximize performance on low-end hardware by avoiding the heavy resource footprints of Electron-based apps.

## ⚡ Technology Stack

- **Frontend Interface:** Next.js 14, Tailwind CSS, Monaco Editor (React wrapper)
- **Desktop Runtime/Backend:** Tauri v2, Rust (native OS webview bindings)
- **Local Storage Engine:** SQLite 3 (configured with Write-Ahead Logging for high concurrency)
- **Local Inference Engine:** Ollama / llama.cpp (SSE streaming endpoint)

## 🛡️ Core Architectural Principles

1. **Local-First Boundary:** All file indices, workspace state, and model inference prioritizes local execution without cloud dependencies.
2. **Lightweight & High-Performance:** Keep memory footprint minimal. CPU cycle economy is prioritized over bloated UI layouts.
3. **Rust IPC Orchestration:** All heavy operations (file operations, SQLite queries, terminal spawn loops) flow through typed Tauri Rust command handlers to keep the UI smooth and responsive.
