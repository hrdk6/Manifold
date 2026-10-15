import { M, MB } from '../../components/Math';
import { Answer, Code, Def, H2, H3, KeyPoints, Note, SolverLink, Table } from '../../components/prose';
import { Work } from '../../lab/ui';
import { fx } from '../../lib/fmt';
import { binaryMetrics } from '../../lib/metrics';
import { ConfusionGrid, ImbalanceFigure, ThresholdFigure } from '../../viz/m5';
import { MetricsWork } from '../../viz/work';

export default function BinaryMetrics() {
  const q8 = binaryMetrics({ tp: 30, fn: 20, fp: 10, tn: 40 });
  const f1 = (p: number, r: number) => (2 * p * r) / (p + r);
  return (
    <>
      <p>
        Accuracy, the fraction of correct predictions, is the obvious way to score a classifier, and often the wrong one. The right metric
        depends on what the model is for and what its mistakes cost. This lesson covers the confusion matrix and the metrics built from it,
        which appear in almost every Module 2 and Module 5 numerical.
      </p>

      <H2>Keep the end goal in mind</H2>
      <p>
        A model is used to make decisions with real-world consequences, so think about the <em>business metric</em> (lives saved, money lost,
        customers kept) and choose an evaluation metric that tracks it.
      </p>
      <H3>Kinds of errors</H3>
      <Table
        head={['Error', 'Also called', 'Meaning', 'Cancer-screening example']}
        rows={[
          ['False positive (FP)', 'Type I error', 'Predicting positive for an actual negative', 'A healthy patient is told they may have cancer: stress, extra tests, cost'],
          ['False negative (FN)', 'Type II error', 'Predicting negative for an actual positive', 'A cancer goes undetected: delayed treatment, possibly fatal'],
        ]}
      />
      <p>The two are rarely equally bad. Accuracy treats them the same, which is its first limitation.</p>
      <H3>Imbalanced datasets</H3>
      <p>
        When one class is much more frequent (99% of ad impressions are not clicked, 98% of transactions are legitimate), a model can reach 99%
        accuracy by always predicting the majority class while being completely useless.
      </p>
      <ImbalanceFigure />

      <H2>The confusion matrix</H2>
      <p>
        For binary classification, the confusion matrix is a 2 × 2 table comparing actual and predicted classes. scikit-learn orders it with
        actual classes in rows and predicted classes in columns, negative class first.
      </p>
      <div style={{ maxWidth: 420 }}>
        <ConfusionGrid tp={50} fn={10} fp={5} tn={35} />
      </div>

      <H2>The metrics</H2>
      <Table
        head={['Metric', 'Formula', 'Question it answers', 'Prefer when']}
        rows={[
          ['Accuracy', <M>{'\\frac{TP + TN}{TP + TN + FP + FN}'}</M>, 'What fraction of all predictions is correct?', 'Balanced classes, equal error costs'],
          ['Precision (PPV)', <M>{'\\frac{TP}{TP + FP}'}</M>, 'Of the predicted positives, how many are real?', 'False positives are costly (spam filter, recommending a drug)'],
          ['Recall (sensitivity, TPR)', <M>{'\\frac{TP}{TP + FN}'}</M>, 'Of the real positives, how many did we find?', 'False negatives are costly (cancer, fraud)'],
          ['Specificity (TNR)', <M>{'\\frac{TN}{TN + FP}'}</M>, 'Of the real negatives, how many did we clear?', 'Screening tests (with sensitivity)'],
          ['FPR', <M>{'\\frac{FP}{FP + TN} = 1 - \\text{specificity}'}</M>, 'How often are negatives falsely flagged?', 'ROC curves'],
          ['F1 score', <M>{'2\\cdot\\frac{P \\cdot R}{P + R}'}</M>, 'A single balance of precision and recall', 'Imbalanced data; both errors matter'],
        ]}
      />
      <Def term="F1 score">
        The harmonic mean of precision and recall. The harmonic mean is dominated by the smaller value, so F1 is high only when <em>both</em>{' '}
        precision and recall are high. The general <M>{'F_\\beta = \\frac{(1+\\beta^2)PR}{\\beta^2 P + R}'}</M> weights recall β times as much
        as precision (F2 for recall-critical tasks).
      </Def>
      <ThresholdFigure />

      <H2>Worked numericals</H2>
      <H3>Q7: TP = 50, FN = 10, FP = 5, TN = 35</H3>
      <Work>
        <MetricsWork tp={50} fp={5} fn={10} tn={35} />
      </Work>
      <H3>Q8: TP = 30, FN = 20, FP = 10, TN = 40</H3>
      <p>
        Precision = 30/(30 + 10) = <strong>{fx(q8.precision, 2)}</strong>, recall = 30/(30 + 20) = <strong>{fx(q8.recall, 2)}</strong> (F1 ={' '}
        {fx(q8.f1, 4)}, accuracy = {fx(q8.accuracy, 2)}).
      </p>
      <ul>
        <li>
          <strong>Improve precision at the expense of recall</strong>: raise the decision threshold so the classifier predicts positive only when
          very confident. FP falls (fewer false alarms), but FN rises (more positives missed).
        </li>
        <li>
          <strong>Improve recall at the expense of precision</strong>: lower the threshold so more cases are flagged. FN falls, FP rises.
        </li>
        <li>Other levers: class weights, resampling, adding features that separate the classes better (which can improve both).</li>
      </ul>
      <H3>Q9: which model has the higher F1?</H3>
      <MB>{`F_1^A = \\frac{2(0.6)(0.8)}{0.6 + 0.8} = \\frac{0.96}{1.4} = ${fx(f1(0.6, 0.8), 4)} \\qquad F_1^B = \\frac{2(0.75)(0.5)}{0.75 + 0.5} = \\frac{0.75}{1.25} = ${fx(f1(0.75, 0.5), 4)}`}</MB>
      <p>
        Model A has the higher F1: it is more balanced. It catches 80% of churners (high recall) at the cost of more false alarms; model B’s
        predictions are more trustworthy (precision 0.75) but it misses half of the churners. For churn, where a missed churner is a lost
        customer and a false alarm only costs a retention offer, A is usually the better business choice.
      </p>
      <H3>Q10 / SEE ’25 4a: fraud detection</H3>
      <Work>
        <MetricsWork tp={16} fp={30} fn={4} tn={150} />
      </Work>
      <p>
        <strong>Why recall matters more here:</strong> a missed fraud (FN) means direct financial loss and damaged customer trust, while a false
        alarm (FP) costs only a quick verification call. Regulators also expect fraud to be caught. So the bank prefers to catch 80% of frauds
        (recall 0.80) even though only about 35% of flagged transactions are actually fraudulent (precision 0.348). Note the accuracy of 0.83 hides
        all of this.
      </p>
      <SolverLink to="metrics">Compute every metric for your own confusion matrix</SolverLink>

      <H2>Accuracy versus F1 on imbalanced data (Q10, Q17)</H2>
      <p>
        With 990 negatives and 10 positives, a model predicting “negative” for everything has accuracy 99% but recall 0, precision undefined and
        F1 0. A model that finds 8 of the 10 positives with 20 false alarms has accuracy 97.8% (lower!) but precision 0.286, recall 0.8 and F1
        0.42. F1 ignores the huge number of easy true negatives and focuses on how well the rare class is handled, which is why it is preferred
        for imbalanced problems.
      </p>
      <Note kind="tip" title="Handling imbalance">
        Use appropriate metrics (precision, recall, F1, AUC, PR curves), resample (over-sample the minority class, under-sample the majority),
        use class weights, and adjust the decision threshold.
      </Note>

      <Code title="metrics.py">{`
from sklearn.metrics import confusion_matrix, accuracy_score, precision_score, recall_score, f1_score, classification_report

y_true = [...]          # actual labels
y_pred = [...]          # model predictions
print(confusion_matrix(y_true, y_pred))      # [[TN FP] [FN TP]]
print(accuracy_score(y_true, y_pred), precision_score(y_true, y_pred),
      recall_score(y_true, y_pred), f1_score(y_true, y_pred))
print(classification_report(y_true, y_pred))
`}</Code>

      <H2>Writing it in the exam</H2>
      <Answer q="Define precision, recall and F1-score with formulas. (Q8)" marks={6}>
        <p>Definitions in words, formulas, the confusion matrix diagram, and one example showing when each matters.</p>
      </Answer>
      <Answer q="Why might recall be more important than precision in fraud detection? Compute both." marks={10} src="SEE ’25 4a">
        <p>
          Identify TP = 16, FN = 4, FP = 30, TN = 150; recall = 16/20 = 0.80; precision = 16/46 = 0.348; also accuracy 0.83 and F1 0.485. Then
          argue: cost of FN (loss, trust, regulation) far exceeds cost of FP (a verification step), so recall is prioritised; mention lowering the
          threshold and F2 / cost-weighted metrics.
        </p>
      </Answer>

      <KeyPoints>
        <li>FP = type I error, FN = type II error; their costs are rarely equal.</li>
        <li>Precision = TP/(TP + FP); recall = TP/(TP + FN); F1 = 2PR/(P + R).</li>
        <li>Q7: accuracy 0.85, P 0.909, R 0.833, F1 0.870. Fraud: R 0.80, P 0.348.</li>
        <li>Raising the threshold trades recall for precision; lowering it does the reverse.</li>
        <li>On imbalanced data accuracy misleads; use F1, precision/recall or AUC.</li>
      </KeyPoints>
    </>
  );
}
