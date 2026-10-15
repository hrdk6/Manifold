import { M, MB } from '../../components/Math';
import { Answer, Code, Compare, Def, H2, H3, KeyPoints, Note, SolverLink, Table } from '../../components/prose';
import { Work } from '../../lab/ui';
import { InteractionFigure, PolyFeaturesFigure } from '../../viz/m4';
import { PolyWork } from '../../viz/work';

export default function Polynomial() {
  return (
    <>
      <p>
        Another way to enrich a feature representation, especially for linear models, is to add products of features (interactions) and powers
        of features (polynomials). A linear model on these new features can fit curved and interacting relationships while still being a linear
        model in its parameters.
      </p>

      <H2>Interaction features (Q7)</H2>
      <Def term="Interaction feature">
        A new feature formed by multiplying two (or more) features, so that the model can capture how the effect of one feature on the target
        depends on the value of another.
      </Def>
      <p>A model with an interaction term:</p>
      <MB>{'\\hat{y} = w_0 + w_1 x_1 + w_2 x_2 + w_3 (x_1 \\times x_2)'}</MB>
      <p>
        Now the effect of increasing x₂ by one unit is <M>{'w_2 + w_3 x_1'}</M>: it depends on x₁. Without the product, the effect is the
        constant w₂ regardless of x₁.
      </p>
      <Table
        head={['Temperature (°C)', 'Advertising (₹)', 'Sales (₹)', 'Interaction temp × ad']}
        numeric={[0, 1, 2, 3]}
        rows={[
          [30, 1000, 3000, 30000],
          [25, 1500, 3500, 37500],
          [20, 1200, 2000, 24000],
          [15, 800, 1500, 12000],
        ]}
      />
      <InteractionFigure />
      <p>
        Other examples: in a medical model, a drug’s effect may depend on age (dose × age); in house pricing, the value of extra area depends on
        location (area × city-centre indicator). Combining binned features with interactions (bin × original feature) gives a linear model a
        separate slope in each bin.
      </p>

      <H2>Polynomial features (Q8)</H2>
      <p>
        Polynomial features raise features to powers: from x, degree 2 produces x and x²; degree 3 adds x³. With several features,
        PolynomialFeatures produces <em>all</em> products up to the degree. For two features and degree 2:
      </p>
      <MB>{'(x_1, x_2) \\;\\rightarrow\\; (1,\\; x_1,\\; x_2,\\; x_1^2,\\; x_1 x_2,\\; x_2^2)'}</MB>
      <p>
        So polynomial features include interaction terms automatically. The number of output features (including the bias) is{' '}
        <M>{'\\binom{n + d}{d}'}</M>, which grows very quickly: 10 features at degree 3 already give 286 columns.
      </p>
      <p>
        <strong>Polynomial regression</strong> is just linear regression on polynomial features:{' '}
        <M>{'\\hat{y} = w_0 + w_1 x + w_2 x^2 + \\dots + w_d x^d'}</M>. It is linear in the weights, so it is fitted by ordinary least
        squares, but the curve it draws is non-linear in x. This is how a linear model captures non-linear relationships.
      </p>
      <PolyFeaturesFigure />

      <H2>Worked example: degree 2 versus linear (SEE ’25 8b, Q20)</H2>
      <p>X = [1, 2, 3], y = [1.5, 4.2, 9.7].</p>
      <Work>
        <PolyWork x={[1, 2, 3]} y={[1.5, 4.2, 9.7]} />
      </Work>
      <Code title="polynomial_regression.py">{`
import numpy as np
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score

X = np.array([[1], [2], [3]])
y = np.array([1.5, 4.2, 9.7])

lin = LinearRegression().fit(X, y)
poly = PolynomialFeatures(degree=2, include_bias=False)
X_poly = poly.fit_transform(X)                # columns: x, x^2
quad = LinearRegression().fit(X_poly, y)

print("linear:", lin.intercept_, lin.coef_)   # -3.0667, [4.1]
print("quad:  ", quad.intercept_, quad.coef_) # 1.6, [-1.5, 1.4]
for name, pred in [("linear", lin.predict(X)), ("quadratic", quad.predict(X_poly))]:
    print(name, "MSE", mean_squared_error(y, pred), "R2", r2_score(y, pred))
`}</Code>
      <SolverLink to="polyreg">Compare linear and quadratic fits on any data</SolverLink>

      <H2>Overfitting with high-degree polynomials (Q9)</H2>
      <Table
        head={['Challenge', 'Explanation']}
        rows={[
          ['Model complexity', 'Each degree adds many terms (combinatorially many with several features); the model can bend to fit every point, including noise.'],
          ['High variance', 'Small changes in the training data change the curve drastically, especially near the edges of the data range.'],
          ['Wild extrapolation', 'High powers explode outside the training range (Runge’s phenomenon).'],
          ['Interpretability', 'Dozens of power and product terms are hard to explain.'],
          ['Computational cost', 'More columns mean slower training and prediction; impractical for many features.'],
          ['Generalisation error', 'Training error keeps falling while test error rises: the defining sign of overfitting.'],
          ['Numerical issues', 'Large powers of large values make the least-squares problem ill-conditioned; scale features first.'],
        ]}
      />
      <Compare
        cols={[
          { title: 'Mitigation strategies', items: ['Regularisation: Ridge (L2) or Lasso (L1) shrink the high-degree coefficients.', 'Cross-validation to choose the degree.', 'Feature selection (e.g. RFE) to keep only useful terms.', 'Use a lower degree; gather more data.', 'Scale features before expanding.'] },
          { title: 'Good practice', items: ['Start with degree 2 or 3.', 'Plot the fitted curve over the full range.', 'Compare training and validation scores for every degree.', 'Prefer interactions you can justify from domain knowledge.'] },
        ]}
      />
      <Note kind="insight">
        In Müller and Guido’s Boston housing example, adding degree-2 interactions and polynomials raises Ridge regression’s test R² from 0.62
        to 0.75, while a random forest gets no benefit from them (and even loses a little). Feature expansion helps linear models most.
      </Note>

      <H2>Writing it in the exam</H2>
      <Answer q="Use polynomial regression with degree 2 on X = [1, 2, 3], y = [1.5, 4.2, 9.7]; compare with linear regression." marks={10} src="SEE ’25 8b">
        <p>
          Set up both models, show the sums table, solve the linear model (b₁ = 4.1, b₀ = −3.0667) and the quadratic one (a₀ = 1.6, a₁ = −1.5,
          a₂ = 1.4), tabulate predictions and errors, compare MSE and R² (0.4356 vs 0, 0.9626 vs 1), and comment that the perfect quadratic fit
          is guaranteed with three points and does not prove better generalisation.
        </p>
      </Answer>

      <H3>Summary</H3>
      <KeyPoints>
        <li>Interaction features (x₁ × x₂) let one feature’s effect depend on another.</li>
        <li>Polynomial features add powers and products; there are C(n + d, d) of them.</li>
        <li>Polynomial regression = linear regression on polynomial features; it fits curves.</li>
        <li>X = [1, 2, 3]: linear ŷ = −3.0667 + 4.1x (R² 0.963); quadratic ŷ = 1.6 − 1.5x + 1.4x² (R² 1).</li>
        <li>High degrees overfit; use regularisation, cross-validation and feature selection.</li>
      </KeyPoints>
    </>
  );
}
