import { MB } from '../../components/Math';
import { Answer, Code, H2, H3, KeyPoints, SolverLink, Steps, Table } from '../../components/prose';
import { DendrogramFigure } from '../../viz/m3';

export default function Hierarchical() {
  return (
    <>
      <p>
        Agglomerative clustering builds clusters bottom-up. It needs no initial centroids, produces a whole hierarchy of clusterings at once, and
        draws its result as a tree called a dendrogram. It is the most common form of hierarchical clustering.
      </p>

      <H2>The algorithm</H2>
      <Steps>
        <li>
          <strong>Start</strong> with every point as its own cluster (n clusters).
        </li>
        <li>
          <strong>Compute</strong> the distance between every pair of clusters.
        </li>
        <li>
          <strong>Merge</strong> the two closest clusters into one.
        </li>
        <li>
          <strong>Repeat</strong> until the desired number of clusters remains (or one cluster, to build the full tree).
        </li>
      </Steps>
      <p>
        The opposite, top-down approach (divisive clustering) starts with one cluster and repeatedly splits it, but it is rarely used.
      </p>

      <H3>Linkage: distance between clusters</H3>
      <Table
        head={['Linkage', 'Distance between clusters A and B', 'Behaviour']}
        rows={[
          ['Single', <MB key="s">{'\\min_{a \\in A, b \\in B} d(a, b)'}</MB>, 'Follows chains of close points; finds elongated shapes but can “chain” distinct clusters together.'],
          ['Complete (maximum)', <MB key="c">{'\\max_{a \\in A, b \\in B} d(a, b)'}</MB>, 'Compact clusters of similar diameter; sensitive to outliers.'],
          ['Average', <MB key="a">{'\\frac{1}{|A||B|}\\sum_{a,b} d(a, b)'}</MB>, 'A compromise between single and complete.'],
          ['Ward (scikit-learn default)', 'merge the pair that least increases the total within-cluster variance', 'Similar-sized, compact clusters; behaves like k-means.'],
        ]}
      />
      <DendrogramFigure />

      <H3>Reading a dendrogram</H3>
      <p>
        The leaves are the data points; each horizontal join is a merge, drawn at the height of the distance between the two clusters it
        joins. To get k clusters, cut the tree with a horizontal line that crosses k vertical branches. Long vertical branches mean the merged
        clusters were far apart, so a cut through the longest gap gives a natural number of clusters.
      </p>
      <SolverLink to="hierarchical">Work through a distance matrix merge by merge</SolverLink>

      <H2>Hierarchical clustering versus k-means (Q19)</H2>
      <Table
        head={['', 'Agglomerative (hierarchical)', 'k-means']}
        rows={[
          ['Approach', 'Bottom-up merging of the closest clusters', 'Iterative assignment to the nearest of k centroids'],
          ['Number of clusters', 'Not needed in advance; cut the dendrogram anywhere', 'k must be chosen in advance'],
          ['Output', 'A full hierarchy (dendrogram)', 'One flat partition'],
          ['Deterministic?', 'Yes', 'No: depends on the initial centroids'],
          ['Cluster shapes', 'Depends on linkage; single linkage follows non-convex shapes', 'Convex, roughly spherical'],
          ['Complexity', 'At least O(n²) memory and time: unsuitable for very large n', 'O(n·k·iterations): scales to large data'],
          ['New points', 'Cannot assign new data (no predict)', 'Assign to the nearest centroid'],
          ['Revisiting merges', 'A merge is never undone', 'Points can move between clusters every iteration'],
        ]}
      />

      <Code title="agglomerative.py">{`
from sklearn.cluster import AgglomerativeClustering
from scipy.cluster.hierarchy import dendrogram, linkage
import matplotlib.pyplot as plt

agg = AgglomerativeClustering(n_clusters=3, linkage="ward")
labels = agg.fit_predict(X)          # no separate predict for new points

Z = linkage(X, method="ward")        # SciPy builds the full merge tree
dendrogram(Z)
plt.ylabel("cluster distance")
plt.show()
`}</Code>

      <H2>Writing it in the exam</H2>
      <Answer q="Explain the differences between hierarchical clustering and k-means clustering. (Q19)" marks={10}>
        <p>
          Describe both algorithms with their steps, draw a small dendrogram with a cut line and a k-means sketch with centroids, then give the
          comparison table. Mention the linkage types for hierarchical clustering and initialisation sensitivity for k-means.
        </p>
      </Answer>

      <H2>Summary</H2>
      <H3>When to use it</H3>
      <p>
        Use agglomerative clustering on small-to-medium datasets when you want to see the structure at every level, do not know k in advance, or
        need a deterministic result. Use k-means for large datasets with roughly spherical clusters.
      </p>

      <KeyPoints>
        <li>Agglomerative clustering starts with singletons and repeatedly merges the two closest clusters.</li>
        <li>Linkage defines cluster distance: single (min), complete (max), average, Ward (variance).</li>
        <li>The dendrogram shows every merge; cut it to choose the number of clusters.</li>
        <li>Unlike k-means: no k in advance, deterministic, hierarchical, but O(n²) and no prediction for new points.</li>
      </KeyPoints>
    </>
  );
}
