import { M, MB } from '../../components/Math';
import { Answer, Code, Compare, Def, H2, H3, KeyPoints, Note, Steps, Table } from '../../components/prose';
import { KernelLiftFigure, SVMFigure } from '../../viz/m2b';

export default function SVM() {
  return (
    <>
      <p>
        Many lines can separate two classes. Support vector machines pick a particular one: the line that stays as far as possible from the
        nearest points of both classes. That single idea, maximising the margin, gives SVMs excellent generalisation, and with kernels they
        extend to boundaries of almost any shape.
      </p>

      <H2>Key ideas</H2>
      <Def term="Hyperplane">
        The decision boundary <M>{'w \\cdot x + b = 0'}</M>: a line in 2-D, a plane in 3-D, a flat subspace of dimension p − 1 in general. The
        weight vector <M>{'w'}</M> is perpendicular to it; b shifts it.
      </Def>
      <Def term="Margin">
        The distance between the hyperplane and the closest training points of either class. SVM chooses the hyperplane with the{' '}
        <strong>maximum margin</strong>, which makes it robust to small perturbations of the data.
      </Def>
      <Def term="Support vectors">
        The training points that lie on the margin (or violate it). They alone determine the hyperplane: remove any other point and the
        solution does not change. This is where the name comes from.
      </Def>

      <SVMFigure />

      <H2>The optimisation problem</H2>
      <H3>Hard margin (separable data)</H3>
      <p>
        Scale w and b so that the closest points satisfy <M>{'|w \\cdot x + b| = 1'}</M>. The margin lines are{' '}
        <M>{'w \\cdot x + b = \\pm 1'}</M> and the width between them is <M>{'2 / \\lVert w \\rVert'}</M>. Maximising the margin is therefore:
      </p>
      <MB>{'\\min_{w,b} \\; \\tfrac{1}{2}\\lVert w \\rVert^2 \\quad \\text{subject to} \\quad y_i (w \\cdot x_i + b) \\geq 1 \\;\\; \\text{for all } i, \\quad y_i \\in \\{-1, +1\\}'}</MB>
      <H3>Soft margin (overlapping data)</H3>
      <p>
        Real data is rarely separable. Slack variables <M>{'\\xi_i \\geq 0'}</M> let points violate the margin at a cost controlled by C:
      </p>
      <MB>{'\\min_{w,b,\\xi} \\; \\tfrac{1}{2}\\lVert w \\rVert^2 + C \\sum_i \\xi_i \\quad \\text{subject to} \\quad y_i (w \\cdot x_i + b) \\geq 1 - \\xi_i'}</MB>
      <p>
        Equivalently, the SVM minimises the <strong>hinge loss</strong> <M>{'\\max(0, 1 - y_i f(x_i))'}</M> plus an L2 penalty: points
        correctly classified beyond the margin cost nothing.
      </p>
      <Table
        head={['C', 'Effect']}
        rows={[
          ['Small C', 'Strong regularisation: wide margin, many support vectors, tolerates misclassified points; may underfit.'],
          ['Large C', 'Weak regularisation: narrow margin, tries to classify every training point; may overfit.'],
        ]}
      />

      <H2>The kernel trick</H2>
      <p>
        A linear boundary cannot separate data like concentric circles. One fix is to add features (x², x₁x₂, …) so the classes become
        linearly separable in a higher-dimensional space. Computing those features explicitly is expensive; but the SVM’s solution only ever
        uses <em>inner products</em> between data points. A <strong>kernel</strong> k(x, x′) computes the inner product in the
        high-dimensional space directly from the original features, without building it.
      </p>
      <KernelLiftFigure />
      <Table
        head={['Kernel', 'Formula', 'Notes']}
        rows={[
          ['Linear', <M>{"k(x, x') = x \\cdot x'"}</M>, 'Plain linear SVM; fast; good for many features (text).'],
          ['Polynomial', <M>{"k(x, x') = (\\gamma\\, x \\cdot x' + r)^d"}</M>, 'All feature interactions up to degree d.'],
          ['RBF (Gaussian)', <M>{"k(x, x') = \\exp(-\\gamma \\lVert x - x' \\rVert^2)"}</M>, 'Most common; corresponds to an infinite-dimensional space; similarity decays with distance.'],
        ]}
      />
      <p>
        The decision function becomes a weighted sum over support vectors only:{' '}
        <M>{'f(x) = \\sum_{i \\in SV} \\alpha_i y_i \\, k(x_i, x) + b'}</M>.
      </p>
      <H3>The γ parameter of the RBF kernel</H3>
      <p>
        γ controls the width of the Gaussian, i.e. how far the influence of one training point reaches. Small γ → each point influences a
        large region → smooth, simple boundary. Large γ → each point only influences its immediate neighbourhood → complex, wiggly boundary
        that can overfit. C and γ interact, so they are tuned together with grid search (Module 5).
      </p>

      <H2>How an SVM classifies (Q4)</H2>
      <Steps>
        <li>
          <strong>Training:</strong> take labelled examples with classes ±1, (scale the features), and solve the optimisation for w, b and the
          support vectors, choosing a kernel and C.
        </li>
        <li>
          <strong>Prediction:</strong> compute f(x) = w·x + b (or the kernel sum). If f(x) ≥ 0 predict +1, otherwise −1. |f(x)| measures
          confidence: distance from the boundary.
        </li>
      </Steps>
      <Note kind="warn" title="Preprocessing matters">
        SVMs are very sensitive to feature scales because the kernel depends on distances. Rescale every feature (standardise, or min–max to
        [0, 1]) before training, or the large-range features dominate.
      </Note>

      <H2>Strengths and weaknesses</H2>
      <Compare
        cols={[
          { title: 'Strengths', items: ['Effective in high-dimensional spaces, even when features outnumber samples.', 'Memory-efficient: only support vectors are kept.', 'Versatile through kernels; complex boundaries from few features.', 'Maximum margin gives good generalisation.'] },
          { title: 'Weaknesses', items: ['Scales poorly beyond tens of thousands of samples.', 'Needs careful preprocessing and tuning of C, γ and the kernel.', 'No direct probability estimates.', 'Hard to interpret; struggles with heavy class overlap and noise.'] },
        ]}
      />

      <Code title="svm.py">{`
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline

model = make_pipeline(StandardScaler(), SVC(kernel="rbf", C=10, gamma=0.1))
model.fit(X_train, y_train)
print("test accuracy:", model.score(X_test, y_test))
print("support vectors per class:", model[-1].n_support_)
`}</Code>

      <H2>Writing it in the exam</H2>
      <Answer q="Describe the working of support vector machines for binary classification. (Q4)" marks={10}>
        <p>
          Define hyperplane, margin and support vectors with a diagram (two classes, boundary, dashed margin lines, ringed support vectors);
          give the hard-margin optimisation and margin 2/‖w‖; the soft margin and C; the kernel trick with the RBF formula and the role of γ;
          prediction by the sign of f(x); and pros/cons.
        </p>
      </Answer>

      <KeyPoints>
        <li>SVM finds the hyperplane w·x + b = 0 with the widest margin, 2/‖w‖.</li>
        <li>Support vectors are the points on or inside the margin; only they define the boundary.</li>
        <li>C trades margin width against training errors (small C = more regularisation).</li>
        <li>Kernels (polynomial, RBF) give non-linear boundaries by implicit high-dimensional mapping.</li>
        <li>RBF γ sets each point’s reach: large γ → complex boundary. Scale features first.</li>
      </KeyPoints>
    </>
  );
}
