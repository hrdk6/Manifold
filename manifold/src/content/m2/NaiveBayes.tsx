import { M, MB } from '../../components/Math';
import { Answer, Code, Compare, H2, H3, KeyPoints, Note, SolverLink, Table } from '../../components/prose';
import { fx } from '../../lib/fmt';
import { naiveBayes } from '../../lib/supervised';
import { playTennis } from '../data/tables';
import { GaussianNBFigure } from '../../viz/m2b';

export default function NaiveBayes() {
  const q = ['Sunny', 'Cool', 'High', 'Strong'];
  const nb = naiveBayes(playTennis.rows, playTennis.attrs, q);
  const yes = nb.per.find((p) => p.cls === 'Yes')!;
  const no = nb.per.find((p) => p.cls === 'No')!;
  const frac = (t: { cnt: number; n: number }) => `\\tfrac{${t.cnt}}{${t.n}}`;
  return (
    <>
      <p>
        Naive Bayes classifiers apply Bayes’ theorem with one bold simplification: that the features are independent of each other once
        you know the class. The assumption is almost never exactly true, yet the classifiers work remarkably well, train in a single pass over
        the data, and scale to huge numbers of features. They are the classic choice for text classification such as spam filtering.
      </p>

      <H2>Bayes’ theorem</H2>
      <MB>{'P(C \\mid x) = \\frac{P(x \\mid C)\\, P(C)}{P(x)}'}</MB>
      <Table
        head={['Term', 'Name', 'Meaning']}
        rows={[
          [<M>{'P(C)'}</M>, 'Prior', 'How common the class is before seeing the features'],
          [<M>{'P(x \\mid C)'}</M>, 'Likelihood', 'How probable these feature values are within the class'],
          [<M>{'P(x)'}</M>, 'Evidence', 'Same for every class, so it can be ignored when comparing'],
          [<M>{'P(C \\mid x)'}</M>, 'Posterior', 'Probability of the class after seeing the features'],
        ]}
      />

      <H2>The naive assumption</H2>
      <p>
        Estimating <M>{'P(x_1, x_2, \\dots, x_n \\mid C)'}</M> directly would require a separate count for every combination of feature
        values, which is hopeless with many features. Naive Bayes assumes conditional independence, so the joint likelihood factorises:
      </p>
      <MB>{'P(x_1, \\dots, x_n \\mid C) = \\prod_{i=1}^{n} P(x_i \\mid C)'}</MB>
      <p>The classifier then picks the class with the largest (unnormalised) posterior, the maximum a posteriori (MAP) decision:</p>
      <MB>{'\\hat{y} = \\argmax_{C} \\; P(C) \\prod_{i=1}^{n} P(x_i \\mid C)'}</MB>

      <H2>Worked example: PlayTennis</H2>
      <p>
        Classify the new day ⟨Outlook = Sunny, Temperature = Cool, Humidity = High, Wind = Strong⟩ using the 14-day PlayTennis data (9 Yes,
        5 No).
      </p>
      <Table
        head={['', 'P(·)', 'Sunny', 'Cool', 'High', 'Strong', 'Product']}
        numeric={[6]}
        rows={[yes, no].map((c) => [
          <strong>{c.cls}</strong>,
          <M>{`\\tfrac{${c.nc}}{14}`}</M>,
          ...c.terms.map((t) => <M>{frac(t)}</M>),
          fx(c.score, 6),
        ])}
      />
      <MB>{`P(\\text{Yes} \\mid x) \\propto \\tfrac{9}{14} \\cdot ${yes.terms.map(frac).join(' \\cdot ')} = ${fx(yes.score, 4)}`}</MB>
      <MB>{`P(\\text{No} \\mid x) \\propto \\tfrac{5}{14} \\cdot ${no.terms.map(frac).join(' \\cdot ')} = ${fx(no.score, 4)}`}</MB>
      <p>
        Normalising: <M>{`P(\\text{No} \\mid x) = \\frac{${fx(no.score, 4)}}{${fx(yes.score, 4)} + ${fx(no.score, 4)}} = ${fx(no.score / nb.total, 3)}`}</M>.
        The prediction is <strong>No</strong>: do not play.
      </p>
      <SolverLink to="naive-bayes">Run Naive Bayes on any categorical table</SolverLink>

      <H3>The zero-frequency problem and Laplace smoothing</H3>
      <p>
        If a value never occurs with a class in the training data (no Overcast day was labelled No), its estimated likelihood is 0 and wipes
        out the entire product, however strong the other evidence. <strong>Laplace (add-one) smoothing</strong> fixes this:
      </p>
      <MB>{'P(x_i = v \\mid C) = \\frac{\\text{count}(x_i = v, C) + \\alpha}{\\text{count}(C) + \\alpha \\cdot k_i}'}</MB>
      <p>
        where <M>{'k_i'}</M> is the number of distinct values of feature i and α = 1 for add-one smoothing. In scikit-learn the{' '}
        <code>alpha</code> parameter of MultinomialNB and BernoulliNB does this; larger α gives a simpler, more smoothed model.
      </p>

      <H2>Categorical versus numerical features (Q17)</H2>
      <Compare
        cols={[
          {
            title: 'Categorical features',
            items: [
              'Estimate P(value | class) by counting relative frequencies in each class, as above.',
              'Add Laplace smoothing to avoid zero probabilities.',
              'scikit-learn: CategoricalNB; for word counts MultinomialNB; for binary presence/absence BernoulliNB.',
            ],
          },
          {
            title: 'Numerical features',
            items: [
              'Assume each class’s values follow a normal distribution; estimate its mean μ_c and standard deviation σ_c.',
              <>
                Likelihood from the Gaussian density <M>{'P(x \\mid C) = \\frac{1}{\\sigma_c\\sqrt{2\\pi}} e^{-(x-\\mu_c)^2 / 2\\sigma_c^2}'}</M>.
              </>,
              'scikit-learn: GaussianNB. Alternatively, bin the feature into categories first.',
            ],
          },
        ]}
      />
      <GaussianNBFigure />

      <H3>The three scikit-learn variants</H3>
      <Table
        head={['Classifier', 'Feature type', 'Typical use']}
        rows={[
          ['GaussianNB', 'Continuous', 'Any continuous data; very high-dimensional data'],
          ['BernoulliNB', 'Binary (present / absent)', 'Text: does the word occur?'],
          ['MultinomialNB', 'Counts', 'Text: how often does each word occur? Usually better than Bernoulli on larger documents'],
        ]}
      />

      <H2>Strengths and weaknesses</H2>
      <ul>
        <li>
          <strong>Fast</strong>: training is a single pass of counting; prediction is a product of looked-up probabilities.
        </li>
        <li>
          <strong>Scales</strong> to very many features and works well with little data; a good baseline for text.
        </li>
        <li>
          <strong>Naive</strong>: correlated features are double-counted, so the probabilities are often poorly calibrated (too close to 0 or
          1), even when the predicted class is right.
        </li>
        <li>Generalisation is often slightly worse than linear models like logistic regression.</li>
      </ul>
      <Note kind="tip">
        To avoid numerical underflow from multiplying many small probabilities, implementations add logarithms instead:
        log P(C) + Σ log P(xᵢ | C).
      </Note>

      <Code title="naive_bayes.py">{`
from sklearn.naive_bayes import GaussianNB, CategoricalNB
from sklearn.preprocessing import OrdinalEncoder
import pandas as pd

df = pd.read_csv("play_tennis.csv")
enc = OrdinalEncoder()
X = enc.fit_transform(df[["Outlook", "Temperature", "Humidity", "Wind"]])
y = df["PlayTennis"]

nb = CategoricalNB(alpha=1.0)     # Laplace smoothing
nb.fit(X, y)
query = enc.transform([["Sunny", "Cool", "High", "Strong"]])
print(nb.predict(query), nb.predict_proba(query))
`}</Code>

      <H2>Writing it in the exam</H2>
      <Answer q="Explain how Naive Bayes handles categorical and numerical features in classification. (Q17)" marks={10}>
        <p>
          Bayes’ theorem with each term named; the conditional-independence assumption and the MAP rule; categorical features by relative
          frequency with Laplace smoothing (formula); numerical features by a per-class Gaussian (formula) or by discretisation; the three
          scikit-learn variants; a short worked example; and strengths/limitations.
        </p>
      </Answer>

      <KeyPoints>
        <li>Posterior ∝ prior × likelihood; P(x) is the same for every class.</li>
        <li>Naive assumption: features are independent given the class, so likelihoods multiply.</li>
        <li>Categorical: count frequencies (+ Laplace smoothing). Numerical: per-class Gaussian.</li>
        <li>PlayTennis ⟨Sunny, Cool, High, Strong⟩ → No (posterior ≈ 0.795).</li>
        <li>Very fast and good for text; probabilities are often overconfident.</li>
      </KeyPoints>
    </>
  );
}
