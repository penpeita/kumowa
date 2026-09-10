'use client';

import { useRef, useState, type PointerEvent } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROLE_INFO, type Problem, type Role } from '@/lib/problems';

const ROLES: Role[] = ['ku', 'mo', 'wa'];
type Drag = { index: number; x: number; y: number; over: Role | null };
type PendingDrag = {
  index: number;
  x: number;
  y: number;
  moved: boolean;
  pointerId: number;
};

export function KumowaBoard({
  problem,
  answers,
  active,
  checked,
  solved,
  onActive,
  onAssign,
}: {
  problem: Problem;
  answers: (Role | null)[];
  active: number;
  checked: boolean;
  solved: boolean;
  onActive: (index: number) => void;
  onAssign: (index: number, role: Role) => void;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const pending = useRef<PendingDrag | null>(null);
  const suppressClick = useRef(false);

  function dropTarget(x: number, y: number): Role | null {
    const value = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>('[data-drop-role]')?.dataset.dropRole;
    return ROLES.includes(value as Role) ? (value as Role) : null;
  }
  function pointerDown(event: PointerEvent<HTMLButtonElement>, index: number) {
    if (solved || !event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    pending.current = {
      index,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    onActive(index);
  }
  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const start = pending.current;
    if (!start || start.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6)
      start.moved = true;
    if (start.moved)
      setDrag({
        index: start.index,
        x: event.clientX,
        y: event.clientY,
        over: dropTarget(event.clientX, event.clientY),
      });
  }
  function pointerEnd(event: PointerEvent<HTMLButtonElement>, cancel = false) {
    const start = pending.current;
    if (!start || start.pointerId !== event.pointerId) return;
    if (start.moved) {
      suppressClick.current = true;
      const target = cancel ? null : dropTarget(event.clientX, event.clientY);
      if (target) onAssign(start.index, target);
    }
    pending.current = null;
    setDrag(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <div className="drag-board">
      <p className="drag-instruction">言葉を円へ動かすでやんす。</p>
      <fieldset className="word-tokens" aria-label="円へ動かす言葉">
        {problem.terms.map((term, index) => (
          <Button
            key={index}
            variant="ghost"
            className={`word-token ${active === index && !solved ? 'active' : ''} ${answers[index] ? 'placed' : ''}`}
            disabled={solved}
            aria-pressed={active === index}
            aria-label={`${term.text}。${answers[index] ? `${ROLE_INFO[answers[index]].letter}に入っているでやんす。` : '円へ動かすでやんす。'}タップしてから円を選んでも入るでやんす。`}
            onPointerDown={(event) => pointerDown(event, index)}
            onPointerMove={pointerMove}
            onPointerUp={(event) => pointerEnd(event)}
            onPointerCancel={(event) => pointerEnd(event, true)}
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false;
                return;
              }
              onActive(index);
            }}
          >
            {term.text}
            {answers[index] && <Check aria-hidden="true" />}
          </Button>
        ))}
      </fieldset>
      <div className="circle-side">
        <p className="circle-prompt" id="circle-prompt">
          {solved ? (
            '3つとも正解でやんす！'
          ) : (
            <>
              「<b>{problem.terms[active].text}</b>」を入れるでやんす。
            </>
          )}
        </p>
        <fieldset className="kumowa-circle" aria-labelledby="circle-prompt">
          {ROLES.map((role) => {
            const termIndex = answers.findIndex((answer) => answer === role);
            const assigned = problem.terms[termIndex];
            const correct = assigned?.role === role;
            return (
              <Button
                key={role}
                variant="ghost"
                data-drop-role={role}
                className={`circle-sector sector-${role} ${drag?.over === role ? 'drag-over' : ''} ${checked && assigned ? (correct ? 'sector-correct' : 'sector-retry') : ''}`}
                disabled={solved}
                onClick={() => onAssign(active, role)}
                aria-label={`${ROLE_INFO[role].letter}、${ROLE_INFO[role].label}。${assigned ? assigned.text : 'まだ空でやんす。'}${checked && assigned ? (correct ? '、正解でやんす。' : '、もう一度でやんす。') : ''}`}
              >
                <span className="sector-letter">{ROLE_INFO[role].letter}</span>
                <span className="sector-label">{ROLE_INFO[role].label}</span>
                <span className={`sector-value ${assigned ? 'filled' : ''}`}>
                  {assigned ? (
                    <>
                      {assigned.text}
                      {checked && (
                        <span className="sector-result">
                          {correct ? '○' : '？'}
                        </span>
                      )}
                    </>
                  ) : (
                    '\u00a0'
                  )}
                </span>
              </Button>
            );
          })}
          <span className="math-marker divide-left" aria-hidden="true">
            ÷
          </span>
          <span className="math-marker divide-right" aria-hidden="true">
            ÷
          </span>
          <span className="math-marker multiply" aria-hidden="true">
            ×
          </span>
        </fieldset>
        <p className="circle-caption">
          言葉 → 円の順にタップでも入るでやんす。
        </p>
      </div>
      {drag && (
        <span
          className="drag-ghost"
          style={{ left: drag.x, top: drag.y }}
          aria-hidden="true"
        >
          {problem.terms[drag.index].text}
        </span>
      )}
    </div>
  );
}
