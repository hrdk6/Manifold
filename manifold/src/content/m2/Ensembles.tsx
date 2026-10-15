import { M, MB } from '../../components/Math';
import { Answer, Code, Compare, Def, H2, H3, KeyPoints, Note, Steps, Table } from '../../components/prose';
import { AdaBoostFigure, ForestFigure, GradientBoostingFigure } from '../../viz/m2b';

export default function Ensembles() {
  return (
    <>
      <p>
        A single decision tree is easy to read but unstable: train it on slightly different data and you may get a very different tree. Ensemble
        methods combine many models, often called weak learners, into one stronger model. Random forests and gradient-boosted trees, the two
        ensembles in this lesson, are among the most successful algorithms for tabular data.
      </p>

      <H2>Ensemble learning</H2>
      <Def term="Ensemble learning">
        Combining the predictions of multiple models so that the combined model performs better than any individual one, by exploiting the
        diversity of their errors.
      </Def>
      <p>
        If several models make <em>different</em> mistakes, a vote or average cancels many of them out. Diversity is the key: copies of the same
        model would make the same mistakes. Ensembles are used to improve accuracy, reduce the risk of picking a single poor model, attach a
        confidence to decisions, and handle feature selection and data fusion.
      </p>
      <p>The three families are:</p>
      <ol>
        <li>
          <strong>Bagging</strong>: train models in parallel on different bootstrap samples and average them (random forests).
        </li>
        <li>
          <strong>Boosting</strong>: train models in sequence, each correcting its predecessors (AdaBoost, gradient boosting, XGBoost).
        </li>
        <li>
          <strong>Stacking</strong>: train a meta-model to combine the predictions of different base models.
        </li>
      </ol>

      <H2>Bagging (bootstrap aggregating)</H2>
      <Steps>
        <li>
          <strong>Bootstrap:</strong> from n training examples, draw n examples <em>with replacement</em>. Some appear twice or more, some not
          at all; on average each sample contains about 63.2% of the distinct examples (<M>{'1 - (1-1/n)^n \\to 1 - 1/e'}</M>).
        </li>
        <li>
          <strong>Train</strong> one model on each bootstrap sample, independently (so it parallelises).
        </li>
        <li>
          <strong>Aggregate:</strong> majority vote for classification (or average the probabilities), the mean for regression.
        </li>
      </Steps>
      <p>
        Bagging mainly reduces <strong>variance</strong>, which is why it helps high-variance learners like deep trees. The examples left out of
        a bootstrap sample (out-of-bag) provide a free validation estimate.
      </p>

      <H3>Random forests</H3>
      <p>
        A random forest is bagging with decision trees plus one more source of randomness: at each split, a tree may only consider a random
        subset of the features (<code>max_features</code>). This decorrelates the trees: a single very strong feature can no longer dominate
        the top split of every tree.
      </p>
      <ForestFigure />
      <Table
        head={['Parameter', 'Effect']}
        rows={[
          ['n_estimators', 'Number of trees. More is better (smoother, more stable) but slower; there is no overfitting from adding trees.'],
          ['max_features', 'Features considered at each split. Smaller → more random, more decorrelated trees. Default √p for classification.'],
          ['max_depth, min_samples_leaf', 'Pre-pruning of each tree; often left at full depth in forests.'],
        ]}
      />
      <p>
        Your slides’ example: for a customer aged 29 with medium income, tree 1 says Yes (income rules), tree 2 says No (age threshold), tree
        3 says Yes. The majority vote is <strong>Yes</strong>.
      </p>
      <Compare
        cols={[
          { title: 'Advantages of random forests', items: ['Among the best out-of-the-box models; little tuning needed.', 'Reduces overfitting compared with a single tree.', 'Robust to noise, outliers and some missing data.', 'No scaling needed; gives feature importances.'] },
          { title: 'Disadvantages', items: ['Hundreds of trees are hard to interpret.', 'Slower to train and predict, more memory.', 'Not well suited to very high-dimensional sparse data such as text.'] },
        ]}
      />

      <H2>Boosting</H2>
      <p>
        Boosting builds models <strong>sequentially</strong>. Each new model concentrates on the examples the current ensemble gets wrong,
        and models are added until no further improvement is seen or a set number is reached. Boosting mainly reduces <strong>bias</strong>,
        turning weak learners (barely better than chance) into a strong one.
      </p>
      <H3>AdaBoost</H3>
      <Steps>
        <li>
          Give every training example the same weight <M>{'w_i = 1/n'}</M>.
        </li>
        <li>
          Train a weak learner (often a one-split stump) to minimise the <em>weighted</em> error <M>{'\\varepsilon_t'}</M>.
        </li>
        <li>
          Compute its say in the final vote: <M>{'\\alpha_t = \\tfrac{1}{2}\\ln\\frac{1-\\varepsilon_t}{\\varepsilon_t}'}</M>. Accurate learners
          get large α.
        </li>
        <li>
          Update weights: <M>{'w_i \\leftarrow w_i\\, e^{-\\alpha_t y_i h_t(x_i)}'}</M>, then normalise. Misclassified examples gain weight,
          correct ones lose it.
        </li>
        <li>
          Repeat. Predict with the weighted vote <M>{'H(x) = \\text{sign}\\left(\\sum_t \\alpha_t h_t(x)\\right)'}</M>.
        </li>
      </Steps>
      <AdaBoostFigure />

      <H3>Gradient boosting</H3>
      <p>
        Gradient-boosted regression trees build shallow trees (depth 1–5) in sequence; each new tree is fitted to the <em>residual errors</em>{' '}
        (more generally, the negative gradient of the loss) of the current ensemble, and only a fraction of it, the{' '}
        <strong>learning rate</strong>, is added:
      </p>
      <MB>{'F_m(x) = F_{m-1}(x) + \\eta \\, h_m(x), \\qquad h_m \\approx y - F_{m-1}(x)'}</MB>
      <GradientBoostingFigure />
      <p>
        Gradient boosting usually needs more careful tuning than random forests (learning rate, number of trees, depth), but is often slightly
        more accurate. A lower learning rate needs more trees. XGBoost and LightGBM are fast, regularised implementations widely used in
        competitions.
      </p>

      <H2>Stacking</H2>
      <p>
        Stacking (stacked generalisation) trains several different base models, say a k-NN, a logistic regression and a random forest, and
        uses their predictions as input features for a meta-model that learns how best to combine them. Because base and meta-models can be of
        any type, it is the most flexible ensemble, but also the most complex to build and validate.
      </p>

      <H2>Bagging versus boosting (Q20)</H2>
      <Table
        head={['', 'Bagging', 'Boosting']}
        rows={[
          ['Training', 'Parallel, independent models', 'Sequential; each model depends on the previous'],
          ['Data each model sees', 'A bootstrap sample (random with replacement)', 'The full data, re-weighted toward past mistakes (or residuals)'],
          ['Combining', 'Equal-weight vote or average', 'Weighted vote / sum (better models count more)'],
          ['Main effect', 'Reduces variance', 'Reduces bias (and variance)'],
          ['Base learners', 'Strong, high-variance (deep trees)', 'Weak, high-bias (stumps, shallow trees)'],
          ['Overfitting risk', 'Low; more models does not overfit', 'Can overfit with too many rounds; needs a learning rate / early stopping'],
          ['Sensitivity to noise', 'Robust', 'Sensitive: noisy points keep getting up-weighted'],
          ['Examples', 'Random forest, bagged trees', 'AdaBoost, gradient boosting, XGBoost'],
        ]}
      />
      <Note kind="exam">
        Draw two small diagrams: bagging as several boxes fed from the dataset in parallel, joined by a vote; boosting as a chain of boxes,
        each passing re-weighted data to the next, joined by a weighted vote. Then give the table.
      </Note>

      <Code title="ensembles.py">{`
from sklearn.ensemble import RandomForestClassifier, AdaBoostClassifier, GradientBoostingClassifier
from sklearn.model_selection import cross_val_score

forest = RandomForestClassifier(n_estimators=200, max_features="sqrt", random_state=0)
ada    = AdaBoostClassifier(n_estimators=100, learning_rate=0.5, random_state=0)
gbrt   = GradientBoostingClassifier(n_estimators=200, learning_rate=0.1, max_depth=3, random_state=0)

for name, model in [("forest", forest), ("adaboost", ada), ("gbrt", gbrt)]:
    print(name, cross_val_score(model, X, y, cv=5).mean())
`}</Code>

      <H2>Writing it in the exam</H2>
      <Answer q="Explain how bagging and boosting differ in their approach to building models. (Q20)" marks={10}>
        <p>
          Define ensemble learning; describe bagging (bootstrap, parallel, vote; random forest as the example; reduces variance) and boosting
          (sequential, re-weighting or residual fitting, weighted vote; AdaBoost or gradient boosting; reduces bias); draw the two diagrams;
          finish with the comparison table and one sentence on stacking.
        </p>
      </Answer>

      <KeyPoints>
        <li>Ensembles combine diverse models so their errors cancel.</li>
        <li>Bagging: bootstrap samples, parallel training, majority vote; reduces variance.</li>
        <li>Random forest = bagged trees + random feature subsets at each split.</li>
        <li>Boosting: sequential, each learner fixes previous errors; AdaBoost re-weights, gradient boosting fits residuals.</li>
        <li>Stacking trains a meta-model on base-model predictions.</li>
      </KeyPoints>
    </>
  );
}
