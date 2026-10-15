/** Flashcards the student saved from the assistant; shown as their own deck on the Flashcards page. */
import { useSyncExternalStore } from 'react';

export interface MyCard {
  term: string;
  def: string;
  topic: string;
  at: number;
}

const KEY = 'manifold-my-cards-v1';
let cards: MyCard[] = [];
try {
  cards = JSON.parse(localStorage.getItem(KEY) ?? '[]') as MyCard[];
} catch {
  cards = [];
}
const subs = new Set<() => void>();
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(cards));
  } catch {
    /* storage unavailable */
  }
  subs.forEach((f) => f());
};

export const myCards = {
  get: () => cards,
  add(items: Omit<MyCard, 'at'>[]) {
    const fresh = items.filter((c) => !cards.some((m) => m.term === c.term && m.def === c.def)).map((c) => ({ ...c, at: Date.now() }));
    cards = [...cards, ...fresh];
    save();
  },
  remove(i: number) {
    cards = cards.filter((_, j) => j !== i);
    save();
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => subs.delete(f);
  },
};

export function useMyCards() {
  return useSyncExternalStore(myCards.subscribe, myCards.get, myCards.get);
}
