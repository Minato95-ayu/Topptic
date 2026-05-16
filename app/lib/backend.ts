import type {
  AIChatRequest,
  AIChatResponse,
  AISuggestRequest,
  AISuggestResponse,
  BackendStatus,
  BuildRequest,
  BuildResponse,
  FileEntry,
  FileReadRequest,
  FileWriteRequest,
  Project
} from '@/app/lib/types';

async function tauriInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
    throw new Error('Tauri runtime is not available');
  }

  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, args);
}

const mockProjects: Project[] = [
  {
    id: 'sample-web',
    name: 'E-commerce App',
    description: 'A local TypeScript starter project',
    language: 'typescript',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true
  },
  {
    id: 'sample-ai',
    name: 'AI Assistant',
    description: 'Python assistant workspace',
    language: 'python',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: false
  },
  {
    id: 'sample-rust',
    name: 'Mobile Game',
    description: 'Rust game prototype',
    language: 'rust',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: false
  }
];

export async function getBackendStatus(): Promise<BackendStatus> {
  try {
    return await tauriInvoke<BackendStatus>('get_backend_status');
  } catch {
    return {
      tauri: false,
      aiEngine: 'mock',
      database: 'mock',
      workspace: 'browser preview'
    };
  }
}

export async function listProjects(): Promise<Project[]> {
  try {
    return await tauriInvoke<Project[]>('list_projects');
  } catch {
    return mockProjects;
  }
}

export async function sendChatMessage(request: AIChatRequest): Promise<AIChatResponse> {
  try {
    return await tauriInvoke<AIChatResponse>('ai_chat', { request });
  } catch {
    return {
      engine: 'mock',
      message: `I received: "${request.message}". Run through Tauri to connect this panel to the Rust backend.`
    };
  }
}

export async function getCodeSuggestions(request: AISuggestRequest): Promise<AISuggestResponse> {
  try {
    return await tauriInvoke<AISuggestResponse>('ai_suggest', { request });
  } catch {
    return {
      engine: 'mock',
      suggestions: `Preview mode received ${request.code.length} bytes of code. Run through Tauri with Ollama or llama.cpp for real suggestions.`
    };
  }
}

export async function listFiles(path?: string): Promise<FileEntry[]> {
  return tauriInvoke<FileEntry[]>('list_files', { path });
}

export async function readFile(request: FileReadRequest): Promise<string> {
  return tauriInvoke<string>('read_file', { request });
}

export async function writeFile(request: FileWriteRequest): Promise<void> {
  await tauriInvoke<void>('write_file', { request });
}

export async function formatCode(path: string, content: string): Promise<string> {
  try {
    return await tauriInvoke<string>('format_code', { request: { path, content } });
  } catch {
    return content;
  }
}

export async function runBuild(request: BuildRequest): Promise<BuildResponse> {
  return tauriInvoke<BuildResponse>('run_build', { request });
}
