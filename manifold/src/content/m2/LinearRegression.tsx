import { M, MB } from '../../components/Math';
import { Answer, Code, Compare, Def, H2, H3, KeyPoints, Note, SolverLink, Table } from '../../components/prose';
import { fx } from '../../lib/fmt';
import { ols1 } from '../../lib/supervised';
import { GradientDescentFigure, HOURS, LeastSquaresFigure, MARKS, RidgeLassoFigure } from '../../viz/m2a';

export default function LinearRegression() {
  const r = ols1(HOURS, MARKS);
  return (
    <>
      <p>
        Linear models are the workhorses of machine learning: fast to train, fast to predict, easy to interpret, and surprisingly strong when
        there are many features. They make a prediction using a <em>linear function</em> of the input features. This lesson covers linear
        regression, the full hand calculation for simple linear regression (asked in the SEE), how it is fitted by gradient descent, and the
        two regularised variants, Ridge and Lasso.
      </p>

      <H2>The linear model</H2>
      <MB>{'\\hat{y} = w_1 x_1 + w_2 x_2 + \\dots + w_p x_p + b'}</MB>
      <p>
        Here <M>{'x_1 \\dots x_p'}</M> are the features of one data point, <M>{'w'}</M> the weights (coefficients, <code>coef_</code> in
        scikit-learn) and <M>{'b'}</M> the intercept (<code>intercept_</code>). With one feature this is the equation of a line{' '}
        <M>{'\\hat{y} = wx + b'}</M>; with two, a plane; with more, a hyperplane. The model assumes the target is a weighted sum of the
        features, which is a strong (and sometimes wrong) assumption, but with many features linear models can be very powerful.
      </p>

      <H2>Ordinary least squares</H2>
      <Def term="Linear regression (ordinary least squares)">
        Finds the parameters w and b that minimise the mean squared error between predictions and true targets on the training set:
        <MB>{'\\text{MSE} = \\frac{1}{n} \\sum_{i=1}^{n} \\left( y_i - \\hat{y}_i \\right)^2'}</MB>
      </Def>
      <p>
        Squaring makes every error positive and punishes large errors much more than small ones. OLS has no hyperparameters, which is
        convenient, but it also means there is no way to control model complexity.
      </p>

      <LeastSquaresFigure />

      <H3>Simple linear regression formulas</H3>
      <p>
        With a single feature, setting the derivatives of the squared error to zero gives closed-form solutions. Write the line as{' '}
        <M>{'\\hat{y} = a + bx'}</M>:
      </p>
      <MB>{'b = \\frac{S_{xy}}{S_{xx}} = \\frac{\\sum (x_i - \\bar{x})(y_i - \\bar{y})}{\\sum (x_i - \\bar{x})^2} = \\frac{\\sum x_i y_i - \\frac{\\sum x_i \\sum y_i}{n}}{\\sum x_i^2 - \\frac{(\\sum x_i)^2}{n}}'}</MB>
      <MB>{'a = \\bar{y} - b\\,\\bar{x}'}</MB>
      <p>The line always passes through the point of means <M>{'(\\bar{x}, \\bar{y})'}</M>.</p>

      <H2>Worked example: hours studied → marks (SEE ’25 3a)</H2>
      <p>
        <M>{`n = 10,\\; \\bar{x} = ${fx(r.xb, 1)},\\; \\bar{y} = ${fx(r.yb, 1)}`}</M>
      </p>
      <Table
        head={['x (hours)', 'y (marks)', 'x − x̄', 'y − ȳ', '(x − x̄)(y − ȳ)', '(x − x̄)²', 'ŷ', 'y − ŷ']}
        numeric={[0, 1, 2, 3, 4, 5, 6, 7]}
        rows={HOURS.map((x, i) => [
          x,
          MARKS[i],
          fx(r.dx[i], 1),
          fx(r.dy[i], 1),
          fx(r.dx[i] * r.dy[i], 2),
          fx(r.dx[i] ** 2, 2),
          fx(r.pred[i], 2),
          fx(r.res[i], 2),
        ])}
        foot={['Σ 55', 'Σ 759', '0', '0', `Sxy = ${fx(r.sxy, 2)}`, `Sxx = ${fx(r.sxx, 2)}`, '', `SSE = ${fx(r.sse, 2)}`]}
      />
      <MB>{`b = \\frac{${fx(r.sxy, 1)}}{${fx(r.sxx, 1)}} = ${fx(r.b, 4)} \\qquad a = ${fx(r.yb, 1)} - ${fx(r.b, 4)} \\times ${fx(r.xb, 1)} = ${fx(r.a, 4)}`}</MB>
      <MB>{`\\boxed{\\hat{y} = ${fx(r.a, 2)} + ${fx(r.b, 4)}\\,x}`}</MB>
      <p>
        <strong>Interpretation:</strong> each additional hour of study is associated with about {fx(r.b, 2)} more marks, and a student who
        studied zero hours would be predicted to score {fx(r.a, 1)}. For 7.5 hours the prediction is {fx(r.a, 2)} + {fx(r.b, 4)} × 7.5 ={' '}
        {fx(r.a + r.b * 7.5, 2)} marks.
      </p>
      <p>
        <strong>Goodness of fit:</strong> SST = Σ(y − ȳ)² = {fx(r.sst, 1)}, SSE = {fx(r.sse, 2)}, so{' '}
        <M>{`R^2 = 1 - \\frac{SSE}{SST} = ${fx(r.r2, 4)}`}</M>: the line explains about {fx(r.r2 * 100, 1)}% of the variation in marks. MSE ={' '}
        {fx(r.mse, 2)}, RMSE = {fx(r.rmse, 2)}.
      </p>
      <Note kind="warn" title="Look at the residuals">
        The residuals are negative at both ends and positive in the middle: marks rise quickly then flatten (diminishing returns near 100). A
        straight line systematically misses this curve, and extrapolating to 11 hours would predict {fx(r.a + r.b * 11, 1)}, more than the
        maximum mark. Mentioning this shows real understanding; a log or polynomial feature would fit better.
      </Note>
      <Code title="simple_linear_regression.py">{`
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score

hours = np.array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).reshape(-1, 1)   # 2-D: (n_samples, n_features)
marks = np.array([35, 50, 60, 70, 80, 85, 90, 94, 97, 98])

model = LinearRegression()
model.fit(hours, marks)

print("slope b     =", model.coef_[0])        # 6.8545
print("intercept a =", model.intercept_)       # 38.2
pred = model.predict(hours)
print("MSE =", mean_squared_error(marks, pred))
print("R^2 =", r2_score(marks, pred))          # 0.9249
print("7.5 hours ->", model.predict([[7.5]]))

# the same by hand
x, y = hours.ravel(), marks
b = ((x - x.mean()) * (y - y.mean())).sum() / ((x - x.mean()) ** 2).sum()
a = y.mean() - b * x.mean()
`}</Code>
      <SolverLink to="linreg">Solve any simple-regression table step by step</SolverLink>

      <H3>Interpreting coefficients (Q15)</H3>
      <p>
        For house price = b + w₁·size + w₂·location_A + w₃·location_B (location one-hot encoded with one category as the baseline):
      </p>
      <ul>
        <li>
          <strong>w₁</strong> is the expected change in price for one extra unit of size (say one square foot), <em>holding location fixed</em>.
        </li>
        <li>
          <strong>w₂</strong> is the price difference between location A and the baseline location for houses of the same size.
        </li>
        <li>
          <strong>b</strong> is the predicted price of a zero-size house in the baseline location: a mathematical anchor, rarely meaningful by
          itself.
        </li>
        <li>
          The sign gives direction, the magnitude the strength; magnitudes are only comparable between features if the features are on the
          same scale. Correlated features make individual coefficients unstable.
        </li>
      </ul>

      <H2>Fitting by gradient descent</H2>
      <p>
        For large datasets the parameters are found iteratively. Gradient descent repeatedly moves the parameters a small step against the
        gradient of the cost:
      </p>
      <MB>{'J(b_0, b_1) = \\frac{1}{2n} \\sum_{i=1}^{n} (b_0 + b_1 x_i - y_i)^2'}</MB>
      <MB>{'b_0 \\leftarrow b_0 - \\eta \\frac{1}{n} \\sum (\\hat{y}_i - y_i) \\qquad b_1 \\leftarrow b_1 - \\eta \\frac{1}{n} \\sum (\\hat{y}_i - y_i)\\, x_i'}</MB>
      <p>
        The learning rate <M>{'\\eta'}</M> controls step size: too small and convergence is slow, too large and the updates overshoot and
        diverge. This is the same rule as Mitchell’s LMS update in Module 1.
      </p>
      <GradientDescentFigure />

      <H2>Regularisation: Ridge and Lasso</H2>
      <p>
        Regularisation means explicitly restricting a model to avoid overfitting, by adding a penalty on the size of the coefficients to the
        cost function.
      </p>
      <Compare
        cols={[
          {
            title: 'Ridge regression (L2)',
            items: [
              <MB key="r">{'\\min_w \\; \\sum (y_i - \\hat{y}_i)^2 + \\alpha \\sum_j w_j^2'}</MB>,
              'Shrinks all coefficients toward zero; none become exactly zero.',
              'Larger α → simpler model, lower training score, often better generalisation.',
              'α = 0 recovers ordinary least squares.',
            ],
          },
          {
            title: 'Lasso (L1)',
            items: [
              <MB key="l">{'\\min_w \\; \\frac{1}{2n}\\sum (y_i - \\hat{y}_i)^2 + \\alpha \\sum_j |w_j|'}</MB>,
              'Drives some coefficients to exactly zero: automatic feature selection.',
              'Gives sparser, more interpretable models.',
              'Prefer it when you expect only a few features to matter.',
            ],
          },
        ]}
      />
      <RidgeLassoFigure />
      <p>
        In practice Ridge is usually the first choice; Lasso is preferable with many features of which only some are important. ElasticNet
        combines both penalties.
      </p>

      <H2>Writing it in the exam</H2>
      <Answer q="Build a simple linear regression model to predict marks from hours studied, with code." marks={10} src="SEE ’25 3a">
        <p>
          <strong>Model and formulas (2).</strong> ŷ = a + bx, b = Sxy/Sxx, a = ȳ − b x̄.
        </p>
        <p>
          <strong>Table (4).</strong> The deviation table above with column sums, then b = 565.5/82.5 = 6.8545 and a = 75.9 − 6.8545 × 5.5 = 38.2.
        </p>
        <p>
          <strong>Result and evaluation (2).</strong> ŷ = 38.2 + 6.8545x; R² ≈ 0.925; one prediction; a sentence on residuals.
        </p>
        <p>
          <strong>Code (2).</strong> The scikit-learn snippet: reshape to 2-D, fit, read coef_ and intercept_, predict, r2_score.
        </p>
      </Answer>

      <KeyPoints>
        <li>Linear models predict ŷ = w·x + b; with one feature that is a straight line.</li>
        <li>OLS minimises the sum of squared residuals; b = Sxy/Sxx and a = ȳ − b x̄.</li>
        <li>Hours/marks: ŷ = 38.2 + 6.8545x with R² ≈ 0.925.</li>
        <li>Gradient descent finds the same solution iteratively; the learning rate must be chosen carefully.</li>
        <li>Ridge (L2) shrinks coefficients; Lasso (L1) sets some to zero. Larger α means a simpler model.</li>
      </KeyPoints>
    </>
  );
}
