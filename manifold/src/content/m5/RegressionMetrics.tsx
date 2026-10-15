import { M, MB } from '../../components/Math';
import { Answer, Code, H2, H3, KeyPoints, Note, SolverLink, Table } from '../../components/prose';
import { fx } from '../../lib/fmt';
import { regressionMetrics } from '../../lib/metrics';
import { RegressionMetricsFigure } from '../../viz/m5';

export default function RegressionMetrics() {
  const y = [3, 5, 7, 9, 11];
  const p = [2.5, 5.5, 6.5, 9.5, 12];
  const r = regressionMetrics(y, p);
  return (
    <>
      <p>
        For regression, predictions are numbers, so we measure how far they are from the true values. Each metric aggregates the residuals{' '}
        <M>{'e_i = y_i - \\hat{y}_i'}</M> differently, and each answers a slightly different question.
      </p>

      <H2>The metrics</H2>
      <Table
        head={['Metric', 'Formula', 'Units', 'Notes']}
        rows={[
          ['MAE', <M>{'\\frac{1}{n}\\sum |y_i - \\hat{y}_i|'}</M>, 'Same as y', 'Average size of an error; robust to outliers; easy to explain'],
          ['MSE', <M>{'\\frac{1}{n}\\sum (y_i - \\hat{y}_i)^2'}</M>, 'y squared', 'Squares penalise big errors heavily; smooth, used as a training loss'],
          ['RMSE', <M>{'\\sqrt{\\text{MSE}}'}</M>, 'Same as y', 'Typical magnitude of an error, still sensitive to large errors'],
          ['R²', <M>{'1 - \\frac{\\sum (y_i - \\hat{y}_i)^2}{\\sum (y_i - \\bar{y})^2}'}</M>, 'Unitless', 'Share of variance explained; 1 perfect, 0 = predicting the mean, can be negative'],
          ['MAPE', <M>{'\\frac{1}{n}\\sum \\left|\\frac{y_i - \\hat{y}_i}{y_i}\\right|'}</M>, 'Percent', 'Relative error; undefined when y = 0'],
        ]}
      />
      <RegressionMetricsFigure />

      <H2>Significance of each (Q11)</H2>
      <ul>
        <li>
          <strong>R²</strong> is the default score of scikit-learn regressors. It compares the model with the trivial predictor ȳ and is easy to
          communicate as “the model explains 92% of the variation”, but it says nothing about the size of errors in real units, always rises when
          features are added on the training data, and depends on the variance of the test set.
        </li>
        <li>
          <strong>MAE</strong> tells you how wrong you are on average in the target’s own units (e.g. “±₹1.8 lakh”), and treats all errors
          linearly, so it is robust when occasional large errors are acceptable.
        </li>
        <li>
          <strong>RMSE</strong> is also in the target’s units but squares errors before averaging, so one large error raises it a lot. Use it when
          big mistakes are disproportionately bad. RMSE ≥ MAE always; a large gap signals a few large errors.
        </li>
      </ul>

      <H3>Worked example</H3>
      <Table
        head={['y', 'ŷ', 'e = y − ŷ', '|e|', 'e²', '(y − ȳ)²']}
        numeric={[0, 1, 2, 3, 4, 5]}
        rows={y.map((v, i) => [v, p[i], fx(r.res[i], 2), fx(Math.abs(r.res[i]), 2), fx(r.res[i] ** 2, 2), fx((v - r.yb) ** 2, 2)])}
        foot={['ȳ = ' + fx(r.yb, 1), '', '', fx(r.res.reduce((s, e) => s + Math.abs(e), 0), 2), fx(r.sse, 2), fx(r.sst, 2)]}
      />
      <MB>{`\\text{MAE} = \\frac{${fx(r.res.reduce((s, e) => s + Math.abs(e), 0), 2)}}{5} = ${fx(r.mae, 3)} \\quad \\text{MSE} = \\frac{${fx(r.sse, 2)}}{5} = ${fx(r.mse, 3)} \\quad \\text{RMSE} = ${fx(r.rmse, 3)} \\quad R^2 = 1 - \\frac{${fx(r.sse, 2)}}{${fx(r.sst, 2)}} = ${fx(r.r2, 4)}`}</MB>
      <SolverLink to="regmetrics">Compute regression metrics for your own predictions</SolverLink>
      <Note kind="tip">
        Your notes stress that R² on the training data is not evidence of a good model: overfitted models have high R² but predict new data
        poorly. Always compute these metrics on a test set or with cross-validation (scoring="r2", "neg_mean_squared_error", …).
      </Note>

      <Code title="regression_metrics.py">{`
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

y_true = np.array([3, 5, 7, 9, 11])
y_pred = np.array([2.5, 5.5, 6.5, 9.5, 12])
mae = mean_absolute_error(y_true, y_pred)
mse = mean_squared_error(y_true, y_pred)
print(mae, mse, np.sqrt(mse), r2_score(y_true, y_pred))
`}</Code>

      <H2>Writing it in the exam</H2>
      <Answer q="Evaluate a regression model using R², MAE and RMSE; discuss the significance of each. (Q11)" marks={10}>
        <p>
          Give the three formulas, compute them on a small example (as above), and explain what each tells you, its units, its sensitivity to
          outliers and when to prefer it. Conclude that reporting MAE or RMSE alongside R² gives both the relative and the absolute picture.
        </p>
      </Answer>

      <KeyPoints>
        <li>MAE: mean absolute error, robust, in target units.</li>
        <li>MSE: mean squared error, punishes large errors; RMSE brings it back to target units.</li>
        <li>R² = 1 − SSE/SST: share of variance explained; 0 means no better than predicting the mean.</li>
        <li>Report metrics on unseen data; training R² can be inflated by overfitting.</li>
      </KeyPoints>
    </>
  );
}
