import { ROLE_INFO, type Problem } from '@/lib/problems';
import { wholePartVisual } from '@/lib/whole-part';
import { kumowaReadingRules } from '@/lib/kumowa-rules';

function WholePartDiagram({ problem }: { problem: Problem }) {
  const diagram = wholePartVisual(problem);
  if (!diagram) return null;
  return (
    <figure
      className="kumowa-whole-part"
      aria-label={`${diagram.wholeLabel}${diagram.wholeText}の枠の中に、${diagram.partLabel}${diagram.partText}が入っているでやんす。`}
    >
      <div className="kumowa-whole-label">
        <b className="kumowa-answer-role role-mo">も</b>
        <span>{diagram.wholeLabel}</span>
        <strong>{diagram.wholeText}</strong>
      </div>
      <div className="kumowa-whole-box" aria-hidden="true">
        {diagram.squareTotal !== null ? (
          <div className="kumowa-people-grid">
            {Array.from({ length: diagram.squareTotal }, (_, index) => (
              <span
                key={index}
                className={index < diagram.squarePart! ? 'is-part' : ''}
              />
            ))}
          </div>
        ) : (
          <div className="kumowa-part-bar">
            <span style={{ width: `${diagram.fraction * 100}%` }} />
          </div>
        )}
      </div>
      <figcaption>
        <div className="kumowa-part-label">
          <span className="kumowa-part-swatch" aria-hidden="true" />
          <span>そのうち</span>
          <b className="kumowa-answer-role role-ku">く</b>
          <span>{diagram.partLabel}</span>
          <strong>{diagram.partText}</strong>
        </div>
        {diagram.squareTotal !== null && (
          <p className="kumowa-square-key">□1つで1{diagram.unit}でやんす。</p>
        )}
      </figcaption>
    </figure>
  );
}

export function KumowaExplanation({ problem }: { problem: Problem }) {
  return (
    <div className="kumowa-explanation">
      <h3>言葉の法則でやんす</h3>
      <ol className="kumowa-reading-rules">
        {kumowaReadingRules(problem).map((rule) => (
          <li key={rule.role}>
            <div className="kumowa-rule-line">
              <mark className="ratio-rule-keyword">{rule.clue}</mark>
              <span className="ratio-rule-arrow" aria-hidden="true">
                →
              </span>
              <b className={`kumowa-answer-role role-${rule.role}`}>
                {ROLE_INFO[rule.role].letter}
              </b>
              <span className="kumowa-answer-label">
                {ROLE_INFO[rule.role].label}
              </span>
            </div>
            <p className="kumowa-rule-match">
              {rule.subject && <span>{rule.subject} </span>}今回は{' '}
              <strong>{rule.text}</strong> でやんす。
            </p>
          </li>
        ))}
      </ol>
      <WholePartDiagram problem={problem} />
    </div>
  );
}
