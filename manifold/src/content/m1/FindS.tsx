import { Answer, Code, H2, H3, KeyPoints, Note, SolverLink, Table } from '../../components/prose';
import { FindSFigure, HypChips } from '../../viz/concept';

export default function FindS() {
  return (
    <>
      <p>
        Find-S is the simplest algorithm that exploits the general-to-specific ordering. It begins with the most specific hypothesis
        possible and makes it more general only when a positive training example forces it to. The result is the <em>maximally specific</em>{' '}
        hypothesis that covers every positive example.
      </p>

      <H2>The algorithm</H2>
      <ol className="steps">
        <li>
          <strong>Initialise</strong> h to the most specific hypothesis in H: <HypChips h={['∅', '∅', '∅', '∅', '∅', '∅']} size="sm" />.
        </li>
        <li>
          <strong>For each positive training instance x</strong>, and for each attribute constraint aᵢ in h: if x satisfies aᵢ, do nothing;
          otherwise replace aᵢ by the next more general constraint that x satisfies (∅ becomes x’s value; a different value becomes ?).
        </li>
        <li>
          <strong>Ignore every negative example.</strong>
        </li>
        <li>
          <strong>Output</strong> h.
        </li>
      </ol>
      <Note kind="warn">
        Initialise with ∅ (phi), not ?. Writing h₀ = ⟨?, ?, …⟩ is the most general hypothesis, the opposite end of the lattice, and costs
        marks. Some answer keys write “?” loosely here; in your answer use ∅ and say it means “no value is acceptable”.
      </Note>

      <FindSFigure />

      <H2>Worked example: EnjoySport</H2>
      <Table
        head={['Step', 'Example', 'Label', 'Hypothesis after the step']}
        rows={[
          ['h₀', '—', '—', <HypChips h={['∅', '∅', '∅', '∅', '∅', '∅']} size="sm" />],
          ['1', 'Sunny, Warm, Normal, Strong, Warm, Same', 'Yes', <HypChips h={['Sunny', 'Warm', 'Normal', 'Strong', 'Warm', 'Same']} size="sm" changed={[0, 1, 2, 3, 4, 5]} />],
          ['2', 'Sunny, Warm, High, Strong, Warm, Same', 'Yes', <HypChips h={['Sunny', 'Warm', '?', 'Strong', 'Warm', 'Same']} size="sm" changed={[2]} />],
          ['3', 'Rainy, Cold, High, Strong, Warm, Change', 'No', <span>unchanged (negative ignored)</span>],
          ['4', 'Sunny, Warm, High, Strong, Cool, Change', 'Yes', <HypChips h={['Sunny', 'Warm', '?', 'Strong', '?', '?']} size="sm" changed={[4, 5]} />],
        ]}
      />
      <p>
        Final hypothesis: <HypChips h={['Sunny', 'Warm', '?', 'Strong', '?', '?']} />. Aldo enjoys the sport when the sky is sunny, the air is
        warm and the wind is strong, whatever the humidity, water and forecast. Check it against example 3: Rainy fails the first constraint,
        so it is correctly classified negative.
      </p>

      <H3>The other question-bank datasets</H3>
      <p>
        <strong>Hiring (Q13).</strong> The positives are ⟨Masters, 5 years, Python, Good⟩, ⟨Masters, 6 years, Python, Good⟩ and ⟨Masters, 5
        years, Python, Excellent⟩. Find-S gives <HypChips h={['Masters', '?', 'Python', '?']} size="sm" />: a Masters degree and Python
        skills lead to a positive decision; experience and portfolio do not matter in this data. The negative (Bachelors) is correctly
        rejected.
      </p>
      <p>
        <strong>Picnic (Q14).</strong> The four positives disagree on every attribute, so Find-S ends at{' '}
        <HypChips h={['?', '?', '?', '?']} size="sm" />, which classifies <em>every</em> day as good for a picnic, including ⟨Rain, Mild,
        Normal, Weak⟩, which is labelled No. Step through the picnic data in the figure above. This is the clearest illustration of Find-S’s
        main weakness, discussed next.
      </p>
      <SolverLink to="find-s">Solve any Find-S table step by step</SolverLink>

      <H2>Properties</H2>
      <ul>
        <li>
          Find-S is guaranteed to output the <strong>most specific hypothesis within H</strong> that is consistent with the positive
          examples.
        </li>
        <li>
          That hypothesis is also consistent with the negative examples <em>provided</em> the target concept is in H and the training data is
          free of errors. Under those assumptions, if c is in H, c is at least as general as h, so it can never be true that h covers a negative
          example that c rejects.
        </li>
        <li>It visits only one hypothesis per step, so it is fast and needs almost no memory.</li>
      </ul>

      <H2>Limitations (Q18)</H2>
      <Table
        head={['Limitation', 'What goes wrong']}
        rows={[
          ['Cannot tell whether it has learned the concept', 'It returns one hypothesis but cannot say whether other, different hypotheses are equally consistent with the data. There is no notion of convergence.'],
          ['Why prefer the most specific hypothesis?', 'Its bias toward specificity is arbitrary; the most general consistent hypothesis has an equal claim. Without the full set of candidates we cannot judge.'],
          ['No detection of inconsistent data', 'Because negatives are ignored, errors and noise go unnoticed. A single mislabelled positive can over-generalise h permanently (the picnic data).'],
          ['Several maximally specific hypotheses', 'For richer hypothesis spaces there can be several maximally specific consistent hypotheses; Find-S would need to backtrack, which it does not.'],
          ['Limited hypothesis space', 'Only conjunctions of attribute values. Disjunctive concepts (“Sunny or Overcast”) cannot be represented at all.'],
        ]}
      />
      <p>Candidate-Elimination, the next lesson, fixes the first three by keeping every consistent hypothesis rather than just one.</p>

      <H2>Find-S in Python</H2>
      <Code title="find_s.py">{`
import pandas as pd

data = pd.DataFrame([
    ["Sunny", "Warm", "Normal", "Strong", "Warm", "Same",   "Yes"],
    ["Sunny", "Warm", "High",   "Strong", "Warm", "Same",   "Yes"],
    ["Rainy", "Cold", "High",   "Strong", "Warm", "Change", "No"],
    ["Sunny", "Warm", "High",   "Strong", "Cool", "Change", "Yes"],
], columns=["Sky", "AirTemp", "Humidity", "Wind", "Water", "Forecast", "EnjoySport"])

def find_s(df, target):
    X = df.drop(columns=[target]).values
    y = df[target].values
    h = ["0"] * X.shape[1]                     # most specific: phi in every slot
    for x, label in zip(X, y):
        if label != "Yes":                     # ignore negative examples
            continue
        for i, value in enumerate(x):
            if h[i] == "0":
                h[i] = value                   # first positive: copy its values
            elif h[i] != value:
                h[i] = "?"                     # disagreement: generalise
    return h

print(find_s(data, "EnjoySport"))
# ['Sunny', 'Warm', '?', 'Strong', '?', '?']
`}</Code>

      <H2>Writing it in the exam</H2>
      <Answer q="Apply FIND-S to the EnjoySport dataset to find the final hypothesis." marks={10} src="SEE ’25 1b">
        <p>
          <strong>Algorithm (3).</strong> Write the four steps above.
        </p>
        <p>
          <strong>Trace (6).</strong> Show h₀ with ∅ and then h after every example, including the line “example 3 is negative, so h is
          unchanged”. Circle or underline the constraints that change.
        </p>
        <p>
          <strong>Conclusion (1).</strong> State the final hypothesis ⟨Sunny, Warm, ?, Strong, ?, ?⟩ in words and verify it rejects the
          negative example.
        </p>
      </Answer>

      <KeyPoints>
        <li>Find-S starts at ⟨∅, …, ∅⟩ and minimally generalises on each positive example.</li>
        <li>Negative examples are ignored entirely.</li>
        <li>EnjoySport result: ⟨Sunny, Warm, ?, Strong, ?, ?⟩.</li>
        <li>It assumes the target is in H and the data is noise-free; otherwise it can over-generalise silently (picnic data).</li>
        <li>It cannot tell whether it has converged or whether other consistent hypotheses exist.</li>
      </KeyPoints>
    </>
  );
}
