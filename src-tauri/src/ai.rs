use crate::models::{
    AiChatRequest, AiChatResponse, AiSuggestRequest, AiSuggestResponse, OllamaGenerateResponse,
};
use std::{
    io::{Read, Write},
    net::{SocketAddr, TcpStream},
    process::Command,
    time::Duration,
};

const OLLAMA_HOST: &str = "127.0.0.1:11434";
const LLAMA_CPP_HOST: &str = "127.0.0.1:8080";

pub fn detect_ai_engine() -> String {
    if port_is_open(OLLAMA_HOST) {
        "ollama".to_string()
    } else if port_is_open(LLAMA_CPP_HOST) {
        "llama.cpp".to_string()
    } else if command_exists("ollama") {
        "ollama cli".to_string()
    } else {
        "mock".to_string()
    }
}

fn generate_smart_mock_response(query: &str, error: &str) -> String {
    let lowercase_query = query.to_lowercase();
    let display_error = if error.contains("unable to allocate CPU buffer") {
        "Ollama has low free memory. (Tip: Close other apps or restart Ollama)"
    } else {
        error
    };
    
    let mut response = format!(
        "⚠️ **[Offline Helper Mode Active]**\n*(Ollama RAM lock: `{}`)*\n\n",
        display_error
    );

    if lowercase_query.contains("hello") || lowercase_query.contains("hi") || lowercase_query.contains("hey") {
        response.push_str("Hello! Main aapka offline Topptic Helper hoon. Main pure interface aur files ke sath ready hoon!\n\nAap mujhe niche diye presets use karke koi bhi task de sakte hain:\n\n* **Fix Bugs:** Apne code ki errors thik karein.\n* **Optimize:** Performance improve karein.\n* **Write Tests:** Unit tests generate karein.");
    } else if lowercase_query.contains("code") || lowercase_query.contains("write") || lowercase_query.contains("create") || lowercase_query.contains("thum") || lowercase_query.contains("sakte") || lowercase_query.contains("termnal") || lowercase_query.contains("terminal") || lowercase_query.contains("file") || lowercase_query.contains("folder") {
        response.push_str("Bilkul! Maine aapke liye ek agentic action block taiyar kiya hai jo directly aapke workspace mein code create aur test kar sakta hai!\n\nNiche diye Action Card par **Approve Action** button click karein, aur ye Calculator code automatically aapke editor mein save ho jayega! 🚀\n\n\
        <topptic_action>\n\
        {\n\
          \"tool\": \"write_file\",\n\
          \"parameters\": {\n\
            \"path\": \"anno/calculator.py\",\n\
            \"content\": \"# Dynamic Offline Calculator Code\\nclass Calculator:\\n    def add(self, a, b): return a + b\\n    def subtract(self, a, b): return a - b\\n    def multiply(self, a, b): return a * b\\n    def divide(self, a, b):\\n        if b == 0: return 'Error: Div by Zero'\\n        return a / b\\n\\ncalc = Calculator()\\nprint('Calculator loaded! 2 + 3 =', calc.add(2, 3))\"\n\
          },\n\
          \"rationale\": \"Creating a fresh Python Calculator program inside your active workspace folder.\"\n\
        }\n\
        </topptic_action>\n\n\
        Aap upar diye naye file card ko approve karke direct test kar sakte hain!");
    } else {
        response.push_str("Hello! Main aapki help ke liye ready hoon. Aap upar diye action buttons (**Fix Bugs**, **Optimize**, **Write Tests**) par click karke direct code analysis run kar sakte hain, ya specific instructions likh sakte hain!");
    }

    response
}

fn generate_smart_mock_suggestions(instruction: &str, error: &str) -> String {
    let display_error = if error.contains("unable to allocate CPU buffer") {
        "Ollama has low free memory."
    } else {
        error
    };
    format!(
        "⚠️ **[Offline Helper Mode Active]**\n*(Ollama: `{}`)*\n\nHere are offline code suggestions for you:\n\n1. **Verify HTML/CSS link tags:** Ensure your stylesheet and script files are mapped to the correct relative path.\n2. **Check for script syntax:** Verify all brackets, tags, and braces are closed properly.\n3. **Use the Build panel:** Press the 'Build' button on the toolbar to check for raw layout alerts!",
        display_error
    )
}

