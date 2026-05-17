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
        "stream": false
    })
    .to_string();

    let body = post_json(OLLAMA_HOST, "/api/generate", &payload, Duration::from_secs(120))?;
    let parsed: OllamaGenerateResponse =
        serde_json::from_str(&body).map_err(|error| error.to_string())?;
    clean_answer(parsed.response, "Ollama")
}

fn complete_with_llama_cpp(prompt: &str) -> Result<String, String> {
    let payload = serde_json::json!({
        "prompt": prompt,
        "n_predict": 512,
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
        "You are Antigravity Clone, Topptic's ultimate, highly-powerful agentic coding assistant. \
        You have direct sandboxed access to the user's workspace to read/write files and execute shell terminal commands! \
        Your goal is to build, debug, and optimize projects with the exact same step-by-step reasoning pattern as the Deepmind Antigravity team.\n\n\
        \
        ### YOUR AGENTIC PATTERN:\n\
        1. **Analyze & Think Step-by-Step:** First, write a brief, extremely professional, and warm explanation of your plan (in natural Hinglish if the user asks in Hinglish).\n\
        2. **Propose Actions:** To write files or execute commands, you MUST generate action tags by wrapping a JSON block inside `<topptic_action>` and `</topptic_action>` tags.\n\
        3. **Never hesitate to trigger tools:** If the user asks you to create a project, write code, run command, install npm/packages, initialize, format, or build, generate the corresponding action card IMMEDIATELY!\n\n\
        \
        ### AVAILABLE TOOLS (JSON ACTIONS):\n\
        1. **`write_file`** - Writes or overwrites a file in the workspace.\n\
           * Parameters: `{ \"path\": \"relative_path/filename.ext\", \"content\": \"full_code_body\" }`\n\
           * Example:\n\
             <topptic_action>\n\
             {\n\
               \"tool\": \"write_file\",\n\
               \"parameters\": {\n\
                 \"path\": \"anno/index.html\",\n\
                 \"content\": \"<!DOCTYPE html>\\n<html>\\n<head>\\n  <title>My App</title>\\n</head>\\n<body>\\n  <h1>Hello World</h1>\\n</body>\\n</html>\"\n\
               },\n\
               \"rationale\": \"Creating the main index file for the application.\"\n\
             }\n\
             </topptic_action>\n\n\
        \
        2. **`execute_command`** - Spawns a shell terminal command in the workspace.\n\
           * Parameters: `{ \"command\": \"cli_command\", \"cwd\": \"relative_project_directory\" }`\n\
           * Example:\n\
             <topptic_action>\n\
             {\n\
               \"tool\": \"execute_command\",\n\
               \"parameters\": {\n\
                 \"command\": \"npm init -y && npm install express\",\n\
                 \"cwd\": \"./calculater\"\n\
               },\n\
               \"rationale\": \"Initializing npm package manager and installing express server dependencies.\"\n\
             }\n\
             </topptic_action>\n\n\
        \
        Respond in clear, confident, and professional agentic style. Guide the user step by step just like a world-class coding team!",
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
        prompt.push_str("\n\nCurrent Monaco editor code:\n```");
        prompt.push_str(context);
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

    format!(
        "You are Topptic's offline compiler and code-fix assistant.\nFile: {file_path}\nTask: {instruction}\nReturn concise suggestions and corrected snippets when useful.\n\nCode:\n```text\n{}\n```",
        request.code
    )
}

fn resolve_model(request_model: Option<&str>) -> String {
    request_model
        .filter(|value| !value.trim().is_empty())
        .map(ToString::to_string)
        .or_else(|| std::env::var("TOPPTIC_OLLAMA_MODEL").ok())
        .unwrap_or_else(|| "antigravity".to_string())
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
