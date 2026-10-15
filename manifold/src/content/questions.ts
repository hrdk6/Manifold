/** BAI503 question bank (Prof. Sanjay M Belgaonkar) + SEE Feb 2025 paper, mapped to lessons and solvers. */

export interface Question {
  id: string; // e.g. m1-12
  module: number;
  n: number;
  text: string;
  kind: 'theory' | 'numerical';
  lesson: string; // lesson path
  solver?: string;
  see?: string; // SEE ’25 question number
}

type Q = [n: number, text: string, kind: 'theory' | 'numerical', lesson: string, solver?: string, see?: string];

const M1: Q[] = [
  [1, 'Define a well-posed learning problem with an example.', 'theory', 'well-posed', undefined, '1a'],
  [2, 'List the major components of a learning system.', 'theory', 'design'],
  [3, 'Explain the key characteristics of a well-posed learning problem.', 'theory', 'well-posed'],
  [4, 'Describe the primary perspectives and issues in machine learning.', 'theory', 'perspectives', undefined, '1a'],
  [5, 'Illustrate how a learning system can be designed for a spam email classification task.', 'theory', 'design'],
  [6, 'Compare and contrast well-posed and ill-posed learning problems, with examples.', 'theory', 'well-posed'],
  [7, 'Critique the role of labelled data in ensuring a well-posed learning problem.', 'theory', 'well-posed'],
  [8, 'Define concept learning and explain its importance in machine learning.', 'theory', 'concept', undefined, '2a'],
  [9, 'What is the role of a hypothesis in concept learning?', 'theory', 'concept', undefined, '2a'],
  [10, 'Explain the general-to-specific ordering with an example.', 'theory', 'concept'],
  [11, 'Describe the purpose of the Candidate-Elimination Algorithm.', 'theory', 'cea'],
  [12, 'Apply FIND-S to the EnjoySport dataset (Sky, AirTemp, Humidity, Wind, Water, Forecast) to find the final hypothesis.', 'numerical', 'find-s', 'find-s', '1b'],
  [13, 'Apply FIND-S to determine the factors that lead to a positive hiring decision (Degree, Experience, Skills, Portfolio).', 'numerical', 'find-s', 'find-s'],
  [14, 'Apply FIND-S to decide whether weather conditions are suitable for a picnic (Outlook, Temperature, Humidity, Wind).', 'numerical', 'find-s', 'find-s'],
  [15, 'Demonstrate Candidate-Elimination on the five-example PlayTennis data (Outlook, Temperature, Humidity, Wind).', 'numerical', 'cea', 'cea'],
  [16, 'Apply Candidate-Elimination to classify fruits as Apple / Not Apple and show S and G after each example.', 'numerical', 'cea', 'cea', '2b'],
  [17, 'Compare Candidate-Elimination with FIND-S in terms of search space and learning capability. Which suits noisy data, and why?', 'theory', 'cea'],
  [18, 'Analyze the limitations of FIND-S in identifying the correct hypothesis.', 'theory', 'find-s'],
  [19, 'Differentiate between FIND-S and Candidate-Elimination in their approach to concept learning.', 'theory', 'cea'],
  [20, 'Evaluate the significance of inductive bias in concept learning. Support your argument with examples.', 'theory', 'bias'],
];

