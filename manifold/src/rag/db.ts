/** Minimal promise wrapper around IndexedDB. Everything the assistant stores stays in this browser. */
import type { ChunkRecord, DocRecord, Thread } from './types';

const NAME = 'manifold-kb';
const VERSION = 1;

export interface FileRecord {
  id: string;
  blob: Blob;
}

export interface TextRecord {
  id: string;
  /** full plain text per page (index 0 = page 1); single entry for unpaged formats */
  pages: string[];
  /** vision-model transcriptions of scanned pages, keyed by page number */
  ocr?: Record<number, string>;
}

type Stores = {
  docs: DocRecord;
  chunks: ChunkRecord;
  files: FileRecord;
  texts: TextRecord;
  threads: Thread;
};

let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('docs')) db.createObjectStore('docs', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('chunks')) {
        const s = db.createObjectStore('chunks', { keyPath: 'id' });
        s.createIndex('docId', 'docId');
      }
      if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('texts')) db.createObjectStore('texts', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('threads')) db.createObjectStore('threads', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

function done(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function wrap<T>(req: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAll<K extends keyof Stores>(store: K): Promise<Stores[K][]> {
  const db = await open();
  return wrap(db.transaction(store).objectStore(store).getAll()) as Promise<Stores[K][]>;
}

export async function get<K extends keyof Stores>(store: K, id: string): Promise<Stores[K] | undefined> {
  const db = await open();
  return wrap(db.transaction(store).objectStore(store).get(id)) as Promise<Stores[K] | undefined>;
}

export async function put<K extends keyof Stores>(store: K, value: Stores[K]) {
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(value);
  await done(tx);
}

export async function putMany<K extends keyof Stores>(store: K, values: Stores[K][]) {
  if (!values.length) return;
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  const os = tx.objectStore(store);
  for (const v of values) os.put(v);
  await done(tx);
}

export async function del<K extends keyof Stores>(store: K, id: string) {
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(id);
  await done(tx);
}

export async function chunksOf(docId: string): Promise<ChunkRecord[]> {
  const db = await open();
  const all = await wrap(db.transaction('chunks').objectStore('chunks').index('docId').getAll(docId));
  return (all as ChunkRecord[]).sort((a, b) => a.i - b.i);
}

/** Replace every chunk of a document in one transaction. */
export async function replaceChunks(docId: string, chunks: ChunkRecord[]) {
  const db = await open();
  const tx = db.transaction('chunks', 'readwrite');
  const store = tx.objectStore('chunks');
  const keys = await wrap(store.index('docId').getAllKeys(docId));
  for (const k of keys) store.delete(k);
  for (const c of chunks) store.put(c);
  await done(tx);
}

export async function removeDoc(docId: string) {
  const db = await open();
  const tx = db.transaction(['docs', 'chunks', 'files', 'texts'], 'readwrite');
  tx.objectStore('docs').delete(docId);
  tx.objectStore('files').delete(docId);
  tx.objectStore('texts').delete(docId);
  const store = tx.objectStore('chunks');
  const keys = await wrap(store.index('docId').getAllKeys(docId));
  for (const k of keys) store.delete(k);
  await done(tx);
}

export async function clearStores(names: (keyof Stores)[]) {
  const db = await open();
  const tx = db.transaction(names, 'readwrite');
  for (const n of names) tx.objectStore(n).clear();
  await done(tx);
}
