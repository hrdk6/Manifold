import { M, MB } from '../../components/Math';
import { Answer, Code, H2, H3, KeyPoints, Note, SolverLink, Table } from '../../components/prose';
import { fx } from '../../lib/fmt';
import { logisticFit } from '../../lib/supervised';
import { LinearClassifierFigure, LogisticFigure } from '../../viz/m2b';

export default function Logistic() {
  const slides = logisticFit([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => [v]), [0, 0, 0, 0, 1, 1, 1, 1, 1, 1], 1);
  const q14 = logisticFit([[2], [5]], [0, 1], 1);
  return (
    <>
      <p>
        Despite its name, logistic regression is a <strong>classification</strong> algorithm. It models the probability that an input belongs
        to the positive class, which makes it simple, interpretable and efficient, and the standard baseline for binary classification. It is
        also the first of the linear classifiers, which separate classes with a line, plane or hyperplane.
      </p>

      <H2>From a line to a probability</H2>
      <p>
        Linear regression outputs any real number, but a probability must lie between 0 and 1. Logistic regression computes the same linear
        score and squashes it with the <span className="term">sigmoid</span> (logistic) function:
      </p>
      <MB>{'z = w_1x_1 + \\dots + w_px_p + b \\qquad P(y = 1 \\mid x) = \\sigma(z) = \\frac{1}{1 + e^{-z}}'}</MB>
      <p>
        <M>{'\\sigma(0) = 0.5'}</M>, large positive z gives probabilities near 1, large negative z near 0. Predict the positive class when{' '}
        <M>{'P \\geq 0.5'}</M>, which is exactly when <M>{'z \\geq 0'}</M>: the <strong>decision boundary</strong> <M>{'w \\cdot x + b = 0'}</M>{' '}
        is linear.
      </p>
      <H3>Log-odds</H3>
      <p>Rearranging shows what the linear part actually models: the logarithm of the odds.</p>
      <MB>{'\\ln \\frac{P(y=1 \\mid x)}{1 - P(y=1 \\mid x)} = w \\cdot x + b'}</MB>
      <p>
        So a weight <M>{'w_j'}</M> is the change in log-odds for a one-unit increase in <M>{'x_j'}</M>, and <M>{'e^{w_j}'}</M> is the{' '}
        <strong>odds ratio</strong>: the factor by which the odds are multiplied. A positive weight raises the probability of the positive
        class; a negative weight lowers it.
      </p>

      <LogisticFigure />

      <H2>Training: maximum likelihood and log-loss</H2>
      <p>
        The parameters are chosen to make the observed labels as probable as possible (maximum likelihood), which is the same as minimising
        the <span className="term">log-loss</span> (binary cross-entropy):
      </p>
      <MB>{'J(w, b) = -\\frac{1}{n} \\sum_{i=1}^{n} \\Big[ y_i \\ln p_i + (1 - y_i) \\ln (1 - p_i) \\Big], \\quad p_i = \\sigma(w \\cdot x_i + b)'}</MB>
      <p>
        A confident wrong prediction (p = 0.99 when y = 0) is penalised heavily, ln(0.01) ≈ −4.6. There is no closed-form solution, so the cost
        is minimised by gradient descent (or Newton’s method). Pleasingly, the gradient has the same form as for linear regression:
      </p>
      <MB>{'\\frac{\\partial J}{\\partial w_j} = \\frac{1}{n} \\sum_{i} (p_i - y_i)\\, x_{ij}'}</MB>

      <H3>Regularisation and C</H3>
      <p>
        scikit-learn’s <code>LogisticRegression</code> applies L2 regularisation by default. Its strength is controlled by <strong>C</strong>,
        the <em>inverse</em> of α: high C means less regularisation (fit the training data as well as possible), low C means stronger
        regularisation (coefficients pushed toward zero, a smoother boundary that tries to fit the majority of points).
      </p>
      <LinearClassifierFigure />
      <Note kind="tip">
        Linear support vector machines (<code>LinearSVC</code>) produce the same kind of straight boundary but optimise a different loss (hinge
        loss). Both are linear classifiers; their boundaries usually look very similar.
      </Note>

      <H2>Worked example: hours studied → pass (slides Ex. 1, Q14)</H2>
      <p>
        With hours 1–10 and results 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, the classes are perfectly separable between 4 and 5 hours. Unregularised
        maximum likelihood would push the weight to infinity (a vertical step). scikit-learn’s default (C = 1) gives a finite model:
      </p>
      <MB>{`z = ${fx(slides.w[0], 3)} + ${fx(slides.w[1], 3)}\\,x \\qquad \\text{boundary: } x = ${fx(-slides.w[0] / slides.w[1], 2)} \\text{ hours}`}</MB>
      <Table
        head={['Hours', '1', '3', '4', '4.5', '5', '7', '10']}
        rows={[['P(pass)', ...[1, 3, 4, 4.5, 5, 7, 10].map((h) => fx(slides.prob([h]), 3))]]}
      />
      <p>
        <strong>Interpretation:</strong> the coefficient {fx(slides.w[1], 3)} means each additional hour multiplies the odds of passing by{' '}
        e<sup>{fx(slides.w[1], 3)}</sup> ≈ {fx(Math.exp(slides.w[1]), 2)}. The intercept {fx(slides.w[0], 2)} is the log-odds of passing after
        zero hours (probability {fx(slides.prob([0]), 4)}).
      </p>
      <p>
        For the two-point version in Q14 (2 hours → No, 5 hours → Yes) the same procedure gives z = {fx(q14.w[0], 3)} + {fx(q14.w[1], 3)}x, a
        boundary at {fx(-q14.w[0] / q14.w[1], 2)} hours (exactly between the two examples, by symmetry). With only two points the coefficients
        mostly reflect the regularisation, which is the honest point to make in the exam.
      </p>
      <SolverLink to="logistic">Fit logistic regression to your own data</SolverLink>

      <H2>Multiclass: one-vs-rest</H2>
      <p>
        Many linear classifiers are binary by nature. The one-vs-rest approach trains one binary model per class (that class versus all others)
        and predicts the class whose model gives the highest score. Each class gets its own coefficient vector and intercept.
      </p>

      <H2>k-NN versus logistic regression (Q16)</H2>
      <Table
        head={['', 'k-NN', 'Logistic regression']}
        rows={[
          ['Model', 'None; stores the data (non-parametric)', 'A weight per feature plus a bias (parametric)'],
          ['Decision boundary', 'Any shape, follows local structure', 'Linear (unless features are transformed)'],
          ['Training cost', 'None', 'Iterative optimisation, but cheap'],
          ['Prediction cost', 'High: distances to every training point', 'Very low: one dot product'],
          ['Memory', 'Whole training set', 'Just the coefficients'],
          ['Probabilities', 'Vote fractions (coarse)', 'Smooth, calibrated-ish probabilities'],
          ['Interpretability', 'By example (“similar to these cases”)', 'Coefficients and odds ratios'],
          ['High dimensions', 'Suffers from the curse of dimensionality', 'Works well, especially with regularisation'],
          ['Best when', 'Small data, complex boundary, low dimension', 'Large data, many features, roughly linear separation'],
        ]}
      />

      <Code title="logistic_regression.py">{`
import numpy as np
from sklearn.linear_model import LogisticRegression

hours = np.arange(1, 11).reshape(-1, 1)
passed = np.array([0, 0, 0, 0, 1, 1, 1, 1, 1, 1])

clf = LogisticRegression(C=1.0)          # L2-regularised by default
clf.fit(hours, passed)
w, b = clf.coef_[0][0], clf.intercept_[0]
print("w =", w, "b =", b, "odds ratio =", np.exp(w))
print(clf.predict_proba([[4.5]]))        # [[P(fail), P(pass)]]
print(clf.predict([[3], [6]]))           # [0 1]
`}</Code>

      <H2>Writing it in the exam</H2>
      <Answer q="Build a logistic regression model on the given dataset and interpret the learned coefficients. (Q14)" marks={10}>
        <p>
          Write the model and sigmoid, the log-odds form, and the log-loss being minimised. State the fitted coefficients (or explain that with
          separable data an L2 penalty is needed for a finite solution), compute P(pass) for one or two inputs, give the decision boundary
          x = −b/w, and interpret w as a change in log-odds and e<sup>w</sup> as an odds ratio.
        </p>
      </Answer>

      <KeyPoints>
        <li>Logistic regression is a linear classifier: P(y = 1 | x) = σ(w·x + b).</li>
        <li>The linear part models the log-odds; e^w is the odds ratio per unit increase of a feature.</li>
        <li>Trained by minimising log-loss (maximum likelihood), with no closed form.</li>
        <li>C is inverse regularisation strength: small C → simpler model.</li>
        <li>Fast to predict and interpretable; k-NN is more flexible but slow and memory-hungry.</li>
      </KeyPoints>
    </>
  );
}
