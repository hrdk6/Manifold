import { M, MB } from '../../components/Math';
import { Answer, Code, Compare, Def, H2, H3, KeyPoints, Note, SolverLink, Steps, Table } from '../../components/prose';
import { fx } from '../../lib/fmt';
import { entropy } from '../../lib/math';
import { buildTree, treeRules } from '../../lib/tree';
import { fluCold, laptop, playTennis } from '../data/tables';
import { ImpurityFigure, TreeRegionsFigure } from '../../viz/m2b';
import { CatTreeDiagram, GainTable } from '../../viz/trees';

export default function Trees() {
  const lt = buildTree(laptop);
  const fl = buildTree(fluCold);
  const pt = buildTree(playTennis);
  const ltBest = lt.split?.attr;
  return (
    <>
      <p>
        A decision tree makes predictions by asking a sequence of if–then questions, much like a game of twenty questions or a doctor’s
        diagnostic flowchart. It is one of the most intuitive models in machine learning, it can be drawn and explained to anyone, and it is
        the building block of the powerful ensemble methods in the next lesson.
      </p>

      <H2>What a decision tree is</H2>
      <Def term="Decision tree">
        A supervised, non-parametric model for classification and regression that recursively splits the data on feature values, forming a
        tree whose internal nodes are tests, whose branches are the outcomes of those tests, and whose leaves hold predictions.
      </Def>
      <p>
        “Non-parametric” means it does not assume a fixed functional form with a fixed set of parameters, unlike logistic regression: it can
        learn any shape from the data. Trees handle both categorical and continuous features and need no feature scaling.
      </p>

      <H3>Components</H3>
      <Table
        head={['Component', 'Meaning']}
        rows={[
          ['Root node', 'The first node; it holds the whole dataset and is split first. Arrows point away from it.'],
          ['Internal (decision) node', 'Tests an attribute and splits the data into child nodes.'],
          ['Branch / edge', 'One outcome of a test (e.g. Outlook = Sunny); a whole subsection of the tree is a subtree.'],
          ['Leaf (terminal) node', 'Does not split further; holds the predicted class (or value). Arrows point towards it.'],
          ['Parent and child', 'A node that is split is the parent of the nodes it creates.'],
          ['Depth', 'The number of tests from the root to the deepest leaf.'],
        ]}
      />
      <p>
        Trees can be <strong>binary</strong> (every test has exactly two outcomes, as in CART and scikit-learn) or <strong>multiway</strong>{' '}
        (one branch per attribute value, as in ID3). There are classification trees (leaves hold classes) and regression trees (leaves hold the
        mean target of their training points).
      </p>

      <H2>Choosing splits: impurity</H2>
      <p>
        The tree should ask the most informative question first. A good split produces children that are as <em>pure</em> as possible (each
        containing mostly one class). Purity is measured by entropy or Gini impurity.
      </p>
      <MB>{'\\text{Entropy}(S) = -\\sum_{i=1}^{c} p_i \\log_2 p_i \\qquad \\text{Gini}(S) = 1 - \\sum_{i=1}^{c} p_i^2'}</MB>
      <ImpurityFigure />
      <H3>Information gain</H3>
      <p>Information gain is the reduction in entropy achieved by splitting set S on attribute A:</p>
      <MB>{'\\text{Gain}(S, A) = \\text{Entropy}(S) - \\sum_{v \\in \\text{Values}(A)} \\frac{|S_v|}{|S|}\\, \\text{Entropy}(S_v)'}</MB>
      <p>
        The second term is the expected entropy after the split, weighting each child by its share of the examples. ID3 chooses the attribute
        with the largest gain. CART (scikit-learn) uses Gini by default and only binary splits; the results are usually very similar.
      </p>

      <H2>The ID3 algorithm</H2>
      <Steps>
        <li>
          <strong>Compute the entropy</strong> of the current set of examples.
        </li>
        <li>
          <strong>For every remaining attribute</strong>, compute the information gain of splitting on it.
        </li>
        <li>
          <strong>Choose the attribute with the highest gain</strong> as the test at this node; create one branch per value.
        </li>
        <li>
          <strong>Recurse</strong> on each branch with the examples that reach it and the remaining attributes.
        </li>
        <li>
          <strong>Stop</strong> when a node is pure (make it a leaf of that class), when no attributes remain, or when a stopping criterion
          (max depth, min samples) is reached; then predict the majority class.
        </li>
      </Steps>

      <H2>Worked example: will the customer buy the laptop? (Q12)</H2>
      <Table
        head={['Price', 'Brand', 'RAM', 'Buy']}
        rows={laptop.rows.map((r) => [...r.x, r.y])}
      />
      <p>
        Four Yes, two No: <M>{`\\text{Entropy}(S) = -\\tfrac{4}{6}\\log_2\\tfrac{4}{6} - \\tfrac{2}{6}\\log_2\\tfrac{2}{6} = ${fx(entropy([4, 2]), 4)}`}</M>.
      </p>
      <GainTable scores={lt.scores} crit="entropy" parent={lt.impurity} best={ltBest} />
      <p>
        <strong>Brand</strong> has the highest gain ({fx(lt.scores.find((s) => s.name === 'Brand')!.gain, 4)}): every Popular laptop was
        bought and no Unpopular one was, so both children are pure (entropy 0) and the tree is complete after one split. Price (gain{' '}
        {fx(lt.scores.find((s) => s.name === 'Price')!.gain, 3)}) and RAM ({fx(lt.scores.find((s) => s.name === 'RAM')!.gain, 3)}) are less
        informative.
      </p>
      <CatTreeDiagram root={lt} data={laptop} />
      <Note kind="warn">
        Some worked answers put Price at the root “because it seems significant” and then split on Brand. That violates ID3: the root must be
        the attribute with the highest information gain, which you must compute for <em>every</em> attribute. Always show the gain table.
      </Note>

      <H3>Flu or cold (Q19)</H3>
      <GainTable scores={fl.scores} crit="entropy" parent={fl.impurity} best={fl.split?.attr} />
      <p>
        Fever and Fatigue both separate the classes perfectly (gain 1.0, the maximum possible for a 3/3 split); Cough is nearly useless
        (gain {fx(fl.scores.find((s) => s.name === 'Cough')!.gain, 3)}). With a tie, ID3 takes the first: <strong>Fever</strong>. Rule:{' '}
        {treeRules(fl).join('; ')}.
      </p>

      <H3>The classic: PlayTennis</H3>
      <GainTable scores={pt.scores} crit="entropy" parent={pt.impurity} best={pt.split?.attr} />
      <p>Outlook wins at the root; the Sunny branch then splits on Humidity and the Rain branch on Wind, while Overcast is always Yes.</p>
      <CatTreeDiagram root={pt} data={playTennis} />
      <SolverLink to="tree">Build any ID3 tree with every calculation shown</SolverLink>

      <H2>Controlling complexity</H2>
      <p>
        Grown until every leaf is pure, a tree memorises the training data, noise included: 100% training accuracy and poor generalisation.
        Two strategies prevent this:
      </p>
      <Compare
        cols={[
          {
            title: 'Pre-pruning (early stopping)',
            items: ['Limit max_depth.', 'Limit max_leaf_nodes.', 'Require min_samples_split / min_samples_leaf.', 'scikit-learn implements this.'],
          },
          {
            title: 'Post-pruning',
            items: [
              'Grow the full tree, then remove or collapse nodes that add little.',
              'Reduced-error pruning: drop a subtree if validation accuracy does not fall.',
              'Cost-complexity pruning (ccp_alpha in scikit-learn).',
            ],
          },
        ]}
      />
      <TreeRegionsFigure />

      <H3>Feature importance</H3>
      <p>
        A tree summarises which features it relied on through <code>feature_importances_</code>: for each feature, the total impurity
        reduction it produced, normalised to sum to 1. A feature with low importance may still be informative; the tree may simply have used a
        correlated feature instead.
      </p>

      <H3>Regression trees</H3>
      <p>
        For a continuous target the leaf predicts the mean of its training targets and splits minimise the squared error. Predictions are
        piecewise constant, and trees cannot <em>extrapolate</em>: outside the training range they predict the last leaf’s value.
      </p>

      <H3>Classification or regression? (Q13)</H3>
      <p>
        A dataset with features (1.2, 3.4) → Class A and (2.1, 4.0) → Class B has a categorical label, so it is a classification problem. A
        tree needs one split, for example “Feature 1 ≤ 1.65 → Class A, otherwise Class B”, which separates the two training points perfectly.
        (With two examples this is a toy; the point is identifying the task type from the label.)
      </p>

      <H2>Strengths and weaknesses</H2>
      <Compare
        cols={[
          {
            title: 'Strengths',
            items: ['Easy to visualise and explain as rules.', 'No scaling or normalisation needed.', 'Handles categorical and numerical features, binary and multiclass.', 'Captures non-linear relationships and interactions.'],
          },
          {
            title: 'Weaknesses',
            items: ['Overfits easily without pruning.', 'Unstable: small data changes can produce a very different tree (high variance).', 'Axis-aligned splits approximate diagonal boundaries with staircases.', 'Cannot extrapolate. Ensembles fix most of these.'],
          },
        ]}
      />

      <Code title="decision_tree.py">{`
import pandas as pd
from sklearn.tree import DecisionTreeClassifier, export_text

df = pd.DataFrame({
    "Price": ["High", "High", "Medium", "Medium", "Low", "Low"],
    "Brand": ["Popular", "Unpopular", "Popular", "Popular", "Unpopular", "Popular"],
    "RAM":   [16, 8, 8, 4, 4, 8],
    "Buy":   ["Yes", "No", "Yes", "Yes", "No", "Yes"],
})
X = pd.get_dummies(df[["Price", "Brand", "RAM"]], columns=["Price", "Brand"])
y = df["Buy"]

tree = DecisionTreeClassifier(criterion="entropy", max_depth=3, random_state=0)
tree.fit(X, y)
print(export_text(tree, feature_names=list(X.columns)))
print(dict(zip(X.columns, tree.feature_importances_)))
`}</Code>

      <H2>Writing it in the exam</H2>
      <Answer q="What is a decision tree? Explain its components and how entropy and information gain are used for splitting." marks={10} src="SEE ’25 4b">
        <p>
          <strong>Definition and components (3).</strong> Definition, a labelled sketch (root, internal node, branch, leaf), binary vs
          multiway, classification vs regression trees.
        </p>
        <p>
          <strong>Entropy and gain (4).</strong> Both formulas; entropy 0 for a pure node and 1 for a 50/50 binary split; gain as the reduction
          in entropy; choose the maximum-gain attribute; recurse; stopping rules.
        </p>
        <p>
          <strong>Example (3).</strong> A short numeric example (the laptop data: Entropy(S) = 0.918, Gain(Brand) = 0.918) or PlayTennis.
          Mention Gini as the alternative and pruning to prevent overfitting.
        </p>
      </Answer>

      <KeyPoints>
        <li>Trees split data with if–then tests; leaves give predictions.</li>
        <li>Entropy −Σp log₂p and Gini 1 − Σp² measure impurity; information gain is the drop in entropy.</li>
        <li>ID3 picks the highest-gain attribute at every node and recurses until nodes are pure.</li>
        <li>Laptop data: Brand has gain 0.918 and splits perfectly. PlayTennis: Outlook at the root.</li>
        <li>Unpruned trees overfit; limit depth or prune. Trees need no scaling but are unstable.</li>
      </KeyPoints>
    </>
  );
}
