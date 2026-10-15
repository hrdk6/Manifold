import { H2, KeyPoints, Note, Table } from '../../components/prose';
import { BikeFigure } from '../../viz/m4';

export default function Expert() {
  return (
    <>
      <p>
        Feature engineering is often where domain knowledge enters a machine-learning project. Algorithms learn from the representation they
        are given; an expert who knows what matters can design features that make patterns obvious, which no amount of algorithm tuning would
        find.
      </p>

      <H2>Prior knowledge as features</H2>
      <ul>
        <li>
          <strong>Travel pricing</strong>: prices depend on holidays and the day of the week, which a raw date does not reveal. Add “is public
          holiday”, “days until holiday”, “day of week”.
        </li>
        <li>
          <strong>Medical diagnosis</strong>: a clinician knows that the ratio of two blood markers is more informative than either alone.
        </li>
        <li>
          <strong>Retail</strong>: “days since last purchase” and “average basket value” summarise a transaction log.
        </li>
        <li>
          <strong>Periodic quantities</strong>: hour of day or month are circular (23:00 is close to 00:00); encode them as sin and cos.
        </li>
      </ul>
      <p>
        Adding features does not force the model to use them, so including domain-inspired features is low-risk if you validate properly.
      </p>

      <H2>Case study: predicting bike rentals</H2>
      <p>
        Müller and Guido predict how many Citi Bikes will be rented at a New York station in each three-hour window, using a month of data: the
        first 23 days for training and the last 8 for testing. The only raw input is the date and time.
      </p>
      <BikeFigure />
      <Table
        head={['Features', 'Model', 'What happens']}
        rows={[
          ['POSIX timestamp (seconds since 1970)', 'Random forest', 'Poor: trees cannot extrapolate to timestamps beyond the training period, so the test predictions are flat.'],
          ['Hour of day', 'Random forest', 'Much better: the daily pattern is captured, but weekdays and weekends are mixed.'],
          ['Hour of day + day of week', 'Random forest', 'Good: separates commuter peaks on weekdays from midday leisure on weekends.'],
          ['Hour + day of week (as numbers)', 'Linear regression', 'Poor: hour and day are treated as continuous, so it can only learn a linear trend over the day.'],
          ['One-hot hour + day of week', 'Ridge', 'Good: one coefficient per hour and per day.'],
          ['One-hot hour × day interactions', 'Ridge', 'As good as the forest: a separate value for every hour of every weekday, and fully interpretable.'],
        ]}
      />
      <Note kind="insight">
        The lesson generalises: knowing that rentals follow a daily and weekly cycle mattered more than the choice of algorithm. Choosing a
        representation that matches the structure of the problem is the most valuable form of feature engineering.
      </Note>

      <KeyPoints>
        <li>Domain knowledge is often the best source of features.</li>
        <li>Decompose raw timestamps into meaningful parts: hour, weekday, holiday, season.</li>
        <li>Trees cannot extrapolate beyond the range of a feature like a raw timestamp.</li>
        <li>For linear models, one-hot encode such parts and add interactions.</li>
      </KeyPoints>
    </>
  );
}