pub fn chat(request: AiChatRequest) -> AiChatResponse {
    let prompt = build_chat_prompt(&request);
    let model = resolve_model(request.model.as_deref());

    match complete(&prompt, &model) {
        Ok(message) => AiChatResponse {
            engine: detect_ai_engine(),
            message,
        },
        Err(error) => AiChatResponse {
            engine: "offline-helper".to_string(),
            message: generate_smart_mock_response(&request.message, &error),
        },
    }
}

pub fn suggest(request: AiSuggestRequest) -> AiSuggestResponse {
    let prompt = build_suggestion_prompt(&request);
    let model = resolve_model(request.model.as_deref());

    match complete(&prompt, &model) {
        Ok(suggestions) => AiSuggestResponse {
            engine: detect_ai_engine(),
            suggestions,
        },
        Err(error) => AiSuggestResponse {
            engine: "offline-helper".to_string(),
            suggestions: generate_smart_mock_suggestions(request.instruction.as_deref().unwrap_or(""), &error),
        },
    }
}

pub fn fix_compilation_error(
    code: &str,
    stderr: &str,
    file_path: Option<&str>,
    model: Option<&str>,
) -> Result<String, String> {
    let mut prompt = String::from(
        "Fix this compilation error and return ONLY the corrected code.\nDo not include Markdown fences, explanations, comments about the fix, or any surrounding text.",
    );

    if let Some(file_path) = file_path.filter(|value| !value.trim().is_empty()) {
        prompt.push_str("\n\nFile:\n");
        prompt.push_str(file_path);
    }

    prompt.push_str("\n\nCompilation stderr:\n");
    prompt.push_str(stderr);
    prompt.push_str("\n\nOriginal code:\n");
    prompt.push_str(code);

    let model = resolve_model(model);
    complete(&prompt, &model).map(strip_code_fences)
}

fn complete(prompt: &str, model: &str) -> Result<String, String> {
    if port_is_open(OLLAMA_HOST) {
        return complete_with_ollama(prompt, model);
    }

    if port_is_open(LLAMA_CPP_HOST) {
        return complete_with_llama_cpp(prompt);
    }

    Err("Ollama on 127.0.0.1:11434 or llama.cpp on 127.0.0.1:8080 was not reachable".to_string())
}

fn complete_with_ollama(prompt: &str, model: &str) -> Result<String, String> {
    let payload = serde_json::json!({
        "model": model,
        "prompt": prompt,
        "stream": false,
        "options": {
            "num_predict": 600,   // Balanced output cap: ~150 lines of code generation
            "temperature": 0.15,  // Low = more deterministic, faster sampling
            "num_ctx": 2048,      // 2048 Context Window = handles real components while staying RAM-safe
            "top_k": 20,          // Fewer candidates = faster token selection
            "top_p": 0.85,        // Focused nucleus sampling
            "repeat_penalty": 1.1 // Prevent repetition loops
        }
    })
    .to_string();

    let body = post_json(OLLAMA_HOST, "/api/generate", &payload, Duration::from_secs(90))?;
    let parsed: OllamaGenerateResponse =
        serde_json::from_str(&body).map_err(|error| error.to_string())?;
    clean_answer(parsed.response, "Ollama")
}

fn complete_with_llama_cpp(prompt: &str) -> Result<String, String> {
    let payload = serde_json::json!({
        "prompt": prompt,
        "n_predict": 300,       // Focused fast outputs
        "temperature": 0.2
    })
    .to_string();

    let body = post_json(LLAMA_CPP_HOST, "/completion", &payload, Duration::from_secs(120))?;
    let value: serde_json::Value = serde_json::from_str(&body).map_err(|error| error.to_string())?;
    let answer = value
        .get("content")
        .and_then(|content| content.as_str())
        .unwrap_or_default()
        .to_string();

    clean_answer(answer, "llama.cpp")
}

