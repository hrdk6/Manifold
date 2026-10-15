import { Answer, Code, Def, H2, H3, KeyPoints, Note, Steps, Table } from '../../components/prose';
import { FeatureSelectionFigure } from '../../viz/m4';

export default function FeatureSelection() {
  return (
    <>
      <p>
        With so many ways to create new features, it is tempting to add more and more. But more features make models more complex and raise the
        chance of overfitting. Automatic feature selection keeps only the most useful features, which can improve generalisation, speed and
        interpretability.
      </p>

      <H2>What it is (Q13)</H2>
      <Def term="Automatic feature selection">
        Algorithmically choosing a subset of the original features that is most useful for the prediction task, discarding irrelevant or
        redundant ones, without manual inspection.
      </Def>
      <p>
        Benefits: better generalisation (less noise to overfit), faster training and prediction, simpler and more interpretable models, and
        less data needed. Because the selection uses the target, it must be done using <strong>only the training data</strong>, otherwise
        information leaks from the test set. There are three basic strategies.
      </p>
      <FeatureSelectionFigure />

      <H2>1. Univariate statistics (filter methods)</H2>
      <p>
        Compute a statistical relationship between each feature and the target <em>individually</em>, then keep the features with the strongest
        relationship. Each feature is considered in isolation, so a feature that is only informative in combination with another is discarded.
        Univariate tests are very fast and independent of the model.
      </p>
      <Table
        head={['Test', 'Features / target', 'Measures']}
        rows={[
          ['ANOVA F-test (f_classif)', 'Continuous features, categorical target', 'Difference in feature means between classes; higher F = stronger'],
          ['F-test for regression (f_regression)', 'Continuous feature and target', 'Linear correlation with the target'],
          ['Chi-square (chi2)', 'Categorical / count features, categorical target', 'Association between feature categories and classes'],
          ['Mutual information', 'Any', 'Any kind of dependency, including non-linear'],
        ]}
      />
      <p>
        scikit-learn: <code>SelectKBest</code> keeps a fixed number k of features, <code>SelectPercentile</code> a fixed percentage.
      </p>

      <H2>2. Model-based selection (embedded methods)</H2>
      <p>
        Fit a supervised model once and use its own measure of feature importance to rank the features. The model used for selection need not
        be the final model.
      </p>
      <ul>
        <li>Tree-based models: <code>feature_importances_</code> (total impurity reduction).</li>
        <li>Linear models with L1 penalty (Lasso): coefficients that are exactly zero drop out automatically.</li>
        <li>Linear models generally: the absolute value of the (standardised) coefficients.</li>
      </ul>
      <p>
        Unlike univariate tests, model-based selection considers all features <em>at once</em> and can capture interactions (if the model can).
        scikit-learn: <code>SelectFromModel(estimator, threshold="median")</code>.
      </p>

      <H2>3. Iterative selection (wrapper methods)</H2>
      <p>
        Build a series of models with different feature subsets, judging each subset by model performance. More expensive, but searches the
        space of subsets directly.
      </p>
      <H3>Recursive Feature Elimination (Q15)</H3>
      <Steps>
        <li>
          <strong>Fit</strong> the model on all features.
        </li>
        <li>
          <strong>Rank</strong> the features by importance (coefficient magnitude or feature importance).
        </li>
        <li>
          <strong>Remove</strong> the least important feature (or a fixed fraction).
        </li>
        <li>
          <strong>Repeat</strong> with the remaining features until the desired number is left.
        </li>
      </Steps>
      <p>
        <strong>Limitations in high-dimensional data:</strong> RFE refits the model once per removed feature, so with thousands of features it is
        very slow (use a step size or a cheap model); importance estimates from a model trained on many noisy features can be unstable, so good
        features may be eliminated early and never return (greedy); with correlated features it may drop one of a useful pair arbitrarily; and
        the chosen number of features still has to be tuned by cross-validation (RFECV).
      </p>
      <H3>Sequential feature selection</H3>
      <ul>
        <li>
          <strong>Forward selection</strong>: start with no features, add the one that improves the model most, repeat until no significant
          gain.
        </li>
        <li>
          <strong>Backward selection</strong>: start with all features, remove the one whose removal hurts least, repeat until removal
          significantly hurts.
        </li>
      </ul>

      <H2>Filter, wrapper and embedded methods compared (Q14)</H2>
      <Table
        head={['', 'Filter', 'Wrapper', 'Embedded']}
        rows={[
          ['How', 'Statistical score per feature, independent of any model', 'Train and evaluate models on feature subsets', 'Selection happens inside model training'],
          ['Examples', 'ANOVA F, chi², mutual information, correlation', 'RFE, forward / backward selection', 'Lasso (L1), tree feature importances'],
          ['Considers feature interactions?', 'No', 'Yes', 'Partly (depends on the model)'],
          ['Cost', 'Very low', 'High: many model fits', 'Moderate: one fit'],
          ['Overfitting risk', 'Low', 'Higher (searches many subsets)', 'Moderate'],
          ['Tied to a model?', 'No', 'Yes, the wrapped model', 'Yes, the training model'],
        ]}
      />
      <Note kind="tip">
        In Müller and Guido’s cancer example, 50 noise features are added to 30 real ones. Univariate selection (keeping 50%) recovers most of the
        real features and improves logistic regression slightly; model-based and RFE selection with a random forest recover them even better.
      </Note>

      <Code title="feature_selection.py">{`
from sklearn.feature_selection import SelectKBest, f_classif, SelectFromModel, RFE
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression

# 1. filter
uni = SelectKBest(score_func=f_classif, k=10).fit(X_train, y_train)
X_train_uni = uni.transform(X_train)
print(uni.get_support())                       # boolean mask of kept features

# 2. embedded / model-based
sfm = SelectFromModel(RandomForestClassifier(n_estimators=100, random_state=42), threshold="median")
X_train_sfm = sfm.fit(X_train, y_train).transform(X_train)

# 3. wrapper
rfe = RFE(LogisticRegression(max_iter=1000), n_features_to_select=10).fit(X_train, y_train)
print(rfe.ranking_)                            # 1 = selected; larger = eliminated earlier
`}</Code>

      <H2>Writing it in the exam</H2>
      <Answer q="Describe the differences between filter, wrapper and embedded methods for feature selection. (Q14)" marks={10}>
        <p>
          Define automatic feature selection and why it helps; describe each family with how it works, two examples and its pros and cons; give
          the comparison table; and mention that selection must use training data only.
        </p>
      </Answer>
      <Answer q="Analyse how Recursive Feature Elimination works and its limitations in high-dimensional datasets. (Q15)" marks={10}>
        <p>
          The four-step loop with a small worked illustration (e.g. 5 features → 3, removing the smallest |coefficient| each round), then the
          limitations: computational cost, unstable importances, greedy irreversibility, correlated features, choosing k; mitigations: step
          size, RFECV, cheaper base models, prior filtering.
        </p>
      </Answer>

      <KeyPoints>
        <li>Feature selection removes irrelevant features to reduce overfitting, cost and complexity.</li>
        <li>Filter (univariate): score each feature alone; fast, ignores interactions.</li>
        <li>Embedded (model-based): use one model’s importances or L1 coefficients.</li>
        <li>Wrapper (iterative): RFE and forward/backward selection; accurate but expensive.</li>
        <li>Always fit selection on training data only.</li>
      </KeyPoints>
    </>
  );
}
