/** Shared types for the study assistant's knowledge base and retrieval pipeline. */

export type SourceKind = 'pdf' | 'docx' | 'pptx' | 'text' | 'markdown' | 'html' | 'image' | 'lesson' | 'bank';

export type DocStatus = 'queued' | 'reading' | 'embedding' | 'ready' | 'error';

export interface DocRecord {
  id: string;
  title: string;
  kind: SourceKind;
  fileName?: string;
  mime?: string;
  size?: number;
  /** pages for PDFs, slides for decks, 1 for images */
  pages?: number;
  chunks: number;
  chars: number;
  addedAt: number;
  status: DocStatus;
  /** 0..1 progress within the current status */
  progress?: number;
  error?: string;
  /** built-in course content, rebuilt when the app's lessons change */
  builtin?: boolean;
  /** include in searches */
  enabled: boolean;
  /** 1-based page numbers that had no text layer (scanned pages) */
  scanned?: number[];
  /** pages already transcribed by a vision model */
  transcribed?: number[];
  /** in-app route for built-in lessons, e.g. /m/3/pca */
  route?: string;
  /** module number for built-in lessons */
  module?: number;
  /** hash of the text that produced the chunks */
  hash?: string;
  /** embedding model the vectors came from */
  embedModel?: string;
  /** version of the file readers that produced the chunks */
  parser?: number;
}

/** A piece of text from a parser, before chunking. */
export interface Block {
  text: string;
  page?: number;
  /** heading path at this block */
  heading: string[];
  kind: 'h' | 'p' | 'li' | 'table' | 'code';
  /** for heading blocks, its level (1 = top) */
  level?: number;
  /** id of the nearest section heading (in-app lessons) */
  anchor?: string;
}

export interface ChunkRecord {
  /** `${docId}#${i}` */
  id: string;
  docId: string;
  i: number;
  text: string;
  heading: string[];
  pageStart?: number;
  pageEnd?: number;
  /** in-app anchor, e.g. /m/3/pca#eigenvectors */
  route?: string;
  vec?: Float32Array;
}

export interface ParsedDoc {
  title: string;
  blocks: Block[];
  pages?: number;
  scanned?: number[];
}

/* ---------------------------------------------------------------- retrieval */

export interface Candidate {
  chunk: ChunkRecord;
  bm25Rank?: number;
  bm25Score?: number;
  denseRank?: number;
  denseScore?: number;
  rrf: number;
  rerank?: number;
  /** final relevance in 0..1 used for ordering */
  score: number;
}

export interface QueryVariant {
  text: string;
  kind: 'question' | 'rewrite' | 'hyde';
}

export interface RetrievalTrace {
  queries: QueryVariant[];
  candidates: Candidate[];
  selected: string[];
  ms: { plan?: number; search: number; rerank?: number };
  searched: number;
  dense: boolean;
  reranked: boolean;
}

/** A passage handed to the model and shown to the student. */
export interface Source {
  n: number;
  docId: string;
  chunkIds: string[];
  title: string;
  kind: SourceKind;
  heading: string[];
  pageStart?: number;
  pageEnd?: number;
  route?: string;
  text: string;
  score: number;
}

/* ---------------------------------------------------------------- chat */

export type Mode = 'answer' | 'teach' | 'exam' | 'quiz' | 'cards' | 'summary';

export interface QuizItem {
  question: string;
  options: string[];
  answer: number;
  why: string;
  source?: number;
}

export interface CardItem {
  term: string;
  def: string;
  source?: number;
}

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  mode: Mode;
  at: number;
  /** what was actually sent as the user message (question + sources), kept so history stays append-only */
  wire?: string;
  marks?: number;
  scope?: string[];
  sources?: Source[];
  trace?: RetrievalTrace;
  quiz?: QuizItem[];
  cards?: CardItem[];
  standalone?: string;
  model?: string;
  error?: string;
  /** answer produced without a language model (passages only) */
  extractive?: boolean;
  usage?: { input: number; output: number; cacheRead?: number };
  stopped?: boolean;
  /** embedding of the question, for placing it on the knowledge map */
  queryVec?: Float32Array;
  /** how long the turn took, in ms */
  ms?: number;
  /** model's reasoning summary, when it shares one */
  thinking?: string;
}

export interface Thread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  turns: ChatTurn[];
}