const M2: Q[] = [
  [1, 'Explain the significance of supervised learning in machine learning.', 'theory', 'supervised', undefined, '3b'],
  [2, 'Explain how model complexity affects overfitting and underfitting with diagrams.', 'theory', 'supervised', undefined, '3b'],
  [3, 'Explain how k-Nearest Neighbours works for classification problems.', 'theory', 'knn'],
  [4, 'Describe the working of support vector machines for binary classification.', 'theory', 'svm'],
  [5, 'Define uncertainty estimation in the context of supervised learning.', 'theory', 'uncertainty'],
  [6, 'Build a simple linear regression model to predict marks from hours studied (1–10 h; 35, 50, 60, 70, 80, 85, 90, 94, 97, 98).', 'numerical', 'linear-regression', 'linreg', '3a'],
  [7, 'Given TP = 50, FN = 10, FP = 5, TN = 35, calculate accuracy, precision, recall and F1.', 'numerical', 'binary-metrics', 'metrics'],
  [8, 'TP = 30, FN = 20, FP = 10, TN = 40: calculate precision and recall; discuss trading one for the other.', 'numerical', 'binary-metrics', 'metrics'],
  [9, 'Model A has P = 0.6, R = 0.8; model B has P = 0.75, R = 0.5. Which has the higher F1 and what does it imply?', 'numerical', 'binary-metrics', 'metrics'],
  [10, 'Fraud detection over 200 transactions (TP 16, FN 4, FP 30, TN 150): why is recall more important? Compute recall and precision.', 'numerical', 'binary-metrics', 'metrics', '4a'],
  [11, 'Apply k-NN to classify (5, 5) from six labelled points; try k = 4 for a tie, then k = 3 and 5.', 'numerical', 'knn', 'knn'],
  [12, 'Build a decision tree to predict whether a customer buys a laptop (Price, Brand, RAM).', 'numerical', 'trees', 'tree'],
  [13, 'Identify whether a small dataset (two features, class labels) suits classification or regression and train a simple tree.', 'numerical', 'trees'],
  [14, 'Build a logistic regression model on Hours Studied → Passed and interpret the learned coefficients.', 'numerical', 'logistic', 'logistic'],
  [15, 'Interpret the coefficients of a linear regression model predicting house prices from size and location.', 'theory', 'linear-regression'],
  [16, 'Compare k-NN with logistic regression for binary classification in performance and computational cost.', 'theory', 'logistic'],
  [17, 'Explain how Naive Bayes handles categorical and numerical features in classification.', 'theory', 'naive-bayes'],
  [18, 'What is a decision tree? Explain its components and how entropy and information gain are used for splitting.', 'theory', 'trees', undefined, '4b'],
  [19, 'Construct a decision tree classifying patients into flu or cold from Fever, Cough and Fatigue.', 'numerical', 'trees', 'tree'],
  [20, 'Explain how bagging and boosting differ in their approach to building models.', 'theory', 'ensembles'],
];

const M3: Q[] = [
  [1, 'Define unsupervised learning and list two examples of its applications.', 'theory', 'unsupervised'],
  [2, 'Differentiate between clustering and dimensionality reduction in unsupervised learning.', 'theory', 'unsupervised'],
  [3, 'Define feature scaling and describe its importance in machine learning.', 'theory', 'scaling', undefined, '6b'],
  [4, 'Explain the differences between normalization and standardization with examples.', 'theory', 'scaling'],
  [5, 'Analyze the impact of scaling features on clustering algorithms like k-means.', 'theory', 'scaling', undefined, '6b'],
  [6, 'Describe the differences between PCA and t-SNE.', 'theory', 'tsne', undefined, '5b'],
  [7, 'Analyze how dimensionality reduction techniques can mitigate the curse of dimensionality.', 'theory', 'pca'],
  [8, 'Analyze how feature extraction differs from feature selection, with examples.', 'theory', 'pca'],
  [9, 'Compare density-based clustering (DBSCAN) with centroid-based clustering (k-means).', 'theory', 'dbscan', undefined, '5b'],
  [10, 'Evaluate the importance of choosing the right distance metric in clustering algorithms.', 'theory', 'compare-clustering'],
  [11, 'Analyze how data sparsity impacts the performance of unsupervised learning models.', 'theory', 'compare-clustering'],
  [12, 'A dataset has 1000 samples and 50 features. Model the application of PCA to reduce it to 2 dimensions for visualisation.', 'theory', 'pca'],
  [13, 'Given the covariance matrix [[4, 2], [2, 3]], find its eigenvalues and eigenvectors and the direction of the principal components.', 'numerical', 'pca', 'eigen', '6a'],
  [14, 'Reduce the dataset X1 = (2, 0, 1, 3, 5), X2 = (4, 0, 1, 3, 5) from two dimensions to one by applying PCA.', 'numerical', 'pca', 'pca', '5a'],
  [15, 'Compare the advantages and limitations of unsupervised learning compared to supervised learning.', 'theory', 'unsupervised'],
  [16, 'Provide a solution to the challenge of high-dimensional data in unsupervised learning using dimensionality reduction.', 'theory', 'pca'],
  [17, 'Evaluate the role of dimensionality reduction in improving computational efficiency.', 'theory', 'pca'],
  [18, 'Define clustering and list three clustering algorithms.', 'theory', 'kmeans'],
  [19, 'Explain the differences between hierarchical clustering and k-means clustering.', 'theory', 'hierarchical'],
  [20, 'Evaluate the importance of choosing the right distance metric in clustering algorithms.', 'theory', 'compare-clustering'],
  [21, 'Apply k-means with k = 2 to (2,3), (3,4), (5,6), (8,8), (9,10) and show the intermediate steps.', 'numerical', 'kmeans', 'kmeans'],
  [22, 'Perform k-means with k = 2 on (1,1), (2,1), (1,2), (10,10), (10,12), (12,10); illustrate on a 2-D plot.', 'numerical', 'kmeans', 'kmeans'],
];

