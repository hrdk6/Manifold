import { MB } from '../../components/Math';
import { Answer, Code, Compare, Def, H2, H3, KeyPoints, Note, Table } from '../../components/prose';
import { ScalingFigure, TrainTestScalingFigure } from '../../viz/m3';

export default function Scaling() {
  return (
    <>
      <p>
        Many algorithms, including SVMs, neural networks, k-NN, k-means and PCA, are very sensitive to the scale of the data. Preprocessing
        converts raw data into a form these algorithms can use well. This lesson covers the preprocessing toolkit from your notes, with the
        emphasis the SEE gave it: feature scaling and its effect on k-means.
      </p>

      <H2>Why preprocessing matters</H2>
      <p>
        Preprocessing means cleaning and transforming raw data so that it is consistent, complete and suitable for a model. It handles
        real-world problems (missing values, inconsistent formats, irrelevant features), helps models converge faster and reach better accuracy,
        improves generalisation, and reduces bias from outliers or badly scaled features. Skipping it leads to poor performance, misleading
        results and slow or failed optimisation.
      </p>

      <H3>Handling missing data</H3>
      <Table
        head={['Technique', 'How', 'When / risk']}
        rows={[
          ['Removal', 'Drop rows or columns with missing values', 'Only when few values are missing at random; otherwise loses information'],
          ['Mean / median imputation', 'Replace with the column mean (or median)', 'Simple; median is robust to outliers; shrinks variance'],
          ['Mode imputation', 'Replace with the most frequent value', 'Categorical features'],
          ['k-NN imputation', 'Average the value from the most similar rows', 'Uses relationships between features'],
          ['Model-based', 'Predict the missing value with a regression model', 'Most accurate, most effort'],
          ['Missing indicator', 'Add a binary column “was missing”', 'When missingness itself is informative'],
        ]}
      />
      <H3>Encoding categorical data</H3>
      <p>
        Most algorithms need numbers: label encoding, one-hot encoding, ordinal encoding, frequency encoding and target encoding. These are
        covered in detail in Module 4.
      </p>

      <H2>Feature scaling</H2>
      <Def term="Feature scaling">
        Transforming numerical features to a similar range or distribution so that each contributes proportionately to the model and no feature
        dominates simply because of its units.
      </Def>
      <p>
        If one feature is income in rupees (up to lakhs) and another is age in years, any algorithm based on distances or on gradient steps is
        dominated by income. Scaling fixes that.
      </p>

      <H3>The four scalers</H3>
      <Table
        head={['Scaler', 'Formula', 'Result', 'Use when']}
        rows={[
          ['StandardScaler (standardisation, z-score)', <MB key="a">{"x' = \\frac{x - \\mu}{\\sigma}"}</MB>, 'Each feature has mean 0, standard deviation 1; range unbounded', 'Default for most models; roughly Gaussian features; SVM, PCA, logistic regression'],
          ['MinMaxScaler (normalisation)', <MB key="b">{"x' = \\frac{x - x_{\\min}}{x_{\\max} - x_{\\min}}"}</MB>, 'Each feature lies exactly in [0, 1]', 'Bounded inputs needed (neural nets, images); no big outliers'],
          ['RobustScaler', <MB key="c">{"x' = \\frac{x - \\text{median}}{Q_3 - Q_1}"}</MB>, 'Centred on the median, scaled by the inter-quartile range', 'Data with outliers'],
          ['Normalizer', <MB key="d">{"x' = \\frac{x}{\\lVert x \\rVert}"}</MB>, 'Each row (sample) has length 1', 'Only the direction matters (text vectors, angles)'],
        ]}
      />
      <Note kind="warn">
        The first three scale each <em>feature</em> (column) independently; Normalizer scales each <em>sample</em> (row). Mixing these up is a
        common exam slip.
      </Note>

      <H3>Normalisation versus standardisation (Q4)</H3>
      <Compare
        cols={[
          {
            title: 'Normalisation (min–max)',
            items: [
              'Rescales to a fixed range, usually [0, 1].',
              'Ages 18, 30, 45, 60 → 0, 0.286, 0.643, 1.',
              'Sensitive to outliers: one extreme value squashes the rest.',
              'Keeps the shape of the distribution.',
            ],
          },
          {
            title: 'Standardisation (z-score)',
            items: [
              'Centres at 0 with unit variance; no fixed range.',
              'Marks with mean 60, sd 10: 75 → 1.5, 45 → −1.5.',
              'Less affected by outliers than min–max (but not immune).',
              'Preferred for algorithms that assume centred data (PCA, SVM, regularised models).',
            ],
          },
        ]}
      />

      <H2>Scaling and k-means (SEE ’25 6b)</H2>
      <p>
        k-means assigns each point to the nearest centroid using Euclidean distance, and updates centroids as means. Both steps treat every
        feature as being on the same scale. If one feature’s range is a thousand times larger, the distance is effectively computed on that
        feature alone, and the clusters simply slice along it.
      </p>
      <ScalingFigure />
      <ul>
        <li>
          <strong>Without scaling</strong>, clusters reflect units rather than structure, centroids are pulled along the large-range axis, and
          the result changes if you change units (rupees to lakhs).
        </li>
        <li>
          <strong>With standardisation</strong>, each feature contributes equally, clusters follow the real groups, and results are
          unit-independent.
        </li>
        <li>
          <strong>Outliers</strong>: with MinMaxScaler one outlier compresses everything else; RobustScaler is safer.
        </li>
        <li>The same reasoning applies to k-NN, DBSCAN, hierarchical clustering, PCA and SVMs.</li>
      </ul>

      <H2>Applying scaling correctly</H2>
      <p>
        Fit the scaler on the <strong>training data only</strong>, then use the same transformation on the training and test sets. Fitting
        on the test set (or on all data before splitting) leaks information and distorts the test points.
      </p>
      <TrainTestScalingFigure />
      <Code title="scaling.py">{`
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.cluster import KMeans

X_train, X_test = train_test_split(X, random_state=0)

scaler = StandardScaler()
scaler.fit(X_train)                       # learn mean and std from training data only
X_train_s = scaler.transform(X_train)
X_test_s = scaler.transform(X_test)       # same parameters applied to test data

# shortcut for the training set: scaler.fit_transform(X_train)
kmeans = KMeans(n_clusters=3, n_init=10, random_state=0).fit(X_train_s)
`}</Code>
      <H3>Effect on supervised learning</H3>
      <p>
        On the cancer dataset in Müller and Guido, an SVM’s test accuracy rises from 63% on raw data to 97% after MinMax scaling. Tree-based
        models are the exception: a split on one feature is unaffected by that feature’s scale, so trees and forests need no scaling.
      </p>

      <H3>Practical preprocessing steps</H3>
      <ol>
        <li>Inspect the dataset and handle missing values.</li>
        <li>Encode categorical variables.</li>
        <li>Scale features with the method suited to the model and data.</li>
        <li>Check the effect with exploratory data analysis (and cross-validation).</li>
      </ol>

      <H2>Writing it in the exam</H2>
      <Answer q="Define feature scaling and outline its importance on the k-means clustering algorithm." marks={10} src="SEE ’25 6b">
        <p>
          <strong>Definition (2).</strong> Plus why: features with large ranges dominate distance computations.
        </p>
        <p>
          <strong>Methods (3).</strong> Standardisation and min–max with formulas and a tiny numeric example; mention RobustScaler for outliers.
        </p>
        <p>
          <strong>k-means (4).</strong> Distance-based assignment and mean-based update; a sketch of unscaled data split along the wide axis
          versus scaled data split into the true groups; centroids, convergence and unit-independence.
        </p>
        <p>
          <strong>Good practice (1).</strong> Fit the scaler on training data and apply it to test data.
        </p>
      </Answer>

      <KeyPoints>
        <li>Distance- and gradient-based models need features on comparable scales; trees do not.</li>
        <li>Standardisation: (x − μ)/σ. Min–max: (x − min)/(max − min) into [0, 1]. Robust: median and IQR.</li>
        <li>Normalizer scales rows, not columns.</li>
        <li>Unscaled k-means clusters along the largest-range feature; scaling makes all features count.</li>
        <li>Fit scalers on training data only, then transform both sets.</li>
      </KeyPoints>
    </>
  );
}
