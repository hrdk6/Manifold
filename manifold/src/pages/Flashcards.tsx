import { useCallback, useEffect, useMemo, useState } from 'react';
import { Seg } from '../components/controls';
import { MarkdownView } from '../components/assistant/Markdown';
import { IconNext, IconPrev, IconShuffle, IconTrash } from '../components/icons';
import { modules } from '../content/course';
import { flashcards } from '../content/flashcards';
import { mulberry32, shuffle } from '../lib/rng';
import { myCards, useMyCards } from '../rag/mycards';

/** Module filter value for the student's own deck. */
const MINE = -1;

export default function Flashcards() {
  const [mod, setMod] = useState(0);
  const [seed, setSeed] = useState(0);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    document.title = 'Flashcards — Manifold';
  }, []);
  const mine = useMyCards();
  const deck = useMemo(() => {
    const base =
      mod === MINE
        ? mine.map((c, i) => ({ module: 0, term: c.term, def: c.def, topic: c.topic, mineIndex: i }))
        : flashcards.filter((c) => !mod || c.module === mod).map((c) => ({ ...c, topic: undefined as string | undefined, mineIndex: -1 }));
    return seed ? shuffle(base, mulberry32(seed)) : base;
  }, [mod, seed, mine]);
  const card = deck[Math.min(i, deck.length - 1)];
  const go = useCallback(
    (d: number) => {
      setFlipped(false);
      setI((v) => (v + d + deck.length) % deck.length);
    },
    [deck.length],
  );
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === ' ') {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);
  useEffect(() => {
    if (mod === MINE && !mine.length) setMod(0);
  }, [mod, mine.length]);
  if (!card) return null;
  const m = modules[card.module - 1] as (typeof modules)[number] | undefined;
  return (
    <div className="page">
      <header className="page-head">
        <h1>Flashcards</h1>
        <p className="page-head__lede">
          {flashcards.length} definitions to recall. Say the answer out loud before you flip. Space flips, the arrow keys move.
        </p>
      </header>
      <div className="qfilters">
        <Seg
          label="Module"
          value={mod}
          onChange={(v) => {
            setMod(v);
            setI(0);
            setFlipped(false);
          }}
          options={[
            { value: 0, label: 'All' },
            ...modules.map((x) => ({ value: x.n, label: String(x.n) })),
            ...(mine.length ? [{ value: MINE, label: `My cards (${mine.length})` }] : []),
          ]}
        />
      </div>
      <div className="flash-stage">
        <div
          className="flash"
          data-flipped={flipped}
          onClick={() => setFlipped((f) => !f)}
          role="button"
          tabIndex={0}
          aria-label={flipped ? `Definition: ${card.def}` : `Term: ${card.term}. Activate to reveal the definition.`}
          style={{ ['--mod-color' as string]: m?.color ?? 'var(--violet)' }}
        >
          <div className="flash__face">
            <div className="flash__meta">{m ? `Module ${card.module}: ${m.short}` : `Saved from the study assistant${card.topic ? `: ${card.topic}` : ''}`}</div>
            <div className="flash__term">{card.term}</div>
            <div className="flash__meta">Tap or press space to reveal</div>
          </div>
          <div className="flash__face flash__face--back">
            <div className="flash__meta">{card.term}</div>
            <div className="flash__def">{m ? card.def : <MarkdownView text={card.def} className="md md--inline" inline />}</div>
          </div>
        </div>
      </div>
      <div className="flash-nav">
        <button className="icon-btn" onClick={() => go(-1)} aria-label="Previous card">
          <IconPrev />
        </button>
        <span className="stepper__count" style={{ textAlign: 'center' }}>
          {Math.min(i, deck.length - 1) + 1} of {deck.length}
        </span>
        <button className="icon-btn" onClick={() => go(1)} aria-label="Next card">
          <IconNext />
        </button>
        <button
          className="btn btn--sm"
          onClick={() => {
            setSeed((s) => s + 1);
            setI(0);
            setFlipped(false);
          }}
        >
          <IconShuffle /> Shuffle
        </button>
        {card.mineIndex >= 0 && (
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => {
              myCards.remove(card.mineIndex);
              setFlipped(false);
              setI((v) => Math.max(0, Math.min(v, deck.length - 2)));
            }}
          >
            <IconTrash /> Remove card
          </button>
        )}
      </div>
    </div>
  );
}
