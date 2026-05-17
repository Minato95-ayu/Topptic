# ⚠️ Topptic AI - Real-World Failures & Edge Cases Tracker

This file documents and tracks active engineering bottlenecks, memory spikes, and AI generation drift encountered during real-world project builds.

---

## 📂 Active Bug & Performance Logs

| Date | Affected Component | Symptom | Root Cause | Fix Status |
| :--- | :--- | :--- | :--- | :--- |
| 2026-05-17 | Rust Backend (`ai.rs`) | Windows CP1252 Terminal encoding crash | Emoji unicode symbols failed to map under Windows command code page. | **RESOLVED ✓** (Bypassed using ASCII tags) |
| 2026-05-17 | Inference (`complete_with_ollama`) | CPU memory allocation lockup | Context size defaults (>2048) caused thrashing on low-end systems. | **RESOLVED ✓** (Set strict 1200-char truncation limits) |

---

## 🛠️ Edge Case Diagnostics

### 1. Windows Code Page Mismatch
*   **Symptom**: Executing print statements containing emojis (like `✅`, `❌`, `🏆`) via terminal triggers `UnicodeEncodeError`.
*   **Workaround**: Standardize all CLI logs to classic ASCII tags (e.g., `[OK]`, `[ERROR]`, `[SCORE]`).

### 2. Low-RAM Garbage Collection Loops
*   **Symptom**: Memory consumption creeps over time during long generation sessions.
*   **Remedy**: Configure Monaco instances to strictly dispose editor models when tabs are switched, and enforce `std::env::set_var("OLLAMA_MAX_LOADED_MODELS", "1")` upon Tauri app initialize.
