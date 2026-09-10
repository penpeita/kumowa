import {
  evaluateAnswers,
  ROLE_INFO,
  type Problem,
  type Role,
  type RatioProblem,
} from './problems.ts';
import {
  getKumowaBank,
  getRatioBank,
  type BankEntry,
} from './question-bank.ts';

export type Course = 'kumowa' | 'ratio';
export type SessionKind = 'practice' | 'test' | 'review';
export type Difficulty = 'beginner' | 'advanced';
export const TEST_LENGTH = 10;
export const BEGINNER_COUNT = 7;
export const BASIC_RATIO_TEMPLATES = [0, 1, 2, 4, 6, 8, 9];
export const APPLIED_RATIO_TEMPLATES = [3, 5, 7];
export const BASIC_KUMOWA_TEMPLATES = [1, 2, 4, 5, 9];
export const APPLIED_KUMOWA_TEMPLATES = [0, 3, 6, 7, 8];
export type QuestionResult = {
  text: string;
  correct: boolean;
  chosen: string[];
  expected: string[];
  explanation: string[];
  kumowaProblem?: Problem;
  kumowaAnswers?: readonly (Role | null)[];
  ratioProblem?: RatioProblem;
};

export function recordKumowaResult(
  problem: Problem,
  answers: readonly (Role | null)[],
): QuestionResult {
  return {
    text: problemText(problem),
    correct: evaluateAnswers(problem, answers).every(Boolean),
    chosen: problem.terms.map(
      (term, index) =>
        `${term.text} → ${answers[index] ? ROLE_INFO[answers[index]].letter : '未回答'}`,
    ),
    expected: problem.terms.map(
      (term) => `${term.text} → ${ROLE_INFO[term.role].letter}`,
    ),
    explanation: problem.terms.map((term) => term.explanation),
    kumowaProblem: problem,
    kumowaAnswers: [...answers],
  };
}

export function reviewKumowaAnswers(
  result: QuestionResult,
): readonly (Role | null)[] {
  if (result.kumowaAnswers) return result.kumowaAnswers;
  // Already-open results from before this UI update only contain text labels.
  const roles: Role[] = ['ku', 'mo', 'wa'];
  return (
    result.kumowaProblem?.terms.map(
      (term, index) =>
        roles.find(
          (role) =>
            result.chosen[index] === `${term.text} → ${ROLE_INFO[role].letter}`,
        ) ?? null,
    ) ?? []
  );
}

export function assignTerm(
  answers: readonly (Role | null)[],
  index: number,
  role: Role,
): (Role | null)[] {
  const updated = [...answers];
  const previous = updated[index];
  const occupied = updated.findIndex(
    (value, position) => value === role && position !== index,
  );
  if (occupied !== -1) updated[occupied] = previous;
  updated[index] = role;
  return updated;
}

export function makeTest(course: 'kumowa', random?: () => number): Problem[];
export function makeTest(
  course: 'ratio',
  random?: () => number,
): RatioProblem[];
export function makeTest(
  course: Course,
  random: () => number = Math.random,
): (Problem | RatioProblem)[] {
  const basic =
    course === 'ratio' ? BASIC_RATIO_TEMPLATES : BASIC_KUMOWA_TEMPLATES;
  const applied =
    course === 'ratio' ? APPLIED_RATIO_TEMPLATES : APPLIED_KUMOWA_TEMPLATES;
  const bank: readonly BankEntry<Problem | RatioProblem>[] =
    course === 'ratio' ? getRatioBank() : getKumowaBank();
  const basicOrder = shuffled(basic, random);
  while (basicOrder.length < BEGINNER_COUNT)
    basicOrder.push(...shuffled(basic, random));
  const order = [
    ...shuffled(basicOrder.slice(0, BEGINNER_COUNT), random),
    ...shuffled(applied, random).slice(0, TEST_LENGTH - BEGINNER_COUNT),
  ];
  const used = new Set<string>();
  return order.map((templateId) => {
    const pool = bank.filter(
      (entry) => entry.templateId === templateId && !used.has(entry.id),
    );
    const entry = pool[Math.floor(random() * pool.length)];
    used.add(entry.id);
    return entry.problem;
  });
}

export function shuffled<T>(
  values: readonly T[],
  random: () => number = Math.random,
): T[] {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [output[index], output[swap]] = [output[swap], output[index]];
  }
  return output;
}

function practiceDeck<T>(values: readonly T[], random: () => number) {
  let order: T[] = [];
  let previous: T | undefined;
  function next(): T {
    if (order.length === 0) {
      order = shuffled(values, random);
      const end = order.length - 1;
      if (order.length > 1 && order[end] === previous) {
        [order[0], order[end]] = [order[end], order[0]];
      }
    }
    previous = order.pop()!;
    return previous;
  }
  return { first: next(), next, size: values.length };
}

export function createKumowaPractice(random: () => number = Math.random) {
  return practiceDeck(
    getKumowaBank().map((entry) => entry.problem),
    random,
  );
}

export function createRatioPractice(
  difficulty: Difficulty,
  random: () => number = Math.random,
) {
  const pool =
    difficulty === 'beginner' ? BASIC_RATIO_TEMPLATES : APPLIED_RATIO_TEMPLATES;
  return practiceDeck(
    getRatioBank()
      .filter((entry) => pool.includes(entry.templateId))
      .map((entry) => entry.problem),
    random,
  );
}

export function problemText(problem: Problem): string {
  return problem.parts
    .map((part) =>
      typeof part === 'string' ? part : problem.terms[part.term].text,
    )
    .join('');
}

export function scoreTest(results: readonly QuestionResult[]): number {
  return results.filter((result) => result.correct).length;
}
