import { Answer, Code, Compare, Def, H2, H3, KeyPoints, Note, Table } from '../../components/prose';
import { UncertaintyFigure } from '../../viz/m2b';

export default function Uncertainty() {
  return (
    <>
      <p>
        A prediction is more useful when it comes with a measure of confidence. A tumour classified “malignant” with 51% certainty calls for a
        different response from one classified malignant with 99% certainty. Most scikit-learn classifiers can report this uncertainty
        through two methods.
      </p>

      <H2>What uncertainty estimation is</H2>
      <Def term="Uncertainty estimation">
        Quantifying how confident a model is in each of its predictions, so that decisions can take the risk of error into account.
      </Def>
      <p>It matters because it enables:</p>
      <ul>
        <li>
          <strong>Reliable decisions</strong> in high-stakes settings (medicine, finance, autonomous vehicles): act automatically only when
          confident, otherwise refer to a human.
        </li>
        <li>
          <strong>Threshold tuning</strong>: trading false positives against false negatives by changing the cut-off (Module 5).
        </li>
        <li>
          <strong>Active learning</strong>: ask for labels on the examples the model is least sure about.
        </li>
        <li>
          <strong>Detecting novel inputs</strong> that are unlike anything in the training data.
        </li>
      </ul>

      <H2>decision_function and predict_proba</H2>
      <Compare
        cols={[
          {
            title: 'decision_function',
            items: [
              'Returns one real-valued score per sample (binary case).',
              'Positive → the positive class (classes_[1]); negative → the other.',
              'Magnitude = how strongly the model believes it; for linear models and SVMs it is related to the distance from the boundary.',
              'Arbitrary range, so hard to interpret across models.',
            ],
          },
          {
            title: 'predict_proba',
            items: [
              'Returns a probability for each class; rows sum to 1.',
              'Shape (n_samples, 2) for binary problems.',
              'Easy to interpret; a threshold of 0.5 reproduces predict.',
              'Only meaningful if the model is calibrated.',
            ],
          },
        ]}
      />
      <UncertaintyFigure />

      <H3>Calibration</H3>
      <p>
        A model is <strong>calibrated</strong> if, among all predictions made with 70% confidence, about 70% are correct. Overfitted models (a
        deep tree, Naive Bayes) tend to be overconfident: probabilities pushed to 0 or 1 even when wrong. Logistic regression is usually
        reasonably calibrated. Calibration can be improved after training (e.g. <code>CalibratedClassifierCV</code>).
      </p>
      <H3>Multiclass uncertainty</H3>
      <p>
        For k classes both methods return k columns: one score or probability per class. The predicted class is the argmax of the row; the
        gap between the largest and second-largest value indicates confidence.
      </p>

      <H2>Other ways to estimate uncertainty</H2>
      <Table
        head={['Method', 'Idea']}
        rows={[
          ['Ensembles', 'Disagreement among trees of a random forest (or bagged models) measures uncertainty.'],
          ['Bayesian methods', 'Treat parameters as distributions; Bayesian neural networks; Monte-Carlo dropout (random dropout at prediction time, look at the spread).'],
          ['Gaussian processes', 'Predict a mean and a confidence interval for every input.'],
          ['Prediction intervals', 'For regression, report a range: ₹30 lakh ± 0.5 lakh is a confident prediction, ± 5 lakh is not.'],
        ]}
      />
      <Note kind="tip">
        Two houses can both be predicted at ₹30 lakh, one with an interval of ₹29.5–30.5 lakh and the other ₹25–35 lakh. Same prediction,
        very different reliability.
      </Note>

      <Code title="uncertainty.py">{`
from sklearn.ensemble import GradientBoostingClassifier

clf = GradientBoostingClassifier(random_state=0).fit(X_train, y_train)
print(clf.decision_function(X_test[:5]))   # signed scores
print(clf.predict_proba(X_test[:5]))       # probabilities, rows sum to 1
print(clf.classes_)                        # column order
`}</Code>

      <H2>Writing it in the exam</H2>
      <Answer q="Define uncertainty estimation in the context of supervised learning. (Q5)" marks={5}>
        <p>
          Definition, why it matters (two or three bullet points), the two scikit-learn methods with what each returns, calibration in one line,
          and one example (medical diagnosis or house-price intervals).
        </p>
      </Answer>

      <KeyPoints>
        <li>Uncertainty estimates say how much to trust each prediction.</li>
        <li>decision_function gives signed scores; predict_proba gives class probabilities summing to 1.</li>
        <li>Calibrated means stated confidence matches observed accuracy; overfit models are overconfident.</li>
        <li>Ensembles, Bayesian methods and prediction intervals are other routes to uncertainty.</li>
      </KeyPoints>
    </>
  );
}
