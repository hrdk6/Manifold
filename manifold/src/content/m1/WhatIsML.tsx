import { M } from '../../components/Math';
import { Answer, Compare, Def, H2, H3, KeyPoints, Note, Table } from '../../components/prose';
import { SorterGame } from '../../viz/common';
import { ProgrammingVsML } from '../../viz/m1';

export default function WhatIsML() {
  return (
    <>
      <p>
        Show a child a handful of cars and a handful of bikes, name each one, and before long they can name a vehicle they have never seen.
        Nobody handed them a rulebook about wheel counts or handlebars. They extracted the rules from <em>experience</em>. A conventional
        computer cannot do that: it follows instructions, adds, compares, prints. Machine learning is the attempt to give a computer the
        child’s ability: to improve at a task by being shown examples rather than by being programmed step by step.
      </p>

      <H2>A definition</H2>
      <Def term="Machine learning (Samuel, 1959)">
        The field of study that gives computers the ability to learn without being explicitly programmed.
      </Def>
      <p>
        That captures the spirit, but it is too loose to build anything with. The definition you should quote in the exam is Tom Mitchell’s,
        because it names the three things every learning problem must specify:
      </p>
      <Def term="Machine learning (Mitchell, 1997)">
        A computer program is said to <strong>learn</strong> from experience <M>{'E'}</M> with respect to some class of tasks <M>{'T'}</M>{' '}
        and performance measure <M>{'P'}</M>, if its performance at tasks in <M>{'T'}</M>, as measured by <M>{'P'}</M>, improves with
        experience <M>{'E'}</M>.
      </Def>
      <ul>
        <li>
          <span className="term">Task T</span>: the problem being solved, such as classifying, predicting a number, grouping or acting.
        </li>
        <li>
          <span className="term">Experience E</span>: the data or feedback the system learns from: labelled examples, unlabelled records,
          or rewards from an environment.
        </li>
        <li>
          <span className="term">Performance measure P</span>: the number that tells us whether the system got better, such as accuracy,
          error rate, mean squared error or games won.
        </li>
      </ul>
      <p>
        In practice ML is a subset of artificial intelligence whose goal is to build models that <strong>generalise</strong>: they are fit
        to a set of training data, but what we care about is how accurately they predict on data they have never seen.
      </p>

      <ProgrammingVsML />

      <H3>How a machine “learns”, in four moves</H3>
      <ol>
        <li>Identify and collect an appropriate dataset (the experience). This is the training set.</li>
        <li>Choose an algorithm suited to the task and run it over the data.</li>
        <li>The algorithm extracts rules, patterns and relations: in other words, it fits a model.</li>
        <li>Use the model to make inferences or decisions on new inputs.</li>
      </ol>

      <H2>Examples of well-defined learning tasks</H2>
      <Table
        head={['Problem', 'Task T', 'Performance P', 'Experience E']}
        rows={[
          ['Checkers', 'Playing checkers', 'Percentage of games won against opponents', 'Games played against itself'],
          ['Handwriting recognition', 'Recognising and classifying handwritten words in images', 'Percentage of words correctly classified', 'A database of handwritten words with their labels'],
          ['Robot driving', 'Driving on public four-lane highways using vision sensors', 'Average distance travelled before an error (judged by a human overseer)', 'Images and steering commands recorded while watching a human driver'],
          ['Spam filtering', 'Classifying emails as spam or not spam', 'Percentage of emails correctly classified', 'Emails labelled by users'],
        ]}
      />

      <H2>The three learning paradigms</H2>
      <p>
        Depending on what kind of experience is available, learning problems fall into three broad families. The distinguishing question is
        always: <em>what feedback does the learner get?</em>
      </p>
      <Compare
        cols={[
          {
            title: 'Supervised learning',
            items: [
              'Experience: labelled pairs (input, correct output).',
              'Learns a function f(x) → y that predicts the label of new inputs.',
              <>
                <strong>Classification</strong> when y is a category (car or bike, spam or not).
              </>,
              <>
                <strong>Regression</strong> when y is a real number (house price, marks).
              </>,
            ],
          },
          {
            title: 'Unsupervised learning',
            items: [
              'Experience: inputs only, no labels or ground truth.',
              'Finds structure: groups, directions of variation, associations.',
              'Clustering (customer segments), dimensionality reduction (PCA), association rules (“people who buy bread buy butter”), anomaly detection.',
            ],
          },
          {
            title: 'Reinforcement learning',
            items: [
              'Experience: rewards and punishments from acting in an environment.',
              'An agent learns by trial and error which actions maximise cumulative reward.',
              'Game playing, robot navigation, a baby learning to walk.',
            ],
          },
        ]}
      />
      <Note kind="tip">
        A classifier can only output the labels it was trained on. Train it on cars and bikes and show it a bus: it will still answer “car”
        or “bike”. That is what “predefined, discrete output values” means in the definition of classification.
      </Note>

      <SorterGame
        title="Which paradigm is it?"
        hint="Read the scenario, pick a paradigm"
        bins={['Supervised', 'Unsupervised', 'Reinforcement']}
        items={[
          { prompt: 'Predict the selling price of a flat from its area, floor and locality, using last year’s sales records.', answer: 'Supervised', why: 'Each past sale has a known price: labelled data. Because the output is a number this is regression.' },
          { prompt: 'Group an online shop’s customers into segments based on their purchase histories, with no segments defined in advance.', answer: 'Unsupervised', why: 'No labels exist; the goal is to discover groups. This is clustering.' },
          { prompt: 'A program learns to play chess by playing millions of games against itself, told only whether it won or lost.', answer: 'Reinforcement', why: 'The only feedback is a delayed reward (win/loss) after a sequence of actions.' },
          { prompt: 'Detect whether a mammogram shows a tumour, using thousands of scans annotated by radiologists.', answer: 'Supervised', why: 'Radiologists provide the correct label for each scan. Output is a class: classification.' },
          { prompt: 'Reduce 784 pixel features of handwritten digits to 2 numbers so the dataset can be plotted.', answer: 'Unsupervised', why: 'Dimensionality reduction (PCA, t-SNE) uses only the inputs.' },
          { prompt: 'A warehouse robot learns a route to the loading bay, receiving +10 on arrival and −1 for every bump into a shelf.', answer: 'Reinforcement', why: 'Rewards and penalties from the environment drive trial-and-error learning.' },
          { prompt: 'Find products that are frequently bought together in supermarket baskets.', answer: 'Unsupervised', why: 'Association-rule mining discovers patterns without any target label.' },
        ]}
      />

      <H2>Where machine learning is used</H2>
      <Table
        head={['Application', 'Examples', 'Type of learning', 'Typical algorithms']}
        rows={[
          ['Recommendation systems', 'Netflix, Amazon, YouTube', 'Supervised or unsupervised', 'Collaborative filtering, matrix factorisation, content-based filtering'],
          ['Autonomous driving', 'Tesla, Waymo', 'Supervised and reinforcement', 'Convolutional neural networks for vision, decision-making models'],
          ['Fraud detection', 'PayPal, Visa', 'Supervised, anomaly detection', 'Logistic regression, decision trees, random forests'],
          ['Healthcare diagnostics', 'Cancer detection, medical imaging', 'Supervised, deep learning', 'CNNs, support vector machines'],
          ['Natural language processing', 'Google Translate, chatbots', 'Supervised and unsupervised', 'Recurrent networks, transformers (e.g. GPT)'],
        ]}
      />

      <H2>Writing it in the exam</H2>
      <Answer q="Define machine learning. Explain the three learning paradigms with examples." marks={10}>
        <p>
          <strong>Definition (2 marks).</strong> Quote Mitchell’s definition and name T, E and P. Add one sentence: the goal is a model that
          generalises to unseen data.
        </p>
        <p>
          <strong>T, E, P example (2 marks).</strong> Give one row of the table above, e.g. handwriting recognition.
        </p>
        <p>
          <strong>Paradigms (6 marks).</strong> Two marks each: supervised (labelled data; classification vs regression with an example of
          each), unsupervised (no labels; clustering and association with examples), reinforcement (agent, environment, reward, trial and
          error). A small diagram of each earns easy marks.
        </p>
      </Answer>

      <KeyPoints>
        <li>ML lets a program improve at a task from experience instead of explicit instructions.</li>
        <li>Mitchell: a program learns if its performance P on tasks T improves with experience E. Always name all three.</li>
        <li>Supervised learning uses labelled data (classification for categories, regression for numbers).</li>
        <li>Unsupervised learning finds structure in unlabelled data; reinforcement learning learns from rewards by trial and error.</li>
        <li>The aim is generalisation: good performance on data the model has not seen.</li>
      </KeyPoints>
    </>
  );
}
