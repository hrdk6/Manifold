/** Saved conversations, newest first. */
import { useSyncExternalStore } from 'react';
import * as db from './db';
import type { Thread } from './types';

let threads: Thread[] = [];
let loaded = false;
const subs = new Set<() => void>();
const emit = () => {
  threads = [...threads].sort((a, b) => b.updatedAt - a.updatedAt);
  subs.forEach((f) => f());
};

let loading: Promise<void> | null = null;
export function loadThreads() {
  if (!loading) {
    loading = db
      .getAll('threads')
      .then((t) => {
        threads = t;
        loaded = true;
        emit();
      })
      .catch(() => {
        loaded = true;
        emit();
      });
  }
  return loading;
}

let snapshot = { threads, loaded };
export function useThreads() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => {
      if (snapshot.threads !== threads || snapshot.loaded !== loaded) snapshot = { threads, loaded };
      return snapshot;
    },
  );
}

export async function saveThread(t: Thread) {
  const i = threads.findIndex((x) => x.id === t.id);
  if (i >= 0) threads[i] = t;
  else threads.push(t);
  emit();
  await db.put('threads', t);
}

export async function deleteThread(id: string) {
  threads = threads.filter((t) => t.id !== id);
  emit();
  await db.del('threads', id);
}

export async function deleteAllThreads() {
  threads = [];
  emit();
  await db.clearStores(['threads']);
}