const M4: Q[] = [
  [1, 'Define categorical variables. List two methods for handling them in machine learning models.', 'theory', 'categorical'],
  [2, 'Explain the difference between one-hot encoding and label encoding with examples.', 'theory', 'categorical'],
  [3, 'Apply one-hot encoding to the Color / Size dataset and explain the resulting transformation.', 'numerical', 'categorical', 'encoding', '7a'],
  [4, 'What is binning? Explain equal-width versus equal-frequency binning with examples.', 'theory', 'binning'],
  [5, 'Compare the advantages and limitations of binning continuous variables in predictive modelling.', 'theory', 'binning', undefined, '7b'],
  [6, 'Explain how decision trees differ from linear models in their ability to capture non-linear relationships.', 'theory', 'binning'],
  [7, 'What are interaction features? Provide an example of their use.', 'theory', 'polynomial'],
  [8, 'Explain how polynomial features can help capture non-linear relationships in data.', 'theory', 'polynomial'],
  [9, 'Discuss the challenges of overfitting when adding higher-degree polynomial features to a model.', 'theory', 'polynomial'],
  [10, 'Define univariate nonlinear transformations and provide two examples.', 'theory', 'transforms'],
  [11, 'Explain the use of log transformations for skewed numerical features.', 'theory', 'transforms'],
  [12, 'Compare the effects of log and square-root transformations on model performance.', 'theory', 'transforms'],
  [13, 'Define automatic feature selection and list two methods used for it.', 'theory', 'feature-selection'],
  [14, 'Describe the differences between filter, wrapper and embedded methods for feature selection.', 'theory', 'feature-selection'],
  [15, 'Analyze how Recursive Feature Elimination (RFE) works and its limitations in high-dimensional datasets.', 'theory', 'feature-selection'],
  [16, 'Encode ["Low", "Medium", "High", "Medium", "Low"] using one-hot encoding and label encoding.', 'numerical', 'categorical', 'encoding'],
  [17, 'Divide Age = [18, 25, 35, 45, 55, 65] into three equal-width bins and label them.', 'numerical', 'binning', 'binning'],
  [18, 'A skewed variable "Income": apply equal-frequency binning and analyse how it addresses skewness.', 'numerical', 'binning', 'binning'],
  [19, 'Fit linear regression to X = [1..5], y = [2.1, 4.3, 6.5, 8.7, 10.9]; calculate slope and intercept.', 'numerical', 'linear-regression', 'linreg'],
  [20, 'Use degree-2 polynomial regression on X = [1, 2, 3], y = [1.5, 4.2, 9.7] and compare with linear regression.', 'numerical', 'polynomial', 'polyreg', '8b'],
  [21, 'Apply a log transformation to Sales = [100, 200, 400, 800] and explain how it handles skew.', 'numerical', 'transforms', 'transform', '8a'],
  [22, 'Compare square-root and log transforms on Income = [1, 4, 16, 64, 256] for variance stabilisation.', 'numerical', 'transforms', 'transform'],
];

