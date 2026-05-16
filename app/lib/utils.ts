export function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop() || '';
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rs: 'rust',
    json: 'json',
    css: 'css',
    html: 'html'
  };
  return map[ext] || 'plaintext';
}

export function cn(...classes: Array<string | boolean | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
