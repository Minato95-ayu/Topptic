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

pub fn chat(request: AiChatRequest) -> AiChatResponse {
    let prompt = build_chat_prompt(&request);
    let model = resolve_model(request.model.as_deref());

    match complete(&prompt, &model) {
        Ok(message) => AiChatResponse {
            engine: detect_ai_engine(),
            message,
        },
        Err(error) => AiChatResponse {
            engine: "mock".to_string(),
            message: format!(
                "Local AI is not available yet ({error}). Backend received: \"{}\".",
                request.message
            ),
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
            engine: "mock".to_string(),
            suggestions: format!(
                "Local AI is not available yet ({error}). I received {} bytes of code for offline analysis.",
                request.code.len()
            ),
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
        "You are Topptic's offline coding assistant. Be concise, practical, and return actionable code guidance.",
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
        .unwrap_or_else(|| "llama3.2".to_string())
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
    let mut stream = TcpStream::connect_timeout(&address, Duration::from_millis(900))
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

    TcpStream::connect_timeout(&address, Duration::from_millis(400)).is_ok()
}

fn command_exists(binary: &str) -> bool {
    Command::new(binary)
        .arg("--version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}
