import { M, MB } from '../../components/Math';
import { Answer, Code, Compare, Def, H2, H3, KeyPoints, Note, SolverLink, Steps, Table } from '../../components/prose';
import { Work } from '../../lab/ui';
import { CostFigure, LossFigure } from '../../viz/m5';
import { MetricsWork } from '../../viz/work';

export default function Scoring() {
  return (
    <>
      <p>
        Cross-validation and grid search need a number to compare models with. By default scikit-learn uses accuracy for classifiers and R² for
        regressors, but the whole point of the previous lessons is that the right number depends on the application. Scoring functions let you
        choose it, and even define your own.
      </p>

      <H2>Scoring functions (Q12)</H2>
      <Def term="Scoring function">
        A function that measures how good a model’s predictions are on a dataset, returning a single number used to evaluate and compare models
        and to select hyperparameters. In scikit-learn, by convention, <strong>higher is always better</strong>.
      </Def>
      <p>
        It matters because model selection optimises whatever you score: if you grid-search on accuracy for a fraud detector, you will select the
        model that is best at labelling legitimate transactions, not the one that catches fraud. The scorer is how the business goal enters the
        machine-learning loop.
      </p>
      <Code title="scoring_parameter.py">{`
from sklearn.model_selection import cross_val_score, GridSearchCV

cross_val_score(model, X, y, cv=5, scoring="roc_auc")
GridSearchCV(model, param_grid, cv=5, scoring="f1").fit(X_train, y_train)

from sklearn.metrics import get_scorer_names
print(sorted(get_scorer_names()))
`}</Code>

      <H2>Classification versus regression scorers (Q13)</H2>
      <Table
        head={['Task', 'Scorer name', 'Measures', 'Example use']}
        rows={[
          ['Classification', '"accuracy"', 'Fraction correct', 'Balanced classes, equal costs'],
          ['Classification', '"precision", "recall", "f1"', 'Positive-class quality', 'Imbalanced data'],
          ['Classification', '"roc_auc", "average_precision"', 'Ranking quality across thresholds', 'Comparing models independent of threshold'],
          ['Classification', '"neg_log_loss"', 'Quality of predicted probabilities', 'When calibrated probabilities matter'],
          ['Classification (multiclass)', '"f1_macro", "f1_weighted", "recall_micro"', 'Averaged per-class scores', 'Class-imbalanced multiclass problems'],
          ['Regression', '"r2"', 'Variance explained (default)', 'General comparison'],
          ['Regression', '"neg_mean_absolute_error"', 'Average error magnitude', 'Robust to outliers'],
          ['Regression', '"neg_mean_squared_error", "neg_root_mean_squared_error"', 'Squared error', 'Large errors costly'],
        ]}
      />
      <Note kind="tip" title="Why “neg_”?">
        Errors are better when smaller, but scorers must be “higher is better”, so scikit-learn returns the negative of MSE or MAE. A score of
        −2.3 is better than −5.1.
      </Note>

      <H2>Log-loss versus hinge loss (Q14)</H2>
      <p>
        Models are trained by minimising a <em>loss</em>; scoring evaluates them. The training loss shapes what the model learns. Writing the
        margin as <M>{'m = y \\cdot f(x)'}</M> with <M>{'y \\in \\{-1, +1\\}'}</M>:
      </p>
      <MB>{'L_{\\text{log}}(m) = \\ln(1 + e^{-m}) \\qquad L_{\\text{hinge}}(m) = \\max(0,\\, 1 - m)'}</MB>
      <LossFigure />
      <Compare
        cols={[
          {
            title: 'Log-loss (cross-entropy): logistic regression',
            items: [
              'Never exactly zero: every point, even correctly classified ones, keeps influencing the model.',
              'Penalises confident wrong predictions very heavily.',
              'Smooth everywhere: easy gradient-based optimisation.',
              'Produces probability estimates; used as "neg_log_loss" for scoring calibrated probabilities.',
            ],
          },
          {
            title: 'Hinge loss: support vector machines',
            items: [
              'Zero once a point is beyond the margin (m ≥ 1): only margin-violating points (support vectors) matter.',
              'Grows linearly for mistakes: more robust to outliers than squared losses.',
              'Leads to sparse solutions and maximum-margin boundaries.',
              'Gives scores, not probabilities; not differentiable at m = 1 (sub-gradients are used).',
            ],
          },
        ]}
      />

      <H2>Custom scoring metrics (SEE ’25 10a, Q15)</H2>
      <p>
        Built-in metrics treat all errors symmetrically or ignore costs. Domain-specific problems often have very asymmetric costs, and a custom
        scorer encodes them directly:
      </p>
      <ul>
        <li>
          <strong>Medical diagnosis</strong>: a missed disease (FN) can be fatal while a false alarm (FP) means an extra test. Use recall at a
          minimum precision, F2 (recall-weighted), or a cost matrix; never plain accuracy on rare diseases.
        </li>
        <li>
          <strong>Fraud detection</strong>: a missed fraud loses money; investigating a false alarm costs staff time. Score by expected monetary
          loss (FN × average fraud amount + FP × investigation cost).
        </li>
        <li>
          <strong>Spam filtering</strong>: the opposite: a real email sent to spam (FP) is worse than a spam in the inbox, so precision is weighted
          more.
        </li>
      </ul>
      <p>Why they matter: they align model selection with the real objective, make trade-offs explicit, improve decisions, and let grid search optimise what the business actually cares about.</p>
      <CostFigure />

      <H3>Worked example: false negatives 5× costlier (Q19)</H3>
      <p>TP = 30, FP = 15, FN = 10, TN = 45, with a false negative costing five times a false positive.</p>
      <Work>
        <MetricsWork tp={30} fp={15} fn={10} tn={45} beta={2} costFN={5} costFP={1} />
      </Work>
      <p>
        A weighted score of 0.10 (versus accuracy 0.75) shows that the 10 missed frauds wipe out most of the value of the correct predictions.
        The F2 score (≈ 0.73) is a standard alternative that weights recall more than precision.
      </p>
      <SolverLink to="metrics">Try other confusion matrices and cost ratios</SolverLink>

      <Code title="custom_scorer.py">{`
from sklearn.metrics import make_scorer, confusion_matrix, fbeta_score

def fraud_cost(y_true, y_pred, c_fn=5, c_fp=1):
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
    return -(c_fn * fn + c_fp * fp)            # negative cost: higher is better

cost_scorer = make_scorer(fraud_cost)
f2_scorer = make_scorer(fbeta_score, beta=2)

grid = GridSearchCV(model, param_grid, cv=StratifiedKFold(5), scoring=cost_scorer)
`}</Code>

      <H2>Tuning a fraud classifier end to end (Q20)</H2>
      <Steps>
        <li>
          <strong>Hold out a test set</strong> with stratification (fraud is rare), never used for any decision.
        </li>
        <li>
          <strong>Build a pipeline</strong>: scaling and any resampling (e.g. SMOTE) inside the pipeline so they are refit within each fold.
        </li>
        <li>
          <strong>Define the scorer</strong> from the business costs (expected loss, or F2 / recall at a precision floor).
        </li>
        <li>
          <strong>Grid or random search with stratified k-fold CV</strong> over model hyperparameters and class weights, scoring with the custom
          scorer.
        </li>
        <li>
          <strong>Tune the decision threshold</strong> on validation predictions to minimise cost (as in the figure above).
        </li>
        <li>
          <strong>Evaluate once on the test set</strong>: report the cost, precision, recall, PR-AUC; monitor after deployment as fraud patterns
          drift.
        </li>
      </Steps>

      <H2>Writing it in the exam</H2>
      <Answer q="Discuss the significance of custom scoring metrics for domain-specific applications such as medical diagnosis or fraud detection." marks={10} src="SEE ’25 10a">
        <p>
          Define scoring functions and their role in model selection (2); explain why standard metrics fall short (asymmetric costs, imbalance,
          accuracy paradox) (2); give the medical and fraud examples with what each custom metric should reward (3); show a cost formula and the
          make_scorer code, and the cost-versus-threshold idea (2); conclude on aligning evaluation with real outcomes (1).
        </p>
      </Answer>
      <Answer q="Analyse how log-loss and hinge loss affect model optimisation in classification tasks. (Q14)" marks={10}>
        <p>
          Define the margin, give both formulas, draw the loss-versus-margin plot with the 0–1 loss, then compare: which points influence the model,
          sensitivity to outliers and confident errors, smoothness, probabilistic output, sparsity of the solution; tie each to logistic regression
          and SVMs.
        </p>
      </Answer>

      <KeyPoints>
        <li>A scoring function turns predictions into one “higher is better” number for model selection.</li>
        <li>Choose it per task: accuracy, F1, ROC-AUC, log-loss for classification; R², MAE, RMSE for regression.</li>
        <li>Log-loss: smooth, probabilistic, every point matters. Hinge: zero beyond the margin, sparse, max-margin.</li>
        <li>Custom scorers encode asymmetric costs; with FN = 5× FP, TP 30/FP 15/FN 10/TN 45 gives a weighted score of 0.10 and cost 65.</li>
        <li>Fraud tuning: stratified CV + grid search + custom scorer + threshold tuning + one final test.</li>
      </KeyPoints>
    </>
  );
}
