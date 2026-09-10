import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dayKey,
  readDailyProgress,
  consumeTest,
  addTestMistakes,
  reviewQuestions,
} from '../lib/daily-progress.ts';
import { getKumowaBank, getRatioBank } from '../lib/question-bank.ts';
import { recordKumowaResult } from '../lib/session.ts';

const today = new Date('2026-09-10T03:00:00Z');
test('the daily boundary is midnight in Japan', () => {
  assert.equal(dayKey(new Date('2026-09-10T14:59:59Z')), '2026-09-10');
  assert.equal(dayKey(new Date('2026-09-10T15:00:00Z')), '2026-09-11');
});
test('each course permits three starts independently and survives reload', () => {
  let progress = readDailyProgress(null, today);
  for (let n = 0; n < 3; n++) progress = consumeTest(progress, 'kumowa');
  progress = readDailyProgress(JSON.stringify(progress), today);
  assert.equal(progress.attempts.kumowa, 3);
  assert.equal(progress.attempts.ratio, 0);
  assert.equal(consumeTest(progress, 'kumowa'), null);
  for (let n = 0; n < 3; n++) progress = consumeTest(progress, 'ratio');
  assert.equal(consumeTest(progress, 'ratio'), null);
});
test('today review deduplicates wrong answers from both courses without consuming attempts', () => {
  const [first, second] = getKumowaBank();
  const p = getRatioBank()[0].problem;
  const results = JSON.parse(
    JSON.stringify([
      recordKumowaResult(first.problem, ['ku', 'mo', 'wa']),
      recordKumowaResult(
        second.problem,
        second.problem.terms.map((t) => t.role),
      ),
      {
        text: p.text,
        correct: false,
        chosen: ['0.2'],
        expected: [],
        explanation: [],
        ratioProblem: p,
      },
    ]),
  );
  let progress = addTestMistakes(
    readDailyProgress(null, today),
    results,
    '2026-09-10',
  );
  progress = addTestMistakes(progress, results, '2026-09-10');
  assert.equal(progress.mistakeIds.length, 2);
  assert.deepEqual(
    reviewQuestions(progress).map((q) => q.course),
    ['kumowa', 'ratio'],
  );
  assert.deepEqual(progress.attempts, { kumowa: 0, ratio: 0 });
});
test('a new day clears counts and mistakes and ignores a late previous-day result', () => {
  const old = {
    date: '2026-09-09',
    attempts: { kumowa: 3, ratio: 3 },
    mistakeIds: ['kumowa-0'],
  };
  const current = readDailyProgress(JSON.stringify(old), today);
  assert.deepEqual(current, readDailyProgress(null, today));
  assert.equal(
    addTestMistakes(
      current,
      [recordKumowaResult(getKumowaBank()[0].problem, ['ku', 'mo', 'wa'])],
      old.date,
    ),
    current,
  );
});
test('corrupted current-day storage does not silently grant new attempts', () => {
  assert.throws(() => readDailyProgress('{', today));
  assert.throws(() =>
    readDailyProgress(
      JSON.stringify({
        date: '2026-09-10',
        attempts: { kumowa: -1, ratio: 0 },
        mistakeIds: [],
      }),
      today,
    ),
  );
  assert.throws(() =>
    readDailyProgress(
      JSON.stringify({
        date: '2026-09-10',
        attempts: { kumowa: 0, ratio: 0 },
        mistakeIds: [null],
      }),
      today,
    ),
  );
  assert.deepEqual(
    reviewQuestions({
      ...readDailyProgress(null, today),
      mistakeIds: ['unknown'],
    }),
    [],
  );
});