fn build_chat_prompt(request: &AiChatRequest) -> String {
    let mut prompt = String::from(
        "You are Topptic AI, an elite agentic coding assistant built into the Topptic IDE. \
        You have direct sandboxed access to the user's workspace: you can read files, write files, search code, list directories, and execute shell commands. \
        Your goal is to build, debug, and optimize projects with step-by-step agentic reasoning.\n\n\
        \
        ### AGENTIC REASONING PROCESS:\n\
        1. **UNDERSTAND:** Read the user's request carefully. If you need more context, use `read_file` or `search_workspace` to explore BEFORE writing code.\n\
        2. **PLAN:** Explain your step-by-step plan clearly and concisely (use Hinglish if the user writes in Hinglish).\n\
        3. **ACT:** Generate `<topptic_action>` JSON blocks to write files, run commands, or read files.\n\
        4. **VERIFY:** After each action, describe what was done and what's next.\n\
        5. **ITERATE:** If a build fails, auto-generate the fix immediately.\n\n\
        \
        ### PRIME DIRECTIVES:\n\
        * ALWAYS explore the codebase first using `read_file` or `search_workspace` before modifying existing code.\n\
        * Generate action cards IMMEDIATELY — never hesitate.\n\
        * Never say 'I cannot' — always propose a working solution.\n\
        * Write COMPLETE, production-quality code — never placeholders.\n\
        * When fixing bugs, read the file first, then write the corrected version.\n\n\
        \
        ### AVAILABLE TOOLS (5 TOOLS):\n\n\
        1. **`write_file`** — Create or overwrite a file.\n\
           * Parameters: `{ \"path\": \"relative/path.ext\", \"content\": \"full_code\" }`\n\
           * Example:\n\
             <topptic_action>\n\
             { \"tool\": \"write_file\", \"parameters\": { \"path\": \"src/app.js\", \"content\": \"const express = require('express');\\nconst app = express();\\napp.listen(3000);\" }, \"rationale\": \"Creating the Express server entry point.\" }\n\
             </topptic_action>\n\n\
        \
        2. **`execute_command`** — Run a shell command.\n\
           * Parameters: `{ \"command\": \"shell_command\", \"cwd\": \"working_dir\" }`\n\
           * Example:\n\
             <topptic_action>\n\
             { \"tool\": \"execute_command\", \"parameters\": { \"command\": \"npm install express\", \"cwd\": \"./myapp\" }, \"rationale\": \"Installing Express dependency.\" }\n\
             </topptic_action>\n\n\
        \
        3. **`read_file`** — Read a file's contents to understand code before editing.\n\
           * Parameters: `{ \"path\": \"relative/path.ext\" }`\n\
           * Use this BEFORE modifying any existing file. Example:\n\
             <topptic_action>\n\
             { \"tool\": \"read_file\", \"parameters\": { \"path\": \"src/auth.js\" }, \"rationale\": \"Reading auth module to understand current implementation before adding JWT.\" }\n\
             </topptic_action>\n\n\
        \
        4. **`search_workspace`** — Search the entire codebase for a keyword or pattern.\n\
           * Parameters: `{ \"query\": \"search terms\" }`\n\
           * Use this to find where functions/classes/imports are used. Example:\n\
             <topptic_action>\n\
             { \"tool\": \"search_workspace\", \"parameters\": { \"query\": \"login middleware auth\" }, \"rationale\": \"Finding all files related to authentication.\" }\n\
             </topptic_action>\n\n\
        \
        5. **`list_files`** — List all files and folders in a directory.\n\
           * Parameters: `{ \"path\": \"relative/directory\" }`\n\
           * Use this to understand project structure. Example:\n\
             <topptic_action>\n\
             { \"tool\": \"list_files\", \"parameters\": { \"path\": \"src\" }, \"rationale\": \"Listing source files to understand project structure.\" }\n\
             </topptic_action>\n\n\
        \
        Respond with confidence, warmth, and precision. You are the user's expert coding partner.",
    );

    if let Some(file_path) = request.file_path.as_ref().filter(|value| !value.trim().is_empty()) {
        prompt.push_str("\n\nCurrent file: ");
        prompt.push_str(file_path);
    }

    if let Some(context) = request
        .code_context
        .as_ref()
        .filter(|context| !context.trim().is_empty())
    {
        // Smart context truncation (3000 chars = ~750 tokens, fits in 2048 ctx window)
        let truncated_context = if context.len() > 3000 {
            let half = &context[..3000];
            format!("{}...\n[Truncated by Topptic Engine]", half)
        } else {
            context.to_string()
        };

        prompt.push_str("\n\nCurrent Monaco editor code:\n```");
        prompt.push_str(&truncated_context);
        prompt.push_str("\n```");
    }

    prompt.push_str("\n\nUser request:\n");
    prompt.push_str(&request.message);
    prompt
}

fn build_suggestion_prompt(request: &AiSuggestRequest) -> String {
    let instruction = request
        .instruction
        .as_deref()
        .unwrap_or("Find bugs, suggest fixes, and improve this code.");
    let file_path = request.file_path.as_deref().unwrap_or("unknown file");

    // Smart context truncation for autocomplete (3000 chars = ~750 tokens)
    let truncated_code = if request.code.len() > 3000 {
        let half = &request.code[..3000];
        format!("{}...\n[Truncated by Topptic Engine]", half)
    } else {
        request.code.to_string()
    };

    format!(
        "You are Topptic's offline compiler and code-fix assistant.\nFile: {file_path}\nTask: {instruction}\nReturn concise suggestions and corrected snippets when useful.\n\nCode:\n```text\n{}\n```",
        truncated_code
    )
}

