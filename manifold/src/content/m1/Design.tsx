import { M, MB } from '../../components/Math';
import { Answer, Def, H2, H3, KeyPoints, Note, Steps, Table } from '../../components/prose';
import { LearningSystemFlow, LMSFigure } from '../../viz/m1';

export default function Design() {
  return (
    <>
      <p>
        Designing a learning system means making a chain of decisions, each of which constrains the next. Mitchell walks through them for a
        program that learns to play checkers; the same sequence applies to a spam filter or a house-price predictor. Your lecture slides list
        six stages, which this lesson follows in order.
      </p>

      <Steps>
        <li>
          <strong>Choose the training experience.</strong> What data and feedback will the learner see?
        </li>
        <li>
          <strong>Choose the target function.</strong> Exactly what should be learned?
        </li>
        <li>
          <strong>Choose a representation</strong> for the target function.
        </li>
        <li>
          <strong>Choose a function approximation algorithm</strong> that fits the representation to data.
        </li>
        <li>
          <strong>Estimate training values</strong> when the data does not supply them directly.
        </li>
        <li>
          <strong>Assemble the final design.</strong>
        </li>
      </Steps>

      <H2>1. Choosing the training experience</H2>
      <p>The type of experience has a large impact on whether learning succeeds. Three attributes matter:</p>
      <ul>
        <li>
          <strong>Direct or indirect feedback.</strong> Direct feedback gives the correct answer for each input (board state → best move).
          Indirect feedback gives only an outcome after a sequence of decisions (the game was won), which creates the{' '}
          <em>credit assignment problem</em>: which moves deserve the credit or blame?
        </li>
        <li>
          <strong>Who controls the sequence of examples.</strong> A teacher may choose the examples, the learner may ask questions, or the
          learner may explore on its own (playing against itself).
        </li>
        <li>
          <strong>How well the training distribution matches the test distribution.</strong> A checkers player trained only against itself may
          never see the strategies a human champion uses. Most learning theory assumes training and test examples come from the same
          distribution; when they do not, performance suffers.
        </li>
      </ul>
      <Table
        head={['Type of feedback', 'Paradigm', 'Example']}
        rows={[
          ['Direct: input–output pairs', 'Supervised', 'Emails labelled spam or not spam'],
          ['Indirect: rewards or penalties after actions', 'Reinforcement', 'A robot rewarded for reaching the end of a maze'],
          ['None: inputs only', 'Unsupervised', 'Clustering customers by purchase behaviour'],
        ]}
      />
      <p>
        The quantity and quality of data matter as much as its type: diverse, representative and correctly labelled data generalises; noisy
        or biased data does not. For checkers, Mitchell settles on: <strong>T</strong> playing checkers, <strong>P</strong> percentage of
        games won in the world tournament, <strong>E</strong> games played against itself.
      </p>

      <H2>2. Choosing the target function</H2>
      <p>
        Next decide exactly what knowledge will be learned. For checkers the obvious choice is a function{' '}
        <M>{'\\text{ChooseMove}: B \\rightarrow M'}</M> from legal board states to the best move, but with only indirect feedback that is
        hard to learn. An easier alternative is an evaluation function that scores boards:
      </p>
      <MB>{'V: B \\rightarrow \\mathbb{R}'}</MB>
      <p>which assigns higher scores to better boards. Mitchell defines the ideal V recursively:</p>
      <ul>
        <li>
          if <M>{'b'}</M> is a final board that is won, <M>{'V(b) = 100'}</M>; lost, <M>{'V(b) = -100'}</M>; drawn, <M>{'V(b) = 0'}</M>;
        </li>
        <li>
          otherwise <M>{'V(b) = V(b^{\\prime})'}</M>, where <M>{"b'"}</M> is the best final board reachable from <M>{'b'}</M> with optimal
          play by both sides.
        </li>
      </ul>
      <p>
        This definition is correct but <em>non-operational</em>: computing it means searching every line of play to the end of the game. So
        the learning task is reduced to finding an <span className="term">operational approximation</span> <M>{'\\hat{V}'}</M> of the ideal
        target function. In supervised learning generally, the target function is a mapping <M>{'f: X \\rightarrow Y'}</M> from features to
        labels; in regression it might map house features to price.
      </p>
      <Note kind="insight">
        The target function should be complex enough to capture the real pattern, but not so complex that it overfits. Choosing{' '}
        <M>{'V'}</M> instead of ChooseMove is a design decision that makes the learning problem easier without changing the goal.
      </Note>

      <H2>3. Choosing a representation for the target function</H2>
      <p>
        The representation determines which functions the learner can express. A very expressive representation can approximate the ideal
        target closely but needs more data to learn. Mitchell chooses a linear combination of six board features:
      </p>
      <MB>{'\\hat{V}(b) = w_0 + w_1x_1 + w_2x_2 + w_3x_3 + w_4x_4 + w_5x_5 + w_6x_6'}</MB>
      <Table
        head={['Feature', 'Meaning']}
        rows={[
          [<M>{'x_1'}</M>, 'number of black pieces on the board'],
          [<M>{'x_2'}</M>, 'number of red pieces'],
          [<M>{'x_3'}</M>, 'number of black kings'],
          [<M>{'x_4'}</M>, 'number of red kings'],
          [<M>{'x_5'}</M>, 'number of black pieces threatened by red (can be captured next turn)'],
          [<M>{'x_6'}</M>, 'number of red pieces threatened by black'],
        ]}
      />
      <p>
        Learning now means choosing the seven weights <M>{'w_0 \\ldots w_6'}</M>. Other common representations are decision trees (rules
        at internal nodes), and neural networks (layers of weighted units), which trade interpretability for expressiveness.
      </p>
      <Table
        head={['Representation', 'Expressiveness', 'Interpretability', 'Example']}
        rows={[
          ['Linear model', 'Only linear relationships', 'High: one weight per feature', 'House-price regression'],
          ['Decision tree', 'Non-linear, axis-aligned rules', 'High: readable if–then rules', 'Loan approval from income and credit score'],
          ['Neural network', 'Can approximate any continuous function', 'Low: a “black box”', 'Recognising cats and dogs in images'],
        ]}
      />

      <H2>4. Choosing a function approximation algorithm</H2>
      <p>
        With a representation fixed, we need an algorithm that adjusts its parameters to fit training examples of the form{' '}
        <M>{'\\langle b, V_{\\text{train}}(b) \\rangle'}</M>. Mitchell defines the best weights as those that minimise the squared error
        over the training set:
      </p>
      <MB>{'E \\equiv \\sum_{\\langle b,\\, V_{train}(b) \\rangle \\in \\text{training examples}} \\left( V_{train}(b) - \\hat{V}(b) \\right)^2'}</MB>
      <p>
        and minimises it incrementally with the <span className="term">least mean squares (LMS)</span> weight-update rule. For each training
        example: compute <M>{'\\hat{V}(b)'}</M> with the current weights, then for every weight
      </p>
      <MB>{'w_i \\leftarrow w_i + \\eta \\, \\big( V_{train}(b) - \\hat{V}(b) \\big) \\, x_i'}</MB>
      <p>
        where <M>{'\\eta'}</M> is a small learning rate (for example 0.1). If the error is zero, nothing changes. If <M>{'\\hat{V}'}</M> is
        too low, every weight with a positive feature value increases, raising the estimate. A feature that is zero for this board leaves its
        weight untouched. This is stochastic gradient descent on the squared error, the same idea used to train neural networks.
      </p>

      <LMSFigure />

      <p>
        Other approximation algorithms include greedy decision-tree learning (split on the attribute with the highest information gain) and
        support vector machines (find the maximum-margin separating hyperplane). They differ in efficiency (gradient descent on large
        networks is slow; trees are fast) and in how well they generalise, which is why regularisation and cross-validation matter.
      </p>

      <H2>5. Estimating training values</H2>
      <p>
        The only training information in checkers is whether each game was eventually won or lost. Intermediate boards have no score. Mitchell’s
        surprisingly effective trick is to estimate each board’s value from the learner’s own opinion of the board that follows it:
      </p>
      <MB>{'V_{train}(b) \\leftarrow \\hat{V}\\big(\\text{Successor}(b)\\big)'}</MB>
      <p>
        where <M>{'\\text{Successor}(b)'}</M> is the next board at which it is again the program’s turn to move. Values propagate backwards
        from the end of the game, where they are exact, becoming more accurate as <M>{'\\hat{V}'}</M> improves. This is the seed of
        temporal-difference learning and Q-learning in reinforcement learning. In supervised problems, by contrast, the training values are
        simply the given labels (the actual house prices), and their quality matters: noisy labels degrade the model.
      </p>

      <H2>6. The final design</H2>
      <p>Put together, the checkers learner consists of four program modules that run in a loop:</p>
      <ul>
        <li>
          <strong>Performance System</strong>: solves the task (plays a game) using the learned <M>{'\\hat{V}'}</M>, producing a trace of
          the game.
        </li>
        <li>
          <strong>Critic</strong>: takes the trace and produces training examples <M>{'\\langle b, V_{train}(b) \\rangle'}</M>.
        </li>
        <li>
          <strong>Generalizer</strong>: takes the training examples and outputs a hypothesis, the new estimate of the target function (here,
          LMS-updated weights).
        </li>
        <li>
          <strong>Experiment Generator</strong>: takes the current hypothesis and proposes a new problem (an initial board) to explore.
        </li>
      </ul>

      <LearningSystemFlow />

      <H3>The general recipe from your notes</H3>
      <p>
        The lecture notes describe the same process in project terms, which is useful when a question asks you to “design a learning system”
        for a concrete application:
      </p>
      <ol>
        <li>Understand the problem: define the objective, the input-to-output mapping, and whether labelled data is available.</li>
        <li>Collect and prepare data: clean it, handle missing values, encode categories, scale features, and split into training, validation and test sets.</li>
        <li>Choose the learning paradigm and model (supervised, unsupervised or reinforcement; tree, network, SVM…).</li>
        <li>Train the model by minimising a loss function, watching for overfitting and underfitting.</li>
        <li>Evaluate with suitable metrics (accuracy, precision, recall, MSE) and cross-validation; tune hyperparameters.</li>
        <li>Deploy, monitor and retrain when the data distribution shifts.</li>
      </ol>
      <p>The design is iterative: evaluation usually sends you back to refine the model, add data, or improve preprocessing.</p>

      <H2>Writing it in the exam</H2>
      <Answer q="List the major components of a learning system. (Q2)" marks={5}>
        <p>
          Name the six design choices (training experience, target function, representation, approximation algorithm, estimating training
          values, final design) with one line each, then the four modules of the final design (Performance System, Critic, Generalizer,
          Experiment Generator) with their inputs and outputs. A loop diagram is worth drawing.
        </p>
      </Answer>
      <Answer q="Illustrate how a learning system can be designed for a spam email classification task. (Q5)" marks={10}>
        <p>
          <strong>Well-posed statement.</strong> T: classify emails as spam or not spam. P: percentage of emails correctly classified (or
          precision and recall on spam). E: a corpus of emails labelled by users.
        </p>
        <p>
          <strong>Training experience.</strong> Direct feedback: each email has a label. Representative of the mail the filter will see.
        </p>
        <p>
          <strong>Target function.</strong> <M>{'f: \\text{Email} \\rightarrow \\{\\text{spam}, \\text{ham}\\}'}</M>, or a score{' '}
          <M>{'P(\\text{spam} \\mid \\text{email})'}</M>.
        </p>
        <p>
          <strong>Representation.</strong> Bag-of-words features (word presence or counts), sender reputation, number of links; a Naive Bayes
          or logistic-regression model over them.
        </p>
        <p>
          <strong>Approximation algorithm.</strong> Estimate word probabilities by counting (Naive Bayes) or fit weights by gradient descent
          on log-loss (logistic regression).
        </p>
        <p>
          <strong>Training values.</strong> The user labels; users moving mail in and out of the spam folder supply new ones.
        </p>
        <p>
          <strong>Final design.</strong> Draw the four-module loop with spam-specific roles, as in the figure above when switched to Spam
          filter.
        </p>
      </Answer>
      <Answer q="Design a machine learning system to predict house prices from rooms, square footage and neighbourhood. (Homework)" marks={10}>
        <p>
          <strong>Experience:</strong> supervised regression; past sales with features and sale price. <strong>Target function:</strong>{' '}
          <M>{'f: (\\text{rooms}, \\text{sqft}, \\text{neighbourhood}) \\rightarrow \\text{price} \\in \\mathbb{R}'}</M>.{' '}
          <strong>Representation:</strong> linear regression (interpretable; one-hot encode neighbourhood), or a tree ensemble if the
          relationship is non-linear. <strong>Algorithm:</strong> ordinary least squares or gradient descent on MSE.{' '}
          <strong>Training values:</strong> recorded sale prices; handle missing values by imputation and watch for outliers and inflation.{' '}
          <strong>Final design:</strong> preprocessing pipeline → model → evaluation with RMSE and R² under cross-validation → deployment and
          periodic retraining.
        </p>
      </Answer>

      <Def term="In one sentence">
        Designing a learner means choosing what experience it gets, what function it should learn, how that function is represented, how its
        parameters are fitted, and where its training values come from, then wiring those choices into a loop that improves with practice.
      </Def>

      <KeyPoints>
        <li>Six choices: training experience, target function, representation, approximation algorithm, training values, final design.</li>
        <li>Checkers: learn V: B → ℝ, represented as a weighted sum of six board features.</li>
        <li>LMS rule: wᵢ ← wᵢ + η (V_train(b) − V̂(b)) xᵢ, which minimises squared error example by example.</li>
        <li>With indirect feedback, estimate V_train(b) ← V̂(Successor(b)).</li>
        <li>Final design: Performance System → Critic → Generalizer → Experiment Generator → …</li>
      </KeyPoints>
    </>
  );
}
