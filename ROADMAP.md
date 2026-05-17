# Topptic Development Roadmap 🚀

## Core Priority: Stable Lightweight IDE Core

Our current focus is strictly on building a stable, high-performance base IDE before adding extensive AI layers.

### 📅 Next Build Order

1. **Workspace Filesystem Engine**
   - Implement secure, workspace-scoped local file read/write operations.
   - Powered by Tauri Rust filesystem bindings.

2. **Monaco Editor Integration**
   - High-fidelity editor load, autosave, syntax highlighting, and formatting hooks.
   - Strict typescript boundaries around editor panels.

3. **Integrated Terminal Panel**
   - Seamless embedded console at the bottom of the editor.
   - PTY/Shell process spawning and async output event streams from Rust to Frontend.

4. **Local AI Runtime**
   - Integration with Ollama SSE streaming APIs and llama.cpp local engines.
   - Offline code completion and auto-healing compilation features.

5. **Performance Optimization**
   - RAM usage reduction, lightweight package bundles, fast startup profiling.
