import { MB } from '../../components/Math';
import { Answer, Code, Def, H2, H3, KeyPoints, Note, SolverLink, Steps, Table } from '../../components/prose';
import { Work } from '../../lab/ui';
import { TSNEFigure } from '../../viz/m3';
import { TSNEWork } from '../../viz/work';

export default function TSNE() {
  return (
    <>
      <p>
        PCA is linear: it can rotate and drop axes, but it cannot unfold curved structure. Manifold-learning algorithms allow far more complex
        mappings and often produce much better visualisations. The most popular is t-SNE, t-distributed Stochastic Neighbour Embedding, by van
        der Maaten and Hinton (2008).
      </p>

      <H2>The idea</H2>
      <Def term="t-SNE">
        A non-linear dimensionality-reduction technique, mainly for visualisation, that finds a 2-D (or 3-D) representation in which points that
        are close in the original space stay close, by matching the neighbour probabilities of the two spaces.
      </Def>
      <p>
        t-SNE starts from a random 2-D arrangement and moves the points step by step so that neighbours in the original feature space become
        neighbours in the picture. It puts much more emphasis on preserving local neighbourhoods than on preserving large distances: it tries to
        keep nearby points together, not to keep far points exactly as far.
      </p>
      <TSNEFigure />

      <H2>How it works</H2>
      <Steps>
        <li>
          <strong>High-dimensional similarities.</strong> For each point i, convert distances to probabilities with a Gaussian centred on i:
          <MB>{'p_{j\\mid i} = \\frac{\\exp(-\\lVert x_i - x_j \\rVert^2 / 2\\sigma_i^2)}{\\sum_{k \\neq i} \\exp(-\\lVert x_i - x_k \\rVert^2 / 2\\sigma_i^2)}'}</MB>
          Each <em>σᵢ</em> is chosen so that the effective number of neighbours matches the <strong>perplexity</strong> (typically 5–50).
        </li>
        <li>
          <strong>Symmetrise:</strong> <MB>{'p_{ij} = \\frac{p_{j\\mid i} + p_{i\\mid j}}{2n}'}</MB>
        </li>
        <li>
          <strong>Low-dimensional similarities</strong> use a heavy-tailed Student t-distribution (one degree of freedom):
          <MB>{'q_{ij} = \\frac{(1 + \\lVert y_i - y_j \\rVert^2)^{-1}}{\\sum_{k \\neq l} (1 + \\lVert y_k - y_l \\rVert^2)^{-1}}'}</MB>
          The heavy tails let moderately distant points sit far apart in 2-D, which avoids crowding everything into the centre.
        </li>
        <li>
          <strong>Minimise the KL divergence</strong> between P and Q by gradient descent on the positions yᵢ:
          <MB>{'KL(P\\,\\|\\,Q) = \\sum_{i \\neq j} p_{ij} \\ln \\frac{p_{ij}}{q_{ij}}'}</MB>
        </li>
      </Steps>

      <H2>Worked example from your notes</H2>
      <p>
        Three points A = (0, 0), B = (1, 1), C = (5, 5), mapped to 1-D. With σ = 1 the calculations are:
      </p>
      <Work>
        <TSNEWork pts={[[0, 0], [1, 1], [5, 5]]} names={['A', 'B', 'C']} sigma={1} y1={[0, 1, 4]} />
      </Work>
      <Note kind="warn" title="A small slip in the notes">
        The notes write exp(−2/2) = 0.1353, but exp(−1) = 0.3679 (0.1353 is exp(−2)). Because the competing term exp(−25) is tiny, p(B | A) is
        still ≈ 1 either way, so the conclusion is unchanged. The suggested result y = (0, 1, 4) keeps A and B together and C far away.
      </Note>
      <SolverLink to="tsne">Compute t-SNE similarities for your own points</SolverLink>

      <H3>Perplexity and other practicalities</H3>
      <ul>
        <li>
          <strong>Perplexity</strong> ≈ the number of neighbours each point considers. Low values emphasise very local structure (many small
          clumps); high values give more global structure. Results can change a lot with it.
        </li>
        <li>
          <strong>Randomness</strong>: different initialisations give different (but similar-looking) maps.
        </li>
        <li>
          <strong>Cluster sizes and distances between clusters are not meaningful</strong> in a t-SNE plot; only the grouping is.
        </li>
        <li>
          <strong>No transform for new data</strong>: scikit-learn’s TSNE has no <code>transform</code> method, only{' '}
          <code>fit_transform</code>. It is for exploring data, not for preprocessing a model.
        </li>
        <li>
          <strong>Slow</strong>: O(n²) in its exact form (Barnes–Hut approximation O(n log n)). Often PCA to ~50 dimensions is applied first.
        </li>
      </ul>

      <H2>PCA versus t-SNE (SEE ’25 5b, Q6)</H2>
      <Table
        head={['', 'PCA', 't-SNE']}
        rows={[
          ['Type', 'Linear projection', 'Non-linear manifold learning'],
          ['Preserves', 'Global structure: directions of maximum variance', 'Local structure: neighbourhoods'],
          ['Method', 'Eigen-decomposition of the covariance matrix (closed form)', 'Iterative optimisation of KL divergence (gradient descent)'],
          ['Deterministic?', 'Yes', 'No: depends on random initialisation'],
          ['Hyperparameters', 'Number of components', 'Perplexity, learning rate, iterations'],
          ['New data', 'transform() projects new points', 'No transform; must re-run'],
          ['Speed', 'Fast, scales to large data', 'Slow, O(n²) exact'],
          ['Interpretability', 'Components are weighted sums of features; explained variance', 'Axes have no meaning; only proximity matters'],
          ['Typical use', 'Preprocessing, compression, noise reduction, quick visualisation', 'Visualising clusters in complex data (images, genes, embeddings)'],
        ]}
      />

      <Code title="tsne_vs_pca.py">{`
from sklearn.datasets import load_digits
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE

digits = load_digits()                       # 1797 images, 64 features
X_pca = PCA(n_components=2).fit_transform(digits.data)
X_tsne = TSNE(n_components=2, perplexity=30, random_state=42).fit_transform(digits.data)
# plot each with points coloured (or labelled) by digits.target
`}</Code>

      <H2>Writing it in the exam</H2>
      <Answer q="Describe the differences between PCA and t-SNE." marks={5} src="SEE ’25 5b (i)">
        <p>
          One line defining each, then the comparison table (at least six rows). Add a sketch: PCA on digits shows overlapping groups, t-SNE shows
          ten separated clusters. Finish with when to use which.
        </p>
      </Answer>

      <KeyPoints>
        <li>t-SNE is a non-linear method for visualising high-dimensional data in 2-D or 3-D.</li>
        <li>It converts distances to neighbour probabilities (Gaussian in high-D, Student-t in low-D) and minimises their KL divergence.</li>
        <li>Perplexity sets the effective number of neighbours.</li>
        <li>It preserves local structure; distances between clusters are not meaningful; no transform for new data.</li>
        <li>PCA: linear, fast, deterministic, global variance. t-SNE: non-linear, slow, random, local neighbourhoods.</li>
      </KeyPoints>
    </>
  );
}
