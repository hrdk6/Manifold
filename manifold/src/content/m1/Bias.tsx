import { M, MB } from '../../components/Math';
import { Answer, Compare, Def, H2, H3, KeyPoints, Note, Table } from '../../components/prose';
import { BiasFigure, HypChips } from '../../viz/concept';

export default function Bias() {
  return (
    <>
      <p>
        The PlayTennis data emptied the version space because the true concept was a disjunction and the hypothesis space only contained
        conjunctions. The natural fix seems to be: use a hypothesis space rich enough to contain every concept. This lesson shows why that
        fix destroys learning altogether, and why every learner must make assumptions beyond the data. Those assumptions are its{' '}
        <em>inductive bias</em>.
      </p>

      <H2>Definition</H2>
      <Def term="Inductive bias (informal)">
        The set of assumptions a learning algorithm uses to predict outputs for inputs it has not encountered during training.
      </Def>
      <p>
        Whenever more than one hypothesis fits the training data, which is almost always, the inductive bias is what makes the learner pick one
        and generalise. It narrows the search space, guides the choice between competing hypotheses, and prevents the learner from simply
        memorising the training set.
      </p>

      <H2>A biased hypothesis space</H2>
      <p>Restricting H to conjunctions is a bias. Suppose the target concept is “Sky = Sunny or Sky = Cloudy” and the data is:</p>
      <Table
        head={['Sky', 'AirTemp', 'Humidity', 'Wind', 'Water', 'Forecast', 'EnjoySport']}
        rows={[
          ['Sunny', 'Warm', 'Normal', 'Strong', 'Cool', 'Change', 'Yes'],
          ['Cloudy', 'Warm', 'Normal', 'Strong', 'Cool', 'Change', 'Yes'],
          ['Rainy', 'Warm', 'Normal', 'Strong', 'Cool', 'Change', 'No'],
        ]}
      />
      <p>
        After the two positives, the most specific conjunctive hypothesis is <HypChips h={['?', 'Warm', 'Normal', 'Strong', 'Cool', 'Change']} size="sm" />,
        which already covers the third (negative) example. No conjunction is consistent with these three examples: the hypothesis space is{' '}
        <strong>biased</strong>, and the bias here causes failure.
      </p>

      <H2>An unbiased learner</H2>
      <p>
        To guarantee the target is representable, let H be the <strong>power set</strong> of X: every possible subset of instances. With 96
        EnjoySport instances that is <M>{'2^{96} \\approx 10^{28}'}</M> concepts, expressible by allowing disjunctions, conjunctions and
        negations of the earlier hypotheses.
      </p>
      <p>
        Now run Candidate-Elimination. With positive examples x₁, x₂, x₃ and negatives x₄, x₅, the boundaries become
      </p>
      <MB>{'S = \\{ (x_1 \\vee x_2 \\vee x_3) \\} \\qquad G = \\{ \\neg (x_4 \\vee x_5) \\}'}</MB>
      <p>
        S is just the disjunction of the positives and G the negation of the negatives. The only instances the version space classifies
        unanimously are the training examples themselves. For any unseen instance x, for every hypothesis h in the version space that labels x
        positive there is an identical one that labels it negative (flip x and nothing else). <strong>Exactly half the version space votes
        each way.</strong> The learner cannot generalise at all; it is a rote learner. Try it in the figure below.
      </p>

      <BiasFigure />

      <H2>The futility of bias-free learning</H2>
      <Note kind="insight" title="The fundamental property of inductive inference">
        A learner that makes no a priori assumptions regarding the identity of the target concept has no rational basis for classifying any
        unseen instances.
      </Note>
      <p>
        Candidate-Elimination generalises beyond the training data only because it assumes the target concept can be represented as a
        conjunction of attribute values. If that assumption is correct and the data is error-free, its classifications of new instances are
        guaranteed correct. If it is wrong, some will be misclassified.
      </p>

      <H3>The formal definition</H3>
      <p>
        Let L be a learning algorithm, <M>{'D_c = \\{\\langle x, c(x) \\rangle\\}'}</M> the training data for concept c, and{' '}
        <M>{'L(x_i, D_c)'}</M> the classification L assigns to <M>{'x_i'}</M> after training on <M>{'D_c'}</M>. Because inductive inference is
        not deductively valid, <M>{'L(x_i, D_c)'}</M> does not follow from <M>{'D_c \\wedge x_i'}</M> alone.
      </p>
      <Def term="Inductive bias (Mitchell)">
        The inductive bias of L is any minimal set of assertions B such that for any target concept c and corresponding training examples{' '}
        <M>{'D_c'}</M>,
        <MB>{'(\\forall x_i \\in X)\\; \\big[ (B \\wedge D_c \\wedge x_i) \\vdash L(x_i, D_c) \\big]'}</MB>
        where ⊢ means “deductively entails”.
      </Def>
      <p>
        In words: the bias is exactly the extra premise that turns the learner’s inductive leap into a deductive proof. For Candidate-Elimination
        that premise is <strong>“the target concept c is contained in the hypothesis space H”</strong>. An inductive system (Candidate-Elimination
        with H) behaves identically to a deductive system (a theorem prover given D, x and the assertion c ∈ H).
      </p>

      <H2>Comparing learners by the strength of their bias</H2>
      <Table
        head={['Learner', 'Inductive bias', 'Behaviour on unseen instances']}
        rows={[
          ['Rote-Learner', 'None', 'Classifies only instances it has stored; refuses all others.'],
          ['Candidate-Elimination', 'The target concept is in H (here: a conjunction)', 'Classifies an instance only when every member of the version space agrees.'],
          ['Find-S', 'The target is in H, and all instances are negative unless the opposite is entailed by its knowledge', 'Classifies every instance; it is the most committed, and so the most likely to be wrong when its assumptions fail.'],
        ]}
      />
      <p>
        The stronger the bias, the more instances a learner can classify and the more “inductive leaps” it makes. Bias is not a defect to be
        eliminated; it is a commitment to be chosen wisely.
      </p>

      <H2>Kinds and examples of inductive bias</H2>
      <Compare
        cols={[
          {
            title: 'Restriction (language) bias',
            items: [
              'Limits which hypotheses can be expressed at all.',
              'Candidate-Elimination: only conjunctions of attribute values.',
              'Linear models: only linear relationships between inputs and output.',
            ],
          },
          {
            title: 'Preference (search) bias',
            items: [
              'All hypotheses are expressible, but some are preferred.',
              'Decision-tree learning (ID3) prefers shorter trees, with high-information attributes near the root.',
              'Occam’s razor: prefer the simplest hypothesis that fits the data.',
            ],
          },
        ]}
      />
      <ul>
        <li>
          <strong>Linear models</strong> assume the relationship between inputs and output is linear; good when it approximately is.
        </li>
        <li>
          <strong>Smoothness</strong>: similar inputs give similar outputs. k-nearest neighbours relies on it entirely.
        </li>
        <li>
          <strong>Occam’s razor</strong>: simpler hypotheses are more likely to be correct; a tree with fewer splits is preferred.
        </li>
        <li>
          <strong>Neural-network architecture</strong>: convolutional networks assume spatial locality and hierarchy in images.
        </li>
        <li>
          <strong>Regularisation</strong> (L1, L2 penalties) is an explicit bias toward small weights and simpler models.
        </li>
      </ul>
      <p>
        Bias can be <strong>explicit</strong> (a designer chooses a linear model or sets hyperparameters) or <strong>implicit</strong> (it
        emerges from the algorithm or architecture, like the preference of gradient descent for certain solutions).
      </p>

      <H3>Trade-offs</H3>
      <ul>
        <li>
          <strong>No Free Lunch theorem</strong>: averaged over all possible problems, no learner beats any other. A bias that helps on one kind
          of problem must hurt on another, so the bias has to match the problem.
        </li>
        <li>
          <strong>Bias–variance trade-off</strong>: a strong bias gives simple models with high bias and low variance (risk of underfitting); a
          weak bias gives flexible models with low bias and high variance (risk of overfitting).
        </li>
      </ul>

      <H2>Writing it in the exam</H2>
      <Answer q="Evaluate the significance of inductive bias in concept learning. Support your argument with examples. (Q20)" marks={10}>
        <p>
          <strong>Define (2).</strong> Informal definition, then Mitchell’s formal one with B ∧ D ∧ x ⊢ L(x, D).
        </p>
        <p>
          <strong>Why it is necessary (3).</strong> Biased space example (Sunny or Cloudy cannot be expressed), unbiased power-set learner whose
          version space splits 50/50 on every unseen instance, and the futility-of-bias-free-learning statement.
        </p>
        <p>
          <strong>Compare learners (2).</strong> Rote-Learner, Candidate-Elimination, Find-S, in increasing strength of bias.
        </p>
        <p>
          <strong>Examples and trade-offs (3).</strong> Linear models, smoothness, Occam’s razor, regularisation; No Free Lunch and the
          bias–variance trade-off. Conclude that the right bias is what lets a learner generalise reliably.
        </p>
      </Answer>

      <KeyPoints>
        <li>Inductive bias = the assumptions that let a learner classify instances it has not seen.</li>
        <li>An unbiased learner (H = power set of X) cannot generalise: every unseen instance splits the version space in half.</li>
        <li>Formally, B is the minimal set of assertions with (B ∧ D_c ∧ xᵢ) ⊢ L(xᵢ, D_c).</li>
        <li>Candidate-Elimination’s bias: the target concept is in H. Find-S adds a default of “negative”.</li>
        <li>Restriction vs preference bias; No Free Lunch and the bias–variance trade-off govern the choice.</li>
      </KeyPoints>
    </>
  );
}
