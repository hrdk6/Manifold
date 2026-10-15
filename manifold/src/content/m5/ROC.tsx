import { MB } from '../../components/Math';
import { Answer, Code, Compare, Def, H2, H3, KeyPoints, Note, SolverLink, Table } from '../../components/prose';
import { fx } from '../../lib/fmt';
import { aucRank, rocCurve } from '../../lib/metrics';
import { ThresholdFigure } from '../../viz/m5';

export default function ROC() {
  const y = [1, 0, 1, 0, 1, 0];
  const s = [0.9, 0.2, 0.8, 0.1, 0.7, 0.3];
  const r = rocCurve(y, s);
  return (
    <>
      <p>
        Most classifiers produce a continuous score (predict_proba or decision_function), and the predicted class depends on a threshold. A
        single confusion matrix describes only one threshold. Precision–recall curves and ROC curves describe all of them at once, and the area
        under the ROC curve summarises a classifier’s ranking ability in one number.
      </p>

      <H2>Changing the threshold</H2>
      <p>
        scikit-learn’s predict uses a threshold of 0.5 on predict_proba (or 0 on decision_function). Lowering it predicts more positives: recall
        goes up, precision usually goes down. Raising it does the opposite. The threshold should be chosen on validation data, not on the test
        set, to match the application’s needs (e.g. “recall of at least 90%”).
      </p>
      <ThresholdFigure />

      <H2>Precision–recall curves</H2>
      <p>
        Plot precision against recall for every possible threshold. The closer the curve stays to the top-right corner, the better. The area
        under it, called <strong>average precision</strong>, summarises it; for an imbalanced problem the PR curve is often more informative
        than the ROC curve because it focuses on the positive class.
      </p>

      <H2>The ROC curve</H2>
      <Def term="ROC curve (Receiver Operating Characteristic)">
        A plot of the true positive rate (recall) against the false positive rate for every threshold of a binary classifier.
        <MB>{'\\text{TPR} = \\frac{TP}{TP + FN} \\qquad \\text{FPR} = \\frac{FP}{FP + TN}'}</MB>
      </Def>
      <ul>
        <li>The curve starts at (0, 0) (threshold above every score: nothing predicted positive) and ends at (1, 1) (everything positive).</li>
        <li>The ideal curve hugs the top-left corner: high recall with few false positives.</li>
        <li>The diagonal is a random classifier (AUC = 0.5); a curve below it is worse than random.</li>
        <li>The point closest to the top-left corner is often a good operating point; choose it on validation data.</li>
      </ul>

      <H2>AUC: area under the ROC curve</H2>
      <p>
        AUC summarises the whole curve in one number between 0 and 1. Its interpretation is elegant: AUC is the{' '}
        <strong>probability that a randomly chosen positive example is scored higher than a randomly chosen negative example</strong>. It is
        independent of the threshold and of class imbalance in that sense, which makes it good for comparing models.
      </p>
      <Table
        head={['AUC', 'Interpretation (your slides)']}
        rows={[
          ['1.0', 'Perfect classifier'],
          ['0.9 – 1.0', 'Excellent'],
          ['0.8 – 0.9', 'Good'],
          ['0.7 – 0.8', 'Fair'],
          ['0.6 – 0.7', 'Poor'],
          ['0.5 – 0.6', 'No better than random guessing'],
        ]}
      />
      <Compare
        cols={[
          { title: 'ROC curve', items: ['A graph: TPR vs FPR across thresholds.', 'Shows the trade-off between sensitivity and specificity.', 'Used to pick an operating threshold.'] },
          { title: 'AUC', items: ['A single number from 0 to 1.', 'Threshold-independent summary of ranking quality.', 'Used to compare models (e.g. AUC 0.937 for a random forest vs 0.916 for an SVM).'] },
        ]}
      />

      <H2>Worked example: spam scores (from your notes)</H2>
      <p>Six emails with true labels (1 = spam) and predicted probabilities:</p>
      <Table
        head={['Email', 'True label', 'Score']}
        numeric={[1, 2]}
        rows={[1, 3, 5, 6, 2, 4].map((i) => [`#${i}`, y[i - 1], s[i - 1]])}
      />
      <p>Sorted by score, then TPR and FPR at each threshold (score ≥ threshold ⇒ spam). There are P = 3 positives and N = 3 negatives:</p>
      <Table
        head={['Threshold', 'Predicted spam', 'TP', 'FP', 'TPR', 'FPR']}
        numeric={[2, 3, 4, 5]}
        rows={r.pts.slice(1).map((p) => [
          fx(p.thr, 1),
          s
            .map((v, i) => (v >= p.thr ? `#${i + 1}` : ''))
            .filter(Boolean)
            .join(', '),
          p.tp,
          p.fp,
          fx(p.tpr, 2),
          fx(p.fpr, 2),
        ])}
      />
      <p>Trapezoidal area between consecutive points:</p>
      <MB>{'\\text{AUC} = \\sum_i (\\text{FPR}_i - \\text{FPR}_{i-1}) \\frac{\\text{TPR}_i + \\text{TPR}_{i-1}}{2}'}</MB>
      <MB>{`= 0 + 0 + 0 + (0.33)(1) + (0.33)(1) + (0.33)(1) = ${fx(r.auc, 2)}`}</MB>
      <p>
        Check with the probability interpretation: every spam score (0.9, 0.8, 0.7) is higher than every non-spam score (0.3, 0.2, 0.1), so
        all 9 positive–negative pairs are ranked correctly: AUC = 9/9 = {fx(aucRank(y, s), 2)}. The ROC curve goes straight up the left edge to
        (0, 1) and then along the top.
      </p>
      <Note kind="warn" title="The notes’ answer of 0.83 is a slip">
        The handout adds the three trapezoids as 0.33 + 0.34 + 0.33 but writes the total as 1.34 and then “normalises” to 0.83. The areas sum to{' '}
        <strong>1.00</strong>, and AUC is already between 0 and 1, so no normalisation exists. A perfect ranking like this one always has AUC = 1.
        Show both the trapezoid sum and the pair-counting check to be safe.
      </Note>
      <SolverLink to="roc">Compute ROC points and AUC for any scores</SolverLink>

      <H3>When ROC and AUC can mislead</H3>
      <p>
        AUC measures ranking, not calibration or the quality of a particular threshold. With extreme imbalance, a model can have a high AUC while
        its precision at any useful recall is poor; the precision–recall curve shows that. Use ROC/AUC to compare rankings, PR curves when the
        positive class is rare, and a cost-based metric to choose the threshold.
      </p>

      <Code title="roc_auc.py">{`
from sklearn.metrics import roc_curve, roc_auc_score, precision_recall_curve, average_precision_score

y_true  = [1, 0, 1, 0, 1, 0]
y_score = [0.9, 0.2, 0.8, 0.1, 0.7, 0.3]
fpr, tpr, thresholds = roc_curve(y_true, y_score)
print(fpr, tpr, thresholds)
print("AUC:", roc_auc_score(y_true, y_score))           # 1.0

precision, recall, thr = precision_recall_curve(y_true, y_score)
print("average precision:", average_precision_score(y_true, y_score))
# for real models: roc_auc_score(y_test, model.predict_proba(X_test)[:, 1]) or model.decision_function(X_test)
`}</Code>

      <H2>Writing it in the exam</H2>
      <Answer q="Explain the importance of the ROC curve and AUC in evaluating classification models. (Q9)" marks={10}>
        <p>
          Define TPR and FPR; describe how the ROC curve is built by sweeping the threshold; draw one with the diagonal, an ideal curve and a
          realistic one; define AUC with its probabilistic meaning and interpretation scale; explain importance (threshold-independent comparison,
          choosing operating points, robustness to class ratio); note limitations and the PR curve; optionally include the six-email example.
        </p>
      </Answer>

      <KeyPoints>
        <li>ROC: TPR = TP/(TP + FN) against FPR = FP/(FP + TN) for every threshold.</li>
        <li>AUC = probability a random positive outranks a random negative; 0.5 is random, 1 is perfect.</li>
        <li>AUC is threshold-independent: good for comparing models.</li>
        <li>Spam example: all positives outrank all negatives, so AUC = 1.0.</li>
        <li>For rare positive classes also look at precision–recall curves and average precision.</li>
      </KeyPoints>
    </>
  );
}
