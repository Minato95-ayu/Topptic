export interface Project {
  id: string;
  name: string;
  description: string | null;
  language: 'typescript' | 'javascript' | 'python' | 'rust' | null;
  path: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface CreateProjectRequest {
  name: string;
  path: string;
}

export interface EditorTab {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  isModified: boolean;
  isDirty: boolean;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  codeContext?: string;
}

export interface BackendStatus {
  tauri: boolean;
  aiEngine: string;
  database: 'sqlite' | 'mock';
  workspace: string;
}

export interface AIChatRequest {
  message: string;
  codeContext?: string;
  filePath?: string;
  model?: string;
}

export interface AIChatResponse {
  message: string;
  engine: string;
}

export interface AISuggestRequest {
  code: string;
  filePath?: string;
  instruction?: string;
  model?: string;
}

export interface AISuggestResponse {
  suggestions: string;
  engine: string;
}

export interface FileReadRequest {
  path: string;
}

export interface FileWriteRequest {
  path: string;
  content: string;
}

export interface FileEntry {
  path: string;
  name: string;
  isDirectory: boolean;
}

export interface BuildRequest {
  projectPath: string;
  sourcePath?: string;
  code?: string;
  command?: string;
  args?: string[];
  maxRetries?: number;
  model?: string;
}

export interface BuildResponse {
  success: boolean;
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  attempts: number;
  healed: boolean;
  finalCode: string | null;
}
