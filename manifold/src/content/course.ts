import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export interface LessonMeta {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  /** question-paper references, e.g. "SEE ’25 1b" */
  see?: string[];
  /** question bank numbers this lesson answers, e.g. ["Q1", "Q12"] */
  qb?: string[];
  solvers?: string[];
}

export interface Lesson extends LessonMeta {
  module: number;
  index: number;
  Component: LazyExoticComponent<ComponentType>;
  /** the lesson module itself (the study assistant reads lessons as text) */
  load: () => Promise<{ default: ComponentType }>;
}

export interface Module {
  n: number;
  title: string;
  short: string;
  color: string;
  blurb: string;
  outcome: string;
  lessons: Lesson[];
}

type Raw = LessonMeta & { load: () => Promise<{ default: ComponentType }> };

const m1: Raw[] = [
  { id: 'what-is-ml', title: 'What machine learning is', summary: 'Learning from experience, the T–E–P definition and the three learning paradigms.', minutes: 12, qb: ['M1 Q1'], load: () => import('./m1/WhatIsML') },
  { id: 'well-posed', title: 'Well-posed learning problems', summary: 'Mitchell’s definition, Hadamard’s three conditions and how to re-pose an ill-posed task.', minutes: 14, see: ['SEE ’25 1a'], qb: ['M1 Q1', 'Q3', 'Q6', 'Q7'], load: () => import('./m1/WellPosed') },
  { id: 'design', title: 'Designing a learning system', summary: 'Training experience, target function, representation, approximation algorithm and the final design.', minutes: 18, qb: ['M1 Q2', 'Q5'], load: () => import('./m1/Design') },
  { id: 'perspectives', title: 'Perspectives and issues', summary: 'Statistical, algorithmic, cognitive, engineering and theoretical views — and what goes wrong in practice.', minutes: 10, see: ['SEE ’25 1a'], qb: ['M1 Q4'], load: () => import('./m1/Perspectives') },
  { id: 'concept', title: 'Concept learning as search', summary: 'Instances, hypotheses, the EnjoySport task and the general-to-specific ordering.', minutes: 16, see: ['SEE ’25 2a'], qb: ['M1 Q8', 'Q9', 'Q10'], load: () => import('./m1/Concept') },
  { id: 'find-s', title: 'Find-S', summary: 'Finding the maximally specific hypothesis — and why ignoring negatives is a weakness.', minutes: 14, see: ['SEE ’25 1b'], qb: ['M1 Q12', 'Q13', 'Q14', 'Q18'], solvers: ['find-s'], load: () => import('./m1/FindS') },
  { id: 'cea', title: 'Version spaces & Candidate-Elimination', summary: 'Representing every consistent hypothesis with two boundary sets, S and G.', minutes: 22, see: ['SEE ’25 2b'], qb: ['M1 Q11', 'Q15', 'Q16', 'Q17', 'Q19'], solvers: ['cea'], load: () => import('./m1/CEA') },
  { id: 'bias', title: 'Inductive bias', summary: 'Why a learner must assume something to generalise, and how biases compare.', minutes: 12, qb: ['M1 Q20'], load: () => import('./m1/Bias') },
];

const m2: Raw[] = [
  { id: 'supervised', title: 'Classification, regression & generalisation', summary: 'Supervised learning, overfitting, underfitting and model complexity versus data size.', minutes: 16, see: ['SEE ’25 3b'], qb: ['M2 Q1', 'Q2'], load: () => import('./m2/Supervised') },
  { id: 'knn', title: 'k-Nearest Neighbours', summary: 'Instance-based learning for classification and regression; choosing k and the distance.', minutes: 15, qb: ['M2 Q3', 'Q11', 'Q16'], solvers: ['knn'], load: () => import('./m2/KNN') },
  { id: 'linear-regression', title: 'Linear regression', summary: 'Least squares, the simple-regression formulas, gradient descent, Ridge and Lasso.', minutes: 22, see: ['SEE ’25 3a'], qb: ['M2 Q6', 'Q15', 'M4 Q19'], solvers: ['linreg'], load: () => import('./m2/LinearRegression') },
  { id: 'logistic', title: 'Logistic regression & linear classifiers', summary: 'The sigmoid, log-odds, log-loss, decision boundaries and interpreting coefficients.', minutes: 18, qb: ['M2 Q14', 'Q16'], solvers: ['logistic'], load: () => import('./m2/Logistic') },
  { id: 'naive-bayes', title: 'Naive Bayes classifiers', summary: 'Bayes’ theorem with a conditional-independence assumption; categorical and Gaussian features.', minutes: 15, qb: ['M2 Q17'], solvers: ['naive-bayes'], load: () => import('./m2/NaiveBayes') },
  { id: 'trees', title: 'Decision trees', summary: 'Entropy, information gain, Gini, ID3 and controlling tree complexity.', minutes: 22, see: ['SEE ’25 4b'], qb: ['M2 Q12', 'Q13', 'Q18', 'Q19'], solvers: ['tree'], load: () => import('./m2/Trees') },
  { id: 'ensembles', title: 'Ensembles: bagging, forests & boosting', summary: 'Random forests, AdaBoost, gradient boosting and stacking.', minutes: 18, qb: ['M2 Q20'], load: () => import('./m2/Ensembles') },
  { id: 'svm', title: 'Support vector machines', summary: 'Maximum margins, support vectors, the kernel trick and the C and γ parameters.', minutes: 20, qb: ['M2 Q4'], load: () => import('./m2/SVM') },
  { id: 'neural', title: 'Neural networks (MLP)', summary: 'Neurons, layers, non-linear activations and how complexity is controlled.', minutes: 10, load: () => import('./m2/Neural') },
  { id: 'uncertainty', title: 'Uncertainty estimates', summary: 'decision_function, predict_proba and what a classifier’s confidence really means.', minutes: 10, qb: ['M2 Q5'], load: () => import('./m2/Uncertainty') },
];

