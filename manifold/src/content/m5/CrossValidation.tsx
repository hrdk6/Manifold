import { MB } from '../../components/Math';
import { Answer, Code, Compare, Def, H2, H3, KeyPoints, Note, SolverLink, Steps, Table } from '../../components/prose';
import { CVFigure } from '../../viz/m5';

export default function CrossValidation() {
  const folds = [
    ['S1, S2', 'S3 … S10'],
    ['S3, S4', 'S1, S2, S5 … S10'],
    ['S5, S6', 'S1 … S4, S7 … S10'],
    ['S7, S8', 'S1 … S6, S9, S10'],
    ['S9, S10', 'S1 … S8'],
  ];
  return (
    <>
      <p>
        Module 5 is about evaluating models honestly and improving them. Everything rests on one question: how well will this model perform on
        data it has never seen? A single train/test split gives a noisy answer. Cross-validation gives a much more reliable one.
      </p>

      <H2>Why a single split is not enough</H2>
      <p>
        With <code>train_test_split</code> we train on, say, 75% of the data and evaluate on 25%. The score depends on which points happened to
        land in the test set: a “lucky” split overestimates performance, an “unlucky” one underestimates it. R² on the training data is no help
        either, since it rises every time a feature is added and offers no protection against overfitting. We need an estimate that uses every
        sample for testing at some point.
      </p>

      <H2>k-fold cross-validation</H2>
      <Def term="Cross-validation">
        A statistical method of evaluating generalisation performance that is more stable and thorough than a single train/test split. The data
        is split repeatedly and multiple models are trained.
      </Def>
      <Steps>
        <li>
          <strong>Partition</strong> the data into k parts (folds) of roughly equal size; k is usually 5 or 10.
        </li>
        <li>
          <strong>Train</strong> a model on k − 1 folds and <strong>test</strong> it on the remaining fold.
        </li>
        <li>
          <strong>Repeat</strong> k times so every fold is the test set exactly once.
        </li>
        <li>
          <strong>Average</strong> the k scores (and look at their spread):
          <MB>{'\\text{CV score} = \\frac{1}{k} \\sum_{i=1}^{k} \\text{score}_i'}</MB>
        </li>
      </Steps>
      <CVFigure />

      <H3>Worked example: 5-fold CV on [S1 … S10] (SEE ’25 10b)</H3>
      <p>
        With 10 samples and k = 5, each fold holds 10/5 = 2 samples. Every split trains on 8 samples (80%) and tests on 2 (20%):
      </p>
      <Table
        head={['Iteration', 'Test fold', 'Training folds', 'Train / test size']}
        rows={folds.map((fo, i) => [`${i + 1}`, fo[0], fo[1], '8 / 2'])}
      />
      <p>
        Each sample appears in a test set exactly once and in a training set four times. If the five accuracies were 0.90, 0.85, 1.00, 0.95 and
        0.90, the CV estimate is their mean, 0.92, with the spread (0.85 to 1.00) showing how sensitive the model is to the data it is trained on.
        If the samples were ordered by class, shuffle first (or use stratified folds).
      </p>
      <SolverLink to="kfold">Generate the splits for any n and k</SolverLink>

      <H2>Benefits and costs</H2>
      <Compare
        cols={[
          {
            title: 'Benefits',
            items: [
              'More reliable estimate: no lucky or unlucky split.',
              'Every example is used for testing exactly once and for training k − 1 times.',
              'Shows how sensitive the model is to the training set (the spread of fold scores, e.g. 90%–100% on iris).',
              'Uses data more effectively: 80% (5-fold) or 90% (10-fold) of the data for training per split, versus 75% for a typical single split.',
              'Detects overfitting: a model tuned to quirks of one split will score worse on others.',
            ],
          },
          {
            title: 'Costs',
            items: ['Trains k models instead of one: about k times slower.', 'Does not produce a model; it evaluates a modelling procedure.', 'Still needs a final model trained on all the training data.'],
          },
        ]}
      />
      <H3>How cross-validation mitigates overfitting (Q3)</H3>
      <p>
        It does not stop a model from overfitting, but it stops <em>you</em> being fooled by one. Because every score comes from data the model
        did not train on, an overfit model scores poorly in CV even if its training score is perfect. Using CV to choose model complexity (tree
        depth, k in k-NN, regularisation strength) therefore steers you toward models that generalise. It also reduces the risk of tuning to a
        single validation split.
      </p>

      <H2>Other strategies</H2>
      <H3>Stratified k-fold</H3>
      <p>
        Simple k-fold takes folds in order. The iris dataset is sorted by class, so with 3 folds the first test fold contains only class 0 while
        the model was trained on classes 1 and 2: accuracy 0%. <strong>Stratified k-fold</strong> keeps the class proportions in every fold equal
        to those of the whole dataset. scikit-learn uses it by default for classifiers; it matters most for imbalanced data.
      </p>
      <H3>Leave-one-out (LOOCV)</H3>
      <p>
        k-fold with k = n: each test set is a single sample. It uses nearly all data for training (less bias, good for small datasets), but needs
        n model fits (very slow for large n) and its estimate can have high variance.
      </p>
      <Table
        head={['', 'k-fold (k = 5 or 10)', 'Leave-one-out']}
        rows={[
          ['Number of fits', 'k', 'n'],
          ['Training size per fit', '(k − 1)/k of the data', 'n − 1 samples'],
          ['Test size per fit', 'n/k', '1'],
          ['Bias of the estimate', 'Slightly pessimistic (less training data)', 'Nearly unbiased'],
          ['Variance of the estimate', 'Lower', 'Higher (each test is one point; training sets nearly identical)'],
          ['Cost', 'Moderate', 'High for large n'],
          ['Use when', 'Default choice', 'Very small datasets'],
        ]}
      />
      <H3>Shuffle-split</H3>
      <p>
        Each iteration samples <code>train_size</code> points for training and a disjoint <code>test_size</code> for testing, repeated{' '}
        <code>n_splits</code> times. The number of iterations is independent of the split sizes, and train + test need not cover the whole data,
        which is handy for subsampling large datasets.
      </p>
      <H3>Cross-validation with groups</H3>
      <p>
        When samples come in related groups (several images of the same person, several recordings of one speaker, several visits of one
        patient), a random split puts the same group in both training and test sets, and the model is rewarded for recognising the individual
        rather than generalising. <code>GroupKFold</code> keeps each group entirely in one fold, so the score reflects performance on{' '}
        <em>new</em> groups (new patients, new speakers, new faces).
      </p>
      <H3>Repeated cross-validation</H3>
      <p>
        Run k-fold several times with different shuffles (e.g. 10-fold repeated 10 times) and average all the scores to further reduce the
        variance of the estimate.
      </p>
      <Note kind="tip" title="The ideal procedure">
        Split into training, validation and test sets: fit on training, choose the model on validation (or by CV on the training set), and only
        then report performance once on the untouched test set. The next lesson explains why the test set must stay untouched.
      </Note>

      <Code title="cross_validation.py">{`
from sklearn.model_selection import cross_val_score, KFold, StratifiedKFold, LeaveOneOut, ShuffleSplit, GroupKFold
from sklearn.linear_model import LogisticRegression
from sklearn.datasets import load_iris

iris = load_iris()
logreg = LogisticRegression(max_iter=1000)

scores = cross_val_score(logreg, iris.data, iris.target, cv=5)
print(scores, scores.mean())                     # e.g. [1. 0.967 0.933 0.9 1.] 0.96

kfold = KFold(n_splits=5, shuffle=True, random_state=0)
print(cross_val_score(logreg, iris.data, iris.target, cv=kfold))
print(cross_val_score(logreg, iris.data, iris.target, cv=StratifiedKFold(5)))
print(cross_val_score(logreg, iris.data, iris.target, cv=LeaveOneOut()).mean())
print(cross_val_score(logreg, iris.data, iris.target, cv=ShuffleSplit(n_splits=10, test_size=0.5, train_size=0.5)))

for train_idx, test_idx in KFold(n_splits=5).split(range(10)):   # S1..S10 as indices 0..9
    print("train", train_idx, "test", test_idx)
`}</Code>

      <H2>Writing it in the exam</H2>
      <Answer q="Explain how 5-fold cross-validation splits a dataset, using [S1 … S10]." marks={10} src="SEE ’25 10b">
        <p>
          Define cross-validation and its purpose (2); state the k-fold procedure (2); draw the 5 × 10 grid with the test fold shaded in each row
          and list the five train/test sets (4); compute the CV score as the mean of the five fold scores and comment on 80/20 usage, each sample
          tested once, and stratification/shuffling (2).
        </p>
      </Answer>
      <Answer q="Compare k-fold cross-validation with leave-one-out cross-validation. (Q2)" marks={5}>
        <p>Brief definitions, then the comparison table (fits, sizes, bias, variance, cost, when to use).</p>
      </Answer>

      <KeyPoints>
        <li>k-fold CV: split into k folds; train on k − 1, test on 1; repeat k times; average.</li>
        <li>5-fold on 10 samples: 5 iterations, 8 train / 2 test, every sample tested once.</li>
        <li>Stratified folds preserve class proportions; shuffle sorted data.</li>
        <li>LOOCV = k-fold with k = n: low bias, high variance, expensive.</li>
        <li>GroupKFold keeps related samples together; ShuffleSplit gives independent random splits.</li>
      </KeyPoints>
    </>
  );
}
