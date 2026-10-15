import { M, MB } from '../../components/Math';
import { Answer, Code, Compare, H2, H3, KeyPoints, Note, SolverLink, Steps, Table } from '../../components/prose';
import { KNNFigure, KNNRegressionFigure } from '../../viz/m2a';

export default function KNN() {
  return (
    <>
      <p>
        k-nearest neighbours is arguably the simplest machine-learning algorithm. To predict for a new point, find the training points closest
        to it and let them decide. There is no model to fit and no parameters to learn, which makes it a perfect first algorithm and a useful
        baseline. It was introduced by Evelyn Fix and Joseph Hodges in 1951 and later developed by Thomas Cover.
      </p>

      <H2>How it works</H2>
      <p>
        k-NN is an <span className="term">instance-based</span> (or lazy) learner: the “training” phase just stores the dataset. All the work
        happens at prediction time.
      </p>
      <Steps>
        <li>
          <strong>Choose k</strong>, the number of neighbours, and a distance metric.
        </li>
        <li>
          <strong>Compute the distance</strong> from the new point to every training point.
        </li>
        <li>
          <strong>Select the k nearest</strong> training points.
        </li>
        <li>
          <strong>Vote (classification)</strong>: predict the class that appears most often among the k neighbours.{' '}
          <strong>Average (regression)</strong>: predict the mean of their target values.
        </li>
      </Steps>

      <KNNFigure />

      <H3>Distance metrics</H3>
      <Table
        head={['Metric', 'Formula', 'Use']}
        rows={[
          ['Euclidean (L2)', <M>{'d(p,q) = \\sqrt{\\sum_{i=1}^{n} (p_i - q_i)^2}'}</M>, 'Default; straight-line distance for continuous features.'],
          ['Manhattan (L1)', <M>{'d(p,q) = \\sum_{i=1}^{n} |p_i - q_i|'}</M>, 'Grid-like movement; less sensitive to a single large difference.'],
          ['Minkowski', <M>{'d(p,q) = \\left(\\sum_{i=1}^{n} |p_i - q_i|^r\\right)^{1/r}'}</M>, 'Generalises both: r = 1 Manhattan, r = 2 Euclidean.'],
          ['Hamming', 'number of positions that differ', 'Categorical or binary features.'],
        ]}
      />
      <Note kind="warn" title="Always scale the features">
        Distances are dominated by features with large ranges. If income is in rupees (0–10,00,000) and age in years (18–70), age barely
        affects the distance. Standardise or min–max scale every feature before running k-NN (Module 3 shows this in action).
      </Note>

      <H3>Choosing k</H3>
      <ul>
        <li>
          <strong>Small k</strong> (k = 1): very flexible, follows every training point, sensitive to noise: <em>overfitting</em>, high
          variance.
        </li>
        <li>
          <strong>Large k</strong>: smooth boundaries, ignores local structure: <em>underfitting</em>, high bias. With k = n, every prediction
          is the majority class.
        </li>
        <li>
          For binary problems use an <strong>odd k</strong> to avoid voting ties. A common starting point is <M>{'k \\approx \\sqrt{n}'}</M>;
          the best k is found with cross-validation.
        </li>
        <li>
          <strong>Weighted k-NN</strong> weights each neighbour’s vote by <M>{'1/d'}</M>, so closer neighbours count more and ties become rare.
        </li>
      </ul>

      <H2>Worked example: classify (5, 5) (Q11)</H2>
      <Table
        head={['Point', 'X', 'Y', 'Class', 'Distance to (5, 5)', 'Rank']}
        numeric={[1, 2, 4, 5]}
        rows={[
          ['P3', 4, 6, 'B', '√(1 + 1) = 1.414', 1],
          ['P5', 6, 4, 'A', '√(1 + 1) = 1.414', 2],
          ['P4', 5, 7, 'B', '√(0 + 4) = 2.000', 3],
          ['P6', 7, 5, 'B', '√(4 + 0) = 2.000', 4],
          ['P2', 3, 3, 'A', '√(4 + 4) = 2.828', 5],
          ['P1', 2, 4, 'A', '√(9 + 1) = 3.162', 6],
        ]}
      />
      <ul>
        <li>
          <strong>k = 4</strong>: neighbours P3 (B), P5 (A), P4 (B), P6 (B) → B wins 3 to 1. Choosing an even k <em>could</em> have produced a
          2–2 tie, but here it does not.
        </li>
        <li>
          <strong>k = 3</strong>: P3 (B), P5 (A), and then P4 and P6 are tied at distance 2. Both are B, so either way the vote is B 2–1.
        </li>
        <li>
          <strong>k = 5</strong>: B, A, B, B, A → B wins 3 to 2.
        </li>
      </ul>
      <p>
        <strong>Conclusion:</strong> the prediction is <strong>class B</strong> for k = 3, 4 and 5. Odd values of k guarantee no tie in a
        two-class vote; even values (k = 2 gives 1–1, k = 6 gives 3–3) can tie and then need a tie-break rule such as distance weighting or the
        nearest neighbour’s class.
      </p>
      <SolverLink to="knn">Solve any k-NN problem step by step</SolverLink>

      <H2>k-NN for regression</H2>
      <MB>{'\\hat{y}(x) = \\frac{1}{k} \\sum_{i \\in N_k(x)} y_i'}</MB>
      <KNNRegressionFigure />

      <H2>Strengths, weaknesses and parameters</H2>
      <Compare
        cols={[
          {
            title: 'Strengths',
            items: ['Very easy to understand and implement.', 'No training phase; new data can be added instantly.', 'Naturally handles multiclass problems.', 'Makes no assumption about the shape of the boundary.', 'Reasonable baseline before trying complex models.'],
          },
          {
            title: 'Weaknesses',
            items: [
              'Prediction is slow for large training sets: O(n·d) distance computations per query (KD-trees or ball trees help).',
              'Needs all training data in memory.',
              'Sensitive to irrelevant features and to feature scaling.',
              'Performs badly in high dimensions (curse of dimensionality) and on sparse data.',
            ],
          },
        ]}
      />
      <p>
        In scikit-learn the two important parameters are the number of neighbours (<code>n_neighbors</code>) and the distance metric; Euclidean
        distance with 3 or 5 neighbours often works well.
      </p>
      <Code title="knn.py">{`
from sklearn.neighbors import KNeighborsClassifier
import numpy as np

X = np.array([[2, 4], [3, 3], [4, 6], [5, 7], [6, 4], [7, 5]])
y = np.array(["A", "A", "B", "B", "A", "B"])

for k in (3, 4, 5):
    knn = KNeighborsClassifier(n_neighbors=k)      # Euclidean by default
    knn.fit(X, y)                                  # just stores the data
    print(k, knn.predict([[5, 5]]))                # -> ['B'] each time
`}</Code>

      <H2>Writing it in the exam</H2>
      <Answer q="Explain how k-Nearest Neighbours works for classification problems. (Q3)" marks={10}>
        <p>
          Definition (instance-based, lazy), the four steps, the Euclidean distance formula, a sketch with a query point and a circle enclosing
          k = 3 neighbours, the effect of k (small → overfit, large → underfit, odd to avoid ties), the need for feature scaling, and a
          strengths/weaknesses list. A short worked example (like the (5, 5) problem) earns full marks.
        </p>
      </Answer>

      <KeyPoints>
        <li>k-NN stores the training data and predicts from the k closest points: majority vote or mean.</li>
        <li>Euclidean distance √Σ(pᵢ − qᵢ)² is the default; scale features first.</li>
        <li>Small k overfits (jagged boundary); large k underfits (over-smooth). Use odd k for binary problems.</li>
        <li>No training cost, but expensive predictions and poor performance in high dimensions.</li>
        <li>(5, 5) is classified B for k = 3, 4, 5.</li>
      </KeyPoints>
    </>
  );
}
