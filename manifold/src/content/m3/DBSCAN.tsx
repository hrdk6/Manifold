import { Answer, Code, Compare, Def, H2, H3, KeyPoints, SolverLink, Steps, Table } from '../../components/prose';
import { dbscan } from '../../lib/cluster';
import { DBSCANFigure } from '../../viz/m3';

const PTS = [
  [1, 1],
  [1, 2],
  [2, 2],
  [2, 1],
  [8, 8],
  [8, 9],
  [9, 8],
  [25, 25],
  [26, 25],
  [27, 27],
];
const NAMES = 'ABCDEFGHIJ'.split('');

export default function DBSCAN() {
  const r = dbscan(PTS, 2, 3);
  return (
    <>
      <p>
        DBSCAN (Density-Based Spatial Clustering of Applications with Noise) defines clusters as dense regions separated by sparse ones. It
        does not need the number of clusters in advance, it can find clusters of any shape, and it explicitly labels outliers as noise.
      </p>

      <H2>Parameters and point types</H2>
      <Def term="Parameters">
        <strong>ε (eps)</strong>: the radius of a point’s neighbourhood. <strong>MinPts</strong> (min_samples): the minimum number of points
        (including the point itself) that must lie within ε for the region to count as dense.
      </Def>
      <Table
        head={['Point type', 'Definition']}
        rows={[
          ['Core point', 'Has at least MinPts points (itself included) within distance ε.'],
          ['Border point', 'Has fewer than MinPts neighbours, but lies within ε of a core point.'],
          ['Noise point', 'Neither core nor border: not reachable from any core point. Labelled −1.'],
        ]}
      />

      <H2>The algorithm</H2>
      <Steps>
        <li>
          <strong>Find core points</strong>: for every point, count the points within ε.
        </li>
        <li>
          <strong>Start a cluster</strong> from an unvisited core point.
        </li>
        <li>
          <strong>Expand</strong>: add every point within ε of a core point in the cluster; if an added point is itself a core point, add its
          neighbours too, recursively (density-reachability).
        </li>
        <li>
          <strong>Repeat</strong> from the next unvisited core point to form the next cluster.
        </li>
        <li>
          <strong>Label</strong> every point never reached as noise.
        </li>
      </Steps>
      <DBSCANFigure />

      <H2>Worked example from your notes</H2>
      <p>Ten points with ε = 2 and MinPts = 3.</p>
      <Table
        head={['Point', 'Coordinates', 'Points within ε = 2 (incl. itself)', 'Count', 'Type', 'Cluster']}
        rows={PTS.map((p, i) => [
          NAMES[i],
          `(${p.join(', ')})`,
          r.neighbors[i].map((j) => NAMES[j]).join(', '),
          r.neighbors[i].length,
          r.kind[i],
          r.label[i] >= 0 ? `C${r.label[i] + 1}` : 'noise',
        ])}
        hl={(i) => r.kind[i] === 'core'}
      />
      <p>
        A, B, C and D are all within √2 ≈ 1.41 of each other, so each has 4 neighbours (core) and they form cluster 1. E, F and G each have 3
        (core), forming cluster 2. H and I are 1 apart, but each has only 2 points within ε, and J is 2.24 from I and 2.83 from H, so none of
        them is core: H, I and J are <strong>noise</strong>. Result: two clusters and three noise points.
      </p>
      <SolverLink to="dbscan">Run DBSCAN on any points with full neighbourhood tables</SolverLink>

      <H3>Choosing ε and MinPts</H3>
      <ul>
        <li>ε too small: most points become noise. ε too large: everything merges into one cluster.</li>
        <li>MinPts is often set to at least dimensions + 1 (e.g. 4 or 5 for 2-D data); larger values give fewer, denser clusters.</li>
        <li>
          A <strong>k-distance plot</strong> (sorted distance to each point’s k-th nearest neighbour) shows a knee at a good ε.
        </li>
        <li>Scale the features first: ε is a single distance applied to every direction.</li>
      </ul>

      <H2>DBSCAN versus k-means (SEE ’25 5b, Q9)</H2>
      <Table
        head={['', 'DBSCAN (density-based)', 'k-means (centroid-based)']}
        rows={[
          ['Number of clusters', 'Discovered automatically', 'Must be given (k)'],
          ['Cluster shape', 'Any shape (moons, rings)', 'Convex, roughly spherical'],
          ['Outliers', 'Detected and labelled as noise', 'Forced into some cluster; drag centroids'],
          ['Parameters', 'ε and MinPts', 'k and initialisation'],
          ['Varying density', 'Struggles: one ε cannot fit both dense and sparse clusters', 'Struggles with different sizes'],
          ['Deterministic?', 'Yes (border points may depend on order)', 'No: depends on initial centroids'],
          ['High dimensions', 'Degrades: distances lose meaning', 'Also degrades'],
          ['New points', 'No predict method', 'Assign to the nearest centroid'],
        ]}
      />
      <Compare
        cols={[
          { title: 'Advantages of DBSCAN', items: ['Finds arbitrarily shaped clusters.', 'Automatically identifies noise points.', 'No need to choose k.'] },
          { title: 'Limitations', items: ['Performance degrades with high-dimensional data.', 'Sensitive to ε and MinPts.', 'Cannot handle clusters of very different densities well.'] },
        ]}
      />

      <Code title="dbscan.py">{`
import numpy as np
from sklearn.cluster import DBSCAN

X = np.array([[1, 1], [1, 2], [2, 2], [2, 1], [8, 8], [8, 9], [9, 8],
              [25, 25], [26, 25], [27, 27]])
db = DBSCAN(eps=2, min_samples=3).fit(X)
print(db.labels_)                 # [ 0  0  0  0  1  1  1 -1 -1 -1]
print(db.core_sample_indices_)    # indices of core points
`}</Code>

      <H2>Writing it in the exam</H2>
      <Answer q="Describe the differences between DBSCAN and k-means clustering." marks={5} src="SEE ’25 5b (ii)">
        <p>
          Define each in one or two lines (density-reachability with ε and MinPts; centroids with k), draw the two-moons picture where k-means
          cuts each moon in half and DBSCAN finds both, then give the comparison table.
        </p>
      </Answer>

      <KeyPoints>
        <li>DBSCAN clusters dense regions using ε (radius) and MinPts (density threshold).</li>
        <li>Core: ≥ MinPts within ε. Border: near a core point. Noise: neither.</li>
        <li>Finds clusters of any shape and labels outliers; no k needed.</li>
        <li>Sensitive to ε and MinPts, struggles with varying density and high dimensions.</li>
        <li>Notes example: clusters {'{'}A, B, C, D{'}'} and {'{'}E, F, G{'}'}; H, I, J are noise.</li>
      </KeyPoints>
    </>
  );
}