const m3: Raw[] = [
  { id: 'unsupervised', title: 'Unsupervised learning & its challenges', summary: 'Transformations versus clustering, and why evaluation is hard without labels.', minutes: 12, qb: ['M3 Q1', 'Q2', 'Q11', 'Q15'], load: () => import('./m3/Unsupervised') },
  { id: 'scaling', title: 'Preprocessing & feature scaling', summary: 'Standardisation, min–max, robust scaling, normalisation — and their effect on k-means.', minutes: 16, see: ['SEE ’25 6b'], qb: ['M3 Q3', 'Q4', 'Q5'], load: () => import('./m3/Scaling') },
  { id: 'pca', title: 'Dimensionality reduction & PCA', summary: 'The curse of dimensionality, covariance, eigenvectors and projecting onto principal components.', minutes: 26, see: ['SEE ’25 5a', 'SEE ’25 6a'], qb: ['M3 Q7', 'Q8', 'Q12', 'Q13', 'Q14', 'Q16', 'Q17'], solvers: ['pca', 'eigen'], load: () => import('./m3/PCA') },
  { id: 'tsne', title: 'Manifold learning with t-SNE', summary: 'Neighbour probabilities, the Student-t trick and when to prefer t-SNE over PCA.', minutes: 15, see: ['SEE ’25 5b'], qb: ['M3 Q6'], solvers: ['tsne'], load: () => import('./m3/TSNE') },
  { id: 'kmeans', title: 'k-Means clustering', summary: 'Assign, update, repeat — inertia, initialisation and choosing k.', minutes: 18, see: ['SEE ’25 6b'], qb: ['M3 Q18', 'Q21', 'Q22'], solvers: ['kmeans'], load: () => import('./m3/KMeans') },
  { id: 'hierarchical', title: 'Agglomerative clustering', summary: 'Bottom-up merging, linkage criteria and reading a dendrogram.', minutes: 12, qb: ['M3 Q19'], solvers: ['hierarchical'], load: () => import('./m3/Hierarchical') },
  { id: 'dbscan', title: 'DBSCAN', summary: 'Density-based clusters of any shape: core, border and noise points.', minutes: 15, see: ['SEE ’25 5b'], qb: ['M3 Q9'], solvers: ['dbscan'], load: () => import('./m3/DBSCAN') },
  { id: 'compare-clustering', title: 'Comparing & evaluating clusterings', summary: 'ARI, silhouette, distance metrics and sparse data.', minutes: 10, qb: ['M3 Q10', 'Q20'], load: () => import('./m3/CompareClustering') },
];

const m4: Raw[] = [
  { id: 'categorical', title: 'Categorical variables', summary: 'Nominal versus ordinal data; one-hot, label, ordinal and binary encoding.', minutes: 15, see: ['SEE ’25 7a'], qb: ['M4 Q1', 'Q2', 'Q3', 'Q16'], solvers: ['encoding'], load: () => import('./m4/Categorical') },
  { id: 'binning', title: 'Binning, linear models & trees', summary: 'Equal-width and equal-frequency bins, and why binning helps linear models.', minutes: 16, see: ['SEE ’25 7b'], qb: ['M4 Q4', 'Q5', 'Q6', 'Q17', 'Q18'], solvers: ['binning'], load: () => import('./m4/Binning') },
  { id: 'polynomial', title: 'Interactions & polynomials', summary: 'Product features, PolynomialFeatures and the overfitting that high degrees invite.', minutes: 16, see: ['SEE ’25 8b'], qb: ['M4 Q7', 'Q8', 'Q9', 'Q20'], solvers: ['polyreg'], load: () => import('./m4/Polynomial') },
  { id: 'transforms', title: 'Univariate nonlinear transformations', summary: 'log, square root and friends for skewed features and count data.', minutes: 13, see: ['SEE ’25 8a'], qb: ['M4 Q10', 'Q11', 'Q12', 'Q21', 'Q22'], solvers: ['transform'], load: () => import('./m4/Transforms') },
  { id: 'feature-selection', title: 'Automatic feature selection', summary: 'Univariate statistics, model-based selection and recursive feature elimination.', minutes: 16, qb: ['M4 Q13', 'Q14', 'Q15'], load: () => import('./m4/FeatureSelection') },
  { id: 'expert', title: 'Utilising expert knowledge', summary: 'Turning domain understanding into features — the bike-rental example.', minutes: 8, load: () => import('./m4/Expert') },
];

