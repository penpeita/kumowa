import { ROLE_INFO, type Problem, type Role } from '@/lib/problems';

const POSITIONS: {
  role: Role;
  x: number;
  letterY: number;
  labelY: number;
  valueY: number;
}[] = [
  { role: 'ku', x: 150, letterY: 66, labelY: 94, valueY: 119 },
  { role: 'mo', x: 90, letterY: 182, labelY: 203, valueY: 225 },
  { role: 'wa', x: 210, letterY: 182, labelY: 203, valueY: 225 },
];

function ReviewCircle({
  problem,
  answers,
  title,
  showDifferences = false,
}: {
  problem: Problem;
  answers: readonly (Role | null)[];
  title: string;
  showDifferences?: boolean;
}) {
  const description = POSITIONS.map(({ role }) => {
    const assigned =
      problem.terms[answers.findIndex((answer) => answer === role)];
    return `${ROLE_INFO[role].letter}：${assigned?.text ?? '未回答'}${showDifferences && assigned && assigned.role !== role ? '（位置が違うでやんす）' : ''}`;
  }).join('、');
  return (
    <figure className="kumowa-review-figure">
      <figcaption>{title}</figcaption>
      <svg
        className="kumowa-review-circle"
        viewBox="0 0 300 300"
        aria-label={`${title}。${description}`}
      >
        <title>
          {title}。{description}
        </title>
        <path d="M 4 150 A 146 146 0 0 1 296 150 Z" fill="var(--ku)" />
        <path
          d="M 4 150 H 150 V 296 A 146 146 0 0 1 4 150 Z"
          fill="var(--mo)"
        />
        <path d="M 150 150 H 296 A 146 146 0 0 1 150 296 Z" fill="var(--wa)" />
        <circle cx="150" cy="150" r="146" className="review-circle-line" />
        <path
          d="M 4 150 H 296 M 150 150 V 296"
          className="review-circle-line"
        />
        {POSITIONS.map(({ role, x, letterY, labelY, valueY }) => {
          const assigned =
            problem.terms[answers.findIndex((answer) => answer === role)];
          const wrong = showDifferences && assigned && assigned.role !== role;
          return (
            <g key={role} aria-hidden="true">
              <text x={x} y={letterY} className="review-circle-letter">
                {ROLE_INFO[role].letter}
              </text>
              <text x={x} y={labelY} className="review-circle-label">
                {ROLE_INFO[role].label}
              </text>
              <rect
                x={x - 51}
                y={valueY - 16}
                width="102"
                height="29"
                rx="7"
                className={`review-circle-card ${wrong ? 'review-card-wrong' : ''}`}
              />
              <text x={x} y={valueY + 4} className="review-circle-value">
                {assigned?.text ?? '未回答'}
              </text>
            </g>
          );
        })}
        {[
          [36, 150, '÷'],
          [264, 150, '÷'],
          [150, 192, '×'],
        ].map(([x, y, symbol]) => (
          <g key={symbol === '×' ? 'multiply' : String(x)} aria-hidden="true">
            <circle cx={x} cy={y} r="12" className="review-circle-operator" />
            <text x={x} y={Number(y) + 6} className="review-circle-symbol">
              {symbol}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

export function KumowaReview({
  problem,
  chosen,
}: {
  problem: Problem;
  chosen: readonly (Role | null)[];
}) {
  const wrong = problem.terms.some(
    (term, index) => chosen[index] !== term.role,
  );
  return (
    <div className="kumowa-review">
      <div className="kumowa-review-grid">
        <ReviewCircle
          problem={problem}
          answers={chosen}
          title="選んだ答えでやんす"
          showDifferences
        />
        <ReviewCircle
          problem={problem}
          answers={problem.terms.map((term) => term.role)}
          title="正解でやんす"
        />
      </div>
      {wrong && (
        <p className="kumowa-review-legend">
          <span aria-hidden="true" />
          赤い点線の札は、位置が違うでやんす。
        </p>
      )}
    </div>
  );
}
