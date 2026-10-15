import { Answer, Compare, Def, H2, H3, KeyPoints, Note, Table } from '../../components/prose';
import { LabelsFigure } from '../../viz/m3';

export default function Unsupervised() {
  return (
    <>
      <p>
        Most of the world’s data has no labels. Server logs, customer transactions, photos, sensor streams: nobody has annotated them with the
        “right answer”. Unsupervised learning extracts knowledge from such data. The learner gets only the inputs and must find structure on
        its own.
      </p>

      <H2>Definition and characteristics</H2>
      <Def term="Unsupervised learning">
        A type of machine learning in which a model learns patterns, structure and relationships from data that has no labelled outcomes. It
        is used to uncover hidden structure, often for exploratory analysis or to create features for other models.
      </Def>
      <ul>
        <li>
          <strong>No labelled data</strong>: only input variables X; no input–output pairs.
        </li>
        <li>
          <strong>Pattern discovery</strong>: the goal is to identify groups, directions of variation or distributions.
        </li>
        <li>
          <strong>Self-organised learning</strong>: the model organises the data by inherent similarities and differences.
        </li>
      </ul>
      <LabelsFigure />

      <H2>Types of unsupervised learning</H2>
      <Compare
        cols={[
          {
            title: 'Unsupervised transformations',
            items: [
              'Create a new representation of the data that may be easier to understand or to learn from.',
              <>
                <strong>Dimensionality reduction</strong>: summarise many features with a few (PCA, t-SNE), for example to plot data in 2-D.
              </>,
              'Finding parts or components: topic extraction from documents (which themes appear in a collection of articles).',
            ],
          },
          {
            title: 'Clustering',
            items: [
              'Partition data into distinct groups of similar items.',
              'Example: group the photos on a social site by the person in them, without knowing who anyone is.',
              'Algorithms: k-means, agglomerative (hierarchical), DBSCAN.',
            ],
          },
        ]}
      />
      <p>
        Your notes also list <strong>association rule mining</strong> (finding items that occur together, like bread and butter) and{' '}
        <strong>anomaly detection</strong> (spotting unusual transactions) as unsupervised applications.
      </p>
      <H3>Clustering versus dimensionality reduction (Q2)</H3>
      <Table
        head={['', 'Clustering', 'Dimensionality reduction']}
        rows={[
          ['Goal', 'Group similar samples', 'Represent each sample with fewer features'],
          ['Acts on', 'Rows (samples)', 'Columns (features)'],
          ['Output', 'A cluster label per sample', 'New, lower-dimensional coordinates per sample'],
          ['Examples', 'k-means, DBSCAN, hierarchical', 'PCA, t-SNE, NMF'],
          ['Typical use', 'Customer segmentation, grouping documents', 'Visualisation, compression, preprocessing, removing noise'],
        ]}
      />
      <H3>Applications</H3>
      <ul>
        <li>Customer segmentation for targeted marketing.</li>
        <li>Grouping news articles or search results by topic.</li>
        <li>Fraud and intrusion detection (anomalies that do not fit any group).</li>
        <li>Visualising high-dimensional data such as gene expression or images.</li>
        <li>Compressing images (colour quantisation with k-means) and preprocessing for supervised models.</li>
      </ul>

      <H2>Supervised versus unsupervised (Q15)</H2>
      <Table
        head={['', 'Supervised', 'Unsupervised']}
        rows={[
          ['Data', 'Labelled input–output pairs', 'Inputs only'],
          ['Goal', 'Predict labels for new inputs', 'Discover structure'],
          ['Evaluation', 'Straightforward: compare predictions to labels', 'Hard: no ground truth to compare with'],
          ['Labelling cost', 'High (often manual)', 'None'],
          ['Typical tasks', 'Classification, regression', 'Clustering, dimensionality reduction, association, anomaly detection'],
          ['Advantages', 'Accurate, measurable, targeted to a goal', 'Uses abundant unlabelled data; finds unexpected patterns; useful for exploration'],
          ['Limitations', 'Needs labels; cannot find what it was not asked for', 'Results hard to validate and interpret; may find structure that is not meaningful'],
        ]}
      />

      <H2>Challenges in unsupervised learning</H2>
      <ul>
        <li>
          <strong>No ground truth for evaluation.</strong> The algorithm may find groups, but nothing tells us whether they are the groups we
          care about. Often the only way to judge a result is to inspect it manually.
        </li>
        <li>
          <strong>Difficulty in model evaluation and validation.</strong> Choosing the number of clusters or components relies on heuristics
          (elbow, silhouette, explained variance).
        </li>
        <li>
          <strong>Curse of dimensionality.</strong> In high-dimensional data, distances lose meaning and data becomes sparse, so similarity-based
          methods struggle.
        </li>
        <li>
          <strong>Sensitivity to preprocessing.</strong> Results change with feature scaling and the distance metric.
        </li>
        <li>
          <strong>Interpretability.</strong> Clusters and components need human interpretation to be useful.
        </li>
      </ul>
      <Note kind="insight">
        Because evaluation is hard, unsupervised algorithms are used mostly in an exploratory setting, to understand data better, or as a
        preprocessing step for supervised learning, where the downstream accuracy provides an indirect measure of quality.
      </Note>

      <H2>Writing it in the exam</H2>
      <Answer q="Define unsupervised learning and list two examples of its applications. (Q1)" marks={5}>
        <p>Definition, the three characteristics, the two types (transformations and clustering) and two concrete applications with one sentence each.</p>
      </Answer>
      <Answer q="Compare the advantages and limitations of unsupervised learning compared to supervised learning. (Q15)" marks={10}>
        <p>Give the comparison table, then expand two advantages and two limitations with examples, and close with the evaluation challenge.</p>
      </Answer>

      <KeyPoints>
        <li>Unsupervised learning finds structure in unlabelled data.</li>
        <li>Two main types: transformations (dimensionality reduction) and clustering.</li>
        <li>Clustering groups rows; dimensionality reduction compresses columns.</li>
        <li>Main challenge: no ground truth, so evaluation and interpretation are hard.</li>
      </KeyPoints>
    </>
  );
}