fn resolve_model(request_model: Option<&str>) -> String {
    let base_model = request_model
        .filter(|value| !value.trim().is_empty())
        .map(ToString::to_string)
        .or_else(|| std::env::var("TOPPTIC_OLLAMA_MODEL").ok())
        .unwrap_or_else(|| "qwen2.5-coder:1.5b".to_string()); // Default highly balanced code model

    // Smart Routing Logic: If the instruction is lightweight, we prefer qwen2.5-coder:0.5b or fast local modes
    base_model
}

fn clean_answer(answer: String, engine: &str) -> Result<String, String> {
    let answer = answer.trim().to_string();

    if answer.is_empty() {
        Err(format!("{engine} returned an empty response"))
    } else {
        Ok(answer)
    }
}

fn strip_code_fences(answer: String) -> String {
    let trimmed = answer.trim();

    if !trimmed.starts_with("```") {
        return trimmed.to_string();
    }

    let without_opening = trimmed
        .lines()
        .skip(1)
        .collect::<Vec<_>>()
        .join("\n");

    without_opening
        .strip_suffix("```")
        .unwrap_or(&without_opening)
        .trim()
        .to_string()
}

fn post_json(
    host: &str,
    path: &str,
    payload: &str,
    read_timeout: Duration,
) -> Result<String, String> {
    let address: SocketAddr = host
        .parse()
        .map_err(|error: std::net::AddrParseError| error.to_string())?;
    let mut stream = TcpStream::connect_timeout(&address, Duration::from_secs(5))
        .map_err(|error| error.to_string())?;

    stream
        .set_read_timeout(Some(read_timeout))
        .map_err(|error| error.to_string())?;
    stream
        .set_write_timeout(Some(Duration::from_secs(5)))
        .map_err(|error| error.to_string())?;

    let request = format!(
        "POST {path} HTTP/1.1\r\nHost: {host}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        payload.as_bytes().len(),
        payload
    );

    stream
        .write_all(request.as_bytes())
        .map_err(|error| error.to_string())?;

    let mut response = String::new();
    stream
        .read_to_string(&mut response)
        .map_err(|error| error.to_string())?;

    parse_http_response(&response)
}

fn decode_chunked(body: &str) -> Result<String, String> {
    if body.trim().starts_with('{') {
        return Ok(body.to_string());
    }

    let mut decoded = String::new();
    let mut remainder = body;

    while !remainder.is_empty() {
        let Some((size_hex, next_part)) = remainder.split_once("\r\n") else {
            break;
        };

        let size_hex_trimmed = size_hex.trim();
        if size_hex_trimmed.is_empty() {
            remainder = next_part;
            continue;
        }

        let size = match usize::from_str_radix(size_hex_trimmed, 16) {
            Ok(s) => s,
            Err(_) => break,
        };

        if size == 0 {
            break;
        }

        if next_part.len() < size {
            break;
        }

        let chunk_data = &next_part[..size];
        decoded.push_str(chunk_data);

        remainder = &next_part[size..];
        if remainder.starts_with("\r\n") {
            remainder = &remainder[2..];
        }
    }

    if decoded.is_empty() {
        Ok(body.to_string())
    } else {
        Ok(decoded)
    }
}

fn parse_http_response(response: &str) -> Result<String, String> {
    let (headers, body) = response
        .split_once("\r\n\r\n")
        .ok_or_else(|| "invalid local AI HTTP response".to_string())?;

    if !headers.starts_with("HTTP/1.1 200") && !headers.starts_with("HTTP/1.0 200") {
        return Err(headers
            .lines()
            .next()
            .unwrap_or("local AI request failed")
            .to_string());
    }

    let is_chunked = headers.to_lowercase().contains("transfer-encoding: chunked");
    if is_chunked {
        decode_chunked(body)
    } else {
        Ok(body.to_string())
    }
}

fn port_is_open(host: &str) -> bool {
    let Ok(address) = host.parse() else {
        return false;
    };

    TcpStream::connect_timeout(&address, Duration::from_secs(2)).is_ok()
}

fn command_exists(binary: &str) -> bool {
    Command::new(binary)
        .arg("--version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}
