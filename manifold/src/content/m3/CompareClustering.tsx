import { MB } from '../../components/Math';
import { Answer, Compare, H2, H3, KeyPoints, Note, Table } from '../../components/prose';
import { CompareClusteringFigure } from '../../viz/m3';

export default function CompareClustering() {
  return (
    <>
      <p>
        Clustering is easy to run and hard to evaluate. Without labels there is no accuracy to compute, and different algorithms (or different
        parameters) can give very different answers. This lesson collects the tools for judging a clustering, and two recurring exam themes: the
        choice of distance metric and the effect of sparse data.
      </p>

      <CompareClusteringFigure />

      <H2>Evaluating with ground truth</H2>
      <p>
        When true labels exist (for example, when testing an algorithm on a benchmark), compare the clustering with them using a score that
        ignores the arbitrary cluster numbering:
      </p>
      <ul>
        <li>
          <strong>Adjusted Rand Index (ARI)</strong>: agreement between two partitions, corrected for chance. 1 = identical, about 0 = random,
          can be negative.
        </li>
        <li>
          <strong>Normalised Mutual Information (NMI)</strong>: shared information between the partitions, between 0 and 1.
        </li>
      </ul>
      <Note kind="warn">
        Do not use classification accuracy: cluster 0 in the result might correspond to class 2 in the truth. ARI and NMI are invariant to how
        clusters are numbered.
      </Note>

      <H2>Evaluating without ground truth</H2>
      <p>
        The usual case. Internal measures judge compactness and separation:
      </p>
      <MB>{'s(i) = \\frac{b(i) - a(i)}{\\max\\{a(i), b(i)\\}}'}</MB>
      <p>
        <strong>Silhouette coefficient</strong>: a(i) is the mean distance from point i to the others in its own cluster, b(i) the mean distance
        to the nearest other cluster. It ranges from −1 to 1; higher means tight, well-separated clusters. Its bias: it favours compact, convex
        clusters, so it scores DBSCAN’s correct two-moons answer worse than k-means’ wrong one. Inertia (for k-means), the elbow method, and above
        all <strong>manual inspection</strong> by someone who knows the domain complete the toolkit.
      </p>

      <H2>Choosing the right distance metric (Q10, Q20)</H2>
      <p>
        Every clustering algorithm decides “similar” through a distance or similarity measure, so the metric shapes the clusters as much as the
        algorithm does.
      </p>
      <Table
        head={['Metric', 'Suits', 'Example']}
        rows={[
          ['Euclidean', 'Continuous, scaled features of comparable importance; compact clusters', 'Customer age and income (after scaling)'],
          ['Manhattan', 'Grid-like data, robustness to single large differences', 'City-block travel distance; high-dimensional data'],
          ['Cosine', 'Direction matters, magnitude does not', 'Text documents of different lengths'],
          ['Hamming / Jaccard', 'Categorical or binary features', 'Survey answers, market baskets'],
          ['Mahalanobis', 'Correlated features with different variances', 'Multivariate measurements'],
        ]}
      />
      <ul>
        <li>The wrong metric produces meaningless groups even with the right algorithm.</li>
        <li>Metrics interact with scaling: Euclidean distance on unscaled data is dominated by large-range features.</li>
        <li>In high dimensions Euclidean distances concentrate; cosine or dimensionality reduction often help.</li>
      </ul>

      <H2>Data sparsity (Q11)</H2>
      <p>
        Sparse data has most values zero or missing (word counts in documents, user–item ratings), or few samples relative to the number of
        dimensions.
      </p>
      <Compare
        cols={[
          {
            title: 'Effects',
            items: [
              'Distances become uninformative: most pairs share few non-zero features.',
              'Density-based methods find no dense regions; everything looks like noise.',
              'Centroids of k-means become averages of mostly zeros.',
              'PCA and covariance estimates are unstable with few samples per dimension.',
              'Higher risk of finding spurious clusters.',
            ],
          },
          {
            title: 'Remedies',
            items: [
              'Use metrics suited to sparsity (cosine, Jaccard).',
              'Reduce dimensions first (PCA / truncated SVD, NMF).',
              'Feature selection to drop near-empty features.',
              'Imputation or aggregation to densify; collect more data.',
              'Use sparse-matrix data structures for efficiency.',
            ],
          },
        ]}
      />

      <H3>Choosing an algorithm</H3>
      <Table
        head={['Situation', 'Good first choice']}
        rows={[
          ['Large data, roughly spherical clusters, k known', 'k-means'],
          ['Unknown k, want the hierarchy, small data', 'Agglomerative clustering'],
          ['Arbitrary shapes, noise present', 'DBSCAN'],
          ['Very high-dimensional data', 'Reduce dimensions first, then cluster'],
        ]}
      />

      <H2>Writing it in the exam</H2>
      <Answer q="Evaluate the importance of choosing the right distance metric in clustering algorithms. (Q10, Q20)" marks={10}>
        <p>
          Explain that clustering is defined by similarity; list four metrics with formula, suited data and example; show with a sketch how
          Euclidean versus cosine can group the same points differently; discuss interaction with scaling and high dimensionality; conclude with
          how to choose (data type, domain knowledge, validation with silhouette or ARI).
        </p>
      </Answer>

      <KeyPoints>
        <li>With labels: ARI or NMI (never plain accuracy). Without: silhouette, inertia/elbow, inspection.</li>
        <li>The distance metric defines similarity: Euclidean, Manhattan, cosine, Hamming/Jaccard.</li>
        <li>Sparse data makes distances and densities unreliable; reduce dimensions and choose sparse-friendly metrics.</li>
        <li>No algorithm is best everywhere; match it to cluster shape, size and noise.</li>
      </KeyPoints>
    </>
  );
}
