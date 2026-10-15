import { M } from '../../components/Math';
import { Answer, Def, H2, H3, KeyPoints, Note, Table } from '../../components/prose';
import { SorterGame } from '../../viz/common';
import { StabilityFigure } from '../../viz/m1';

export default function WellPosed() {
  return (
    <>
      <p>
        Before choosing an algorithm you have to state the problem precisely enough that “getting better” has a meaning. The phrase{' '}
        <em>well-posed</em> is used in two connected senses, and a good exam answer mentions both: Mitchell’s sense (the problem names its
        task, performance measure and experience) and the mathematical sense due to Hadamard (a solution exists, is unique, and is stable).
      </p>

      <H2>Mitchell’s well-posed learning problem</H2>
      <Def term="Well-posed learning problem">
        A learning problem is well-posed when it identifies three features: the class of <strong>tasks T</strong>, the{' '}
        <strong>performance measure P</strong> to be improved, and the source of <strong>experience E</strong>.
      </Def>
      <p>
        “Make a computer good at checkers” is not yet a learning problem. “Improve the percentage of games won (P) at playing checkers (T) by
        playing practice games against itself (E)” is. Being explicit about all three forces decisions you would otherwise skip: what counts
        as success, and what data will actually be available.
      </p>
      <Table
        head={['Learning problem', 'T', 'P', 'E']}
        rows={[
          ['Checkers learning', 'Playing checkers', '% of games won against opponents', 'Practice games played against itself'],
          ['Handwriting recognition', 'Recognising and classifying handwritten words within images', '% of words correctly classified', 'A database of handwritten words with given classifications'],
          ['Robot driving', 'Driving on public four-lane highways using vision sensors', 'Average distance travelled before an error', 'A sequence of images and steering commands recorded while observing a human driver'],
        ]}
      />

      <H2>Hadamard’s three conditions</H2>
      <p>In the mathematical sense, a problem is well-posed when:</p>
      <ol>
        <li>
          <strong>Existence</strong>: a solution exists.
        </li>
        <li>
          <strong>Uniqueness</strong>: the solution is unique.
        </li>
        <li>
          <strong>Stability</strong>: the solution’s behaviour changes continuously with the input data; a small change in the input
          produces only a small change in the output.
        </li>
      </ol>
      <p>
        A problem is <span className="term">ill-posed</span> when one or more of these conditions fails: there is no solution, there are many
        solutions, or the solution jumps wildly under tiny changes to the data.
      </p>

      <StabilityFigure />

      <H3>Examples you can use</H3>
      <Table
        head={['Problem', 'Verdict', 'Why']}
        rows={[
          ['Image classification (cat vs dog from labelled images)', 'Well-posed', 'A classifier exists; it outputs one label per image; a slightly rotated photo of the same cat keeps its label.'],
          ['Spam detection', 'Well-posed', 'Logistic regression or Naive Bayes solve it; each email gets one label; a misspelling should not flip the decision.'],
          ['House-price prediction from size, location and rooms', 'Well-posed', 'A regression model maps features to one price; a slightly larger house changes the price slightly.'],
          ['Handwriting recognition', 'Well-posed', 'Each character corresponds to one letter; variations in style should not change the recognised letter.'],
          ['Exact stock price at a future date', 'Ill-posed', 'The market is chaotic: unforeseen events mean the same history admits many futures, and tiny input changes produce large output changes.'],
          ['Exact weather more than two weeks ahead', 'Ill-posed', 'The butterfly effect: small perturbations in initial conditions grow into completely different forecasts.'],
          ['An individual’s exact behaviour in a complex social situation', 'Ill-posed', 'Different people react differently to the same stimulus; small changes in stress or context change behaviour drastically.'],
          ['Exact vote counts for every party in an election', 'Ill-posed', 'Last-minute swings and small local events have outsized effects; many outcomes are consistent with the polls.'],
        ]}
      />

      <SorterGame
        title="Well-posed or ill-posed?"
        bins={['Well-posed', 'Ill-posed']}
        items={[
          { prompt: 'Classify a chest X-ray as showing pneumonia or not, given 20,000 labelled X-rays.', answer: 'Well-posed', why: 'Clear task and labels, a measurable accuracy, and small image changes should not change the diagnosis.' },
          { prompt: 'Predict the exact closing value of the Sensex on this date next year.', answer: 'Ill-posed', why: 'Uniqueness and stability fail: many futures fit the same past, and tiny inputs swing the output.' },
          { prompt: 'Predict whether tomorrow’s Sensex will close higher or lower than today’s.', answer: 'Well-posed', why: 'Re-posed as binary classification with a measurable accuracy. It may be hard, but it is well-defined.' },
          { prompt: 'Reconstruct a sharp image from a heavily blurred one with no assumptions about the image.', answer: 'Ill-posed', why: 'Many sharp images blur to the same result (not unique), and noise is amplified (not stable). Adding a prior or regulariser re-poses it.' },
          { prompt: 'Recognise digits 0–9 in handwritten postcodes.', answer: 'Well-posed', why: 'Ten fixed classes, labelled data, measurable accuracy.' },
          { prompt: 'Forecast the exact rainfall in Bengaluru, in millimetres, 30 days from now.', answer: 'Ill-posed', why: 'Long-range weather is chaotic. Forecasting a probability of rain over a season is the well-posed version.' },
        ]}
      />

      <H2>Turning an ill-posed problem into a well-posed one</H2>
      <p>Ill-posed problems are rarely abandoned; they are re-posed. The common moves are:</p>
      <ul>
        <li>
          <strong>Coarsen the output.</strong> Predict the direction of the stock (up/down) instead of its exact price; predict a range or a
          probability instead of a point.
        </li>
        <li>
          <strong>Add constraints or a prior.</strong> Regularisation (L1/L2 penalties) picks one solution among many and makes it stable;
          in image deblurring, a smoothness prior makes the answer unique.
        </li>
        <li>
          <strong>Shorten the horizon.</strong> Forecast weather for the next three days, not the next three weeks.
        </li>
        <li>
          <strong>Get better experience.</strong> More, cleaner and correctly labelled data narrows the set of consistent solutions.
        </li>
      </ul>

      <H2>The role of labelled data</H2>
      <p>
        Question bank Q7 asks you to critique how labelled data makes a problem well-posed. Labels <em>define</em> the target function: they
        tell the learner which answer is correct, which supplies Mitchell’s experience E and makes P measurable (you can count correct
        predictions). They also help with uniqueness, since each additional labelled example rules out hypotheses that disagree with it.
      </p>
      <p>But labels are not sufficient on their own, and a critical answer says why:</p>
      <ul>
        <li>
          <strong>Label noise</strong> makes the data contradict itself, so no consistent hypothesis may exist (existence fails).
        </li>
        <li>
          <strong>Too few labels</strong> leave many hypotheses consistent with the data (uniqueness fails); the learner needs an inductive bias
          to choose.
        </li>
        <li>
          <strong>Biased or unrepresentative labels</strong> make the model well-posed on the training distribution but unreliable in the
          real one.
        </li>
        <li>
          <strong>Expensive labels</strong> (medical images, legal documents) can make the supervised version impractical, pushing us
          toward unsupervised or semi-supervised formulations.
        </li>
      </ul>

      <Note kind="exam">
        SEE Feb 2025 Q1a combined this lesson with the next one: “Define a well-posed learning problem with an example and describe the
        primary perspectives and issues in machine learning” (10 marks). Spend about 4 marks here (definition, T/E/P example, Hadamard’s
        three conditions) and 6 on perspectives and issues.
      </Note>

      <H2>Writing it in the exam</H2>
      <Answer q="Compare and contrast well-posed and ill-posed learning problems, with examples." marks={10}>
        <p>
          <strong>Define both (3 marks).</strong> Mitchell: a well-posed learning problem specifies T, P and E. Hadamard: existence, uniqueness
          and stability. Ill-posed: at least one condition fails.
        </p>
        <p>
          <strong>Table of contrasts (3 marks).</strong> Rows: solution existence, uniqueness, sensitivity to input, ease of evaluation,
          reliability of the trained model.
        </p>
        <p>
          <strong>Examples (3 marks).</strong> Two well-posed (image classification, spam detection) and two ill-posed (exact stock price,
          long-range weather), each with the condition it satisfies or violates.
        </p>
        <p>
          <strong>Re-posing (1 mark).</strong> Predict the direction rather than the value, or add regularisation.
        </p>
      </Answer>

      <KeyPoints>
        <li>Mitchell: a well-posed learning problem names its task T, performance measure P and experience E.</li>
        <li>Hadamard: a well-posed problem has a solution that exists, is unique and depends continuously on the data.</li>
        <li>
          Ill-posed problems violate at least one condition; chaotic systems such as markets and long-range weather violate stability (
          <M>{'\\text{small } \\delta \\Rightarrow \\text{large change}'}</M>).
        </li>
        <li>Re-pose an ill-posed problem by coarsening the output, adding constraints, shortening the horizon or improving the data.</li>
        <li>Labelled data defines the target and makes P measurable, but noisy, scarce or biased labels can still leave a problem ill-posed.</li>
      </KeyPoints>
    </>
  );
}
