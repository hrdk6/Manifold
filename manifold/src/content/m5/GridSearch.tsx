import { M } from '../../components/Math';
import { Answer, Code, Compare, Def, H2, H3, KeyPoints, Note, Table } from '../../components/prose';
import { GridSearchFigure, GridVsRandomFigure } from '../../viz/m5';

export default function GridSearch() {
  return (
    <>
      <p>
        Once we can evaluate a model reliably, we can improve it by choosing its hyperparameters well. Grid search is the most common way to do
        this, and both of the Module 5 questions on the Feb 2025 SEE (9a and 9b) are about it.
      </p>

      <H2>Parameters and hyperparameters</H2>
      <Def term="Hyperparameter">
        A setting chosen <em>before</em> training that controls how a model learns or how complex it can be, for example C and γ of an SVM, k in
        k-NN, max_depth of a tree, α of Ridge. Ordinary parameters (weights, support vectors) are learned from the data during training.
      </Def>

      <H2>Grid search</H2>
      <Def term="Grid search">
        An exhaustive search over a specified grid of hyperparameter values: train and evaluate the model for every combination and keep the
        combination with the best score.
      </Def>
      <p>
        For an RBF SVM, trying C and γ ∈ {'{'}0.001, 0.01, 0.1, 1, 10, 100{'}'} gives 6 × 6 = 36 combinations. Systematic and simple, but the
        cost multiplies quickly.
      </p>
      <GridSearchFigure />

      <H2>The danger of overfitting the parameters and the validation set</H2>
      <p>
        A tempting mistake: try every combination, evaluate each on the test set, and report the best test score. But the test set was used to
        <em> choose</em> the parameters, so its score is no longer an honest estimate of performance on new data. Trying 36 combinations and
        picking the best is itself a form of fitting, and the winner partly reflects luck on that particular test set.
      </p>
      <p>The fix is a three-way split:</p>
      <svg viewBox="0 0 620 90" style={{ width: '100%', maxWidth: 640, height: 'auto', display: 'block', margin: '1.4rem 0' }} role="img" aria-label="Training, validation and test sets">
        <rect x="0" y="20" width="370" height="38" rx="6" fill="var(--ultra)" opacity="0.85" />
        <rect x="374" y="20" width="120" height="38" rx="6" fill="var(--ochre)" opacity="0.9" />
        <rect x="498" y="20" width="122" height="38" rx="6" fill="var(--rose)" opacity="0.9" />
        <text x="185" y="44" textAnchor="middle" style={{ fontFamily: 'var(--font-ui)', fontWeight: 750, fontSize: 14, fill: '#fff' }}>Training set: fit the model</text>
        <text x="434" y="44" textAnchor="middle" style={{ fontFamily: 'var(--font-ui)', fontWeight: 750, fontSize: 13, fill: '#fff' }}>Validation: choose</text>
        <text x="559" y="44" textAnchor="middle" style={{ fontFamily: 'var(--font-ui)', fontWeight: 750, fontSize: 13, fill: '#fff' }}>Test: report once</text>
        <text x="0" y="80" style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fill: 'var(--ink-3)' }}>After choosing, retrain on training + validation, then evaluate on the test set a single time.</text>
      </svg>
      <ul>
        <li>
          <strong>Training set</strong>: build the models.
        </li>
        <li>
          <strong>Validation set</strong>: choose hyperparameters (and models).
        </li>
        <li>
          <strong>Test set</strong>: kept aside and used once, at the very end, to report generalisation.
        </li>
      </ul>

      <H2>Grid search with cross-validation</H2>
      <p>
        A single validation split is itself noisy. Better: evaluate each combination with k-fold cross-validation on the training set, pick the
        combination with the best mean CV score, retrain on the whole training set with it, and evaluate once on the test set. scikit-learn
        packages this as <code>GridSearchCV</code>.
      </p>
      <Code title="grid_search_svm.py">{`
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.svm import SVC
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

X_train, X_test, y_train, y_test = train_test_split(X, y, random_state=0)

param_grid = {"svc__C":     [0.001, 0.01, 0.1, 1, 10, 100],
              "svc__gamma": [0.001, 0.01, 0.1, 1, 10, 100]}
pipe = make_pipeline(StandardScaler(), SVC(kernel="rbf"))   # scaler refit inside every fold

grid = GridSearchCV(pipe, param_grid, cv=5, scoring="accuracy", n_jobs=-1)
grid.fit(X_train, y_train)            # 36 combinations x 5 folds = 180 fits, then a refit

print("best parameters:", grid.best_params_)
print("best CV score:  ", grid.best_score_)
print("test score:     ", grid.score(X_test, y_test))   # reported once
results = grid.cv_results_            # mean_test_score for every combination (plot as a heatmap)
`}</Code>
      <H3>Nested cross-validation</H3>
      <p>
        To evaluate the whole procedure “grid search + model” without a single fixed test split, use nested CV: an outer CV loop splits the data
        into training and test folds; on each outer training fold an inner grid search with CV chooses the parameters; the chosen model is scored
        on the outer test fold. The result estimates how well the method generalises, at the cost of many more fits.
      </p>

      <H2>Impact of grid search on an SVM (SEE ’25 9b)</H2>
      <p>The heatmap above is the answer to this question in picture form. Analyse it region by region:</p>
      <Table
        head={['Region', 'What the model does', 'CV accuracy']}
        rows={[
          ['Small C, small γ', 'Very smooth boundary, heavy regularisation: underfits (often predicts the majority class).', 'Low'],
          ['Large γ, any C', 'Each support vector influences only a tiny neighbourhood: the boundary wraps individual points and overfits.', 'Low on validation even if training is perfect'],
          ['Large C, small γ', 'Near-linear boundary with little regularisation: reasonable if the data is nearly linear.', 'Medium'],
          ['A band of moderate γ with C large enough', 'Flexible enough to follow the true shape, regular enough to ignore noise.', 'Highest'],
        ]}
      />
      <ul>
        <li>
          SVM performance is <strong>very sensitive</strong> to C and γ: accuracy can swing from chance level to near-perfect across the grid,
          so default values are rarely optimal.
        </li>
        <li>
          C and γ <strong>interact</strong>: the best γ depends on C, so they must be searched jointly, not one at a time.
        </li>
        <li>
          The grid should span orders of magnitude (log scale). If the best value lies on the edge of the grid, extend the grid in that direction.
        </li>
        <li>
          Scaling must happen inside each CV fold (a Pipeline), otherwise information leaks from the validation folds and the scores are optimistic.
        </li>
        <li>The tuned model is then evaluated on the held-out test set; the CV score of the best cell is slightly optimistic.</li>
      </ul>

      <H2>Computational challenges and remedies (SEE ’25 9a, Q6)</H2>
      <p>
        The number of fits is <M>{'\\prod_i (\\text{values of hyperparameter } i) \\times k'}</M>: it grows <strong>exponentially</strong> with the
        number of hyperparameters. Five hyperparameters with 10 values each and 5-fold CV need 500,000 fits.
      </p>
      <Compare
        cols={[
          {
            title: 'Challenges',
            items: [
              'Combinatorial explosion of combinations (curse of dimensionality for hyperparameters).',
              'Each combination needs k fits; expensive models (SVMs on large data, deep nets) make each fit slow.',
              'Memory and time grow with dataset size.',
              'Fine grids waste effort on unimportant hyperparameters.',
              'Risk of overfitting the validation scores when many combinations are tried.',
            ],
          },
          {
            title: 'Strategies',
            items: [
              <>
                <strong>Random search</strong> (RandomizedSearchCV): a fixed budget of random combinations; far more efficient in many dimensions.
              </>,
              <>
                <strong>Coarse-to-fine</strong>: a coarse log-scale grid first, then a finer grid around the best region.
              </>,
              <>
                <strong>Parallelism</strong>: <code>n_jobs=-1</code> runs fits on all CPU cores; distribute across machines.
              </>,
              <>
                <strong>Successive halving</strong> (HalvingGridSearchCV): evaluate many candidates on little data, keep the best, give them more.
              </>,
              <>
                <strong>Bayesian optimisation</strong>: model the score surface and choose promising points next.
              </>,
              'Fewer folds or a data subsample during early exploration; early stopping for iterative models.',
              'Use domain knowledge and defaults to prune the grid; conditional grids (e.g. γ only for RBF kernels).',
            ],
          },
        ]}
      />

      <H2>Grid search versus random search (Q5)</H2>
      <GridVsRandomFigure />
      <Table
        head={['', 'Grid search', 'Random search']}
        rows={[
          ['Combinations tried', 'Every point on a predefined grid', 'A fixed number sampled from distributions'],
          ['Cost', 'Product of grid sizes: exponential in the number of hyperparameters', 'Set by the budget (n_iter), independent of dimensionality'],
          ['Coverage of each hyperparameter', 'Only the grid values', 'Many distinct values of every hyperparameter'],
          ['Best for', 'Few hyperparameters, small grids, reproducible exhaustive search', 'Many hyperparameters, especially when only a few matter'],
          ['Guarantee', 'Finds the best point on the grid', 'Probabilistic; may miss the exact best'],
        ]}
      />
      <Note kind="exam">
        For high-dimensional hyperparameter spaces, random search is more efficient: with the same budget it explores more distinct values of
        the hyperparameters that actually matter (Bergstra and Bengio, 2012).
      </Note>

      <H2>Writing it in the exam</H2>
      <Answer q="Discuss the computational challenges of grid search and propose strategies to address them." marks={10} src="SEE ’25 9a">
        <p>
          Define grid search with GridSearchCV; quantify the cost with the product formula and a numeric example; list the challenges; propose at
          least five strategies (random search, coarse-to-fine, parallelism, successive halving, Bayesian optimisation, subsampling) with one line
          each; include the grid-versus-random sketch.
        </p>
      </Answer>
      <Answer q="Analyse the impact of hyperparameter tuning using grid search on an SVM’s performance." marks={10} src="SEE ’25 9b">
        <p>
          Explain C and γ; draw the C × γ accuracy heatmap and analyse its regions (underfit, overfit, the good band); give the GridSearchCV
          code with a scaling pipeline; mention the train/validation/test discipline and that the best CV score is optimistic.
        </p>
      </Answer>

      <KeyPoints>
        <li>Hyperparameters are set before training; grid search tries every combination on a grid.</li>
        <li>Never tune on the test set: use training / validation / test, or CV on the training set.</li>
        <li>GridSearchCV = grid search + k-fold CV + refit on all training data.</li>
        <li>For SVMs, C and γ interact strongly; accuracy is high only in a narrow band of the grid.</li>
        <li>Cost grows exponentially; random search, coarse-to-fine, parallelism and halving help.</li>
      </KeyPoints>
    </>
  );
}
