import { M, MB } from '../../components/Math';
import { Answer, Def, H2, H3, KeyPoints, Note, Table } from '../../components/prose';
import { enjoySport } from '../data/concept';
import { Check } from '../../viz/common';
import { ConceptTable, HypChips, HypothesisCounter, LatticeFigure } from '../../viz/concept';

export default function Concept() {
  return (
    <>
      <p>
        Much of learning is learning <em>categories</em>: what makes something a bird, a good loan applicant, a day worth playing tennis.
        Concept learning studies the simplest version of this: given examples labelled as members or non-members of a category, infer a
        general definition of the category. It is the cleanest setting in which to see what a hypothesis is, how a learner searches for one,
        and why every learner needs some bias.
      </p>

      <H2>What concept learning is</H2>
      <Def term="Concept learning">
        Inferring a Boolean-valued function from training examples of its input and output.
      </Def>
      <p>
        A <span className="term">concept</span> is a subset of objects defined over a larger set, or equivalently a function that returns{' '}
        <strong>true</strong> for members and <strong>false</strong> for everything else. “Apple” is a concept over all fruits; “days on
        which Aldo enjoys his favourite water sport” is a concept over all days.
      </p>
      <Note kind="insight" title="Why it matters">
        Concept learning is the foundation of classification: every binary classifier learns a concept. It makes the core ideas of the
        subject concrete: hypothesis spaces, generalisation from specific examples, the ordering of hypotheses, and inductive bias.
      </Note>

      <H2>The EnjoySport task</H2>
      <p>Mitchell’s running example has six attributes describing a day, and a label saying whether Aldo enjoyed his sport:</p>
      <ConceptTable data={enjoySport} />

      <H3>Notation</H3>
      <Table
        head={['Symbol', 'Name', 'For EnjoySport']}
        rows={[
          [<M>{'X'}</M>, 'Instances: the set of items over which the concept is defined', 'All possible days, each described by Sky, AirTemp, Humidity, Wind, Water, Forecast'],
          [<M>{'c'}</M>, 'Target concept: the function to learn, c : X → {0, 1}', 'c(x) = 1 if EnjoySport = Yes'],
          [<M>{'D'}</M>, 'Training examples: pairs ⟨x, c(x)⟩', 'The four rows above'],
          [<M>{'H'}</M>, 'Hypothesis space: every hypothesis the learner may consider', 'Conjunctions of constraints on the six attributes'],
        ]}
      />
      <p>
        Examples with <M>{'c(x) = 1'}</M> are <span className="term">positive examples</span>; those with <M>{'c(x) = 0'}</M> are{' '}
        <span className="term">negative examples</span>. The learner’s goal is a hypothesis <M>{'h \\in H'}</M> such that{' '}
        <M>{'h(x) = c(x)'}</M> for all <M>{'x \\in X'}</M>.
      </p>

      <H3>Representing hypotheses</H3>
      <p>Each hypothesis is a vector of six constraints, one per attribute. Each constraint is one of:</p>
      <ul>
        <li>
          <strong>?</strong>: any value is acceptable;
        </li>
        <li>
          <strong>a specific value</strong> such as Warm: only that value is acceptable;
        </li>
        <li>
          <strong>∅</strong>: no value is acceptable.
        </li>
      </ul>
      <p>
        An instance satisfies <M>{'h'}</M> (and <M>{'h'}</M> classifies it positive) when it meets every constraint. The hypothesis that
        Aldo enjoys his sport only on cold days with high humidity is <HypChips h={['?', 'Cold', 'High', '?', '?', '?']} size="sm" />. The{' '}
        <strong>most general hypothesis</strong> <HypChips h={['?', '?', '?', '?', '?', '?']} size="sm" /> says every day is positive; the{' '}
        <strong>most specific</strong> <HypChips h={['∅', '∅', '∅', '∅', '∅', '∅']} size="sm" /> says no day is.
      </p>

      <H2>Concept learning as search</H2>
      <p>
        Choosing a hypothesis representation fixes the space the learner can search. Concept learning is then a search through{' '}
        <M>{'H'}</M> for the hypothesis that best fits the training examples. The space is large even for this toy problem, which is why
        search must be organised cleverly.
      </p>
      <HypothesisCounter />

      <Def term="The inductive learning hypothesis">
        Any hypothesis found to approximate the target function well over a sufficiently large set of training examples will also approximate
        the target function well over other unobserved examples.
      </Def>
      <p>
        This is an assumption, not a theorem. It is the leap of faith every learner makes: we only ever see the training data, so the best we
        can do is find a hypothesis that fits it and hope it generalises.
      </p>

      <H2>The general-to-specific ordering</H2>
      <p>
        Many algorithms exploit a structure that every concept-learning problem has: some hypotheses are more general than others.
        Compare
      </p>
      <MB>{'h_1 = \\langle \\text{Sunny}, ?, ?, \\text{Strong}, ?, ? \\rangle \\qquad h_2 = \\langle \\text{Sunny}, ?, ?, ?, ?, ? \\rangle'}</MB>
      <p>
        Any day <M>{'h_1'}</M> classifies positive, <M>{'h_2'}</M> also classifies positive, because <M>{'h_2'}</M> imposes fewer
        constraints. So <M>{'h_2'}</M> is more general than <M>{'h_1'}</M>.
      </p>
      <Def term="More-general-than-or-equal-to (≥g)">
        Let <M>{'h_j'}</M> and <M>{'h_k'}</M> be Boolean-valued functions over <M>{'X'}</M>. Then <M>{'h_j \\geq_g h_k'}</M> if and only if{' '}
        <M>{'(\\forall x \\in X)\\,[\\,h_k(x) = 1 \\rightarrow h_j(x) = 1\\,]'}</M>. And <M>{'h_j >_g h_k'}</M> (strictly more general)
        if <M>{'h_j \\geq_g h_k'}</M> and not <M>{'h_k \\geq_g h_j'}</M>.
      </Def>
      <p>
        The relation is a <span className="term">partial order</span>: it is reflexive, antisymmetric and transitive, but some pairs are
        incomparable. <HypChips h={['Sunny', '?', '?', '?', '?', '?']} size="sm" /> and{' '}
        <HypChips h={['?', '?', '?', 'Strong', '?', '?']} size="sm" /> each accept days the other rejects, so neither is more general.
      </p>
      <LatticeFigure />
      <p>
        The ordering lets an algorithm search without enumerating <M>{'H'}</M>. Find-S starts at the bottom and moves up only as far as
        positive examples force it; Candidate-Elimination tracks both the upper and lower edges of the region of consistent hypotheses.
        Questions about consistency or contradictions in the data become questions about where hypotheses sit in this order.
      </p>

      <H2>More examples of concept learning tasks</H2>
      <H3>Recognising tennis from its equipment</H3>
      <p>
        Instances are sports described by Ball (small, large, none), Racket (yes, no), Field (court, field, table) and Net (yes, no). A
        consistent hypothesis is <HypChips h={['Small', 'Yes', 'Court', 'Yes']} size="sm" />: if the sport uses a small ball, a racket, a
        court and a net, it is tennis. Football (large ball, no racket, field, no net) and table tennis (described here without a ball or
        racket, on a table with a net) are rejected.
      </p>
      <H3>Recognising an orange</H3>
      <p>
        From ⟨Orange, Round, Medium⟩ → yes, ⟨Yellow, Elongated, Large⟩ → no (banana), ⟨Green, Round, Small⟩ → no (grape),
        ⟨Orange, Round, Small⟩ → yes, the most specific consistent hypothesis is <HypChips h={['Orange', 'Round', '?']} size="sm" />.
      </p>

      <Check
        q="Which hypothesis is more general than ⟨Sunny, Warm, ?, Strong, ?, ?⟩?"
        options={['⟨Sunny, Warm, High, Strong, ?, ?⟩', '⟨Sunny, ?, ?, Strong, ?, ?⟩', '⟨Rainy, Warm, ?, Strong, ?, ?⟩', '⟨Sunny, Warm, ∅, Strong, ?, ?⟩']}
        answer={1}
        why="Dropping the AirTemp constraint can only admit more days. Option A adds a constraint (more specific), C changes a constraint (incomparable), and D contains ∅ (accepts nothing)."
      />

      <H2>Writing it in the exam</H2>
      <Answer q="Define concept learning and explain its importance; explain the role of a hypothesis in concept learning." marks={10} src="SEE ’25 2a">
        <p>
          <strong>Definition (2).</strong> Inferring a Boolean-valued function from training examples of its input and output. A concept is a
          subset of instances, or a function c : X → {'{0, 1}'}.
        </p>
        <p>
          <strong>Components (3).</strong> Instances X, target concept c, training examples D (positive and negative), hypothesis space H. Use
          EnjoySport as the example and show the hypothesis notation with ?, specific values and ∅.
        </p>
        <p>
          <strong>Importance (2).</strong> Foundation of classification; makes generalisation and search precise; introduces version spaces
          and inductive bias; produces human-readable rules.
        </p>
        <p>
          <strong>Role of a hypothesis (3).</strong> A hypothesis is a candidate definition of the concept. It is what the learner outputs
          and uses to classify unseen instances; the hypothesis space bounds what can be learned; consistency with D is how hypotheses are
          judged; the general-to-specific ordering of hypotheses organises the search (Find-S, Candidate-Elimination).
        </p>
      </Answer>
      <Answer q="Explain the general-to-specific ordering with an example." marks={5}>
        <p>
          Give the ≥g definition, the h₁/h₂ example above, state that it is a partial order (with an incomparable pair), and draw a small
          lattice from ⟨?, ?⟩ down to ⟨∅, ∅⟩. Finish with why it matters: Find-S and Candidate-Elimination search H by moving along this
          ordering instead of enumerating it.
        </p>
      </Answer>

      <KeyPoints>
        <li>Concept learning infers a Boolean-valued function from labelled examples.</li>
        <li>Notation: instances X, target concept c, training data D, hypothesis space H.</li>
        <li>Hypotheses are conjunctions of constraints: ? (anything), a value, or ∅ (nothing).</li>
        <li>Learning is search through H; for EnjoySport, 973 semantically distinct hypotheses.</li>
        <li>h_j ≥g h_k when every instance satisfying h_k also satisfies h_j. It is a partial order that algorithms exploit.</li>
      </KeyPoints>
    </>
  );
}
