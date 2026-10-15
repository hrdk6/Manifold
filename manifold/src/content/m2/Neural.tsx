import { M, MB } from '../../components/Math';
import { Compare, H2, KeyPoints, Note } from '../../components/prose';
import { ActivationFigure, MLPDiagram } from '../../viz/m2b';

export default function Neural() {
  return (
    <>
      <p>
        Multilayer perceptrons (MLPs), also called feed-forward neural networks, are the simplest kind of deep-learning model. Your syllabus
        covers them briefly alongside the other supervised algorithms; they also explain the “cognitive perspective” from Module 1.
      </p>

      <H2>From a linear model to a network</H2>
      <p>
        A linear model computes a weighted sum <M>{'\\hat{y} = \\sum_j w_j x_j + b'}</M>. An MLP repeats this several times: the inputs feed a
        layer of <em>hidden units</em>, each computing its own weighted sum, and the outputs of those units are combined again to produce the
        prediction.
      </p>
      <MLPDiagram />
      <p>
        If every layer were just a weighted sum, the whole network would collapse into one linear model. What makes it more powerful is a{' '}
        <strong>non-linear activation function</strong> applied to each hidden unit:
      </p>
      <MB>{'h_k = g\\left(\\sum_j w_{jk} x_j + b_k\\right), \\qquad \\hat{y} = \\sum_k v_k h_k + c, \\qquad g \\in \\{\\text{ReLU}, \\tanh\\}'}</MB>
      <ActivationFigure />

      <H2>Training</H2>
      <p>
        The weights start random and are learned by gradient descent on a loss (log-loss for classification, squared error for regression);
        the gradients are computed layer by layer with <strong>backpropagation</strong>. Because the loss surface is non-convex, the result
        depends on the random initialisation.
      </p>

      <H2>Controlling complexity</H2>
      <Compare
        cols={[
          { title: 'More capacity', items: ['More hidden units per layer.', 'More hidden layers.', 'Smoother, more complex boundaries.'] },
          { title: 'Less capacity (regularisation)', items: ['L2 penalty alpha on the weights.', 'Fewer units or layers.', 'Early stopping; dropout in deep networks.'] },
        ]}
      />
      <Note kind="warn">
        Like SVMs, neural networks need features on a similar scale (standardise to mean 0, variance 1) and careful tuning. They shine on large
        datasets of homogeneous features such as images, audio and text, where they can learn their own features; on small tabular data, trees
        and linear models are often as good and far easier.
      </Note>

      <KeyPoints>
        <li>An MLP stacks layers of weighted sums with non-linear activations (ReLU, tanh).</li>
        <li>Without non-linearity, any number of layers is still a linear model.</li>
        <li>Trained with gradient descent and backpropagation; results depend on initialisation.</li>
        <li>Complexity grows with units and layers; control it with the alpha penalty and early stopping.</li>
      </KeyPoints>
    </>
  );
}
