# Topptic System Architecture 🏗️

Topptic is built with a hybrid desktop architecture designed to maximize performance on low-end hardware by avoiding the heavy resource footprints of Electron-based apps. It integrates a local-first **Agentic AI engine** directly inside a native Rust shell.

---

## ⚡ Technology Stack

- **Frontend Interface:** Next.js 14, Tailwind CSS, Monaco Editor (React wrapper)
- **Desktop Runtime/Backend:** Tauri v2, Rust (native OS webview bindings)
- **Local Storage Engine:** SQLite 3 (configured with Write-Ahead Logging for high concurrency)
- **Local Inference Engine:** Ollama / llama.cpp (SSE streaming endpoint)
- **Local Fine-Tuning Engine:** Custom PyTorch character-level GPT Transformer (finetune_agent.py)

---

## 🤖 TOPPTIC AI Agentic Architecture

The core superpower of Topptic is its **100% offline agentic programming engine**, designed to behave identically to the high-end reasoning systems developed by Google, DeepMind, and OpenAI.

### 1. The 4-Step Agentic Loop (PLAN ➔ ACT ➔ VERIFY ➔ ITERATE)

```
        Aapka Prompt (e.g. "Create a Server")
                       │
                       ▼
             ┌───────────────────┐
             │      1. PLAN      │ ◄─── (Dimaag / System Prompt)
             └─────────┬─────────┘
                       │
                       ▼
             ┌───────────────────┐
             │      2. ACT       │ ◄─── (Generate Action Cards in JSON)
             └─────────┬─────────┘
                       │
                       ▼
             ┌───────────────────┐
             │     3. VERIFY     │ ◄─── (Read logs / check file exist)
             └─────────┬─────────┘
                       │
                       ▼
             ┌───────────────────┐
             │    4. ITERATE     │ ◄─── (If failure, trigger auto-fix!)
             └───────────────────┘
```

*   **PLAN**: The agent parses the instruction, reads the relevant file context using custom Rust file system commands, and devises a warm, step-by-step strategy (fully compatible with natural Hinglish prompts).
*   **ACT**: Instead of just outputting text, the agent generates actionable JSON representations inside `<topptic_action>` tags. These represent tools such as `write_file` or `execute_command`.
*   **VERIFY**: Once the user approves the action card, the Rust backend executes the modification, captures stdout/stderr, and returns it to the agent stream.
*   **ITERATE**: The agent reviews the compilation output. If there is a bug, it iterates by automatically generating a new action patch.

---

## 🛠️ The Self-Healing Compiler Loop

When a user clicks the **Build** panel, Topptic runs a multi-threaded compilation pipeline powered by the Rust backend. 

```
 ┌─────────────┐     ┌──────────────┐     ┌──────────────┐
 │ User clicks │ ──► │ Rust Spawns  │ ──► │ Compilation  │
 │   "Build"   │     │  Subprocess  │     │   Process    │
 └─────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                        ▼                                                 ▼
               [Success: Output App]                             [Error: stderr logs]
                        │                                                 │
                        ▼                                                 ▼
             🚀 Ready for production                     🤖 Handed to TOPPTIC AI Agent
                                                                          │
                                                                          ▼
                                                                🛠️ Auto-Fix Card Generated!
```

1.  **Tauri Spawning**: The Rust backend spawns a platform-specific compiler process (e.g., `cargo build`, `npm run build`, `python`, or `g++`).
2.  **Telemetry capture**: Stdout and Stderr are piped in real-time. If the exit code is non-zero, the exact compiler stderr log is isolated.
3.  **Heuristics injection**: The error stack is loaded into the **Topptic AI** context along with the active file buffer. The agent produces a targeted code patch, preventing the developer from having to debug manually.

---

## 🏗️ Rust IPC Command Architecture

Tauri acts as the typed secure gateway between the Next.js sandboxed frontend and the host operating system. Heavy operations never block the frontend render cycle.

*   **File operations (`fs_ops.rs`)**: Manages reading, writing, directory listing, and workspace state securely. Includes strict checks to keep modifications inside the sandbox.
*   **Command runner (`commands.rs`)**: Manages running shells and captures real-time stdout streams to pipe back to Next.js using Tauri `Emitter` traits.
*   **Database manager (`db.rs`)**: A fast SQLite instance storing workspace project entries, custom settings, and terminal history.

---

## 🧠 Private PyTorch Fine-Tuning Pipeline

Topptic includes a completely local machine learning model training loop, allowing users to train a custom **Antigravity Causal Language Model** on their private codebases.

*   **Dataset generator (`autotrain_agent.py`)**: Crawls active workspaces, cleans system code, and constructs instruction-response pairs stored in `training_dataset.json`.
*   **Causal Transformer (`finetune_agent.py`)**: An ultra-optimized character-level GPT Transformer with Multi-Head Causal Self-Attention, trained using PyTorch. 
*   **Resource Economy**: Runs in ~50MB of RAM, making it perfectly optimized for low-end laptops and offline setups.

---

## 🛡️ Core Architectural Principles

1.  **Local-First Boundary:** All file indices, workspace state, and model inference prioritizes local execution without cloud dependencies.
2.  **Lightweight & High-Performance:** Keep memory footprint minimal. CPU cycle economy is prioritized over bloated UI layouts.
3.  **Rust IPC Orchestration:** All heavy operations (file operations, SQLite queries, terminal spawn loops) flow through typed Tauri Rust command handlers to keep the UI smooth and responsive.
