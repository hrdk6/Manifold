import { MB } from '../../components/Math';
import { Answer, Code, Compare, Def, H2, H3, KeyPoints, Note, SolverLink, Steps, Table } from '../../components/prose';
import { fx } from '../../lib/fmt';
import { kmeansTrace } from '../../lib/cluster';
import { KMeansFigure } from '../../viz/m3';

export default function KMeans() {
  const q21 = [
    [2, 3],
    [3, 4],
    [5, 6],
    [8, 8],
    [9, 10],
  ];
  const tr = kmeansTrace(q21, [q21[0], q21[4]], 10);
  const q22 = [
    [1, 1],
    [2, 1],
    [1, 2],
    [10, 10],
    [10, 12],
    [12, 10],
  ];
  const tr22 = kmeansTrace(q22, [q22[0], q22[3]], 10);
  const last22 = tr22[tr22.length - 1];
  return (
    <>
      <p>
        Clustering partitions a dataset into groups called clusters, so that points in the same cluster are similar and points in different
        clusters are different. k-means is the simplest and most commonly used clustering algorithm.
      </p>

      <H2>Clustering</H2>
      <Def term="Clustering">
        The task of partitioning data into groups (clusters) such that items within a cluster are more similar to each other than to items in
        other clusters. Like classification, every point gets a label, but the labels have no prior meaning.
      </Def>
      <p>
        Three clustering algorithms in your syllabus (Q18): <strong>k-means</strong> (centroid-based), <strong>agglomerative / hierarchical</strong>{' '}
        (connectivity-based) and <strong>DBSCAN</strong> (density-based).
      </p>

      <H2>The k-means algorithm</H2>
      <p>
        k-means tries to find cluster centres (centroids) that represent regions of the data. It minimises the{' '}
        <strong>within-cluster sum of squares</strong> (inertia):
      </p>
      <MB>{'J = \\sum_{j=1}^{k} \\sum_{x \\in C_j} \\lVert x - \\mu_j \\rVert^2'}</MB>
      <Steps>
        <li>
          <strong>Choose k</strong>, the number of clusters.
        </li>
        <li>
          <strong>Initialise</strong> k centroids, e.g. k randomly chosen data points.
        </li>
        <li>
          <strong>Assign</strong> each point to the nearest centroid (Euclidean distance).
        </li>
        <li>
          <strong>Update</strong> each centroid to the mean of the points assigned to it.
        </li>
        <li>
          <strong>Repeat</strong> assign and update until the assignments no longer change (or a maximum number of iterations).
        </li>
      </Steps>
      <KMeansFigure />

      <H2>Worked example (Q21): k = 2 on (2,3), (3,4), (5,6), (8,8), (9,10)</H2>
      <p>Take the first and last points as initial centroids: C₁ = (2, 3), C₂ = (9, 10).</p>
      {tr.map((it, n) => (
        <div key={n}>
          <H3>Iteration {n + 1}</H3>
          <Table
            head={['Point', `d to C₁ (${it.centroids[0].map((v) => fx(v, 2)).join(', ')})`, `d to C₂ (${it.centroids[1].map((v) => fx(v, 2)).join(', ')})`, 'Cluster']}
            numeric={[1, 2]}
            rows={q21.map((p, i) => [`(${p.join(', ')})`, fx(it.dists[i][0], 3), fx(it.dists[i][1], 3), `C${it.assign[i] + 1}`])}
            hl={(i) => it.assign[i] === 0}
          />
          <p>
            New centroids: C₁ = ({it.newCentroids[0].map((v) => fx(v, 3)).join(', ')}), C₂ = ({it.newCentroids[1].map((v) => fx(v, 3)).join(', ')}).{' '}
            {n === tr.length - 1 ? 'The centroids did not move, so the algorithm has converged.' : ''}
          </p>
        </div>
      ))}
      <p>
        <strong>Result:</strong> Cluster 1 = {'{'}(2,3), (3,4), (5,6){'}'} with centroid ({fx(tr[tr.length - 1].newCentroids[0][0], 3)},{' '}
        {fx(tr[tr.length - 1].newCentroids[0][1], 3)}); Cluster 2 = {'{'}(8,8), (9,10){'}'} with centroid (8.5, 9).
      </p>
      <p>
        <strong>Q22</strong>, k = 2 on (1,1), (2,1), (1,2), (10,10), (10,12), (12,10), starting from (1,1) and (10,10), converges after{' '}
        {tr22.length} iteration{tr22.length > 1 ? 's' : ''} to centroids ({last22.newCentroids[0].map((v) => fx(v, 3)).join(', ')}) and (
        {last22.newCentroids[1].map((v) => fx(v, 3)).join(', ')}): the three points near the origin and the three near (10, 10).
      </p>
      <SolverLink to="kmeans">Run k-means step by step on any points</SolverLink>

      <H2>Practical issues</H2>
      <H3>Initialisation</H3>
      <p>
        k-means converges to a <em>local</em> minimum that depends on the starting centroids. Remedies: run several times with different
        starts and keep the lowest inertia (<code>n_init</code> in scikit-learn), and use <strong>k-means++</strong>, which spreads the initial
        centroids out by choosing each new one with probability proportional to its squared distance from the existing ones.
      </p>
      <H3>Choosing k</H3>
      <ul>
        <li>
          <strong>Elbow method</strong>: plot inertia against k; inertia always falls as k grows, so look for the “elbow” where adding clusters
          stops helping much.
        </li>
        <li>
          <strong>Silhouette score</strong>: how much closer each point is to its own cluster than to the next one (−1 to 1); choose k with the
          highest average.
        </li>
        <li>Domain knowledge: the number of customer segments a business can act on.</li>
      </ul>
      <H3>Limitations</H3>
      <Compare
        cols={[
          { title: 'Assumes', items: ['Clusters are convex and roughly spherical (all directions equally important).', 'Clusters have similar sizes and densities.', 'k is known in advance.'] },
          { title: 'Fails on', items: ['Elongated or curved shapes (two moons, rings).', 'Clusters of very different size or density.', 'Outliers, which drag centroids; every point must belong to a cluster.', 'Unscaled features (see the scaling lesson).'] },
        ]}
      />
      <Note kind="tip">
        <strong>Vector quantisation.</strong> k-means can also be seen as compression: each point is represented by its nearest centroid. Using
        more clusters than there are “real” groups gives a rich encoding of the data that can feed other models; colour quantisation of images
        works this way.
      </Note>
      <H3>Applications</H3>
      <p>Customer segmentation, image compression, document clustering, anomaly detection (points far from every centroid).</p>

      <Code title="kmeans.py">{`
import numpy as np
from sklearn.cluster import KMeans

X = np.array([[2, 3], [3, 4], [5, 6], [8, 8], [9, 10]])
km = KMeans(n_clusters=2, init=np.array([[2, 3], [9, 10]]), n_init=1)
km.fit(X)
print(km.labels_)            # [0 0 0 1 1]
print(km.cluster_centers_)   # [[3.333 4.333] [8.5 9.]]
print(km.inertia_)           # within-cluster sum of squares
`}</Code>

      <H2>Writing it in the exam</H2>
      <Answer q="Apply k-means with k = 2 and show the intermediate steps. (Q21, Q22)" marks={10}>
        <p>
          State the algorithm, the chosen initial centroids, then for every iteration a table of distances to each centroid with the assignment,
          followed by the recalculated centroids (show the averaging). Stop when assignments repeat, state the final clusters and centroids, and
          sketch them on a 2-D plot with the centroids marked.
        </p>
      </Answer>

      <KeyPoints>
        <li>k-means minimises within-cluster squared distance by alternating assign and update.</li>
        <li>Converges to a local minimum; use several starts or k-means++.</li>
        <li>Choose k with the elbow method or silhouette score.</li>
        <li>Works for convex, similar-sized clusters; fails on curved shapes; needs scaled features.</li>
        <li>Q21 result: {'{'}(2,3), (3,4), (5,6){'}'} and {'{'}(8,8), (9,10){'}'}.</li>
      </KeyPoints>
    </>
  );
}
