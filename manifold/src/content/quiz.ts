export interface QuizItem {
  module: number;
  q: string;
  options: string[];
  answer: number;
  why: string;
}

const q = (module: number, question: string, options: string[], answer: number, why: string): QuizItem => ({ module, q: question, options, answer, why });

export const quiz: QuizItem[] = [
  // Module 1
  q(1, 'In Mitchell’s definition, what does P stand for?', ['Probability of success', 'Performance measure', 'Prior knowledge', 'Parameter set'], 1, 'A well-posed learning problem names its Task T, Performance measure P and Experience E.'),
  q(1, 'Which Hadamard condition does long-range weather forecasting violate most clearly?', ['Existence', 'Uniqueness', 'Stability', 'Measurability'], 2, 'Tiny changes in initial conditions produce large changes in the forecast: the solution does not depend continuously on the data.'),
  q(1, 'In Mitchell’s checkers design, which module turns a game trace into training examples?', ['Performance System', 'Critic', 'Generalizer', 'Experiment Generator'], 1, 'The Critic produces ⟨b, V_train(b)⟩ pairs from the game history; the Generalizer then fits the weights.'),
  q(1, 'Using the LMS rule, if V̂(b) is too low and feature xᵢ is 0, weight wᵢ…', ['increases', 'decreases', 'does not change', 'is reset to zero'], 2, 'The update is η·error·xᵢ; with xᵢ = 0 the change is zero.'),
  q(1, 'What is the initial hypothesis in Find-S?', ['⟨?, ?, …, ?⟩', '⟨∅, ∅, …, ∅⟩', 'The first positive example', 'The first negative example'], 1, 'Find-S starts from the most specific hypothesis and generalises only as positives force it.'),
  q(1, 'What does Find-S do with a negative example?', ['Specialises h', 'Generalises h', 'Ignores it', 'Removes h'], 2, 'Find-S ignores negatives, which is why it cannot detect inconsistent data.'),
  q(1, 'Final Find-S hypothesis for EnjoySport?', ['⟨Sunny, Warm, ?, Strong, ?, ?⟩', '⟨Sunny, Warm, High, Strong, ?, ?⟩', '⟨?, Warm, ?, Strong, ?, ?⟩', '⟨Sunny, ?, ?, ?, ?, ?⟩'], 0, 'Examples 2 and 4 generalise Humidity, Water and Forecast to “?”.'),
  q(1, 'In Candidate-Elimination, a positive example causes…', ['G to be specialised', 'S to be generalised and inconsistent members of G removed', 'S to be specialised', 'Nothing'], 1, 'Positives prune G and minimally generalise S.'),
  q(1, 'An empty version space means…', ['The algorithm converged', 'The data is noisy or the target concept is not in H', 'More negatives are needed', 'S equals G'], 1, 'No hypothesis in H is consistent with all examples.'),
  q(1, 'The inductive bias of Candidate-Elimination is that…', ['simpler hypotheses are better', 'the target concept is contained in H', 'every instance is negative by default', 'features are independent'], 1, 'With that assumption, its classifications follow deductively from the data.'),
  q(1, 'How many semantically distinct hypotheses does EnjoySport have?', ['96', '973', '5120', '2^96'], 1, '1 + 4·3·3·3·3·3 = 973 (every hypothesis with ∅ is the same empty concept).'),
  q(1, 'Which pair of hypotheses is incomparable under ≥g?', ['⟨Sunny, ?⟩ and ⟨Sunny, Strong⟩', '⟨?, ?⟩ and ⟨Rainy, ?⟩', '⟨Sunny, ?⟩ and ⟨?, Strong⟩', '⟨∅, ∅⟩ and ⟨Sunny, Weak⟩'], 2, 'Each accepts instances the other rejects, so neither is more general.'),

  // Module 2
  q(2, 'Predicting a house’s price from its features is…', ['binary classification', 'multiclass classification', 'regression', 'clustering'], 2, 'The output is a continuous number.'),
  q(2, 'A model has 99% training and 70% test accuracy. It is most likely…', ['underfitting', 'overfitting', 'well balanced', 'unsupervised'], 1, 'A large train–test gap signals high variance.'),
  q(2, 'Increasing k in k-NN generally makes the decision boundary…', ['more jagged', 'smoother', 'linear', 'unchanged'], 1, 'Averaging more neighbours smooths predictions (more bias, less variance).'),
  q(2, 'For hours = 1…10 and marks 35…98, the least-squares slope is about…', ['5.20', '6.85', '7.50', '38.2'], 1, 'b = Sxy/Sxx = 565.5/82.5 = 6.8545; the intercept is 38.2.'),
  q(2, 'Which regulariser can set coefficients exactly to zero?', ['Ridge (L2)', 'Lasso (L1)', 'Both', 'Neither'], 1, 'The L1 penalty produces sparse solutions.'),
  q(2, 'In logistic regression, e^w is…', ['the probability of class 1', 'the odds ratio per unit increase of the feature', 'the log-loss', 'the decision threshold'], 1, 'w changes the log-odds; exponentiating gives the multiplicative change in odds.'),
  q(2, 'In scikit-learn, a smaller C for LogisticRegression means…', ['less regularisation', 'more regularisation', 'more iterations', 'a higher threshold'], 1, 'C is the inverse of regularisation strength.'),
  q(2, 'Naive Bayes assumes features are…', ['normally distributed', 'independent given the class', 'scaled', 'binary'], 1, 'Conditional independence lets the likelihood factorise.'),
  q(2, 'Entropy of a node with 4 positives and 2 negatives?', ['0.500', '0.667', '0.918', '1.000'], 2, '−(2/3)log₂(2/3) − (1/3)log₂(1/3) = 0.918.'),
  q(2, 'In the laptop dataset, which attribute has the highest information gain?', ['Price', 'Brand', 'RAM', 'All equal'], 1, 'Brand splits the data into pure subsets: gain 0.918.'),
  q(2, 'Bagging mainly reduces…', ['bias', 'variance', 'training time', 'the number of features'], 1, 'Averaging decorrelated high-variance models cancels much of their variance.'),
  q(2, 'In AdaBoost, after each round the weights of misclassified points…', ['decrease', 'increase', 'stay equal', 'are set to zero'], 1, 'The next learner focuses on previous mistakes.'),
  q(2, 'The SVM margin width equals…', ['‖w‖', '2/‖w‖', '1/‖w‖²', 'C'], 1, 'The margin lines are w·x + b = ±1, which are 2/‖w‖ apart.'),
  q(2, 'Increasing γ of an RBF SVM tends to…', ['smooth the boundary', 'make the boundary more complex', 'remove support vectors', 'make it linear'], 1, 'Each point’s influence becomes more local.'),

  // Module 3
  q(3, 'Which algorithm needs feature scaling least?', ['k-means', 'k-NN', 'Decision tree', 'SVM'], 2, 'Splits on one feature are unaffected by that feature’s scale.'),
  q(3, 'MinMaxScaler maps each feature to…', ['mean 0, std 1', '[0, 1]', 'unit length rows', 'median 0'], 1, '(x − min)/(max − min).'),
  q(3, 'Fitting the scaler on the test set separately…', ['is recommended', 'distorts the test data relative to the training data', 'improves accuracy', 'is required for PCA'], 1, 'Learn scaling parameters on training data and apply them to test data.'),
  q(3, 'Eigenvalues of [[4, 2], [2, 3]]?', ['4 and 3', '5.562 and 1.438', '6 and 1', '7 and 8'], 1, 'λ² − 7λ + 8 = 0 gives λ = (7 ± √17)/2.'),
  q(3, 'In PCA, the eigenvalue of a component equals…', ['its mean', 'the variance along it', 'its number of features', 'its error'], 1, 'Larger eigenvalue = more variance captured.'),
  q(3, 'Which method has no transform() for new data in scikit-learn?', ['PCA', 'StandardScaler', 't-SNE', 'NMF'], 2, 't-SNE only offers fit_transform.'),
  q(3, 't-SNE uses which distribution in the low-dimensional space?', ['Gaussian', 'Student t', 'Uniform', 'Poisson'], 1, 'Its heavy tails reduce crowding.'),
  q(3, 'k-means minimises…', ['the number of clusters', 'within-cluster sum of squared distances', 'between-cluster distance', 'silhouette'], 1, 'The inertia objective.'),
  q(3, 'Which clustering algorithm labels outliers as noise?', ['k-means', 'Agglomerative', 'DBSCAN', 'PCA'], 2, 'Points not density-reachable from a core point are noise.'),
  q(3, 'In DBSCAN, a core point has…', ['at least MinPts points within ε (itself included)', 'exactly ε neighbours', 'no neighbours', 'the lowest density'], 0, 'That is the density condition.'),
  q(3, 'Single linkage measures cluster distance as…', ['the maximum pairwise distance', 'the minimum pairwise distance', 'the centroid distance', 'the variance increase'], 1, 'It follows chains of close points.'),
  q(3, 'Which score evaluates a clustering against known labels?', ['Inertia', 'Silhouette', 'Adjusted Rand Index', 'Perplexity'], 2, 'ARI compares two partitions and corrects for chance.'),

  // Module 4
  q(4, 'Colour (red, blue, green) is best encoded with…', ['label encoding', 'one-hot encoding', 'ordinal encoding', 'min–max scaling'], 1, 'It is nominal: one-hot introduces no false order.'),
  q(4, 'One-hot encoding Color (3 values) and Size (3 values) produces…', ['2 columns', '3 columns', '6 columns', '9 columns'], 2, 'One column per category of each feature.'),
  q(4, 'scikit-learn’s LabelEncoder on ["Low", "Medium", "High"] gives High = …', ['0', '1', '2', '3'], 0, 'Categories are sorted alphabetically: High, Low, Medium.'),
  q(4, 'Ages [18, 25, 35, 45, 55, 65] in 3 equal-width bins: the width is…', ['15.67', '16', '20', '23.5'], 0, '(65 − 18)/3 = 15.67.'),
  q(4, 'Binning helps most for…', ['decision trees', 'linear models', 'random forests', 'k-means'], 1, 'It lets a linear model fit a step function.'),
  q(4, 'With 2 features and degree 2, PolynomialFeatures (with bias) yields…', ['4', '5', '6', '9'], 2, '1, x₁, x₂, x₁², x₁x₂, x₂² = C(4, 2) = 6.'),
  q(4, 'Degree-2 fit to X = [1, 2, 3], y = [1.5, 4.2, 9.7] has R² of…', ['0.963', '0.990', '1.000', '0.500'], 2, 'Three points and three parameters: an exact interpolation.'),
  q(4, 'ln of Sales [100, 200, 400, 800] increases by a constant step of…', ['100', 'ln 2 ≈ 0.693', '2', '0.301'], 1, 'Each value doubles, so the log rises by ln 2 (0.301 in log₁₀).'),
  q(4, 'Which transform is safe for counts containing zeros?', ['log(x)', 'log(x + 1)', '1/x', 'e^x'], 1, 'log1p is defined at 0.'),
  q(4, 'RFE is an example of which kind of feature selection?', ['Filter', 'Wrapper', 'Embedded', 'Unsupervised'], 1, 'It repeatedly trains the model on feature subsets.'),

  // Module 5
  q(5, '5-fold CV on 10 samples trains each model on…', ['2 samples', '5 samples', '8 samples', '10 samples'], 2, 'Each fold holds 2 samples; the other 8 train.'),
  q(5, 'Leave-one-out CV on n samples fits how many models?', ['1', 'k', 'n', 'n²'], 2, 'One per sample.'),
  q(5, 'Stratified k-fold ensures that…', ['folds are shuffled', 'each fold keeps the class proportions', 'groups are not split', 'the test set is fixed'], 1, 'Essential for sorted or imbalanced classification data.'),
  q(5, 'A grid of 6 C values × 6 γ values with 5-fold CV needs…', ['36 fits', '42 fits', '180 fits', '360 fits'], 2, '36 combinations × 5 folds (plus one refit).'),
  q(5, 'Why not choose hyperparameters on the test set?', ['It is slower', 'The test score becomes an optimistic, biased estimate', 'It reduces accuracy', 'scikit-learn forbids it'], 1, 'The test set must stay untouched until the final evaluation.'),
  q(5, 'TP = 16, FN = 4, FP = 30, TN = 150. Recall = ?', ['0.348', '0.80', '0.83', '0.94'], 1, '16/(16 + 4).'),
  q(5, 'Same matrix: precision = ?', ['0.348', '0.80', '0.83', '0.49'], 0, '16/(16 + 30).'),
  q(5, 'Model A (P 0.6, R 0.8) vs model B (P 0.75, R 0.5): higher F1?', ['A', 'B', 'Equal', 'Cannot tell'], 0, 'F1 = 0.686 vs 0.600.'),
  q(5, 'An AUC of 0.5 means…', ['perfect ranking', 'random ranking', 'always wrong', '50% accuracy'], 1, 'A positive is as likely to be ranked above a negative as below.'),
  q(5, 'Lowering the decision threshold usually…', ['raises precision', 'raises recall', 'raises both', 'changes neither'], 1, 'More predictions become positive, catching more true positives (and more false alarms).'),
  q(5, 'Which metric is in the same units as the target?', ['R²', 'MSE', 'RMSE', 'Log-loss'], 2, 'RMSE is the square root of MSE.'),
  q(5, 'Hinge loss is zero when…', ['the prediction is wrong', 'y·f(x) ≥ 1', 'y·f(x) = 0', 'never'], 1, 'Points beyond the margin no longer affect the SVM.'),
];
