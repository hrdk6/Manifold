import { M, MB } from '../../components/Math';
import { Answer, Code, Compare, Def, H2, H3, KeyPoints, Note, SolverLink, Steps, Table } from '../../components/prose';
import { Work } from '../../lab/ui';
import { CurseFigure, DigitsPCAFigure, PCAFigure } from '../../viz/m3';
import { EigenWork, PCAWork } from '../../viz/work';

export default function PCA() {
  return (
    <>
      <p>
        Real datasets often have dozens or thousands of features, many of them redundant. Dimensionality reduction finds a smaller set of
        features that keeps most of the information. Principal Component Analysis (PCA) is the classic method, and it is the most heavily
        examined topic in Module 3: both a 10-mark theory question and two numericals on the SEE.
      </p>

      <H2>Why reduce dimensions?</H2>
      <H3>The curse of dimensionality</H3>
      <p>
        As the number of features grows, the volume of the feature space grows exponentially, so a fixed number of samples becomes extremely
        sparse. Distances between points concentrate (the nearest and farthest neighbours end up almost equally far away), models need far more
        data to generalise, overfitting becomes easier, and computation becomes expensive.
      </p>
      <CurseFigure />
      <p>Dimensionality reduction mitigates the curse (Q7, Q16, Q17) by:</p>
      <ul>
        <li>
          <strong>Removing redundancy</strong>: correlated features are merged into one component.
        </li>
        <li>
          <strong>Reducing noise</strong>: low-variance directions, often mostly noise, are dropped.
        </li>
        <li>
          <strong>Restoring meaningful distances</strong> for k-NN and clustering, which work better in fewer dimensions.
        </li>
        <li>
          <strong>Improving efficiency</strong>: fewer features means less memory, faster training and prediction, and smaller models.
        </li>
        <li>
          <strong>Enabling visualisation</strong>: projecting to 2 or 3 dimensions lets us see the data.
        </li>
      </ul>

      <H3>Feature extraction versus feature selection (Q8)</H3>
      <Compare
        cols={[
          {
            title: 'Feature extraction',
            items: [
              'Creates new features as combinations of the original ones.',
              'Example: PCA’s components are weighted sums of all original features; t-SNE coordinates; NMF parts.',
              'Can capture more information in fewer features, but new features may be hard to interpret.',
            ],
          },
          {
            title: 'Feature selection',
            items: [
              'Keeps a subset of the original features unchanged.',
              'Example: keep “age” and “income”, drop “customer ID”; filter, wrapper and embedded methods (Module 4).',
              'Interpretable, but cannot merge correlated features into one.',
            ],
          },
        ]}
      />

      <H2>Principal Component Analysis</H2>
      <Def term="PCA">
        A linear, unsupervised method that rotates the data onto new orthogonal axes, the <strong>principal components</strong>, ordered so the
        first captures the maximum possible variance, the second the maximum remaining variance while being perpendicular to the first, and so
        on. Keeping only the first k components reduces the dimensionality with minimal loss of variance.
      </Def>
      <PCAFigure />

      <H3>The algorithm</H3>
      <Steps>
        <li>
          <strong>Standardise or centre</strong> the data: subtract each feature’s mean (and divide by its standard deviation if the features
          have different units).
        </li>
        <li>
          <strong>Compute the covariance matrix</strong>{' '}
          <M>{'C = \\frac{1}{n-1} X_c^{\\top} X_c'}</M>, where <M>{'C_{jk} = \\text{Cov}(x_j, x_k)'}</M>.
        </li>
        <li>
          <strong>Eigen-decompose</strong> C: solve <M>{'\\det(C - \\lambda I) = 0'}</M> for the eigenvalues λ and{' '}
          <M>{'(C - \\lambda I)v = 0'}</M> for the eigenvectors v.
        </li>
        <li>
          <strong>Sort</strong> eigenvectors by decreasing eigenvalue. Eigenvalue = variance along that eigenvector.
        </li>
        <li>
          <strong>Choose k</strong> components (e.g. enough to explain 90–95% of the variance).
        </li>
        <li>
          <strong>Project</strong>: <M>{'Z = X_c W_k'}</M>, where the columns of <M>{'W_k'}</M> are the top k unit eigenvectors.
        </li>
      </Steps>
      <MB>{'\\text{Explained variance ratio of PC}_i = \\frac{\\lambda_i}{\\sum_j \\lambda_j}'}</MB>

      <H2>Numerical 1: eigenvalues of a covariance matrix (SEE ’25 6a)</H2>
      <p>
        Given <M>{'C = \\begin{bmatrix} 4 & 2 \\\\ 2 & 3 \\end{bmatrix}'}</M>, find the eigenvalues, eigenvectors and principal directions.
      </p>
      <Work>
        <EigenWork a={4} b={2} d={3} />
      </Work>
      <SolverLink to="eigen">Try another covariance matrix</SolverLink>

      <H2>Numerical 2: reduce 2-D data to 1-D (SEE ’25 5a)</H2>
      <p>
        Data: X1 = (2, 0, 1, 3, 5), X2 = (4, 0, 1, 3, 5). Reduce from two dimensions to one.
      </p>
      <Work>
        <PCAWork x1={[2, 0, 1, 3, 5]} x2={[4, 0, 1, 3, 5]} />
      </Work>
      <Code title="pca_steps.py — code for each step (the SEE asks for this)">{`
import numpy as np

X = np.array([[2, 4], [0, 0], [1, 1], [3, 3], [5, 5]], dtype=float)

# Step 1: centre the data
mean = X.mean(axis=0)                       # [2.2, 2.6]
Xc = X - mean

# Step 2: covariance matrix (n - 1 in the denominator)
C = np.cov(Xc, rowvar=False)                # [[3.7, 3.6], [3.6, 4.3]]

# Step 3: eigenvalues and eigenvectors (eigh: for symmetric matrices)
eigvals, eigvecs = np.linalg.eigh(C)

# Step 4: sort by decreasing eigenvalue
order = np.argsort(eigvals)[::-1]
eigvals, eigvecs = eigvals[order], eigvecs[:, order]

# Step 5: keep k = 1 component and project
W = eigvecs[:, :1]
Z = Xc @ W                                  # 1-D representation
print(eigvals, eigvals / eigvals.sum())     # variance and explained ratio
print(Z.ravel())

# The same with scikit-learn (signs of components may be flipped)
from sklearn.decomposition import PCA
pca = PCA(n_components=1)
print(pca.fit_transform(X).ravel(), pca.explained_variance_ratio_)
`}</Code>
      <Note kind="tip" title="Signs are arbitrary">
        An eigenvector and its negative describe the same direction. NumPy or scikit-learn may return PC1 with the opposite sign, which flips
        all the projected scores. Both answers are correct; just be consistent.
      </Note>
      <SolverLink to="pca">Solve PCA for your own data</SolverLink>

      <H3>The classic textbook example</H3>
      <p>
        Your handwritten notes use the points (4, 11), (8, 4), (13, 5), (7, 14). Means (8, 8.5); Var(x₁) = 14, Var(x₂) = 23, Cov = −11;
        λ² − 37λ + 201 = 0 gives λ₁ = 30.385, λ₂ = 6.615; e₁ = (0.5574, −0.8303); PC1 scores −4.3052, 3.7361, 5.6928, −5.1238. Load it in
        the PCA solver to see every line.
      </p>

      <H2>How many components?</H2>
      <DigitsPCAFigure />
      <ul>
        <li>
          <strong>Explained-variance threshold</strong>: keep the smallest k whose cumulative ratio reaches, say, 95%.
        </li>
        <li>
          <strong>Scree plot / elbow</strong>: plot eigenvalues in decreasing order and stop where they level off.
        </li>
        <li>
          <strong>Purpose</strong>: k = 2 or 3 for visualisation; whatever gives the best downstream accuracy for preprocessing.
        </li>
      </ul>

      <H2>PCA from 50 dimensions to 2 (Q12)</H2>
      <p>
        With 1000 samples × 50 features: standardise all 50 features, compute the 50 × 50 covariance matrix, take its two eigenvectors with the
        largest eigenvalues, and project each sample onto them to get a 1000 × 2 matrix. Plot the two columns as a scatter plot (coloured by
        class if labels exist) and report the explained-variance ratio so the reader knows how much information the picture keeps.
      </p>
      <Code title="pca_50_to_2.py">{`
import numpy as np
import matplotlib.pyplot as plt
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

X = np.random.rand(1000, 50)                 # stand-in for the real data
X_scaled = StandardScaler().fit_transform(X)

pca = PCA(n_components=2)
X_2d = pca.fit_transform(X_scaled)           # shape (1000, 2)
print("explained variance:", pca.explained_variance_ratio_)
print("components shape:", pca.components_.shape)   # (2, 50)

plt.scatter(X_2d[:, 0], X_2d[:, 1], s=8, alpha=0.7)
plt.xlabel("PC1"); plt.ylabel("PC2"); plt.title("PCA: 50-D to 2-D")
plt.show()
`}</Code>

      <H2>Limitations of PCA</H2>
      <Table
        head={['Limitation', 'Consequence']}
        rows={[
          ['Linear', 'Cannot unfold curved structure (a spiral or a “Swiss roll”); use manifold learning such as t-SNE.'],
          ['Scale-sensitive', 'Features with large variance dominate; standardise first unless units are comparable.'],
          ['Maximises variance, not class separation', 'The highest-variance direction is not necessarily the one that separates classes (LDA targets that).'],
          ['Hard to interpret', 'Each component mixes all original features.'],
          ['Sensitive to outliers', 'An outlier can tilt a component toward itself.'],
        ]}
      />
      <p>
        <strong>Non-negative matrix factorisation (NMF)</strong> is a related extraction method for non-negative data (images, word counts) that
        expresses each sample as an additive combination of non-negative “parts”, which is often easier to interpret than PCA’s signed
        components.
      </p>

      <H2>Writing it in the exam</H2>
      <Answer q="Reduce the given 2-D dataset to 1-D with PCA, showing code for each step." marks={10} src="SEE ’25 5a">
        <p>
          Follow the five steps above with full arithmetic: means, centred table with squares and products, covariance matrix, characteristic
          equation and eigenvalues, eigenvector for λ₁ normalised, and the projection table. Then give the NumPy code with a comment per step and
          a one-line conclusion with the variance retained.
        </p>
      </Answer>
      <Answer q="Analyse how dimensionality reduction techniques can mitigate the curse of dimensionality. (Q7)" marks={10}>
        <p>
          Explain the curse (exponential volume, sparsity, distance concentration, overfitting, cost), then how PCA (and t-SNE for visualisation)
          counters each, with the 50 → 2 example and a short code snippet; mention feature selection as the alternative and the limits of PCA.
        </p>
      </Answer>

      <KeyPoints>
        <li>The curse of dimensionality: sparse data, meaningless distances, overfitting, high cost.</li>
        <li>Extraction (PCA) builds new features; selection keeps some original ones.</li>
        <li>PCA: centre → covariance → eigen-decompose → sort → keep top k → project.</li>
        <li>[[4, 2], [2, 3]]: λ² − 7λ + 8 = 0, λ = 5.562 and 1.438, PC1 ∝ (1, 0.781).</li>
        <li>Eigenvalue = variance along its eigenvector; choose k by cumulative explained variance.</li>
      </KeyPoints>
    </>
  );
}
