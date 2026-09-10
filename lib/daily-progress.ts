import { getKumowaBank, getRatioBank } from './question-bank.ts';
import type { Problem, RatioProblem } from './problems.ts';
import { problemText, type Course, type QuestionResult } from './session.ts';

export const DAILY_TEST_LIMIT = 3;
export const DAILY_STORAGE_KEY = 'kumowa-daily-v1';
export type DailyProgress = {
  date: string;
  attempts: Record<Course, number>;
  mistakeIds: string[];
};
export type ReviewQuestion =
  | { course: 'kumowa'; problem: Problem }
  | { course: 'ratio'; problem: RatioProblem };

export function dayKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) =>
    parts.find((part) => part.type === type)!.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
export function readDailyProgress(
  raw: string | null,
  now: Date = new Date(),
): DailyProgress {
  const date = dayKey(now);
  const empty = { date, attempts: { kumowa: 0, ratio: 0 }, mistakeIds: [] };
  if (raw === null) return empty;
  const value: unknown = JSON.parse(raw);
  if (
    !value ||
    typeof value !== 'object' ||
    !('date' in value) ||
    typeof value.date !== 'string'
  )
    throw new Error('Invalid daily record');
  if (value.date !== date) return empty;
  if (
    !('attempts' in value) ||
    !value.attempts ||
    typeof value.attempts !== 'object' ||
    !('kumowa' in value.attempts) ||
    !('ratio' in value.attempts)
  )
    throw new Error('Invalid daily record');
  const validCount = (count: unknown): count is number =>
    typeof count === 'number' &&
    Number.isInteger(count) &&
    count >= 0 &&
    count <= DAILY_TEST_LIMIT;
  if (
    !validCount(value.attempts.kumowa) ||
    !validCount(value.attempts.ratio) ||
    !('mistakeIds' in value) ||
    !Array.isArray(value.mistakeIds) ||
    value.mistakeIds.length > DAILY_TEST_LIMIT * 10 * 2 ||
    !value.mistakeIds.every((id) => typeof id === 'string')
  )
    throw new Error('Invalid daily record');
  return {
    date,
    attempts: { kumowa: value.attempts.kumowa, ratio: value.attempts.ratio },
    mistakeIds: [...new Set(value.mistakeIds as string[])],
  };
}
export function consumeTest(
  progress: DailyProgress,
  course: Course,
): DailyProgress | null {
  if (progress.attempts[course] >= DAILY_TEST_LIMIT) return null;
  return {
    ...progress,
    attempts: { ...progress.attempts, [course]: progress.attempts[course] + 1 },
  };
}
export function addTestMistakes(
  progress: DailyProgress,
  results: readonly QuestionResult[],
  testDate: string,
): DailyProgress {
  if (testDate !== progress.date) return progress;
  const ids = new Set(progress.mistakeIds);
  for (const result of results) {
    if (result.correct) continue;
    const bank = result.kumowaProblem ? getKumowaBank() : getRatioBank();
    const entry = bank.find(
      (item) =>
        item.problem === (result.kumowaProblem ?? result.ratioProblem) ||
        ('parts' in item.problem
          ? problemText(item.problem)
          : item.problem.text) === result.text,
    );
    if (entry) ids.add(entry.id);
  }
  return {
    ...progress,
    mistakeIds: [...ids].slice(0, DAILY_TEST_LIMIT * 10 * 2),
  };
}
export function reviewQuestions(progress: DailyProgress): ReviewQuestion[] {
  return progress.mistakeIds.flatMap((id): ReviewQuestion[] => {
    if (id.startsWith('kumowa-')) {
      const entry = getKumowaBank().find((item) => item.id === id);
      return entry ? [{ course: 'kumowa', problem: entry.problem }] : [];
    }
    const entry = getRatioBank().find((item) => item.id === id);
    return entry ? [{ course: 'ratio', problem: entry.problem }] : [];
  });
}
