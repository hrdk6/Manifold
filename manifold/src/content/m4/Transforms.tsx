import { M, MB } from '../../components/Math';
import { Answer, Code, Compare, Def, H2, H3, KeyPoints, Note, SolverLink, Table } from '../../components/prose';
import { fx } from '../../lib/fmt';
import { mean, skewness, variance } from '../../lib/math';
import { TransformFigure } from '../../viz/m4';

export default function Transforms() {
  const sales = [100, 200, 400, 800];
  const income = [1, 4, 16, 64, 256];
  const ln = (v: number) => Math.log(v);
  const l10 = (v: number) => Math.log10(v);
  return (
    <>
      <p>
        Interactions and polynomials add new features. Another powerful option is to apply a mathematical function to a single feature, such
        as log, square root or exponential. Most models, linear models in particular, work best when each feature (and the target) has a
        roughly Gaussian distribution without extreme values.
      </p>

      <H2>Univariate nonlinear transformations (Q10)</H2>
      <Def term="Univariate nonlinear transformation">
        Applying a non-linear mathematical function to one variable at a time, to reduce skewness, stabilise variance, compress the range or
        make a relationship more linear.
      </Def>
      <Table
        head={['Transform', 'Formula', 'Typical use']}
        rows={[
          ['Log', <M>{'y = \\log(x)'}</M>, 'Strong right skew spanning orders of magnitude: income, population, sales, prices'],
          ['Log1p', <M>{'y = \\log(x + 1)'}</M>, 'Counts containing zeros (log 0 is undefined)'],
          ['Square root', <M>{'y = \\sqrt{x}'}</M>, 'Moderate right skew; count data (Poisson)'],
          ['Reciprocal', <M>{'y = 1/x'}</M>, 'Rates: time per unit ↔ units per time'],
          ['Exponential', <M>{'y = e^{x}'}</M>, 'Reversing a log transform; scaling up'],
          ['Box-Cox / Yeo-Johnson', 'a power λ chosen from the data', 'Automatically finds the best power (sklearn PowerTransformer)'],
          ['sin / cos', 'periodic encoding', 'Cyclic features such as hour of day or month'],
        ]}
      />

      <H2>Skewness and why it matters</H2>
      <p>
        <strong>Skewness</strong> measures the asymmetry of a distribution. Right (positive) skew means a long tail of large values: most points
        are small, a few are huge. Left skew is the mirror image. Skewed features hurt models that assume roughly normal data: the large values
        act like outliers and dominate the fit, and errors are not spread evenly (heteroscedasticity).
      </p>
      <TransformFigure />

      <H2>The log transformation (Q11)</H2>
      <ul>
        <li>
          <strong>Compresses large values</strong> far more than small ones, pulling in the long right tail and making the distribution more
          symmetric.
        </li>
        <li>
          <strong>Stabilises variance</strong> when the spread grows with the mean (heteroscedastic data).
        </li>
        <li>
          <strong>Turns multiplicative relationships into additive ones</strong>: <M>{'\\log(ab) = \\log a + \\log b'}</M>, so constant
          percentage changes become constant differences, which linear models handle well.
        </li>
        <li>
          <strong>Limitations</strong>: only defined for positive values (use log(x + 1) with zeros), and results must be back-transformed (e^y)
          for interpretation.
        </li>
      </ul>

      <H3>Worked example: Sales = [100, 200, 400, 800] (SEE ’25 8a)</H3>
      <Table
        head={['Sales', 'ln(Sales)', 'log₁₀(Sales)', 'Ratio to previous', 'Step in ln']}
        numeric={[0, 1, 2, 3, 4]}
        rows={sales.map((v, i) => [v, fx(ln(v), 4), fx(l10(v), 4), i ? `× ${v / sales[i - 1]}` : '—', i ? fx(ln(v) - ln(sales[i - 1]), 4) : '—'])}
      />
      <p>
        The raw values double each time, so the gaps grow: 100, 200, 400. After the log, every step is the same, ln 2 = 0.6931 (or log₁₀ 2 =
        0.3010): the exponential growth has become a straight line. The spread shrinks from a range of 700 (and a max/min ratio of 8) to a range
        of {fx(ln(800) - ln(100), 4)} in natural-log units. Skewness falls from {fx(skewness(sales), 3)} to {fx(skewness(sales.map(ln)), 3)}{' '}
        (perfectly symmetric). A model now sees evenly spaced values, the largest value no longer dominates, and a linear model can fit a trend
        that was exponential.
      </p>

      <H2>Log versus square root (Q12, Q22)</H2>
      <p>Income = [1, 4, 16, 64, 256]: each value is four times the previous one.</p>
      <Table
        head={['Income', '√Income', 'ln(Income)', 'log₂(Income)']}
        numeric={[0, 1, 2, 3]}
        rows={income.map((v) => [v, fx(Math.sqrt(v), 3), fx(ln(v), 4), fx(Math.log2(v), 3)])}
        foot={['', '', '', '']}
      />
      <Table
        head={['Statistic', 'Raw', 'Square root', 'Log (ln)']}
        numeric={[1, 2, 3]}
        rows={[
          ['Mean', fx(mean(income), 2), fx(mean(income.map(Math.sqrt)), 2), fx(mean(income.map(ln)), 4)],
          ['Variance (n − 1)', fx(variance(income), 2), fx(variance(income.map(Math.sqrt)), 2), fx(variance(income.map(ln)), 4)],
          ['Coefficient of variation', fx(Math.sqrt(variance(income)) / mean(income), 3), fx(Math.sqrt(variance(income.map(Math.sqrt))) / mean(income.map(Math.sqrt)), 3), '—'],
          ['Skewness', fx(skewness(income), 3), fx(skewness(income.map(Math.sqrt)), 3), fx(skewness(income.map(ln)), 3)],
        ]}
      />
      <p>
        <strong>Analysis.</strong> The square root halves the exponent (1, 2, 4, 8, 16): gaps still double, so the distribution is less skewed
        but still right-skewed. The log makes the values exactly evenly spaced (0, 1.386, 2.773, 4.159, 5.545 in ln; 0, 2, 4, 6, 8 in log₂):
        skewness is removed completely and the variance becomes tiny relative to the original. For data that grows multiplicatively the log is
        the variance-stabilising transform; the square root suits milder skew such as count data, and it works with zeros, unlike the log.
      </p>
      <Compare
        cols={[
          { title: 'Square root', items: ['Milder compression.', 'Defined at 0.', 'Good for counts (stabilises Poisson variance).', 'Easier to interpret than log.'] },
          { title: 'Log', items: ['Stronger compression; handles values over many orders of magnitude.', 'Needs x > 0 (or log1p).', 'Makes multiplicative effects additive.', 'Best for strongly right-skewed data like income and sales.'] },
        ]}
      />
      <SolverLink to="transform">Transform any variable and compare</SolverLink>

      <H3>Which models benefit?</H3>
      <p>
        Linear models and neural networks benefit most, since they are sensitive to the scale and distribution of each feature. Tree-based
        models do not care: a monotone transform leaves the ordering of values, and therefore every possible split, unchanged. Transforming the{' '}
        <em>target</em> of a regression (e.g. predicting log(price)) is also common; remember to transform predictions back.
      </p>
      <Note kind="tip">
        In Müller and Guido’s count-data example, Ridge regression scores R² = 0.622 on the raw features and 0.875 after log(x + 1). The
        figure above reproduces the same effect on similar synthetic data.
      </Note>
      <MB>{'x_{\\text{new}} = \\log(x + 1) \\qquad \\Longleftrightarrow \\qquad x = e^{x_{\\text{new}}} - 1'}</MB>

      <Code title="transforms.py">{`
import numpy as np

sales = np.array([100, 200, 400, 800])
print(np.log(sales))      # [4.605 5.298 5.991 6.685]  equal steps of ln 2
print(np.log10(sales))    # [2.    2.301 2.602 2.903]

income = np.array([1, 4, 16, 64, 256])
print(np.sqrt(income), np.var(np.sqrt(income), ddof=1))
print(np.log(income), np.var(np.log(income), ddof=1))

X_train_log = np.log1p(X_train)   # log(x + 1), safe for zero counts
`}</Code>

      <H2>Writing it in the exam</H2>
      <Answer q="Apply a log transformation to Sales = [100, 200, 400, 800] and explain how it handles skewed data." marks={10} src="SEE ’25 8a">
        <p>
          Define skewness and log transformation (2); compute the table of ln (and/or log₁₀) values (3); point out the constant step ln 2 and the
          collapse of the range and ratio (2); explain the benefits: symmetry, variance stabilisation, multiplicative → additive, reduced outlier
          influence (2); note the limitations (positive values, back-transformation) and give the NumPy line (1).
        </p>
      </Answer>

      <KeyPoints>
        <li>Univariate transforms apply a function (log, √, exp) to one feature at a time.</li>
        <li>Log compresses large values, removes right skew, stabilises variance and linearises multiplicative growth.</li>
        <li>Sales [100…800] → ln: 4.605, 5.298, 5.991, 6.685, equally spaced by ln 2.</li>
        <li>√ is milder and works at 0; log is stronger and needs positive values (or log1p).</li>
        <li>Linear models benefit; trees are unaffected by monotone transforms.</li>
      </KeyPoints>
    </>
  );
}
