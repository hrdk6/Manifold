import { M, MB } from '../../components/Math';
import { Answer, Code, Compare, Def, H2, H3, KeyPoints, Note, SolverLink, Table } from '../../components/prose';
import { BinningFigure, WaveBinningFigure } from '../../viz/m4';

export default function Binning() {
  return (
    <>
      <p>
        The best representation of a feature depends on the model that will use it. Binning, also called discretisation, turns a continuous
        feature into a categorical one by cutting its range into intervals. It can dramatically improve linear models, does little for trees,
        and comes with real costs. All three points are examined.
      </p>

      <H2>What binning is</H2>
      <Def term="Binning (discretisation)">
        Dividing a continuous variable into a set of discrete, non-overlapping intervals (bins) and replacing each value with the bin it falls
        in, often as a label or a one-hot encoded indicator.
      </Def>
      <p>
        Examples: ages 23, 25, 28, 30, 35, 38, 42 become 20–29, 20–29, 20–29, 30–39, 30–39, 30–39, 40–49. Income brackets, temperature ranges
        and grade bands are all bins.
      </p>

      <H2>Equal-width versus equal-frequency</H2>
      <Compare
        cols={[
          {
            title: 'Equal-width binning',
            items: [
              <>
                Divide the range into k intervals of the same width <M>{'w = \\frac{\\max - \\min}{k}'}</M>.
              </>,
              'Simple, easy to interpret.',
              'Suits roughly uniform data.',
              'Skewed data: most points crowd into a few bins, others are nearly empty; sensitive to outliers.',
            ],
          },
          {
            title: 'Equal-frequency (quantile) binning',
            items: [
              'Sort the data and cut it so each bin holds about n/k points.',
              'Bin edges are quantiles; bins are narrow where data is dense.',
              'Suits non-uniform, skewed data; robust to outliers.',
              'Bin widths vary, so ranges are less intuitive; ties can make equal counts impossible.',
            ],
          },
        ]}
      />
      <BinningFigure />

      <H3>Worked example: three equal-width bins for Age (Q17)</H3>
      <p>Age = [18, 25, 35, 45, 55, 65].</p>
      <MB>{'w = \\frac{65 - 18}{3} = \\frac{47}{3} = 15.67'}</MB>
      <Table
        head={['Bin', 'Range', 'Label', 'Ages']}
        rows={[
          ['1', '18 – 33.67', 'Young', '18, 25'],
          ['2', '33.67 – 49.33', 'Middle-aged', '35, 45'],
          ['3', '49.33 – 65', 'Senior', '55, 65'],
        ]}
      />
      <p>Transformed feature: [Young, Young, Middle-aged, Middle-aged, Senior, Senior], or one-hot encoded as three binary columns.</p>
      <Note kind="tip" title="The slides’ example, corrected">
        For ages 18–75 with 3 bins the width is 57/3 = 19, so the edges are 18–37, 37–56 and 56–75 (the slide prints 36 and 54). The
        assignment of [18, 22, 35], [45, 52] and [60, 75] is the same either way. Equal-frequency on the sorted list [18, 22, 35, 45, 52, 60,
        75] gives 7/3 ≈ 2.33 per bin: [18, 22, 35], [45, 52], [60, 75].
      </Note>

      <H3>Equal-frequency binning of a skewed variable (Q18)</H3>
      <p>Income (₹ thousands) = [12, 15, 18, 20, 22, 25, 30, 40, 120, 500], five bins:</p>
      <Table
        head={['Strategy', 'Bins and counts']}
        rows={[
          ['Equal width (w = 97.6)', '12–109.6: 8 people; 109.6–207.2: 1; 207.2–304.8: 0; 304.8–402.4: 0; 402.4–500: 1'],
          ['Equal frequency (2 per bin)', '[12, 15], [18, 20], [22, 25], [30, 40], [120, 500]'],
        ]}
      />
      <p>
        Equal-width binning reproduces the skew (eight people in one bin, empty bins in the middle). Equal-frequency binning spreads people
        evenly, so the binned feature is effectively the person’s <em>rank</em> group: the extreme incomes of 120 and 500 no longer distort
        anything; they simply share the top bin. That is how quantile binning addresses skewness and outliers.
      </p>
      <SolverLink to="binning">Bin any list both ways</SolverLink>

      <H2>Binning, linear models and trees</H2>
      <p>
        A linear model on a single feature can only fit a straight line. Binning that feature and one-hot encoding the bins gives the linear
        model one coefficient per bin, so it can fit a different constant in each interval: a step function. This makes it far more flexible.
      </p>
      <WaveBinningFigure />
      <Table
        head={['', 'Linear regression on binned features', 'Decision tree regression']}
        rows={[
          ['Flexibility', 'One constant per bin (plus a single global slope if the original feature is added)', 'Learns its own split points; non-linear and piecewise constant'],
          ['Split points', 'Fixed in advance by the binning', 'Chosen from data to reduce error'],
          ['Prediction shape', 'Step function (or parallel line segments)', 'Step function'],
          ['Outliers', 'Sensitive (global fit)', 'More robust (local partitions)'],
          ['Interpretation', 'A coefficient per bin', 'If–then rules'],
          ['Benefit of binning', 'Large: adds non-linearity', 'Little: trees already bin internally'],
        ]}
      />
      <H3>Linear models versus trees on non-linear relationships (Q6)</H3>
      <p>
        A linear model represents the target as a weighted sum <M>{'\\hat{y} = \\sum w_j x_j + b'}</M>, so its prediction changes at a constant
        rate with each feature. It captures non-linearity only if we engineer features for it (bins, polynomials, interactions, transforms).
        A decision tree partitions the feature space with if–then splits and predicts a constant in each region, so it captures non-linear and
        interaction effects automatically, at the cost of blocky predictions, no extrapolation and higher variance.
      </p>

      <H2>Advantages and limitations of binning (SEE ’25 7b, Q5)</H2>
      <Compare
        cols={[
          {
            title: 'Advantages',
            items: [
              'Simplifies models and makes them easier to explain to non-specialists.',
              'Reduces the effect of outliers and small measurement errors (smoothing).',
              'Lets linear models capture non-linear relationships.',
              'Can stabilise models by reducing variability in feature values.',
              'Handles missing values naturally (a separate “missing” bin).',
              'Easy to communicate and visualise; supports segmentation (age groups, income brackets).',
              'Reduces the number of distinct values: compression and speed.',
            ],
          },
          {
            title: 'Limitations',
            items: [
              'Loss of information: values within a bin become indistinguishable.',
              'Bin edges are arbitrary and may not match the data’s natural structure.',
              'Boundary effects: 33.6 and 33.7 can fall in different bins and be treated very differently.',
              'Discretisation bias if bins are chosen badly.',
              'Too many fine bins add features and risk overfitting; too few lose signal.',
              'Breaks continuity, which hurts models that benefit from smooth inputs.',
              'Little or no benefit for tree-based models.',
            ],
          },
        ]}
      />

      <Code title="binning.py">{`
import numpy as np
import pandas as pd
from sklearn.preprocessing import KBinsDiscretizer

age = pd.Series([18, 25, 35, 45, 55, 65])
print(pd.cut(age, bins=3, labels=["Young", "Middle-aged", "Senior"]))   # equal width
print(pd.qcut(age, q=3, labels=["Low", "Mid", "High"]))                 # equal frequency

kb = KBinsDiscretizer(n_bins=10, strategy="uniform", encode="onehot-dense")
X_binned = kb.fit_transform(X)       # then fit LinearRegression on X_binned
print(kb.bin_edges_)
`}</Code>

      <H2>Writing it in the exam</H2>
      <Answer q="Compare and contrast the advantages and limitations of binning continuous variables in predictive modelling." marks={10} src="SEE ’25 7b">
        <p>
          Define binning with a one-line example; describe equal-width and equal-frequency briefly; then two columns of at least five advantages
          and five limitations, each with a short example (outlier smoothing, boundary effect, information loss). Finish with when to use it:
          valuable for linear models on non-linear relationships, unnecessary for trees.
        </p>
      </Answer>

      <KeyPoints>
        <li>Binning turns a continuous feature into intervals (bins).</li>
        <li>Equal width: (max − min)/k. Equal frequency: about n/k points per bin, robust to skew and outliers.</li>
        <li>Age [18…65] in 3 equal-width bins: width 15.67, bins Young / Middle-aged / Senior with 2 ages each.</li>
        <li>Binning lets linear models fit step functions; trees gain little from it.</li>
        <li>Trade-off: interpretability and robustness versus information loss and arbitrary edges.</li>
      </KeyPoints>
    </>
  );
}
