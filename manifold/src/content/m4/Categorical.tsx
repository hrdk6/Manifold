import { Answer, Code, Compare, Def, H2, H3, KeyPoints, Note, SolverLink, Table } from '../../components/prose';
import { EncodingFigure } from '../../viz/m4';

export default function Categorical() {
  return (
    <>
      <p>
        Module 4 is about <em>feature engineering</em>: finding the best way to represent your data for a particular model. This often matters
        more than the choice of algorithm or its parameters. It starts with the most common practical problem: features that are categories,
        not numbers.
      </p>

      <H2>Categorical variables</H2>
      <Def term="Categorical variable">
        A variable whose values are categories or groups from a limited, fixed set rather than measured quantities, such as colour, city,
        product type or education level.
      </Def>
      <Compare
        cols={[
          { title: 'Nominal', items: ['No intrinsic order between categories.', 'Colours (red, blue, green); animal types (dog, cat, bird); workclass.', 'Encode with one-hot (or binary for many categories).'] },
          { title: 'Ordinal', items: ['A clear order, but differences between levels are not necessarily equal.', 'Education (high school < bachelor’s < master’s < PhD); satisfaction (unsatisfied < neutral < satisfied).', 'Encode with ordinal integers in the meaningful order.'] },
        ]}
      />
      <p>
        Linear models, SVMs, neural networks and distance-based methods need numbers. Feeding strings is impossible, and feeding arbitrary
        integers can be actively misleading.
      </p>

      <H2>Encoding methods</H2>
      <Table
        head={['Method', 'How', 'Use when', 'Watch out for']}
        rows={[
          ['One-hot (dummy variables)', 'One 0/1 column per category', 'Nominal features (the default)', 'Many columns for high-cardinality features; dummy-variable trap'],
          ['Label encoding', 'Each category → an integer (0, 1, 2, …)', 'Target labels; tree models', 'Implies a false order to linear and distance-based models'],
          ['Ordinal encoding', 'Integers in the meaningful order', 'Ordinal features', 'Assumes equal spacing between levels'],
          ['Binary encoding', 'Integer code written in binary, one column per bit', 'Nominal features with many categories', 'Less interpretable; similar codes share bits'],
          ['Frequency encoding', 'Category → how often it occurs', 'High cardinality', 'Different categories with equal counts collide'],
          ['Target encoding', 'Category → mean target value for that category', 'High cardinality, strong predictive categories', 'Target leakage unless computed inside cross-validation'],
        ]}
      />
      <EncodingFigure />

      <H2>One-hot encoding in detail</H2>
      <p>
        One-hot encoding (also called one-out-of-N or dummy variables) replaces a categorical feature with as many new binary features as it
        has categories. For each data point exactly one of the new features is 1 and the rest are 0. It is the standard choice for nominal data
        because it introduces no artificial order: Red is not “greater than” Blue.
      </p>
      <H3>Worked example (SEE ’25 7a)</H3>
      <Table
        head={['ID', 'Color_Blue', 'Color_Green', 'Color_Red', 'Size_Large', 'Size_Medium', 'Size_Small']}
        numeric={[1, 2, 3, 4, 5, 6]}
        rows={[
          ['1 (Red, Large)', 0, 0, 1, 1, 0, 0],
          ['2 (Blue, Medium)', 1, 0, 0, 0, 1, 0],
          ['3 (Green, Small)', 0, 1, 0, 0, 0, 1],
          ['4 (Red, Medium)', 0, 0, 1, 0, 1, 0],
        ]}
      />
      <p>
        <strong>Explanation of the transformation:</strong> Color has 3 categories, so it becomes 3 columns; Size has 3, so it becomes 3. The
        2 original columns become 6. Each row has exactly one 1 within the Color group and one within the Size group. Columns appear in
        alphabetical order (pandas’ convention). Since Size is actually ordered, an ordinal encoding (Small 0, Medium 1, Large 2) would also be
        reasonable and keeps it to one column.
      </p>
      <Code title="one_hot.py (the SEE asks for this code)">{`
import pandas as pd
from sklearn.preprocessing import OneHotEncoder

df = pd.DataFrame({"ID": [1, 2, 3, 4],
                   "Color": ["Red", "Blue", "Green", "Red"],
                   "Size": ["Large", "Medium", "Small", "Medium"]})

# Option 1: pandas
encoded = pd.get_dummies(df, columns=["Color", "Size"], dtype=int)
print(encoded)

# Option 2: scikit-learn (remembers the categories, so it can transform test data)
enc = OneHotEncoder(sparse_output=False)
arr = enc.fit_transform(df[["Color", "Size"]])
print(enc.get_feature_names_out())   # ['Color_Blue' 'Color_Green' 'Color_Red' 'Size_Large' 'Size_Medium' 'Size_Small']
print(arr)
`}</Code>
      <SolverLink to="encoding">Encode any table</SolverLink>

      <H3>The dummy-variable trap</H3>
      <p>
        The one-hot columns of a feature always sum to 1, so one column is perfectly predictable from the others (multicollinearity). For
        unregularised linear regression this makes the coefficients non-unique. The fix is to drop one column per feature (
        <code>drop_first=True</code> or <code>drop="first"</code>); the dropped category becomes the baseline. Regularised models and trees do not
        need this.
      </p>

      <H2>Label encoding versus one-hot encoding (Q2, Q16)</H2>
      <p>Encode the ordinal list ["Low", "Medium", "High", "Medium", "Low"]:</p>
      <Table
        head={['Value', 'One-hot (High, Low, Medium)', 'LabelEncoder (alphabetical)', 'Meaningful ordinal']}
        rows={[
          ['Low', '[0, 1, 0]', 1, 0],
          ['Medium', '[0, 0, 1]', 2, 1],
          ['High', '[1, 0, 0]', 0, 2],
          ['Medium', '[0, 0, 1]', 2, 1],
          ['Low', '[0, 1, 0]', 1, 0],
        ]}
      />
      <Note kind="warn" title="LabelEncoder sorts alphabetically">
        scikit-learn’s LabelEncoder (and OrdinalEncoder by default) assigns High = 0, Low = 1, Medium = 2, which scrambles the real order. For an
        ordinal feature, specify the order yourself: <code>OrdinalEncoder(categories=[["Low", "Medium", "High"]])</code> or a mapping{' '}
        <code>{'{"Low": 0, "Medium": 1, "High": 2}'}</code>. In the exam, show both and say which is appropriate.
      </Note>
      <Compare
        cols={[
          { title: 'Label encoding', items: ['One integer column.', 'Compact: no growth in dimensionality.', 'Implies an order and equal spacing.', 'Fine for tree models and for the target variable.'] },
          { title: 'One-hot encoding', items: ['One binary column per category.', 'No false order; the safe default for nominal data.', 'Dimensionality grows with the number of categories.', 'Needed for linear models, SVMs, k-NN, neural networks.'] },
        ]}
      />

      <H2>Numbers can encode categories</H2>
      <p>
        A column of integers is not necessarily numeric. In census data, workclass might be stored as 0 = private, 1 = self-employed, 2 =
        government. A model treating it as continuous would assume government is “twice” self-employed. Check what the numbers mean; if they are
        codes, one-hot encode them (pandas <code>get_dummies</code> only encodes string columns automatically, so list such columns explicitly
        or convert them to strings).
      </p>
      <Note kind="warn" title="Encode training and test data together">
        Fit the encoder on the training data (or make sure both sets contain the same categories). If a category appears only in the test set,
        get_dummies applied separately produces different columns; OneHotEncoder with <code>handle_unknown="ignore"</code> avoids this.
      </Note>

      <H2>Writing it in the exam</H2>
      <Answer q="Apply one-hot encoding to the Color/Size dataset, explain the transformation and write the code." marks={10} src="SEE ’25 7a">
        <p>
          Define categorical variables and one-hot encoding (2), show the 4 × 6 encoded table (4), explain the transformation in words: column
          counts, exactly one 1 per group, no implied order, dummy-trap note (2), and the pandas / scikit-learn code (2).
        </p>
      </Answer>

      <KeyPoints>
        <li>Nominal categories have no order; ordinal categories do.</li>
        <li>One-hot: one binary column per category, the default for nominal data.</li>
        <li>Label/ordinal encoding: one integer column; only meaningful if the order is real.</li>
        <li>Drop one dummy per feature for unregularised linear models (dummy-variable trap).</li>
        <li>Integer-coded categories must still be treated as categorical.</li>
      </KeyPoints>
    </>
  );
}
