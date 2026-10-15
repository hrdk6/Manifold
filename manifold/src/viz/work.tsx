import { M, MB } from '../components/Math';
import { Plot } from '../components/Plot';
import { Table } from '../components/prose';
import { fx, tf } from '../lib/fmt';
import { eig2, mean, sum } from '../lib/math';
import { Result, WorkStep } from '../lab/ui';

/** Full worked solution for eigen-decomposition of a symmetric 2×2 (covariance) matrix. */
export function EigenWork({ a, b, d, startStep = 1 }: { a: number; b: number; d: number; startStep?: number }) {
  const e = eig2(a, b, d);
  const vRaw = (l: number) => [b, l - a];
  const step = (n: number) => startStep + n - 1;
  void step;
  return (
    <>
      <WorkStep title="Write the characteristic equation det(C − λI) = 0">
        <MB>{`C = \\begin{bmatrix} ${tf(a)} & ${tf(b)} \\\\ ${tf(b)} & ${tf(d)} \\end{bmatrix} \\qquad \\det\\begin{bmatrix} ${tf(a)} - \\lambda & ${tf(b)} \\\\ ${tf(b)} & ${tf(d)} - \\lambda \\end{bmatrix} = 0`}</MB>
        <MB>{`(${tf(a)} - \\lambda)(${tf(d)} - \\lambda) - ${tf(b)}^2 = 0 \\;\\Rightarrow\\; \\lambda^2 - ${tf(e.tr)}\\lambda + ${tf(e.det)} = 0`}</MB>
        <p>
          The coefficient of λ is the trace (a + d = {fx(e.tr, 4)}) and the constant is the determinant (ad − b² = {fx(e.det, 4)}).
        </p>
      </WorkStep>
      <WorkStep title="Solve the quadratic for the eigenvalues">
        <MB>{`\\lambda = \\frac{${tf(e.tr)} \\pm \\sqrt{${tf(e.tr)}^2 - 4(${tf(e.det)})}}{2} = \\frac{${tf(e.tr)} \\pm \\sqrt{${tf(e.tr * e.tr - 4 * e.det)}}}{2} = \\frac{${tf(e.tr)} \\pm ${tf(e.disc)}}{2}`}</MB>
        <MB>{`\\lambda_1 = ${tf(e.l1)}, \\qquad \\lambda_2 = ${tf(e.l2)}`}</MB>
        <p>
          Check: λ₁ + λ₂ = {fx(e.l1 + e.l2, 4)} = trace, and λ₁λ₂ = {fx(e.l1 * e.l2, 4)} = determinant.
        </p>
      </WorkStep>
      <WorkStep title="Find each eigenvector from (C − λI)v = 0">
        {[e.l1, e.l2].map((l, i) => {
          const v = vRaw(l);
          const n = Math.hypot(v[0], v[1]);
          const u = i === 0 ? e.v1 : e.v2;
          return (
            <div key={i}>
              <p>
                For <M>{`\\lambda_${i + 1} = ${tf(l)}`}</M>, the first row gives{' '}
                <M>{`(${tf(a)} - ${tf(l)})v_1 + ${tf(b)}\\,v_2 = 0 \\Rightarrow ${tf(a - l)}\\,v_1 + ${tf(b)}\\,v_2 = 0`}</M>.
              </p>
              <MB>{Math.abs(b) > 1e-12 ? `v_2 = ${tf((l - a) / b)}\\,v_1 \\;\\Rightarrow\\; v = \\begin{bmatrix} 1 \\\\ ${tf((l - a) / b)} \\end{bmatrix} \\;\\xrightarrow{\\text{normalise}}\\; \\frac{1}{${tf(n / Math.abs(b))}} \\begin{bmatrix} 1 \\\\ ${tf((l - a) / b)} \\end{bmatrix} = \\begin{bmatrix} ${tf(u[0])} \\\\ ${tf(u[1])} \\end{bmatrix}` : `v = \\begin{bmatrix} ${tf(u[0])} \\\\ ${tf(u[1])} \\end{bmatrix}`}</MB>
            </div>
          );
        })}
        <p>The two eigenvectors are perpendicular: their dot product is {fx(e.v1[0] * e.v2[0] + e.v1[1] * e.v2[1], 6)}.</p>
      </WorkStep>
      <WorkStep title="Directions of the principal components">
        <p>
          PC1 points along <M>{`(${tf(e.v1[0])}, ${tf(e.v1[1])})`}</M>, at an angle of {fx((Math.atan2(e.v1[1], e.v1[0]) * 180) / Math.PI, 2)}° to the x-axis, and
          captures {fx((e.l1 / e.tr) * 100, 2)}% of the total variance. PC2 is perpendicular, along <M>{`(${tf(e.v2[0])}, ${tf(e.v2[1])})`}</M>, with the remaining{' '}
          {fx((e.l2 / e.tr) * 100, 2)}%.
        </p>
        <div className="plot-wrap" style={{ maxWidth: 360 }}>
          <Plot xDomain={[-1.3, 1.3]} yDomain={[-1.3, 1.3]} height={250} equal xTicks={[-1, 0, 1]} yTicks={[-1, 0, 1]}>
            {(s) => (
              <>
                <ellipse
                  cx={s.x(0)}
                  cy={s.y(0)}
                  rx={(s.x(1) - s.x(0)) * Math.sqrt(e.l1 / e.l1)}
                  ry={(s.x(1) - s.x(0)) * Math.sqrt(Math.max(0, e.l2) / e.l1)}
                  transform={`rotate(${(-Math.atan2(e.v1[1], e.v1[0]) * 180) / Math.PI} ${s.x(0)} ${s.y(0)})`}
                  fill="var(--ultra-soft)"
                  stroke="var(--ultra)"
                  strokeOpacity={0.5}
                />
                {[e.v1, e.v2].map((v, i) => (
                  <g key={i}>
                    <line x1={s.x(0)} y1={s.y(0)} x2={s.x(v[0])} y2={s.y(v[1])} stroke={i === 0 ? 'var(--rose)' : 'var(--ochre)'} strokeWidth={3} />
                    <text x={s.x(v[0] * 1.08)} y={s.y(v[1] * 1.08)} style={{ fill: i === 0 ? 'var(--rose)' : 'var(--ochre)', fontWeight: 800 }}>
                      PC{i + 1}
                    </text>
                  </g>
                ))}
              </>
            )}
          </Plot>
        </div>
      </WorkStep>
    </>
  );
}

