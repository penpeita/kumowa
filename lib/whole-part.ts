import type { Problem } from './problems.ts';

export function wholePartVisual(problem: Problem) {
  if (!problem.wholePart) return null;
  const whole = problem.terms.find((term) => term.role === 'mo')!;
  const part = problem.terms.find((term) => term.role === 'ku')!;
  const total = Number.parseFloat(whole.text);
  const count = Number.parseFloat(part.text);
  // Countable squares only use quantities already written in the question.
  // Use a proportional box for larger groups and unknown quantities.
  const countable =
    Number.isInteger(total) &&
    Number.isInteger(count) &&
    total > 0 &&
    total <= 80 &&
    count > 0 &&
    count <= total;
  return {
    ...problem.wholePart,
    wholeText: whole.text,
    partText: part.text,
    squareTotal: countable ? total : null,
    squarePart: countable ? count : null,
  };
}
