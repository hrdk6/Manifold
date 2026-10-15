import { Answer, Compare, Def, H2, H3, KeyPoints, Note, Table } from '../../components/prose';
import { Check } from '../../viz/common';

export default function Perspectives() {
  return (
    <>
      <p>
        Machine learning draws on statistics, computer science, psychology, engineering and mathematics, and each discipline looks at the
        same problem through a different lens. Knowing the lenses helps you explain <em>why</em> a technique exists; knowing the issues helps
        you explain why a model that looks good in the lab can fail in practice.
      </p>

      <H2>The unifying perspective: learning as search</H2>
      <Def term="Mitchell’s perspective">
        Machine learning involves searching a very large space of possible hypotheses to determine one that best fits the observed data and
        any prior knowledge held by the learner.
      </Def>
      <p>
        The checkers learner searches the space of all weight vectors <em>w₀…w₆</em>; a decision-tree learner searches the space of trees;
        Find-S and Candidate-Elimination (later in this module) search a space of conjunctive rules. Different algorithms are different
        search strategies over different hypothesis spaces.
      </p>

      <H2>Five perspectives</H2>
      <Table
        head={['Perspective', 'What it emphasises', 'Typical ideas']}
        rows={[
          ['Statistical', 'Learning as estimating a function from a sample, so as to generalise to the population.', 'Maximum likelihood estimation, loss minimisation, inference, confidence.'],
          ['Algorithmic', 'Efficient procedures that learn from data and scale.', 'Optimisation (gradient descent, genetic algorithms), time and memory complexity.'],
          ['Cognitive', 'Learning modelled on human learning and the brain.', 'Artificial neural networks inspired by biological neurons; learning from experience.'],
          ['Engineering', 'Robust, deployable systems that solve practical problems.', 'Data pipelines, integration into products, scalability, monitoring (recommenders, self-driving cars).'],
          ['Theoretical', 'The mathematical limits and guarantees of learning.', 'Bias–variance trade-off, generalisation theory, PAC (Probably Approximately Correct) learning.'],
        ]}
      />
      <Note kind="tip">
        PAC learning asks: how many examples does a learner need so that, with high probability, the hypothesis it outputs is approximately
        correct? It ties sample size to the complexity of the hypothesis space. Mention it under the theoretical perspective.
      </Note>

      <H2>Issues in machine learning</H2>
      <H3>Mitchell’s research questions</H3>
      <ul>
        <li>What algorithms exist for learning general target functions from specific training examples, and in what settings do they converge?</li>
        <li>How much training data is sufficient? What bounds relate confidence in a hypothesis to the amount of experience and the size of the hypothesis space?</li>
        <li>When and how can prior knowledge held by the learner guide generalisation, even if it is only approximately correct?</li>
        <li>What is the best strategy for choosing the next training experience, and how does that choice change the problem?</li>
        <li>What is the best way to reduce a learning task to one or more function-approximation problems?</li>
        <li>How can the learner automatically change its representation to improve its ability to learn the target function?</li>
      </ul>

      <H3>Practical issues (from your notes)</H3>
      <Compare
        cols={[
          {
            title: 'Data',
            items: [
              <>
                <strong>Sparsity</strong>: too little data for the problem’s complexity.
              </>,
              <>
                <strong>Noise and missing values</strong> degrade accuracy.
              </>,
              <>
                <strong>Bias</strong>: unbalanced or unrepresentative data is inherited and amplified by the model.
              </>,
            ],
          },
          {
            title: 'Model',
            items: [
              <>
                <strong>Overfitting</strong>: memorising noise; great on training data, poor on new data.
              </>,
              <>
                <strong>Underfitting</strong>: too simple to capture the pattern.
              </>,
              <>
                <strong>Interpretability</strong>: deep models are black boxes; accuracy often trades against explainability.
              </>,
            ],
          },
          {
            title: 'System and society',
            items: [
              <>
                <strong>Scalability</strong>: compute and memory grow with data; distributed training may be needed.
              </>,
              <>
                <strong>Ethics</strong>: fairness, transparency and accountability of automated decisions.
              </>,
              <>
                <strong>Privacy</strong>: models need personal data that must be protected.
              </>,
            ],
          },
        ]}
      />

      <Check
        q="A loan-approval model trained on historical decisions approves far fewer applicants from one district, mirroring past human prejudice. Which issue is this primarily?"
        options={['Underfitting', 'Data bias leading to unfair outcomes', 'Scalability', 'Lack of a performance measure']}
        answer={1}
        why="The model faithfully learned a pattern that exists in biased training data. Fairness problems usually start with the data, not the algorithm."
      />

      <H2>Writing it in the exam</H2>
      <Answer q="Describe the primary perspectives and issues in machine learning." marks={6} src="SEE ’25 1a">
        <p>
          <strong>Perspective (2 marks).</strong> Open with Mitchell: ML is a search through a large hypothesis space for the hypothesis that
          best fits the data and prior knowledge. Then list the five lenses (statistical, algorithmic, cognitive, engineering, theoretical)
          with one line each.
        </p>
        <p>
          <strong>Issues (4 marks).</strong> Give Mitchell’s questions (algorithms and convergence, how much data, prior knowledge, choosing
          the next experience, reducing to function approximation, changing representation) and the practical issues: data quality and bias,
          overfitting/underfitting, interpretability, scalability, ethics and privacy. Illustrate at least two with an example.
        </p>
      </Answer>

      <KeyPoints>
        <li>Unifying view: learning is search through a hypothesis space for the best fit to data and prior knowledge.</li>
        <li>Five perspectives: statistical, algorithmic, cognitive, engineering, theoretical (bias–variance, PAC).</li>
        <li>Mitchell’s issues: algorithms, how much data, prior knowledge, choice of experience, function approximation, representation.</li>
        <li>Practical issues: data quality and bias, over/underfitting, interpretability, scalability, ethics and privacy.</li>
      </KeyPoints>
    </>
  );
}
