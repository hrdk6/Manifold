export const uid = (prefix = '') =>
  prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** 32-bit FNV-1a, hex. Used to notice when built-in lesson text changes. */
export function fnv(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Collapse whitespace and repair common PDF ligature artefacts. */
export function clean(s: string) {
  return s
    .replace(/­/g, '')
    .replace(/[ﬀ]/g, 'ff')
    .replace(/[ﬁ]/g, 'fi')
    .replace(/[ﬂ]/g, 'fl')
    .replace(/[ﬃ]/g, 'ffi')
    .replace(/[ﬄ]/g, 'ffl')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

export function kindOf(file: File): import('./types').SourceKind | null {
  const n = file.name.toLowerCase();
  if (n.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf';
  if (n.endsWith('.docx')) return 'docx';
  if (n.endsWith('.pptx')) return 'pptx';
  if (n.endsWith('.md') || n.endsWith('.markdown')) return 'markdown';
  if (n.endsWith('.html') || n.endsWith('.htm')) return 'html';
  if (n.endsWith('.txt') || n.endsWith('.csv') || n.endsWith('.tex') || n.endsWith('.py') || n.endsWith('.ipynb')) return 'text';
  if (/\.(png|jpe?g|webp|gif|bmp)$/.test(n) || file.type.startsWith('image/')) return 'image';
  return null;
}

export const ACCEPT = '.pdf,.docx,.pptx,.txt,.md,.markdown,.html,.htm,.csv,.tex,.py,.ipynb,.png,.jpg,.jpeg,.webp';

export const titleFromFile = (name: string) =>
  name
    .replace(/\.[^.]+$/, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function fmtBytes(n?: number) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}

export function pageLabel(a?: number, b?: number, kind?: string) {
  if (!a) return '';
  const unit = kind === 'pptx' ? 'slide' : 'p.';
  if (kind === 'pptx') return b && b !== a ? `slides ${a}–${b}` : `${unit} ${a}`;
  return b && b !== a ? `pp. ${a}–${b}` : `p. ${a}`;
}
