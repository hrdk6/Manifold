import { useEffect, useRef, useState } from 'react';
import { Seg, Toggle } from '../controls';
import { IconX } from '../icons';
import { complete, LlmError, ollamaModels } from '../../rag/llm';
import { CLAUDE_MODELS, GROQ_MODELS, hasModel, isCloud, settings, useSettings, type Provider } from '../../rag/settings';
import { runEmbedding } from '../../rag/kb';

type Test = { state: 'idle' } | { state: 'busy' } | { state: 'ok'; msg: string } | { state: 'fail'; msg: string };

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const s = useSettings();
  const [showKey, setShowKey] = useState(false);
  const [ollama, setOllama] = useState<{ state: 'idle' | 'busy' | 'ok' | 'fail'; models: string[] }>({ state: 'idle', models: [] });
  const [test, setTest] = useState<Test>({ state: 'idle' });

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open || s.provider !== 'ollama') return;
    setOllama((o) => ({ ...o, state: 'busy' }));
    ollamaModels(s.ollamaUrl)
      .then((models) => {
        setOllama({ state: 'ok', models });
        if (models.length && !models.includes(settings.get().ollamaModel)) settings.set({ ollamaModel: models[0] });
      })
      .catch(() => setOllama({ state: 'fail', models: [] }));
  }, [open, s.provider, s.ollamaUrl]);

  useEffect(() => setTest({ state: 'idle' }), [s.provider, s.anthropicKey, s.anthropicModel, s.ollamaModel, s.openaiModel, s.openaiUrl]);

  const runTest = async () => {
    setTest({ state: 'busy' });
    try {
      const r = await complete(settings.get(), {
        system: 'Reply with exactly the word: ready',
        messages: [{ role: 'user', content: 'Are you there?' }],
        maxTokens: 400,
        effort: 'low',
      });
      setTest({ state: 'ok', msg: `Connected to ${r.model}.` });
    } catch (err) {
      const e = err as LlmError;
      setTest({ state: 'fail', msg: [e.message, e.hint].filter(Boolean).join(' ') });
    }
  };

  return (
    <dialog ref={ref} className="sheet" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby="settings-title">
      <div className="sheet__inner">
        <header className="sheet__head">
          <h2 id="settings-title">Assistant settings</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings">
            <IconX />
          </button>
        </header>

        <section className="sheet__section">
          <h3>Answer model</h3>
          <p className="sheet__note">The model writes answers from the passages the search finds. Without one, the assistant shows the passages only.</p>
          {!isCloud && (
            <Seg<Provider>
              label="Provider"
              value={s.provider}
              onChange={(provider) => settings.set({ provider })}
              options={[
                { value: 'groq', label: 'Groq' },
                { value: 'anthropic', label: 'Claude' },
                { value: 'ollama', label: 'Ollama (local)' },
                { value: 'openai', label: 'Other server' },
              ]}
            />
          )}

          {s.provider === 'groq' && (
            <div className="form-grid">
              <div className="form-row">
                <span>Model</span>
                <div className="model-list" role="radiogroup" aria-label="Groq model">
                  {GROQ_MODELS.map((m) => (
                    <button key={m.id} type="button" role="radio" aria-checked={s.groqModel === m.id} className="model-opt" onClick={() => settings.set({ groqModel: m.id })}>
                      <strong>{m.label}</strong>
                      <span>{m.note}</span>
                    </button>
                  ))}
                </div>
                <small>
                  If the chosen model is busy, the other two take over automatically. The Groq key is kept on the server, so there is nothing to enter here.
                </small>
              </div>
              <Seg
                label="Thinking effort"
                value={s.effort}
                onChange={(effort) => settings.set({ effort })}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                ]}
              />
            </div>
          )}

          {s.provider === 'anthropic' && (
            <div className="form-grid">
              <label className="form-row">
                <span>Anthropic API key</span>
                <span className="key-field">
                  <input
                    className="field"
                    type={showKey ? 'text' : 'password'}
                    value={s.anthropicKey}
                    onChange={(e) => settings.set({ anthropicKey: e.target.value })}
                    placeholder="sk-ant-…"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowKey((v) => !v)}>
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </span>
                <small>
                  Saved in this browser only and sent straight to Anthropic. Create a key at{' '}
                  <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noreferrer">
                    platform.claude.com
                  </a>
                  .
                </small>
              </label>
              <div className="form-row">
                <span>Model</span>
                <div className="model-list" role="radiogroup" aria-label="Claude model">
                  {CLAUDE_MODELS.map((m) => (
                    <button key={m.id} type="button" role="radio" aria-checked={s.anthropicModel === m.id} className="model-opt" onClick={() => settings.set({ anthropicModel: m.id })}>
                      <strong>{m.label}</strong>
                      <span>{m.note}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Seg
                label="Thinking effort"
                value={s.effort}
                onChange={(effort) => settings.set({ effort })}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                ]}
              />
            </div>
          )}

          {s.provider === 'ollama' && (
            <div className="form-grid">
              <label className="form-row">
                <span>Ollama address</span>
                <input className="field" value={s.ollamaUrl} onChange={(e) => settings.set({ ollamaUrl: e.target.value })} spellCheck={false} />
              </label>
              <label className="form-row">
                <span>Model</span>
                {ollama.models.length ? (
                  <select className="field" value={s.ollamaModel} onChange={(e) => settings.set({ ollamaModel: e.target.value })}>
                    {ollama.models.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <input className="field" value={s.ollamaModel} onChange={(e) => settings.set({ ollamaModel: e.target.value })} placeholder="llama3.1" spellCheck={false} />
                )}
                <small>
                  {ollama.state === 'busy'
                    ? 'Looking for Ollama…'
                    : ollama.state === 'ok'
                      ? `Ollama is running with ${ollama.models.length} model${ollama.models.length === 1 ? '' : 's'}. Everything stays on this computer.`
                      : ollama.state === 'fail'
                        ? 'Ollama is not answering at this address. Start the Ollama app, then reopen these settings.'
                        : 'Runs a model on this computer: free and private, but slower and less accurate than Claude.'}
                  {ollama.state === 'ok' && ' The first answer waits while the model loads into memory.'}
                </small>
              </label>
            </div>
          )}

          {s.provider === 'openai' && (
            <div className="form-grid">
              <label className="form-row">
                <span>Server address</span>
                <input className="field" value={s.openaiUrl} onChange={(e) => settings.set({ openaiUrl: e.target.value })} placeholder="http://localhost:1234/v1" spellCheck={false} />
                <small>Any server with an OpenAI-style chat completions endpoint, such as LM Studio.</small>
              </label>
              <label className="form-row">
                <span>API key (if the server needs one)</span>
                <input className="field" type="password" value={s.openaiKey} onChange={(e) => settings.set({ openaiKey: e.target.value })} autoComplete="off" spellCheck={false} />
              </label>
              <label className="form-row">
                <span>Model name</span>
                <input className="field" value={s.openaiModel} onChange={(e) => settings.set({ openaiModel: e.target.value })} spellCheck={false} />
              </label>
            </div>
          )}

          <div className="test-row">
            <button className="btn btn--sm" onClick={runTest} disabled={!hasModel(s) || test.state === 'busy'}>
              {test.state === 'busy' ? 'Testing…' : 'Test connection'}
            </button>
            {test.state === 'ok' && <span className="test-ok">{test.msg}</span>}
            {test.state === 'fail' && <span className="test-fail">{test.msg}</span>}
          </div>
        </section>

        <section className="sheet__section">
          <h3>Search</h3>
          <p className="sheet__note">Keyword search always runs. The other stages run on this device and download their models once.</p>
          <div className="toggle-list">
            <Toggle
              label={
                <span>
                  <strong>Semantic search</strong> finds passages by meaning, not just matching words (23 MB model)
                </span>
              }
              checked={s.dense}
              onChange={(dense) => {
                settings.set({ dense });
                if (dense) runEmbedding();
              }}
            />
            <Toggle
              label={
                <span>
                  <strong>Reranking</strong> rereads the top 20 candidates against your question (87 MB model)
                </span>
              }
              checked={s.rerank}
              onChange={(rerank) => settings.set({ rerank })}
            />
            <Toggle
              label={
                <span>
                  <strong>Query rewriting</strong> lets the answer model expand your question and resolve follow-ups before searching
                  {s.provider !== 'anthropic' && s.provider !== 'groq' && ' (with a local model, follow-up questions only, as it costs an extra model call)'}
                </span>
              }
              checked={s.rewrite}
              onChange={(rewrite) => settings.set({ rewrite })}
            />
            <Toggle
              label={
                <span>
                  <strong>Neighbouring passages</strong> adds the text either side of each match for context
                </span>
              }
              checked={s.neighbors}
              onChange={(neighbors) => settings.set({ neighbors })}
            />
          </div>
          <label className="form-row form-row--inline">
            <span>Passages per answer</span>
            <input type="range" min={3} max={10} value={s.k} onChange={(e) => settings.set({ k: Number(e.target.value) })} />
            <output>{s.k}</output>
          </label>
        </section>
      </div>
    </dialog>
  );
}