/** Full PCA 2-D → 1-D worked solution. */
export function PCAWork({ x1, x2 }: { x1: number[]; x2: number[] }) {
  const n = x1.length;
  const m1 = mean(x1);
  const m2 = mean(x2);
  const c1 = x1.map((v) => v - m1);
  const c2 = x2.map((v) => v - m2);
  const s11 = sum(c1.map((v) => v * v)) / (n - 1);
  const s22 = sum(c2.map((v) => v * v)) / (n - 1);
  const s12 = sum(c1.map((v, i) => v * c2[i])) / (n - 1);
  const e = eig2(s11, s12, s22);
  const scores = c1.map((v, i) => v * e.v1[0] + c2[i] * e.v1[1]);
  return (
    <>
      <WorkStep title="Compute the mean of each feature">
        <MB>{`\\bar{x}_1 = \\frac{${x1.join(' + ')}}{${n}} = ${tf(m1)} \\qquad \\bar{x}_2 = \\frac{${x2.join(' + ')}}{${n}} = ${tf(m2)}`}</MB>
      </WorkStep>
      <WorkStep title="Centre the data (subtract the means)">
        <Table
          head={['Point', 'x₁', 'x₂', 'x₁ − x̄₁', 'x₂ − x̄₂', '(x₁ − x̄₁)²', '(x₂ − x̄₂)²', '(x₁ − x̄₁)(x₂ − x̄₂)']}
          numeric={[1, 2, 3, 4, 5, 6, 7]}
          rows={x1.map((v, i) => [`P${i + 1}`, v, x2[i], fx(c1[i], 3), fx(c2[i], 3), fx(c1[i] ** 2, 3), fx(c2[i] ** 2, 3), fx(c1[i] * c2[i], 3)])}
          foot={['Σ', fx(sum(x1), 2), fx(sum(x2), 2), '0', '0', fx(s11 * (n - 1), 3), fx(s22 * (n - 1), 3), fx(s12 * (n - 1), 3)]}
        />
      </WorkStep>
      <WorkStep title="Build the covariance matrix (divide by n − 1)">
        <MB>{`\\text{Var}(x_1) = \\frac{${tf(s11 * (n - 1))}}{${n - 1}} = ${tf(s11)} \\quad \\text{Var}(x_2) = \\frac{${tf(s22 * (n - 1))}}{${n - 1}} = ${tf(s22)} \\quad \\text{Cov}(x_1, x_2) = \\frac{${tf(s12 * (n - 1))}}{${n - 1}} = ${tf(s12)}`}</MB>
        <MB>{`C = \\begin{bmatrix} ${tf(s11)} & ${tf(s12)} \\\\ ${tf(s12)} & ${tf(s22)} \\end{bmatrix}`}</MB>
        <p style={{ fontSize: '0.95rem', color: 'var(--ink-2)' }}>
          Some textbooks divide by n; the eigenvectors (and so the projection) are identical, only the eigenvalues scale by (n − 1)/n.
        </p>
      </WorkStep>
      <EigenWork a={s11} b={s12} d={s22} />
      <WorkStep title="Project each centred point onto PC1">
        <MB>{`z_i = ${tf(e.v1[0])}\\,(x_{1i} - ${tf(m1)}) + ${tf(e.v1[1])}\\,(x_{2i} - ${tf(m2)})`}</MB>
        <Table
          head={['Point', 'x₁ − x̄₁', 'x₂ − x̄₂', 'Calculation', 'PC1 score z']}
          numeric={[1, 2, 4]}
          rows={x1.map((_, i) => [
            `P${i + 1}`,
            fx(c1[i], 3),
            fx(c2[i], 3),
            `${fx(e.v1[0], 4)} × ${fx(c1[i], 3)} + ${fx(e.v1[1], 4)} × ${fx(c2[i], 3)}`,
            <strong key={i}>{fx(scores[i], 4)}</strong>,
          ])}
        />
        <div className="plot-wrap" style={{ marginTop: '0.8rem' }}>
          <Plot
            xDomain={[Math.min(...x1) - 1.5, Math.max(...x1) + 1.5]}
            yDomain={[Math.min(...x2) - 1.5, Math.max(...x2) + 1.5]}
            height={280}
            equal
            xLabel="x₁"
            yLabel="x₂"
          >
            {(s) => {
              const L = 30;
              return (
                <>
                  <line x1={s.x(m1 - e.v1[0] * L)} y1={s.y(m2 - e.v1[1] * L)} x2={s.x(m1 + e.v1[0] * L)} y2={s.y(m2 + e.v1[1] * L)} stroke="var(--rose)" strokeWidth={2} />
                  {x1.map((v, i) => {
                    const q = [m1 + e.v1[0] * scores[i], m2 + e.v1[1] * scores[i]];
                    return (
                      <g key={i}>
                        <line x1={s.x(v)} y1={s.y(x2[i])} x2={s.x(q[0])} y2={s.y(q[1])} stroke="var(--ink-3)" strokeDasharray="3 3" />
                        <circle cx={s.x(q[0])} cy={s.y(q[1])} r={4} fill="var(--rose)" />
                        <circle cx={s.x(v)} cy={s.y(x2[i])} r={5.5} fill="var(--ultra)" stroke="var(--surface)" strokeWidth={1.5} />
                        <text x={s.x(v) + 8} y={s.y(x2[i]) - 6} style={{ fill: 'var(--ink-2)', fontWeight: 700 }}>
                          P{i + 1}
                        </text>
                      </g>
                    );
                  })}
                  <circle cx={s.x(m1)} cy={s.y(m2)} r={4} fill="var(--ink)" />
                </>
              );
            }}
          </Plot>
        </div>
      </WorkStep>
      <Result label="Data reduced from 2-D to 1-D (PC1 scores)">
        <M>{`z = (${scores.map((v) => tf(v, 4)).join(',\\; ')})`}</M>
        <div style={{ fontSize: '0.95rem', fontWeight: 500, marginTop: '0.4rem', opacity: 0.85 }}>
          PC1 keeps {fx((e.l1 / e.tr) * 100, 2)}% of the variance.
        </div>
      </Result>
    </>
  );
}

