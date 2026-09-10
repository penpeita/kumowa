import { ratioFormula, decimal, type RatioProblem } from '@/lib/problems';
import { ratioReadingRule } from '@/lib/ratio-rules';

export function RatioExplanation({ problem }: { problem: RatioProblem }) {
  const increase = problem.answer === 'increase';
  const direct = problem.answer === 'direct';
  const growthDiagram = [2, 5, 6, 9].includes(problem.templateId);
  const fraction = problem.percent / 100;
  const usedPercent = increase
    ? 100 + problem.percent
    : direct
      ? problem.percent
      : 100 - problem.percent;
  const leftWidth = growthDiagram ? 1 / (1 + fraction) : 1 - fraction;
  const rule = ratioReadingRule(problem);
  return (
    <div className="ratio-explanation">
      <p className="technique-heading">言葉の法則でやんす</p>
      <div className="ratio-reading-rule">
        <div className="ratio-rule-clues">
          {rule.clues.map((clue, index) => (
            <span className="ratio-clue-pair" key={clue}>
              {index > 0 && rule.connector && <span>{rule.connector}</span>}
              <mark className="ratio-rule-keyword">{clue}</mark>
            </span>
          ))}
        </div>
        <span className="ratio-rule-arrow" aria-hidden="true">
          →
        </span>
        <strong className={`ratio-rule-action choice-${problem.answer}`}>
          {rule.action}
        </strong>
      </div>
      <p className="ratio-rule-equation">
        <b>{ratioFormula(problem.answer, problem.percent)}</b>
        {!direct && (
          <>
            {' '}
            ＝ <b>{decimal(usedPercent)}</b>
          </>
        )}
      </p>
      <p className="ratio-rule-percent">
        使うのは <b>{usedPercent}％</b> でやんす。
      </p>
      <details className="ratio-rule-diagram">
        <summary>図で確かめるでやんす</summary>
        <div className="quantity-diagram">
          <p>求めるのは、色がついた部分でやんす。</p>
          <p className="bar-caption">
            {problem.technique.baseClue}
            <br />
            元を <b>1</b> とするでやんす。
          </p>
          <div
            className={`quantity-bar ${growthDiagram ? 'bar-increase' : direct ? 'bar-direct' : 'bar-decrease'}`}
            aria-hidden="true"
          >
            <span
              className={`bar-left ${increase || !direct ? 'highlighted' : ''}`}
              style={{ width: `${leftWidth * 100}%` }}
            />
            <span
              className={`bar-right ${increase || direct ? 'highlighted' : ''}`}
              style={{ width: `${(1 - leftWidth) * 100}%` }}
            />
          </div>
          <div className="bar-legend">
            <span>
              <i
                className={
                  increase || !direct ? 'legend-color' : 'legend-muted'
                }
              />
              {problem.technique.rest}：
              {growthDiagram ? '1' : `1 − ${decimal(problem.percent)}`}
            </span>
            <span>
              <i
                className={increase || direct ? 'legend-color' : 'legend-muted'}
              />
              {problem.technique.part}：{decimal(problem.percent)}
            </span>
          </div>
        </div>
      </details>
    </div>
  );
}
