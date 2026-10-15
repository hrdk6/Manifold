import { M } from '../../components/Math';
import { Answer, Compare, Def, H2, H3, KeyPoints, Note, Table } from '../../components/prose';
import { Check } from '../../viz/common';
import { ComplexityFigure } from '../../viz/m2a';

export default function Supervised() {
  return (
    <>
      <p>
        Supervised learning is the most widely used kind of machine learning. Whenever you have examples of inputs paired with the outputs
        you want, and you need to produce the right output for new inputs, you have a supervised problem. This lesson sets up the vocabulary
        the rest of the module relies on: classification versus regression, generalisation, and the tension between fitting the training data
        and predicting new data.
      </p>

      <H2>Supervised learning</H2>
      <Def term="Supervised learning">
        Learning a function that maps an input to an output from example input–output pairs. The examples are <em>labelled</em>: a “teacher”
        has supplied the correct output for each one. The goal is accurate predictions for new, previously unseen inputs.
      </Def>
      <p>
        Creating the labelled dataset usually takes human effort (someone has to mark which emails are spam), but once it exists the
        algorithm automates a decision that would otherwise be slow or impossible to make by hand.
      </p>

      <H3>Classification and regression</H3>
      <Compare
        cols={[
          {
            title: 'Classification',
            items: [
              'Predicts a class label from a predefined set of possibilities.',
              <>
                <strong>Binary</strong>: two classes (spam / not spam, pass / fail). One is often called the positive class.
              </>,
              <>
                <strong>Multiclass</strong>: more than two (which of the ten digits, which language a site is in).
              </>,
              'Example: is this tumour benign or malignant?',
            ],
          },
          {
            title: 'Regression',
            items: [
              'Predicts a continuous number (a floating-point value).',
              'Example: a person’s annual income from education, age and location.',
              'Example: crop yield of a farm from last year’s yield, weather and staff count.',
              'Test: is there continuity between possible outputs? If yes, it is regression.',
            ],
          },
        ]}
      />
      <Note kind="tip">
        Predicting income is regression even though income is reported in whole rupees: the difference between ₹40,000 and ₹40,001 does
        not matter, and outputs form a continuum. Predicting the language of a website is classification: there is nothing “between” Hindi and
        Kannada.
      </Note>

      <H3>Why supervised learning matters (Q1)</H3>
      <ul>
        <li>
          <strong>It powers most practical ML</strong>: spam filtering, image recognition, voice assistants, medical diagnosis, credit scoring,
          demand forecasting.
        </li>
        <li>
          <strong>Measurable</strong>: because the correct answers are known, performance can be measured precisely (accuracy, MSE), which makes
          the problem well-posed.
        </li>
        <li>
          <strong>Controllable</strong>: we define exactly what the output should be, which matters where accuracy is critical.
        </li>
        <li>
          <strong>Predictive analytics</strong>: learning from historical data to forecast sales, churn or risk drives business decisions.
        </li>
        <li>
          <strong>Interpretable options</strong>: linear models and trees explain their decisions, valued in healthcare, law and finance.
        </li>
        <li>
          <strong>Foundation</strong>: concepts introduced here (loss, generalisation, overfitting, validation) underpin every other kind of
          learning.
        </li>
      </ul>

      <H2>Generalisation, overfitting and underfitting</H2>
      <Def term="Generalisation">
        A model generalises if it makes accurate predictions on unseen data that comes from the same distribution as the training data.
      </Def>
      <p>
        We always build models on the training set but care about their performance on new data. A model can be judged by how well it
        does on a held-out test set, which approximates performance on future data. Two failure modes bracket the good models:
      </p>
      <Table
        head={['', 'Underfitting', 'Overfitting']}
        rows={[
          ['What happens', 'The model is too simple to capture the patterns in the data.', 'The model is so complex it fits the noise and quirks of the training set.'],
          ['Training error', 'High', 'Very low'],
          ['Test error', 'High', 'High (much higher than training)'],
          ['Bias / variance', 'High bias, low variance', 'Low bias, high variance'],
          ['Example', 'A straight line through a curved relationship', 'A degree-15 polynomial through 20 noisy points'],
          ['Remedies', 'More features, a more flexible model, less regularisation', 'More data, a simpler model, regularisation, pruning, cross-validation'],
        ]}
      />
      <p>
        Müller and Guido illustrate this with a rule-maker who notices that every boat buyer in the data is over 45, has fewer than three
        children and is not divorced. The rule is 100% accurate on the data, yet obviously too specific. “People older than 50 want to buy a
        boat” is too simple. A good model is as simple as possible while still capturing the real pattern.
      </p>

      <ComplexityFigure />

      <H3>The model-complexity curve</H3>
      <p>
        Plot accuracy (or error) against model complexity. Training performance improves steadily with complexity. Test performance improves,
        peaks and then declines once the model starts to memorise. The best model sits at the peak of the test curve:{' '}
        <strong>the sweet spot</strong>. In the exam, draw this figure with three labelled regions: underfitting on the left, the sweet spot in
        the middle, overfitting on the right.
      </p>
      <svg viewBox="0 0 520 230" style={{ width: '100%', maxWidth: 560, height: 'auto', display: 'block', margin: '1.5rem 0' }} role="img" aria-label="Model complexity curve">
        <line x1="50" y1="195" x2="500" y2="195" stroke="var(--rule-strong)" />
        <line x1="50" y1="20" x2="50" y2="195" stroke="var(--rule-strong)" />
        <path d="M60 170 C 150 110, 260 60, 490 30" fill="none" stroke="var(--ultra)" strokeWidth="3" />
        <path d="M60 175 C 150 115, 230 70, 270 72 S 400 110, 490 150" fill="none" stroke="var(--rose)" strokeWidth="3" />
        <line x1="270" y1="20" x2="270" y2="195" stroke="var(--ink-3)" strokeDasharray="4 4" />
        <text x="105" y="215" textAnchor="middle" style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fill: 'var(--ink-2)', fontWeight: 650 }}>Underfitting</text>
        <text x="270" y="215" textAnchor="middle" style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fill: 'var(--ink)', fontWeight: 750 }}>Sweet spot</text>
        <text x="430" y="215" textAnchor="middle" style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fill: 'var(--ink-2)', fontWeight: 650 }}>Overfitting</text>
        <text x="495" y="28" textAnchor="end" style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fill: 'var(--ultra)', fontWeight: 650 }}>Training accuracy</text>
        <text x="495" y="145" textAnchor="end" style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fill: 'var(--rose)', fontWeight: 650 }}>Test accuracy</text>
        <text x="20" y="110" transform="rotate(-90 20 110)" textAnchor="middle" style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fill: 'var(--ink-3)' }}>Accuracy</text>
        <text x="275" y="12" style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fill: 'var(--ink-3)' }}>Model complexity →</text>
      </svg>

      <H3>Relation of model complexity to dataset size</H3>
      <p>
        The complexity a model can safely have is tied to the variety of data available. The more varied examples you have, the more complex a
        model you can use without overfitting. Collecting more data (more <em>varied</em> data, not duplicates) is often the most effective way
        to improve a model, more so than tweaking the algorithm. Try it in the figure: at degree 12, 20 points overfit badly while 120 points
        keep the curve sensible.
      </p>

      <H3>Bias and variance</H3>
      <p>
        Expected test error decomposes into three parts: <M>{'\\text{Error} = \\text{Bias}^2 + \\text{Variance} + \\text{irreducible noise}'}</M>.
        Bias is error from wrong assumptions (a line for a curve). Variance is error from sensitivity to the particular training sample (a
        different sample would give a very different wiggly curve). Increasing complexity lowers bias and raises variance; good models balance
        the two.
      </p>

      <Check
        q="A model scores 99% accuracy on its training set and 71% on the test set. What is the most likely diagnosis?"
        options={['Underfitting', 'Overfitting', 'A perfectly balanced model', 'The test set is mislabelled']}
        answer={1}
        why="A large gap between training and test performance is the signature of overfitting: the model has memorised the training data, including noise."
      />

      <H2>Writing it in the exam</H2>
      <Answer q="Explain the significance of supervised learning, and how model complexity affects overfitting and underfitting, with diagrams." marks={10} src="SEE ’25 3b">
        <p>
          <strong>Supervised learning (4).</strong> Definition with labelled pairs; classification vs regression with examples; significance:
          practical applications, measurable performance, predictive analytics, interpretability.
        </p>
        <p>
          <strong>Complexity (6).</strong> Define generalisation, underfitting and overfitting (table rows: training error, test error, bias,
          variance). Draw two diagrams: (i) three fits to the same data (a line underfitting, a smooth curve, a wiggly curve through every
          point); (ii) the model-complexity curve with training and test accuracy and the sweet spot. One line on dataset size: more varied data
          allows more complex models.
        </p>
      </Answer>

      <KeyPoints>
        <li>Supervised learning learns input → output mappings from labelled examples.</li>
        <li>Classification predicts categories; regression predicts continuous values.</li>
        <li>The goal is generalisation to unseen data, estimated with a held-out test set.</li>
        <li>Underfitting: too simple, high bias. Overfitting: too complex, high variance, big train–test gap.</li>
        <li>Test performance peaks at moderate complexity; more varied data supports more complex models.</li>
      </KeyPoints>
    </>
  );
}