/** t-SNE similarity calculations for a handful of points with fixed σ, plus q_ij and KL for a given 1-D embedding. */
export function TSNEWork({ pts, names, sigma = 1, y1 }: { pts: number[][]; names: string[]; sigma?: number; y1: number[] }) {
  const n = pts.length;
  const d2 = pts.map((a) => pts.map((b) => a.reduce((s, v, k) => s + (v - b[k]) ** 2, 0)));
  const cond = pts.map((_, i) => {
    const e = pts.map((_, j) => (i === j ? 0 : Math.exp(-d2[i][j] / (2 * sigma * sigma))));
    const z = sum(e);
    return e.map((v) => v / z);
  });
  const P = pts.map((_, i) => pts.map((_, j) => (i === j ? 0 : (cond[i][j] + cond[j][i]) / (2 * n))));
  const num = y1.map((a) => y1.map((b) => 1 / (1 + (a - b) ** 2)));
  const Z = sum(num.flatMap((r, i) => r.filter((_, j) => j !== i)));
  const Q = num.map((r, i) => r.map((v, j) => (i === j ? 0 : v / Z)));
  let kl = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && P[i][j] > 0) kl += P[i][j] * Math.log(P[i][j] / Q[i][j]);
  const sci = (v: number) => (v !== 0 && Math.abs(v) < 1e-3 ? v.toExponential(3) : fx(v, 4));
  const pairs: [number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j]);
  return (
    <>
      <WorkStep title="Squared distances in the original space">
        <Table head={['Pair', '‖xᵢ − xⱼ‖²']} numeric={[1]} rows={pairs.map(([i, j]) => [`${names[i]}–${names[j]}`, fx(d2[i][j], 3)])} />
      </WorkStep>
      <WorkStep title={`Conditional similarities p(j | i) with a Gaussian kernel, σ = ${sigma}`}>
        <MB>{'p_{j\mid i} = \frac{\exp(-\lVert x_i - x_j \rVert^2 / 2\sigma_i^2)}{\sum_{k \neq i} \exp(-\lVert x_i - x_k \rVert^2 / 2\sigma_i^2)}'}</MB>
        <Table
          head={['From i', ...names.map((nm) => `p(${nm} | i)`)]}
          numeric={names.map((_, k) => k + 1)}
          rows={pts.map((_, i) => [names[i], ...pts.map((_, j) => (i === j ? '—' : sci(cond[i][j])))])}
        />
        <p>Each row sums to 1: from each point’s point of view, the near neighbour gets nearly all the probability.</p>
      </WorkStep>
      <WorkStep title="Symmetrise: joint similarities p(ij)">
        <MB>{`p_{ij} = \frac{p_{j\mid i} + p_{i\mid j}}{2n}, \quad n = ${n}`}</MB>
        <Table head={['Pair', 'p(ij)']} numeric={[1]} rows={pairs.map(([i, j]) => [`${names[i]}–${names[j]}`, sci(P[i][j])])} />
      </WorkStep>
      <WorkStep title={`Low-dimensional similarities q(ij) for the 1-D positions (${y1.map((v, i) => `${names[i]} = ${v}`).join(', ')})`}>
        <MB>{'q_{ij} = \frac{(1 + \lVert y_i - y_j \rVert^2)^{-1}}{\sum_{k \neq l} (1 + \lVert y_k - y_l \rVert^2)^{-1}}'}</MB>
        <Table
          head={['Pair', '(1 + d²)⁻¹', 'q(ij)', 'p(ij)']}
          numeric={[1, 2, 3]}
          rows={pairs.map(([i, j]) => [`${names[i]}–${names[j]}`, fx(num[i][j], 4), fx(Q[i][j], 4), sci(P[i][j])])}
        />
        <p>The normaliser sums over both orders of every pair: {fx(Z, 4)}.</p>
      </WorkStep>
      <WorkStep title="Kullback–Leibler divergence to be minimised">
        <MB>{`KL(P \,\|\, Q) = \sum_{i \neq j} p_{ij} \ln \frac{p_{ij}}{q_{ij}} = ${tf(kl, 4)}`}</MB>
        <p>
          Gradient descent moves the yᵢ to reduce this value. Pairs with large p(ij) but small q(ij) (neighbours placed too far apart) contribute
          most and are pulled together.
        </p>
      </WorkStep>
    </>
  );
}