const M5: Q[] = [
  [1, 'Define cross-validation and explain its purpose in machine learning.', 'theory', 'cross-validation'],
  [2, 'Compare k-fold cross-validation with leave-one-out cross-validation.', 'theory', 'cross-validation'],
  [3, 'Analyze how cross-validation mitigates the risk of overfitting when evaluating model performance.', 'theory', 'cross-validation'],
  [4, 'What is grid search, and how is it used in hyperparameter tuning?', 'theory', 'grid-search'],
  [5, 'Describe grid search versus random search. Which is more efficient for high-dimensional hyperparameter spaces?', 'theory', 'grid-search'],
  [6, 'Discuss the computational challenges of grid search and propose strategies to address them.', 'theory', 'grid-search', undefined, '9a'],
  [7, 'Analyze the impact of hyperparameter tuning using grid search on a support vector machine’s performance.', 'theory', 'grid-search', undefined, '9b'],
  [8, 'Define precision, recall and F1-score. Provide their mathematical formulas.', 'theory', 'binary-metrics'],
  [9, 'Explain the importance of the ROC curve and AUC in evaluating classification models.', 'theory', 'roc'],
  [10, 'Analyze the difference between accuracy and F1-score in the context of an imbalanced dataset.', 'theory', 'binary-metrics'],
  [11, 'Evaluate a regression model using R², MAE and RMSE. Discuss the significance of each metric.', 'theory', 'regression-metrics'],
  [12, 'What is a scoring function, and why is it important in model evaluation?', 'theory', 'scoring'],
  [13, 'Differentiate between scoring functions for regression and classification tasks with examples.', 'theory', 'scoring'],
  [14, 'Analyze how log-loss and hinge loss affect model optimisation in classification tasks.', 'theory', 'scoring'],
  [15, 'Evaluate the significance of custom scoring metrics for domain-specific applications such as medical diagnosis or fraud detection.', 'theory', 'scoring', undefined, '10a'],
  [16, 'Explain how 5-fold cross-validation splits the dataset [S1 … S10].', 'numerical', 'cross-validation', 'kfold', '10b'],
  [17, 'Differentiate precision, recall and F1. Explain with an example why F1 is preferred for imbalanced data.', 'theory', 'binary-metrics'],
  [18, 'For a given confusion matrix, calculate precision, recall, F1-score and accuracy.', 'numerical', 'binary-metrics', 'metrics'],
  [19, 'False negatives cost 5× false positives. Propose and compute a weighted score for TP 30, FP 15, FN 10, TN 45.', 'numerical', 'scoring', 'metrics'],
  [20, 'Explain how you would tune a credit-card fraud classifier using cross-validation, grid search and a custom scoring metric.', 'theory', 'scoring'],
];

const all = [M1, M2, M3, M4, M5];

export const questions: Question[] = all.flatMap((qs, mi) =>
  qs.map(([n, text, kind, lesson, solver, see]) => ({
    id: `m${mi + 1}-${n}`,
    module: mi + 1,
    n,
    text,
    kind,
    lesson: `/m/${mi + 1}/${lesson}`,
    solver,
    see: see ? `SEE ’25 ${see}` : undefined,
  })),
);

