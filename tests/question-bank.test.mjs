import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getKumowaBank,
  getRatioBank,
  QUESTION_BANK_SIZE,
} from '../lib/question-bank.ts';
import {
  createKumowaPractice,
  createRatioPractice,
  makeTest,
  problemText,
  BASIC_KUMOWA_TEMPLATES,
  APPLIED_KUMOWA_TEMPLATES,
} from '../lib/session.ts';
import { ratioFormula } from '../lib/problems.ts';
import { wholePartVisual } from '../lib/whole-part.ts';

const textOf = (problem) =>
  'parts' in problem ? problemText(problem) : problem.text;

test('each course has exactly 1000 distinct questions and balanced template coverage', () => {
  for (const bank of [getKumowaBank(), getRatioBank()]) {
    assert.equal(bank.length, QUESTION_BANK_SIZE);
    assert.equal(
      new Set(bank.map((entry) => entry.id)).size,
      QUESTION_BANK_SIZE,
    );
    assert.equal(
      new Set(bank.map((entry) => textOf(entry.problem))).size,
      QUESTION_BANK_SIZE,
    );
    for (let template = 0; template < 10; template++) {
      assert.equal(
        bank.filter((entry) => entry.templateId === template).length,
        100,
      );
    }
    for (const { problem } of bank) {
      assert.doesNotMatch(
        JSON.stringify(problem),
        /(?<!\d)100(?!\d)|NaN|undefined|ヒント/u,
      );
      assert.match(textOf(problem), /でやんすか。$/u);
    }
  }
});

test('all kumowa bank answers, discrete counts, and diagrams match the generated story', () => {
  for (const { problem } of getKumowaBank()) {
    assert.deepEqual(problem.terms.map((term) => term.role).sort(), [
      'ku',
      'mo',
      'wa',
    ]);
    assert.deepEqual(
      problem.parts
        .filter((part) => typeof part !== 'string')
        .map((part) => part.term)
        .sort((left, right) => left - right),
      [0, 1, 2],
    );
    assert.ok(problem.terms.every((term) => term.explanation.length <= 24));
    for (const term of problem.terms) {
      if (/^\d.*(人|本|ページ)$/u.test(term.text))
        assert.ok(Number.isInteger(Number.parseFloat(term.text)));
    }
    const diagram = wholePartVisual(problem);
    if (!diagram) continue;
    const total = Number.parseFloat(diagram.wholeText);
    const part = Number.parseFloat(diagram.partText);
    if (Number.isFinite(total) && Number.isFinite(part))
      assert.ok(Math.abs(part / total - diagram.fraction) < 1e-10);
    if (Number.isFinite(total))
      assert.ok(
        Math.abs(
          total * diagram.fraction - Math.round(total * diagram.fraction),
        ) < 1e-10,
      );
    if (Number.isFinite(part))
      assert.ok(
        Math.abs(
          part / diagram.fraction - Math.round(part / diagram.fraction),
        ) < 1e-10,
      );
  }
});

test('8 percent discount, discount amount, and becoming 92 percent are separate reading cases', () => {
  const bank = getRatioBank();
  const selling = bank.find(
    (entry) => entry.templateId === 0 && entry.problem.percent === 8,
  ).problem;
  const discount = bank.find(
    (entry) => entry.templateId === 3 && entry.problem.percent === 8,
  ).problem;
  const became = bank.find(
    (entry) =>
      entry.templateId === 8 &&
      entry.problem.percent === 92 &&
      entry.problem.text.includes('％になった'),
  ).problem;
  assert.equal(ratioFormula(selling.answer, selling.percent), '1 − 0.08');
  assert.equal(ratioFormula(discount.answer, discount.percent), '0.08');
  assert.equal(ratioFormula(became.answer, became.percent), '0.92');
  for (const { problem } of bank) {
    assert.ok(problem.text.includes(problem.technique.focus), problem.text);
    assert.ok(problem.technique.baseClue.includes('元'));
  }
  assert.match(
    bank.find((entry) => entry.templateId === 6).problem.technique.baseClue,
    /「去年より」の去年/,
  );
});

test('a practice run exhausts its pool before repeating, including the cycle boundary', () => {
  let draws = 0;
  const kumowa = createKumowaPractice(() => (draws++ < 999 ? 0.999999 : 0));
  const decks = [
    kumowa,
    createRatioPractice('beginner', () => 0.4),
    createRatioPractice('advanced', () => 0.7),
  ];
  assert.deepEqual(
    decks.map((deck) => deck.size),
    [1000, 700, 300],
  );
  for (const deck of decks) {
    let current = deck.first;
    let previous;
    for (let cycle = 0; cycle < 3; cycle++) {
      const seen = new Set();
      for (let index = 0; index < deck.size; index++) {
        assert.notEqual(current, previous);
        seen.add(textOf(current));
        previous = current;
        current = deck.next();
      }
      assert.equal(seen.size, deck.size);
    }
  }
});

test('new runs shuffle their first question and order instead of using the old fixed cycle', () => {
  const left = createKumowaPractice(() => 0);
  const right = createKumowaPractice(() => 0.999999);
  assert.notEqual(textOf(left.first), textOf(right.first));
  assert.notDeepEqual(
    Array.from({ length: 20 }, () => textOf(left.next())),
    Array.from({ length: 20 }, () => textOf(right.next())),
  );
});

test('randomized tests draw unique bank questions while retaining seven basic and three applied', () => {
  const bank = getKumowaBank();
  for (const value of [0, 0.2, 0.5, 0.8, 0.999999]) {
    for (const course of ['kumowa', 'ratio']) {
      const questions = makeTest(course, () => value);
      assert.equal(new Set(questions.map(textOf)).size, 10);
      if (course === 'kumowa') {
        const templates = questions.map(
          (question) =>
            bank.find((entry) => entry.problem === question).templateId,
        );
        assert.ok(
          templates
            .slice(0, 7)
            .every((template) => BASIC_KUMOWA_TEMPLATES.includes(template)),
        );
        assert.ok(
          templates
            .slice(7)
            .every((template) => APPLIED_KUMOWA_TEMPLATES.includes(template)),
        );
      }
    }
  }
});
