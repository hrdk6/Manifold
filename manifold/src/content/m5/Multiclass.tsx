import { M, MB } from '../../components/Math';
import { Answer, Code, H2, H3, KeyPoints, Note, SolverLink, Table } from '../../components/prose';
import { fx } from '../../lib/fmt';
import { multiclassReport } from '../../lib/metrics';
import { DigitsConfusionFigure } from '../../viz/m5';

export default function Multiclass() {
  const cm = [
    [3, 0, 0],
    [0, 3, 1],
    [0, 0, 3],
  ];
  const labels = ['Setosa', 'Versicolor', 'Virginica'];
  const rep = multiclassReport(cm, labels);
  return (
    <>
      <p>
        All the binary metrics extend to problems with more than two classes. The confusion matrix becomes k × k, precision and recall are
        computed for each class in turn (that class versus the rest), and the per-class numbers are averaged in one of three ways.
      </p>

      <H2>Multiclass confusion matrix and accuracy</H2>
      <p>
        Entry (i, j) counts the samples of true class i predicted as class j (scikit-learn’s orientation: rows true, columns predicted).
        Correct predictions lie on the diagonal; off-diagonal cells show which classes are confused with which.
      </p>
      <MB>{'\\text{Accuracy} = \\frac{\\sum_i C_{ii}}{\\sum_{i,j} C_{ij}}'}</MB>
      <p>
        Accuracy has the same weakness as in the binary case: if 85% of points are class A, always predicting A scores 85%.
      </p>
      <DigitsConfusionFigure />

      <H2>Per-class precision, recall and F1</H2>
      <p>For class c, treat c as positive and every other class as negative:</p>
      <MB>{'P_c = \\frac{C_{cc}}{\\sum_i C_{ic}} \\;(\\text{column}) \\qquad R_c = \\frac{C_{cc}}{\\sum_j C_{cj}} \\;(\\text{row}) \\qquad F1_c = \\frac{2 P_c R_c}{P_c + R_c}'}</MB>
      <H3>Three ways to average</H3>
      <Table
        head={['Average', 'How', 'Use when']}
        rows={[
          ['Macro', 'Unweighted mean of the per-class scores', 'Every class matters equally, however small'],
          ['Weighted', 'Mean weighted by each class’s support (number of true samples)', 'Reflect the class distribution'],
          ['Micro', 'Pool all TP, FP, FN over classes, then compute once', 'Every sample matters equally; for single-label problems micro P = micro R = micro F1 = accuracy'],
        ]}
      />

      <H2>Worked example: iris subset (from your notes)</H2>
      <p>Ten flowers, confusion matrix (rows true, columns predicted):</p>
      <Table
        head={['True \\ Predicted', ...labels, 'Support']}
        numeric={[1, 2, 3, 4]}
        rows={cm.map((r, i) => [labels[i], ...r, r.reduce((a, b) => a + b, 0)])}
      />
      <p>
        Accuracy = (3 + 3 + 3)/10 = <strong>{fx(rep.accuracy, 2)}</strong>.
      </p>
      <Table
        head={['Class', 'Precision', 'Recall', 'F1', 'Support']}
        numeric={[1, 2, 3, 4]}
        rows={rep.per.map((p) => [p.label, `${p.tp}/${p.predicted} = ${fx(p.precision, 4)}`, `${p.tp}/${p.support} = ${fx(p.recall, 4)}`, fx(p.f1, 4), p.support])}
      />
      <Table
        head={['Average', 'Precision', 'Recall', 'F1']}
        numeric={[1, 2, 3]}
        rows={[
          ['Macro', fx(rep.macro.precision, 4), fx(rep.macro.recall, 4), fx(rep.macro.f1, 4)],
          ['Weighted', fx(rep.weighted.precision, 4), fx(rep.weighted.recall, 4), fx(rep.weighted.f1, 4)],
          ['Micro', fx(rep.micro.precision, 4), fx(rep.micro.recall, 4), fx(rep.micro.f1, 4)],
        ]}
      />
      <p>
        For example, macro precision = (1 + 1 + 0.75)/3 = 0.9167 and weighted recall = (3 × 1 + 4 × 0.75 + 3 × 1)/10 = 0.90. The macro F1 is the
        mean of the per-class F1 values: (1 + 0.8571 + 0.8571)/3 = <M>{fx(rep.macro.f1, 4)}</M>.
      </p>
      <Note kind="warn" title="Check the handout’s averages">
        The handout lists macro F1 = 0.9167 and all weighted scores = 0.925. Only weighted <em>precision</em> is 0.925: weighted recall is 0.90
        (it always equals accuracy) and both F1 averages are about 0.905, because F1 must be averaged from the per-class F1 values, not computed
        from the averaged precision and recall. Show the per-class table and you cannot go wrong.
      </Note>
      <SolverLink to="multiclass">Compute a full report for any confusion matrix</SolverLink>

      <Code title="multiclass.py">{`
from sklearn.metrics import confusion_matrix, classification_report, f1_score

y_true = [0, 0, 0, 1, 1, 1, 1, 2, 2, 2]
y_pred = [0, 0, 0, 1, 1, 1, 2, 2, 2, 2]
print(confusion_matrix(y_true, y_pred))
print(classification_report(y_true, y_pred, target_names=["Setosa", "Versicolor", "Virginica"]))
print(f1_score(y_true, y_pred, average="macro"), f1_score(y_true, y_pred, average="weighted"), f1_score(y_true, y_pred, average="micro"))
`}</Code>

      <H2>Writing it in the exam</H2>
      <Answer q="Compute precision, recall and F1 for each class of a multiclass confusion matrix, with macro and weighted averages." marks={10}>
        <p>
          Read the diagonal; compute each class’s precision from its column and recall from its row; F1 per class; then the macro (simple mean),
          weighted (by support) and micro (pooled) averages, stating which you would report and why.
        </p>
      </Answer>

      <KeyPoints>
        <li>The k × k confusion matrix shows which classes get confused.</li>
        <li>Per class: precision from the column, recall from the row.</li>
        <li>Macro averages treat classes equally; weighted uses support; micro pools all decisions (= accuracy for single-label).</li>
        <li>Iris example: accuracy 0.90, macro P = R = 0.9167, macro F1 ≈ 0.905.</li>
      </KeyPoints>
    </>
  );
}