/** The Feb 2025 SEE paper, in paper order. */
export const seePaper: { q: string; module: number; text: string; marks: number; lesson: string; solver?: string }[] = [
  { q: '1a', module: 1, marks: 10, text: 'Define a well-posed learning problem with an example and describe the primary perspectives and issues in machine learning.', lesson: '/m/1/well-posed' },
  { q: '1b', module: 1, marks: 10, text: 'Apply FIND-S to the EnjoySport data to find the final hypothesis.', lesson: '/m/1/find-s', solver: 'find-s' },
  { q: '2a', module: 1, marks: 10, text: 'Define concept learning and explain its importance; explain the role of a hypothesis in concept learning.', lesson: '/m/1/concept' },
  { q: '2b', module: 1, marks: 10, text: 'Apply Candidate-Elimination to the Apple / Not Apple data and show S and G after each example.', lesson: '/m/1/cea', solver: 'cea' },
  { q: '3a', module: 2, marks: 10, text: 'Build a simple linear regression model for Hours_Studied → Marks_Scored and provide code snippets.', lesson: '/m/2/linear-regression', solver: 'linreg' },
  { q: '3b', module: 2, marks: 10, text: 'Explain the significance of supervised learning and how model complexity affects over/underfitting, with diagrams.', lesson: '/m/2/supervised' },
  { q: '4a', module: 2, marks: 10, text: 'Fraud detection (TP 16, FN 4, FP 30, TN 150): why is recall more important than precision? Compute both.', lesson: '/m/5/binary-metrics', solver: 'metrics' },
  { q: '4b', module: 2, marks: 10, text: 'Describe decision trees and their components; explain entropy and information gain for splitting nodes.', lesson: '/m/2/trees' },
  { q: '5a', module: 3, marks: 10, text: 'Reduce X1 = (2, 0, 1, 3, 5), X2 = (4, 0, 1, 3, 5) from 2-D to 1-D with PCA; show code for each step.', lesson: '/m/3/pca', solver: 'pca' },
  { q: '5b', module: 3, marks: 10, text: 'Describe the differences between (i) PCA and t-SNE, (ii) DBSCAN and k-means.', lesson: '/m/3/tsne' },
  { q: '6a', module: 3, marks: 10, text: 'Given the covariance matrix [[4, 2], [2, 3]], find eigenvalues, eigenvectors and the principal directions.', lesson: '/m/3/pca', solver: 'eigen' },
  { q: '6b', module: 3, marks: 10, text: 'Define feature scaling and outline its importance for k-means clustering.', lesson: '/m/3/scaling' },
  { q: '7a', module: 4, marks: 10, text: 'Apply one-hot encoding to the Color / Size table and write the code for the encoding.', lesson: '/m/4/categorical', solver: 'encoding' },
  { q: '7b', module: 4, marks: 10, text: 'Compare and contrast the advantages and limitations of binning continuous variables.', lesson: '/m/4/binning' },
  { q: '8a', module: 4, marks: 10, text: 'Apply a log transformation to Sales = [100, 200, 400, 800] and explain how it handles skew.', lesson: '/m/4/transforms', solver: 'transform' },
  { q: '8b', module: 4, marks: 10, text: 'Polynomial regression (degree 2) on X = [1, 2, 3], y = [1.5, 4.2, 9.7] compared with linear regression.', lesson: '/m/4/polynomial', solver: 'polyreg' },
  { q: '9a', module: 5, marks: 10, text: 'Discuss the computational challenges of grid search and propose strategies to address them.', lesson: '/m/5/grid-search' },
  { q: '9b', module: 5, marks: 10, text: 'Analyze the impact of hyperparameter tuning using grid search on an SVM’s performance.', lesson: '/m/5/grid-search' },
  { q: '10a', module: 5, marks: 10, text: 'Discuss the significance of custom scoring metrics for medical diagnosis or fraud detection.', lesson: '/m/5/scoring' },
  { q: '10b', module: 5, marks: 10, text: 'Explain how 5-fold cross-validation splits [S1 … S10].', lesson: '/m/5/cross-validation', solver: 'kfold' },
];
