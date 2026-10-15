import { useState } from 'react';
import { MB } from '../../components/Math';
import { Table } from '../../components/prose';
import { fx } from '../../lib/fmt';
import { multiclassReport } from '../../lib/metrics';
import { InputCard, Presets, Result, Work, WorkStep } from '../ui';

const PRESETS = {
  iris: { label: 'Iris subset (notes)', labels: ['Setosa', 'Versicolor', 'Virginica'], cm: [[3, 0, 0], [0, 3, 1], [0, 0, 3]] },
  slides: { label: 'Three classes (practice)', labels: ['A', 'B', 'C'], cm: [[50, 5, 0], [4, 40, 2], [3, 1, 30]] },
  four: { label: 'Four classes', labels: ['cat', 'dog', 'fox', 'owl'], cm: [[20, 4, 1, 0], [3, 25, 2, 0], [2, 3, 15, 0], [0, 0, 1, 9]] },
};
type PId = keyof typeof PRESETS;

export default function MulticlassSolver() {
  const [preset, setPreset] = useState<PId | null>('iris');
  const [labels, setLabels] = useState(PRESETS.iris.labels);
  const [cm, setCm] = useState(PRESETS.iris.cm);
  const rep = multiclassReport(cm, labels);
  const k = labels.length;
  return (
    <>
      <InputCard>
        <Presets
          value={preset}
          options={(Object.keys(PRESETS) as PId[]).map((id) => ({ id, label: PRESETS[id].label }))}
          onPick={(id) => {
            setPreset(id);
            setLabels(PRESETS[id].labels);
            setCm(PRESETS[id].cm.map((r) => r.slice()));
          }}
        />
        <div className="input-grid">
          <table>
            <thead>
              <tr>
                <th>True \ Predicted</th>
                {labels.map((l, j) => (
                  <th key={j}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cm.map((row, i) => (
                <tr key={i}>
                  <td>
                    <input
                      value={labels[i]}
                      onChange={(e) => {
                        setPreset(null);
                        setLabels(labels.map((l, j) => (j === i ? e.target.value : l)));
                      }}
                      aria-label={`Class ${i + 1} name`}
                    />
                  </td>
                  {row.map((v, j) => (
                    <td key={j}>
                      <input
                        className="num-in"
                        type="number"
                        min={0}
                        value={v}
                        style={i === j ? { fontWeight: 800, borderColor: 'var(--ultra)' } : undefined}
                        onChange={(e) => {
                          setPreset(null);
                          setCm(cm.map((r, a) => r.map((c, b) => (a === i && b === j ? Math.max(0, Number(e.target.value)) : c))));
                        }}
                        aria-label={`True ${labels[i]}, predicted ${labels[j]}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </InputCard>
      {rep.total > 0 && (
        <Work>
          <WorkStep title="Accuracy from the diagonal">
            <MB>{`\\text{Accuracy} = \\frac{${cm.map((r, i) => r[i]).join(' + ')}}{${rep.total}} = ${fx(rep.accuracy, 4)}`}</MB>
          </WorkStep>
          <WorkStep title="Per-class precision (column) and recall (row)">
            <Table
              head={['Class', 'TP', 'Predicted (column sum)', 'Actual (row sum)', 'Precision', 'Recall', 'F1']}
              numeric={[1, 2, 3, 4, 5, 6]}
              rows={rep.per.map((p) => [p.label, p.tp, p.predicted, p.support, `${p.tp}/${p.predicted} = ${fx(p.precision, 4)}`, `${p.tp}/${p.support} = ${fx(p.recall, 4)}`, fx(p.f1, 4)])}
            />
          </WorkStep>
          <WorkStep title="Averages">
            <MB>{`\\text{Macro } P = \\frac{${rep.per.map((p) => fx(p.precision, 4)).join(' + ')}}{${k}} = ${fx(rep.macro.precision, 4)} \\qquad \\text{Macro } R = ${fx(rep.macro.recall, 4)} \\qquad \\text{Macro } F_1 = ${fx(rep.macro.f1, 4)}`}</MB>
            <MB>{`\\text{Weighted } R = \\frac{${rep.per.map((p) => `${p.support} \\times ${fx(p.recall, 4)}`).join(' + ')}}{${rep.total}} = ${fx(rep.weighted.recall, 4)}`}</MB>
            <Table
              head={['Average', 'Precision', 'Recall', 'F1']}
              numeric={[1, 2, 3]}
              rows={[
                ['Macro (unweighted mean)', fx(rep.macro.precision, 4), fx(rep.macro.recall, 4), fx(rep.macro.f1, 4)],
                ['Weighted (by support)', fx(rep.weighted.precision, 4), fx(rep.weighted.recall, 4), fx(rep.weighted.f1, 4)],
                ['Micro (pooled)', fx(rep.micro.precision, 4), fx(rep.micro.recall, 4), fx(rep.micro.f1, 4)],
              ]}
            />
          </WorkStep>
          <Result label="Summary">
            Accuracy {fx(rep.accuracy, 4)}; macro F1 {fx(rep.macro.f1, 4)}; weighted F1 {fx(rep.weighted.f1, 4)}.
          </Result>
        </Work>
      )}
    </>
  );
}