/** Linear vs quadratic least squares with the normal equations written out. */
export function PolyWork({ x, y }: { x: number[]; y: number[] }) {
  const n = x.length;
  const S = (p: number, q = 0) => sum(x.map((v, i) => v ** p * (q ? y[i] : 1)));
  // linear
  const b1 = (n * S(1, 1) - S(1) * sum(y)) / (n * S(2) - S(1) ** 2);
  const b0 = (sum(y) - b1 * S(1)) / n;
  // quadratic normal equations
  const A = [
    [n, S(1), S(2)],
    [S(1), S(2), S(3)],
    [S(2), S(3), S(4)],
  ];
  const rhs = [sum(y), S(1, 1), S(2, 1)];
  const det3 = (M: number[][]) =>
    M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
  const D = det3(A);
  const coef = [0, 1, 2].map((k) => det3(A.map((row, i) => row.map((v, j) => (j === k ? rhs[i] : v)))) / D);
  const p1 = x.map((v) => b0 + b1 * v);
  const p2 = x.map((v) => coef[0] + coef[1] * v + coef[2] * v * v);
  const yb = mean(y);
  const sst = sum(y.map((v) => (v - yb) ** 2));
  const sse1 = sum(y.map((v, i) => (v - p1[i]) ** 2));
  const sse2 = sum(y.map((v, i) => (v - p2[i]) ** 2));
  const exact = n <= 3;
  return (
    <>
      <WorkStep title="Tabulate the sums needed by the normal equations">
        <Table
          head={['x', 'y', 'x²', 'x³', 'x⁴', 'xy', 'x²y']}
          numeric={[0, 1, 2, 3, 4, 5, 6]}
          rows={x.map((v, i) => [v, y[i], fx(v ** 2, 2), fx(v ** 3, 2), fx(v ** 4, 2), fx(v * y[i], 3), fx(v * v * y[i], 3)])}
          foot={[`Σ ${fx(S(1), 2)}`, `Σ ${fx(sum(y), 3)}`, fx(S(2), 2), fx(S(3), 2), fx(S(4), 2), fx(S(1, 1), 3), fx(S(2, 1), 3)]}
        />
      </WorkStep>
      <WorkStep title="Linear model ŷ = b₀ + b₁x">
        <MB>{`b_1 = \frac{n\sum xy - \sum x \sum y}{n \sum x^2 - (\sum x)^2} = \frac{${n}(${tf(S(1, 1))}) - (${tf(S(1))})(${tf(sum(y))})}{${n}(${tf(S(2))}) - (${tf(S(1))})^2} = ${tf(b1)}`}</MB>
        <MB>{`b_0 = \bar{y} - b_1 \bar{x} = ${tf(yb)} - ${tf(b1)} \times ${tf(mean(x))} = ${tf(b0)}`}</MB>
        <MB>{`\hat{y} = ${tf(b0)} ${b1 < 0 ? '-' : '+'} ${tf(Math.abs(b1))}\,x`}</MB>
      </WorkStep>
      <WorkStep title="Quadratic model ŷ = a₀ + a₁x + a₂x²: solve the normal equations">
        <MB>{`\begin{bmatrix} ${n} & ${tf(S(1))} & ${tf(S(2))} \\ ${tf(S(1))} & ${tf(S(2))} & ${tf(S(3))} \\ ${tf(S(2))} & ${tf(S(3))} & ${tf(S(4))} \end{bmatrix} \begin{bmatrix} a_0 \\ a_1 \\ a_2 \end{bmatrix} = \begin{bmatrix} ${tf(rhs[0])} \\ ${tf(rhs[1])} \\ ${tf(rhs[2])} \end{bmatrix}`}</MB>
        <MB>{`a_0 = ${tf(coef[0])}, \quad a_1 = ${tf(coef[1])}, \quad a_2 = ${tf(coef[2])}`}</MB>
        <MB>{`\hat{y} = ${tf(coef[0])} ${coef[1] < 0 ? '-' : '+'} ${tf(Math.abs(coef[1]))}\,x ${coef[2] < 0 ? '-' : '+'} ${tf(Math.abs(coef[2]))}\,x^2`}</MB>
        {exact && <p>With three points and three parameters the parabola passes exactly through every point (you could also solve the three equations a₀ + a₁xᵢ + a₂xᵢ² = yᵢ directly).</p>}
      </WorkStep>
      <WorkStep title="Compare the two fits">
        <Table
          head={['x', 'y', 'ŷ linear', 'error²', 'ŷ quadratic', 'error²']}
          numeric={[0, 1, 2, 3, 4, 5]}
          rows={x.map((v, i) => [v, y[i], fx(p1[i], 4), fx((y[i] - p1[i]) ** 2, 4), fx(p2[i], 4), fx((y[i] - p2[i]) ** 2, 4)])}
        />
        <Table
          head={['Metric', 'Linear', 'Quadratic']}
          numeric={[1, 2]}
          rows={[
            ['SSE', fx(sse1, 4), fx(sse2, 4)],
            ['MSE', fx(sse1 / n, 4), fx(sse2 / n, 4)],
            ['RMSE', fx(Math.sqrt(sse1 / n), 4), fx(Math.sqrt(sse2 / n), 4)],
            ['R²', fx(1 - sse1 / sst, 4), fx(1 - sse2 / sst, 4)],
          ]}
        />
        <div className="plot-wrap" style={{ maxWidth: 520 }}>
          <Plot xDomain={[Math.min(...x) - 0.5, Math.max(...x) + 0.5]} yDomain={[Math.min(0, ...y) - 1, Math.max(...y) * 1.15]} height={240} xLabel="x" yLabel="y">
            {(s) => {
              const xs = Array.from({ length: 100 }, (_, i) => Math.min(...x) - 0.5 + ((Math.max(...x) - Math.min(...x) + 1) * i) / 99);
              const path = (fn: (v: number) => number) => xs.map((v, i) => `${i ? 'L' : 'M'}${s.x(v)} ${s.y(fn(v))}`).join('');
              return (
                <>
                  <path d={path((v) => b0 + b1 * v)} fill="none" stroke="var(--ink-3)" strokeWidth={2} strokeDasharray="6 4" />
                  <path d={path((v) => coef[0] + coef[1] * v + coef[2] * v * v)} fill="none" stroke="var(--rose)" strokeWidth={2.4} />
                  {x.map((v, i) => (
                    <circle key={i} cx={s.x(v)} cy={s.y(y[i])} r={5.5} fill="var(--ultra)" stroke="var(--surface)" strokeWidth={1.5} />
                  ))}
                </>
              );
            }}
          </Plot>
        </div>
      </WorkStep>
      <Result label="Conclusion">
        Quadratic R² = {fx(1 - sse2 / sst, 4)} versus linear R² = {fx(1 - sse1 / sst, 4)}.
        <div style={{ fontSize: '0.95rem', fontWeight: 500, marginTop: '0.4rem', opacity: 0.85 }}>
          {exact
            ? 'The perfect quadratic fit is guaranteed with 3 points and 3 parameters, so it proves nothing about generalisation: validate on new data before preferring it.'
            : 'The quadratic captures the curvature; check on held-out data that the improvement is real.'}
        </div>
      </Result>
    </>
  );
}

