import type { ReactNode } from 'react';

export function Presets<T extends string>({
  value,
  options,
  onPick,
}: {
  value: T | null;
  options: { id: T; label: string }[];
  onPick: (id: T) => void;
}) {
  return (
    <div className="solver__presets">
      <span className="solver__presets-label">Load a problem</span>
      {options.map((o) => (
        <button key={o.id} type="button" className="preset" aria-pressed={value === o.id} onClick={() => onPick(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Work({ children }: { children: ReactNode }) {
  return <div className="work">{children}</div>;
}

export function WorkStep({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="work__step">
      <div className="work__body">
        <div className="work__title" style={{ fontFamily: 'var(--font-ui)' }}>
          {title}
        </div>
        {children}
      </div>
    </section>
  );
}

export function Result({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="result">
      <div className="result__label">{label}</div>
      <div className="result__value">{children}</div>
    </div>
  );
}

export function InputCard({ children }: { children: ReactNode }) {
  return <div className="solver__input">{children}</div>;
}

export function ErrorLine({ children }: { children: ReactNode }) {
  return <p className="solver__error">{children}</p>;
}
