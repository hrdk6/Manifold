import { M, MB } from '../../components/Math';
import { Answer, Compare, Def, H2, H3, KeyPoints, Note, SolverLink, Table } from '../../components/prose';
import { CEAFigure, HypChips, VSVoteFigure } from '../../viz/concept';

const H = (s: string) => <HypChips h={s.split(',').map((t) => t.trim())} size="sm" />;

export default function CEA() {
  return (
    <>
      <p>
        Find-S returns one hypothesis and has no idea whether others fit the data equally well. Candidate-Elimination answers a better
        question: <em>what is the set of all hypotheses consistent with the training data?</em> Remarkably, it can represent that set, which
        may be huge, using just two small boundary sets.
      </p>

      <H2>Consistency and the version space</H2>
      <Def term="Consistent">
        A hypothesis h is consistent with a set of training examples D if and only if h(x) = c(x) for each example ⟨x, c(x)⟩ in D.
      </Def>
      <MB>{'\\text{Consistent}(h, D) \\equiv (\\forall \\langle x, c(x) \\rangle \\in D)\\; h(x) = c(x)'}</MB>
      <Note kind="tip">
        Consistent is not the same as satisfies. An example x <em>satisfies</em> h when h(x) = 1, whatever x’s label. h is{' '}
        <em>consistent</em> with x when h(x) agrees with the label, so a hypothesis can be consistent with a negative example it does not
        satisfy.
      </Note>
      <Def term="Version space">
        The version space <M>{'VS_{H,D}'}</M>, with respect to hypothesis space H and training examples D, is the subset of hypotheses from H
        consistent with all the training examples in D.
        <MB>{'VS_{H,D} \\equiv \\{\\, h \\in H \\mid \\text{Consistent}(h, D) \\,\\}'}</MB>
      </Def>

      <H3>List-Then-Eliminate</H3>
      <p>
        The obvious way to compute the version space is to list every hypothesis in H and delete those that disagree with each example. It is
        correct, but it requires enumerating H (973 hypotheses for EnjoySport, astronomically many for realistic problems), so it is only
        practical for tiny, finite spaces.
      </p>
      <ol>
        <li>VersionSpace ← a list containing every hypothesis in H.</li>
        <li>For each training example ⟨x, c(x)⟩, remove from VersionSpace any h for which h(x) ≠ c(x).</li>
        <li>Output the list of hypotheses in VersionSpace.</li>
      </ol>

      <H2>A compact representation: the boundaries S and G</H2>
      <Def term="General boundary G">
        The set of maximally general members of H consistent with D.
        <MB>{"G \\equiv \\{ g \\in H \\mid \\text{Consistent}(g, D) \\wedge (\\neg \\exists g' \\in H)[(g' >_g g) \\wedge \\text{Consistent}(g', D)] \\}"}</MB>
      </Def>
      <Def term="Specific boundary S">
        The set of minimally general (maximally specific) members of H consistent with D.
        <MB>{"S \\equiv \\{ s \\in H \\mid \\text{Consistent}(s, D) \\wedge (\\neg \\exists s' \\in H)[(s >_g s') \\wedge \\text{Consistent}(s', D)] \\}"}</MB>
      </Def>
      <p>
        <strong>Version space representation theorem.</strong> Every member of the version space lies between these boundaries:
      </p>
      <MB>{'VS_{H,D} = \\{ h \\in H \\mid (\\exists s \\in S)(\\exists g \\in G)\\; (g \\geq_g h \\geq_g s) \\}'}</MB>
      <p>So storing S and G is enough to know the whole version space, and to classify new instances with it.</p>

      <H2>The Candidate-Elimination algorithm</H2>
      <p>
        Initialise G to the most general hypothesis <HypChips h={['?', '?', '?']} size="sm" /> and S to the most specific{' '}
        <HypChips h={['∅', '∅', '∅']} size="sm" />. Then, for each training example d:
      </p>
      <Compare
        cols={[
          {
            title: 'If d is a positive example',
            items: [
              'Remove from G any hypothesis inconsistent with d (one that does not cover d).',
              <>
                For each s in S not consistent with d: remove s, and add all <strong>minimal generalisations</strong> h of s such that h is
                consistent with d and some member of G is more general than h.
              </>,
              'Remove from S any hypothesis more general than another hypothesis in S.',
            ],
          },
          {
            title: 'If d is a negative example',
            items: [
              'Remove from S any hypothesis inconsistent with d (one that covers d).',
              <>
                For each g in G not consistent with d: remove g, and add all <strong>minimal specialisations</strong> h of g such that h is
                consistent with d and some member of S is more specific than h.
              </>,
              'Remove from G any hypothesis less general than another hypothesis in G.',
            ],
          },
        ]}
      />
      <p>
        For conjunctive hypotheses, the minimal generalisation of s to cover a positive x is unique: replace ∅ with x’s value and any
        disagreeing value with ?. The minimal specialisations of g to exclude a negative x are found by taking each ? in g and replacing it, in
        turn, with every value of that attribute <em>except</em> x’s value. Then keep only those still above S.
      </p>

      <CEAFigure />

      <H2>Worked example: Apple or not (SEE ’25 2b)</H2>
      <Table
        head={['Example', 'Label', 'S after', 'G after']}
        rows={[
          ['start', '—', H('∅, ∅, ∅'), H('?, ?, ?')],
          ['E1 Red, Small, Smooth', 'Yes', H('Red, Small, Smooth'), H('?, ?, ?')],
          ['E2 Green, Large, Rough', 'No', H('Red, Small, Smooth'), <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{H('Red, ?, ?')}{H('?, Small, ?')}{H('?, ?, Smooth')}</span>],
          ['E3 Red, Medium, Smooth', 'Yes', H('Red, ?, Smooth'), <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{H('Red, ?, ?')}{H('?, ?, Smooth')}</span>],
          ['E4 Yellow, Large, Rough', 'No', H('Red, ?, Smooth'), <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{H('Red, ?, ?')}{H('?, ?, Smooth')}</span>],
          ['E5 Red, Small, Rough', 'No', H('Red, ?, Smooth'), H('?, ?, Smooth')],
        ]}
      />
      <p>Reasoning at each step:</p>
      <ul>
        <li>
          <strong>E2 (negative).</strong> G’s only member ⟨?, ?, ?⟩ covers E2, so specialise it. Colour can become Red or Yellow (not Green);
          Size can become Small or Medium (not Large); Texture can become Smooth (not Rough). Keep only those more general than S =
          ⟨Red, Small, Smooth⟩: ⟨Red, ?, ?⟩, ⟨?, Small, ?⟩ and ⟨?, ?, Smooth⟩. ⟨Yellow, ?, ?⟩ and ⟨?, Medium, ?⟩ are dropped because they
          would reject E1.
        </li>
        <li>
          <strong>E3 (positive).</strong> ⟨?, Small, ?⟩ does not cover a Medium apple, so it leaves G. S generalises Size to ?.
        </li>
        <li>
          <strong>E4 (negative).</strong> Both members of G already reject a yellow, rough fruit, and S does not cover it: no change.
        </li>
        <li>
          <strong>E5 (negative).</strong> ⟨Red, ?, ?⟩ covers this red, rough fruit, so it must be specialised: ⟨Red, Medium, ?⟩ and ⟨Red,
          Large, ?⟩ are not above S and are dropped; ⟨Red, ?, Smooth⟩ survives the S-check. But ⟨?, ?, Smooth⟩ is <em>already consistent</em>{' '}
          with E5 (Rough fails Smooth), so it stays, and ⟨Red, ?, Smooth⟩ is removed because it is less general than ⟨?, ?, Smooth⟩.
        </li>
      </ul>
      <p>
        Final boundaries: S = {'{'}⟨Red, ?, Smooth⟩{'}'}, G = {'{'}⟨?, ?, Smooth⟩{'}'}. The version space contains exactly these two
        hypotheses. Every fruit in the data is classified correctly by both, and they disagree only on non-red smooth fruit, which no example
        has shown.
      </p>
      <Note kind="exam" title="If your answer differs from the IA-1 scheme">
        The IA-1 solution scheme removes ⟨?, ?, Smooth⟩ at E5 and reports S = G = ⟨Red, ?, Smooth⟩. By the algorithm’s own rule, a member of
        G is only touched if it is <em>inconsistent</em> with the negative example, and ⟨?, ?, Smooth⟩ correctly rejects ⟨Red, Small,
        Rough⟩. In the exam, show the rule you are applying at each step (as above); if you mention convergence, say the version space is{' '}
        {'{'}⟨Red, ?, Smooth⟩, ⟨?, ?, Smooth⟩{'}'}, and that ⟨Red, ?, Smooth⟩ is the most specific concept consistent with the data. Clear,
        rule-by-rule working earns the marks.
      </Note>

      <H3>Classic EnjoySport trace</H3>
      <Table
        head={['After', 'S', 'G']}
        rows={[
          ['start', H('∅, ∅, ∅, ∅, ∅, ∅'), H('?, ?, ?, ?, ?, ?')],
          ['1 (+)', H('Sunny, Warm, Normal, Strong, Warm, Same'), H('?, ?, ?, ?, ?, ?')],
          ['2 (+)', H('Sunny, Warm, ?, Strong, Warm, Same'), H('?, ?, ?, ?, ?, ?')],
          ['3 (−)', H('Sunny, Warm, ?, Strong, Warm, Same'), <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{H('Sunny, ?, ?, ?, ?, ?')}{H('?, Warm, ?, ?, ?, ?')}{H('?, ?, ?, ?, ?, Same')}</span>],
          ['4 (+)', H('Sunny, Warm, ?, Strong, ?, ?'), <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{H('Sunny, ?, ?, ?, ?, ?')}{H('?, Warm, ?, ?, ?, ?')}</span>],
        ]}
      />
      <p>
        At example 3, ⟨?, ?, Normal, ?, ?, ?⟩ and ⟨?, ?, ?, ?, Cool, ?⟩ are minimal specialisations too, but they are not more general than S
        (they would reject example 2 or 1), so they are discarded. At example 4, ⟨?, ?, ?, ?, ?, Same⟩ fails to cover a positive day with
        forecast Change and leaves G. The final version space has six hypotheses; they are listed in the figure above when you choose
        EnjoySport.
      </p>

      <H3>When the version space collapses: PlayTennis (Q15)</H3>
      <p>
        Run the PlayTennis data through the figure. After D3 (Overcast, positive) G shrinks to ⟨Overcast, ?, ?, ?⟩. D4 is a positive{' '}
        <em>Rain</em> day, which that hypothesis rejects, so it is removed and G becomes empty; S then has nothing above it and empties too.
      </p>
      <p>
        This is not an arithmetic slip; it is the algorithm telling you something. Any conjunction covering both Overcast and Rain positives
        must leave Outlook as ?, and covering Hot, Mild and Cool, High and Normal leaves only ⟨?, ?, ?, Weak⟩, which wrongly covers the
        negative D1 (Sunny, Hot, High, Weak). The real concept is “Outlook is not Sunny”, a <strong>disjunction</strong> that the conjunctive
        hypothesis space cannot express. An empty version space means either the data contains errors or the target concept is not in H.
      </p>
      <SolverLink to="cea">Trace any dataset in the Candidate-Elimination solver</SolverLink>

      <H2>Remarks on version spaces</H2>
      <H3>Will it converge to the correct hypothesis?</H3>
      <p>
        Yes, provided (1) the training examples contain no errors and (2) some hypothesis in H correctly describes the target concept. As
        more examples arrive, S and G move towards each other, and when they become identical the target concept has been learned exactly.
        If either condition fails, the version space eventually becomes empty, as above.
      </p>
      <H3>What training example should the learner request next?</H3>
      <p>
        If the learner may choose its own queries, the best one is an instance that satisfies exactly half of the hypotheses in the current
        version space. Whatever the answer, half the hypotheses are eliminated, so the correct concept is found in about{' '}
        <M>{'\\lceil \\log_2 |VS| \\rceil'}</M> queries. For EnjoySport, ⟨Sunny, Warm, Normal, Weak, Warm, Same⟩ satisfies exactly three of the six remaining hypotheses (those that do not
        require a strong wind).
      </p>
      <H3>How can partially learned concepts be used?</H3>
      <p>
        Even before convergence, a new instance can be classified with complete confidence when every hypothesis in the version space agrees:
        if it satisfies every member of S it is positive, and if it satisfies no member of G it is negative. Otherwise the hypotheses can vote,
        and the proportion of votes is a measure of confidence.
      </p>
      <VSVoteFigure />

      <H2>Find-S versus Candidate-Elimination (Q17, Q19)</H2>
      <Table
        head={['', 'Find-S', 'Candidate-Elimination']}
        rows={[
          ['Output', 'A single maximally specific hypothesis', 'The whole version space, via boundaries S and G'],
          ['Examples used', 'Positive only; negatives ignored', 'Both positive and negative'],
          ['Search direction', 'Specific-to-general only', 'Bidirectional: S generalises, G specialises'],
          ['Knows when it has converged?', 'No', 'Yes: S = G'],
          ['Detects inconsistent data?', 'No; silently over-generalises', 'Yes: the version space becomes empty'],
          ['Can choose informative queries?', 'No', 'Yes: query instances that split the version space'],
          ['Classifying unseen instances', 'One answer, no confidence', 'Unanimous vote, or a vote fraction as confidence'],
          ['Cost', 'Very cheap: one hypothesis', 'S and G can grow large (G especially) in big spaces'],
        ]}
      />
      <Note kind="exam" title="Which is preferable with noisy data?">
        Neither algorithm tolerates noise, because both demand perfect consistency. With a mislabelled example, Find-S quietly over-generalises
        (a noisy positive) and never notices, while Candidate-Elimination eliminates the true hypothesis and collapses towards an empty
        version space. Candidate-Elimination is the more useful of the two because the collapse <em>signals</em> that something is wrong,
        whereas Find-S gives a confident wrong answer. For genuinely noisy data, use noise-tolerant learners such as pruned decision trees or
        probabilistic models.
      </Note>

      <H2>Writing it in the exam</H2>
      <Answer q="Apply Candidate-Elimination to the given data and show S and G after each example." marks={10} src="SEE ’25 2b">
        <p>
          <strong>Setup (2).</strong> Define S and G, initialise S₀ = ⟨∅, ∅, ∅⟩ and G₀ = ⟨?, ?, ?⟩, list the attribute values.
        </p>
        <p>
          <strong>Trace (6).</strong> For each example write its label, then S and G. For negatives, list every minimal specialisation and
          say which are kept (“more general than S”) and which are dropped. For positives, say which members of G are removed and how S
          generalises.
        </p>
        <p>
          <strong>Result (2).</strong> State the final S and G and the version space between them, and classify one new instance by voting.
        </p>
      </Answer>
      <Answer q="Describe the purpose of the Candidate-Elimination algorithm. (Q11)" marks={5}>
        <p>
          It computes the version space: every hypothesis in H consistent with the training data. It does so incrementally and compactly by
          maintaining only the most general boundary G and the most specific boundary S. This lets the learner tell when it has converged,
          detect inconsistent data, pick informative queries and classify new instances with a measure of confidence.
        </p>
      </Answer>

      <KeyPoints>
        <li>Version space = all hypotheses in H consistent with D; it is fully described by its boundaries S and G.</li>
        <li>Positive examples prune G and generalise S; negative examples prune S and specialise G.</li>
        <li>Specialisations must stay above S; generalisations must stay below G; prune redundant members.</li>
        <li>Converges to the target if the data is error-free and the target is in H; otherwise the version space empties.</li>
        <li>Apple result: S = {'{'}⟨Red, ?, Smooth⟩{'}'}, G = {'{'}⟨?, ?, Smooth⟩{'}'}.</li>
      </KeyPoints>
    </>
  );
}
