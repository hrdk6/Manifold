import type { Stage } from '../../rag/assistant';

const LABEL: Record<Stage, string> = {
  plan: 'Understanding the question',
  search: 'Searching your knowledge base',
  rerank: 'Reranking the best matches',
  write: 'Writing the answer',
};

/** The retrieval pipeline as a row of steps, lit as the turn moves through them. */
export function Pipeline({ steps, stage, detail }: { steps: Stage[]; stage: Stage; detail?: string }) {
  const at = steps.indexOf(stage);
  return (
    <div className="pipe" role="status" aria-live="polite">
      <div className="pipe__track" aria-hidden="true">
        {steps.map((s, i) => (
          <span key={s} className="pipe__seg" data-state={i < at ? 'done' : i === at ? 'active' : 'todo'} />
        ))}
      </div>
      <div className="pipe__label">
        {LABEL[stage]}
        {detail && <span className="pipe__detail">{detail}</span>}
      </div>
    </div>
  );
}