/** Confusion-matrix metrics with every substitution written out. */
export function MetricsWork({ tp, fp, fn, tn, beta, costFN, costFP }: { tp: number; fp: number; fn: number; tn: number; beta?: number; costFN?: number; costFP?: number }) {
  const n = tp + fp + fn + tn;
  const P = tp / (tp + fp);
  const R = tp / (tp + fn);
  const F1 = (2 * P * R) / (P + R);
  const spec = tn / (tn + fp);
  const acc = (tp + tn) / n;
  const q = (v: number) => (Number.isFinite(v) ? tf(v, 4) : '\text{undefined}');
  return (
    <>
      <WorkStep title="Read the confusion matrix">
        <Table
          head={['', 'Predicted positive', 'Predicted negative', 'Total']}
          numeric={[1, 2, 3]}
          rows={[
            ['Actual positive', `TP = ${tp}`, `FN = ${fn}`, tp + fn],
            ['Actual negative', `FP = ${fp}`, `TN = ${tn}`, fp + tn],
            ['Total', tp + fp, fn + tn, n],
          ]}
        />
      </WorkStep>
      <WorkStep title="Accuracy and error rate">
        <MB>{`\text{Accuracy} = \frac{TP + TN}{TP + TN + FP + FN} = \frac{${tp} + ${tn}}{${n}} = ${q(acc)}`}</MB>
        <MB>{`\text{Error rate} = 1 - ${q(acc)} = ${q(1 - acc)}`}</MB>
      </WorkStep>
      <WorkStep title="Precision: of everything predicted positive, how much was right?">
        <MB>{`\text{Precision} = \frac{TP}{TP + FP} = \frac{${tp}}{${tp} + ${fp}} = ${q(P)}`}</MB>
      </WorkStep>
      <WorkStep title="Recall (sensitivity, TPR): of all actual positives, how many were found?">
        <MB>{`\text{Recall} = \frac{TP}{TP + FN} = \frac{${tp}}{${tp} + ${fn}} = ${q(R)}`}</MB>
      </WorkStep>
      <WorkStep title="F1 score: harmonic mean of precision and recall">
        <MB>{`F_1 = \frac{2 \cdot P \cdot R}{P + R} = \frac{2 \times ${q(P)} \times ${q(R)}}{${q(P)} + ${q(R)}} = ${q(F1)}`}</MB>
        <p>Equivalent form: F1 = 2TP / (2TP + FP + FN) = {2 * tp} / {2 * tp + fp + fn} = {fx((2 * tp) / (2 * tp + fp + fn), 4)}.</p>
      </WorkStep>
      <WorkStep title="Specificity and false positive rate">
        <MB>{`\text{Specificity} = \frac{TN}{TN + FP} = \frac{${tn}}{${tn} + ${fp}} = ${q(spec)} \qquad \text{FPR} = 1 - \text{Specificity} = ${q(1 - spec)}`}</MB>
      </WorkStep>
      {beta !== undefined && (
        <WorkStep title={`F-beta with β = ${beta} (recall weighted ${beta}× as much as precision)`}>
          <MB>{`F_\beta = \frac{(1 + \beta^2) P R}{\beta^2 P + R} = \frac{${tf(1 + beta * beta)} \times ${q(P)} \times ${q(R)}}{${tf(beta * beta)} \times ${q(P)} + ${q(R)}} = ${q(((1 + beta * beta) * P * R) / (beta * beta * P + R))}`}</MB>
        </WorkStep>
      )}
      {costFN !== undefined && costFP !== undefined && (
        <WorkStep title={`Cost-weighted evaluation (a false negative costs ${costFN}×, a false positive ${costFP}×)`}>
          <MB>{`\text{Total cost} = ${costFN} \times FN + ${costFP} \times FP = ${costFN} \times ${fn} + ${costFP} \times ${fp} = ${costFN * fn + costFP * fp}`}</MB>
          <MB>{`\text{Weighted score} = \frac{TP + TN - ${costFP}\,FP - ${costFN}\,FN}{N} = \frac{${tp + tn} - ${costFP * fp} - ${costFN * fn}}{${n}} = ${q((tp + tn - costFP * fp - costFN * fn) / n)}`}</MB>
          <MB>{`\text{Cost-weighted accuracy} = \frac{TP + TN}{TP + TN + ${costFP}\,FP + ${costFN}\,FN} = \frac{${tp + tn}}{${tp + tn + costFP * fp + costFN * fn}} = ${q((tp + tn) / (tp + tn + costFP * fp + costFN * fn))}`}</MB>
          <p>
            The plain accuracy {fx(acc, 4)} treats both errors alike; the weighted metrics expose that the {fn} missed positives dominate the cost.
            Lower total cost (or higher weighted score) is better when comparing models.
          </p>
        </WorkStep>
      )}
      <Result label="Summary">
        Accuracy {fx(acc, 4)}, precision {Number.isFinite(P) ? fx(P, 4) : 'undefined'}, recall {fx(R, 4)}, F1 {Number.isFinite(F1) ? fx(F1, 4) : 'undefined'}
      </Result>
    </>
  );
}
