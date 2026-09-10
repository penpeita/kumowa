import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignTerm,
  makeTest,
  createRatioPractice,
  scoreTest,
  BASIC_RATIO_TEMPLATES,
  APPLIED_RATIO_TEMPLATES,
  recordKumowaResult,
  reviewKumowaAnswers,
} from '../lib/session.ts';
import { createProblem, createRatioProblem } from '../lib/problems.ts';

test('dropping a new card on an occupied segment returns its old card to the tray', () => {
  const initial = ['mo', null, null];
  assert.deepEqual(assignTerm(initial, 1, 'mo'), [null, 'mo', null]);
  assert.deepEqual(initial, ['mo', null, null]);
});
test('moving placed cards swaps segments without duplicates or lost cards', () => {
  assert.deepEqual(assignTerm(['ku', 'wa', 'mo'], 0, 'mo'), ['mo', 'wa', 'ku']);
  assert.deepEqual(assignTerm(['mo', 'wa', 'ku'], 0, 'mo'), ['mo', 'wa', 'ku']);
});
test('test questions 1–7 are basic, 8–10 are applied, on every randomized run', () => {
  for (let run = 0; run < 40; run++) {
    const questions = makeTest('ratio', () => (run % 39) / 40);
    assert.equal(questions.length, 10);
    assert.ok(
      questions
        .slice(0, 7)
        .every((q) => BASIC_RATIO_TEMPLATES.includes(q.templateId)),
    );
    assert.ok(
      questions
        .slice(7)
        .every((q) => APPLIED_RATIO_TEMPLATES.includes(q.templateId)),
    );
    assert.equal(new Set(questions.slice(7).map((q) => q.templateId)).size, 3);
    assert.equal(makeTest('kumowa', () => 0.5).length, 10);
  }
});
test('practice levels select their own intended question types', () => {
  const basic = createRatioPractice('beginner');
  const applied = createRatioPractice('advanced');
  for (let n = 0; n < 30; n++) {
    assert.ok(
      BASIC_RATIO_TEMPLATES.includes(
        (n === 0 ? basic.first : basic.next()).templateId,
      ),
    );
    assert.ok(
      APPLIED_RATIO_TEMPLATES.includes(
        (n === 0 ? applied.first : applied.next()).templateId,
      ),
    );
  }
});
test('no generated question or explanation contains the standalone number 100', () => {
  for (let index = 0; index < 1200; index++) {
    const random = () => (index % 101) / 101;
    for (const question of [
      createProblem(index, random),
      createRatioProblem(index, random),
    ]) {
      assert.doesNotMatch(JSON.stringify(question), /(?<!\d)100(?!\d)/);
    }
  }
});
test('tricky discount explanation points to the requested amount and a useful rewording', () => {
  const discount = createRatioProblem(3);
  const selling = createRatioProblem(0);
  assert.equal(discount.technique.focus, '値引きされる金額');
  assert.equal(discount.technique.rewrite, '何円安くなる？');
  assert.equal(discount.answer, 'direct');
  assert.equal(selling.technique.rewrite, 'いくら払う？');
  assert.equal(selling.answer, 'decrease');
});
test('test score counts complete correct questions, not filled or partially correct ones', () => {
  const base = { text: '', chosen: [], expected: [], explanation: [] };
  assert.equal(
    scoreTest([
      { ...base, correct: true },
      { ...base, correct: false },
    ]),
    1,
  );
  assert.equal(scoreTest([]), 0);
});

test('test review preserves the submitted placements separately from the correct placements', () => {
  const problem = createProblem(0);
  const answers = ['ku', 'mo', 'wa'];
  const result = recordKumowaResult(problem, answers);
  answers[0] = 'mo';
  assert.deepEqual(reviewKumowaAnswers(result), ['ku', 'mo', 'wa']);
  assert.deepEqual(result.chosen, [
    '240円 → く',
    '20％引き → も',
    'いくら → わ',
  ]);
  assert.deepEqual(result.expected, [
    '240円 → も',
    '20％引き → わ',
    'いくら → く',
  ]);
  assert.equal(result.correct, false);
  assert.deepEqual(
    problem.terms.map((term) => term.role),
    ['mo', 'wa', 'ku'],
  );
  const reverseProblem = createProblem(8);
  const correct = recordKumowaResult(
    reverseProblem,
    reverseProblem.terms.map((term) => term.role),
  );
  assert.equal(correct.correct, true);
  assert.deepEqual(reviewKumowaAnswers(correct), ['wa', 'ku', 'mo']);
});

test('already-open review results can recover placements from their original text records', () => {
  const result = recordKumowaResult(createProblem(0), ['wa', 'ku', 'mo']);
  const legacy = { ...result, kumowaAnswers: undefined };
  assert.deepEqual(reviewKumowaAnswers(legacy), ['wa', 'ku', 'mo']);
  assert.deepEqual(reviewKumowaAnswers({ ...legacy, chosen: [] }), [
    null,
    null,
    null,
  ]);
});