const m5: Raw[] = [
  { id: 'cross-validation', title: 'Cross-validation', summary: 'k-fold, stratified, leave-one-out, shuffle-split and group-wise splitting.', minutes: 18, see: ['SEE ’25 10b'], qb: ['M5 Q1', 'Q2', 'Q3', 'Q16'], solvers: ['kfold'], load: () => import('./m5/CrossValidation') },
  { id: 'grid-search', title: 'Grid search', summary: 'Tuning hyperparameters without fooling yourself: validation sets, GridSearchCV and nested CV.', minutes: 18, see: ['SEE ’25 9a', 'SEE ’25 9b'], qb: ['M5 Q4', 'Q5', 'Q6', 'Q7'], load: () => import('./m5/GridSearch') },
  { id: 'binary-metrics', title: 'Metrics for binary classification', summary: 'Errors, imbalance, the confusion matrix, precision, recall and F1.', minutes: 18, see: ['SEE ’25 4a'], qb: ['M5 Q8', 'Q10', 'Q17', 'Q18', 'M2 Q7', 'Q8', 'Q9', 'Q10'], solvers: ['metrics'], load: () => import('./m5/BinaryMetrics') },
  { id: 'roc', title: 'Thresholds, PR and ROC curves', summary: 'How decision thresholds trade precision for recall, and what AUC summarises.', minutes: 16, qb: ['M5 Q9'], solvers: ['roc'], load: () => import('./m5/ROC') },
  { id: 'multiclass', title: 'Multiclass metrics', summary: 'Per-class precision and recall with macro, micro and weighted averages.', minutes: 12, solvers: ['multiclass'], load: () => import('./m5/Multiclass') },
  { id: 'regression-metrics', title: 'Regression metrics', summary: 'R², MAE, MSE and RMSE — what each one rewards and punishes.', minutes: 10, qb: ['M5 Q11'], solvers: ['regmetrics'], load: () => import('./m5/RegressionMetrics') },
  { id: 'scoring', title: 'Scoring & model selection', summary: 'Scoring functions, log-loss versus hinge loss and custom cost-aware metrics.', minutes: 14, see: ['SEE ’25 10a'], qb: ['M5 Q12', 'Q13', 'Q14', 'Q15', 'Q19', 'Q20'], solvers: ['metrics'], load: () => import('./m5/Scoring') },
];

const defs: Omit<Module, 'lessons'>[] = [
  {
    n: 1,
    title: 'Introduction & Concept Learning',
    short: 'Foundations',
    color: 'var(--ultra)',
    blurb: 'What it means for a program to learn, how to design a learner, and the first algorithms that search a space of hypotheses.',
    outcome: 'Pose a learning problem precisely and run Find-S and Candidate-Elimination by hand.',
  },
  {
    n: 2,
    title: 'Supervised Learning',
    short: 'Supervised',
    color: 'var(--rose)',
    blurb: 'Learning from labelled examples: nearest neighbours, linear models, Bayes, trees, ensembles and support vector machines.',
    outcome: 'Choose, fit and interpret the core classifiers and regressors, and reason about over- and underfitting.',
  },
  {
    n: 3,
    title: 'Unsupervised Learning',
    short: 'Unsupervised',
    color: 'var(--viridian)',
    blurb: 'Finding structure without labels: scaling, PCA, t-SNE and the three clustering families.',
    outcome: 'Reduce dimensions with PCA by hand and pick the right clustering algorithm for a dataset.',
  },
  {
    n: 4,
    title: 'Representing Data & Engineering Features',
    short: 'Features',
    color: 'var(--ochre)',
    blurb: 'Turning raw columns into features a model can use: encodings, bins, interactions, transformations and selection.',
    outcome: 'Encode, bin and transform features, and select the ones that matter.',
  },
  {
    n: 5,
    title: 'Model Evaluation & Improvement',
    short: 'Evaluation',
    color: 'var(--violet)',
    blurb: 'Measuring generalisation honestly: cross-validation, grid search and the right metric for the goal.',
    outcome: 'Evaluate and tune a model with cross-validation and defend your choice of metric.',
  },
];

const raws = [m1, m2, m3, m4, m5];

export const modules: Module[] = defs.map((d, mi) => ({
  ...d,
  lessons: raws[mi].map((r, li) => {
    const { load, ...meta } = r;
    return { ...meta, module: d.n, index: li, Component: lazy(load), load };
  }),
}));

export const allLessons: Lesson[] = modules.flatMap((m) => m.lessons);

export const lessonPath = (l: { module: number; id: string }) => `/m/${l.module}/${l.id}`;

export function findLesson(module: number, id: string) {
  return modules[module - 1]?.lessons.find((l) => l.id === id);
}

export function neighbours(l: Lesson) {
  const i = allLessons.findIndex((x) => x.module === l.module && x.id === l.id);
  return { prev: allLessons[i - 1], next: allLessons[i + 1] };
}
