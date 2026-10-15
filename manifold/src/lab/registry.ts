import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export interface SolverMeta {
  id: string;
  title: string;
  module: number;
  desc: string;
  asks: string; // what kind of exam question
  see?: boolean;
  lesson: string; // lesson path
}

export interface Solver extends SolverMeta {
  Component: LazyExoticComponent<ComponentType>;
}

const raw: (SolverMeta & { load: () => Promise<{ default: ComponentType }> })[] = [
  { id: 'find-s', module: 1, title: 'Find-S', desc: 'Trace the maximally specific hypothesis through a training table.', asks: '“Apply Find-S to find the final hypothesis”', see: true, lesson: '/m/1/find-s', load: () => import('./solvers/FindSSolver') },
  { id: 'cea', module: 1, title: 'Candidate-Elimination', desc: 'Show S and G after every example, with each specialisation explained.', asks: '“Show the changes in S and G after each example”', see: true, lesson: '/m/1/cea', load: () => import('./solvers/CEASolver') },

  { id: 'linreg', module: 2, title: 'Simple linear regression', desc: 'Least-squares slope and intercept with the full deviation table, R² and predictions.', asks: '“Build a simple linear regression model”', see: true, lesson: '/m/2/linear-regression', load: () => import('./solvers/LinRegSolver') },
  { id: 'knn', module: 2, title: 'k-Nearest Neighbours', desc: 'Distance table, ranked neighbours and the vote for several k at once.', asks: '“Apply k-NN to classify the point (5, 5)”', lesson: '/m/2/knn', load: () => import('./solvers/KNNSolver') },
  { id: 'logistic', module: 2, title: 'Logistic regression', desc: 'Fit the sigmoid, read off coefficients as odds ratios and predict probabilities.', asks: '“Build a logistic regression model and interpret the coefficients”', lesson: '/m/2/logistic', load: () => import('./solvers/LogisticSolver') },
  { id: 'naive-bayes', module: 2, title: 'Naive Bayes', desc: 'Priors, likelihood tables and posteriors for a categorical query.', asks: '“Classify the new instance using Naive Bayes”', lesson: '/m/2/naive-bayes', load: () => import('./solvers/NaiveBayesSolver') },
  { id: 'tree', module: 2, title: 'Decision tree (ID3)', desc: 'Entropy and information gain at every node, then the finished tree.', asks: '“Build a decision tree using entropy and information gain”', see: true, lesson: '/m/2/trees', load: () => import('./solvers/TreeSolver') },

  { id: 'pca', module: 3, title: 'PCA: 2-D → 1-D', desc: 'Means, covariance matrix, eigen-decomposition and projected scores, step by step.', asks: '“Reduce the dimensions from two to one by applying PCA”', see: true, lesson: '/m/3/pca', load: () => import('./solvers/PCASolver') },
  { id: 'eigen', module: 3, title: 'Eigenvalues of a 2×2 covariance', desc: 'Characteristic equation, eigenvalues, eigenvectors and principal directions.', asks: '“Given the covariance matrix, find eigenvalues and eigenvectors”', see: true, lesson: '/m/3/pca', load: () => import('./solvers/EigenSolver') },
  { id: 'kmeans', module: 3, title: 'k-Means', desc: 'Every iteration: distance table, assignments and centroid update until convergence.', asks: '“Apply k-means with k = 2 and show intermediate steps”', lesson: '/m/3/kmeans', load: () => import('./solvers/KMeansSolver') },
  { id: 'hierarchical', module: 3, title: 'Agglomerative clustering', desc: 'Distance matrix and merge order with single, complete or average linkage.', asks: '“Perform hierarchical clustering and draw the dendrogram”', lesson: '/m/3/hierarchical', load: () => import('./solvers/HierarchicalSolver') },
  { id: 'dbscan', module: 3, title: 'DBSCAN', desc: 'ε-neighbourhoods, core/border/noise labels and cluster expansion.', asks: '“Apply DBSCAN with ε and MinPts”', lesson: '/m/3/dbscan', load: () => import('./solvers/DBSCANSolver') },
  { id: 'tsne', module: 3, title: 't-SNE similarities', desc: 'The p(j|i) and q(ij) calculations for a handful of points.', asks: '“Compute pairwise similarities for t-SNE”', lesson: '/m/3/tsne', load: () => import('./solvers/TSNESolver') },

  { id: 'encoding', module: 4, title: 'Encoding categoricals', desc: 'One-hot, label and ordinal encoding of any table, with pandas code.', asks: '“Apply one-hot encoding to the following dataset”', see: true, lesson: '/m/4/categorical', load: () => import('./solvers/EncodingSolver') },
  { id: 'binning', module: 4, title: 'Binning', desc: 'Equal-width and equal-frequency bins with edges, labels and counts.', asks: '“Divide Age into three equal-width bins”', lesson: '/m/4/binning', load: () => import('./solvers/BinningSolver') },
  { id: 'transform', module: 4, title: 'log / √ transforms', desc: 'Transform a skewed variable and compare spread, ratios and skewness.', asks: '“Apply a log transformation to Sales”', see: true, lesson: '/m/4/transforms', load: () => import('./solvers/TransformSolver') },
  { id: 'polyreg', module: 4, title: 'Polynomial vs linear regression', desc: 'Fit degree 1 and degree 2 by least squares and compare errors.', asks: '“Use polynomial regression with degree 2 … compare to linear”', see: true, lesson: '/m/4/polynomial', load: () => import('./solvers/PolyRegSolver') },

  { id: 'kfold', module: 5, title: 'k-fold splits', desc: 'Which samples train and test in each fold — plain, stratified or leave-one-out.', asks: '“Explain how 5-fold CV splits S1…S10”', see: true, lesson: '/m/5/cross-validation', load: () => import('./solvers/KFoldSolver') },
  { id: 'metrics', module: 5, title: 'Confusion-matrix metrics', desc: 'Accuracy, precision, recall, F1, specificity and a cost-weighted score.', asks: '“Calculate accuracy, precision, recall and F1”', see: true, lesson: '/m/5/binary-metrics', load: () => import('./solvers/MetricsSolver') },
  { id: 'roc', module: 5, title: 'ROC curve & AUC', desc: 'TPR/FPR at every threshold and the trapezoid-rule area.', asks: '“Plot the ROC curve and compute AUC”', lesson: '/m/5/roc', load: () => import('./solvers/ROCSolver') },
  { id: 'multiclass', module: 5, title: 'Multiclass report', desc: 'Per-class precision, recall, F1 with macro, weighted and micro averages.', asks: '“Compute precision/recall for each class”', lesson: '/m/5/multiclass', load: () => import('./solvers/MulticlassSolver') },
  { id: 'regmetrics', module: 5, title: 'Regression metrics', desc: 'R², MAE, MSE and RMSE from actual and predicted values.', asks: '“Evaluate using R², MAE and RMSE”', lesson: '/m/5/regression-metrics', load: () => import('./solvers/RegMetricsSolver') },
];

export const solvers: Solver[] = raw.map(({ load, ...m }) => ({ ...m, Component: lazy(load) }));
export const findSolver = (id: string) => solvers.find((s) => s.id === id);
