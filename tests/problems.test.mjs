import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProblem,
  createRatioProblem,
  evaluateAnswers,
  getNextEmptySlot,
  ratioFormula,
  decimal,
} from '../lib/problems.ts';

test('the first story explains classification with short clues and no calculation detour', () => {
  const p = createProblem(0, () => 0);
  assert.deepEqual(
    p.terms.map((t) => [t.text, t.role]),
    [
      ['240円', 'mo'],
      ['20％引き', 'wa'],
      ['いくら', 'ku'],
    ],
  );
  assert.equal(
    p.parts
      .map((t) => (typeof t === 'string' ? t : p.terms[t.term].text))
      .join(''),
    '240円のものが20％引きで売っていたでやんす。いくらでやんすか。',
  );
  assert.deepEqual(
    p.terms.map((t) => t.explanation),
    [
      '値引き前の値段が元でやんす。',
      '「％・倍」が目印でやんす。',
      '売る値段を比べるでやんす。',
    ],
  );
  assert.equal(p.note, undefined);
  assert.doesNotMatch(JSON.stringify(p), /80％|0\.8|も ×|＝/);
});

test('generated questions have exactly one of each role and exactly three matching phrases', () => {
  for (let index = 0; index < 1000; index++) {
    const p = createProblem(index, () => (index % 97) / 97);
    assert.deepEqual(p.terms.map((t) => t.role).sort(), ['ku', 'mo', 'wa']);
    assert.deepEqual(
      p.parts
        .filter((t) => typeof t !== 'string')
        .map((t) => t.term)
        .sort((a, b) => a - b),
      [0, 1, 2],
    );
    assert.ok(
      p.terms.every((t) => t.text.length > 0 && t.explanation.length > 0),
    );
    assert.ok(p.terms.every((t) => t.explanation.length <= 24));
    assert.ok(!p.terms.some((t) => /NaN|undefined|\.\d{5}/.test(t.text)));
    // Discrete counts (people, books, pages) stay whole in generated stories.
    for (const t of p.terms)
      if (/\d+(人|本|ページ)$/.test(t.text))
        assert.equal(Number.parseFloat(t.text) % 1, 0);
  }
});

test('unknowns cover compare, base and ratio; sentence order is not a fixed answer key', () => {
  const questions = Array.from({ length: 10 }, (_, i) =>
    createProblem(i, () => 0.2),
  );
  assert.deepEqual([...new Set(questions.map((p) => p.terms[2].role))].sort(), [
    'ku',
    'mo',
    'wa',
  ]);
  assert.ok(
    new Set(questions.map((p) => p.terms.map((t) => t.role).join(','))).size >=
      4,
  );
});

test('questions continue after many rounds and numbers vary within a context', () => {
  assert.notEqual(
    createProblem(10, () => 0).terms[0].text,
    createProblem(10, () => 0.99).terms[0].text,
  );
  assert.equal(createProblem(10000, () => 0).terms.length, 3);
  assert.ok(createRatioProblem(10000, () => 0).text);
});

test('answer checking handles empty, duplicate and partially correct assignments', () => {
  const p = createProblem(0);
  assert.deepEqual(evaluateAnswers(p, [null, null, null]), [
    false,
    false,
    false,
  ]);
  assert.deepEqual(evaluateAnswers(p, ['mo', 'wa', 'ku']), [true, true, true]);
  assert.deepEqual(evaluateAnswers(p, ['mo', 'mo', 'mo']), [
    true,
    false,
    false,
  ]);
  assert.deepEqual(evaluateAnswers(p, ['ku', 'wa', 'ku']), [false, true, true]);
  assert.deepEqual(evaluateAnswers(p, []), [false, false, false]);
});

test('selection advances through blanks, wraps and preserves existing answers', () => {
  assert.equal(getNextEmptySlot(['mo', null, null], 0), 1);
  assert.equal(getNextEmptySlot(['mo', 'wa', null], 1), 2);
  assert.equal(getNextEmptySlot([null, 'wa', 'ku'], 2), 0);
  assert.equal(getNextEmptySlot(['mo', 'wa', 'ku'], 0), null);
});

test('20 percent selling price uses a complement, discount amount uses the direct ratio', () => {
  const sellingPrice = createRatioProblem(0);
  const discountAmount = createRatioProblem(3, () => 0.3);
  assert.match(sellingPrice.text, /240円.*20％引き.*売る値段/);
  assert.equal(sellingPrice.answer, 'decrease');
  assert.equal(discountAmount.answer, 'direct');
  assert.match(discountAmount.text, /値引きされる金額/);
});

test('increased totals and just the increased part use different ratios', () => {
  assert.equal(createRatioProblem(2).answer, 'increase');
  assert.equal(createRatioProblem(5).answer, 'direct');
  assert.match(createRatioProblem(5).text, /増やす分だけ/);
});

test('unread pages use the remaining ratio and percent-of-price is direct', () => {
  assert.equal(createRatioProblem(7).answer, 'decrease');
  assert.match(createRatioProblem(7).text, /まだ読んでいない/);
  assert.equal(createRatioProblem(8).answer, 'direct');
  assert.match(createRatioProblem(8).text, /％の値段/);
});

test('ratio formulas use the percentage shown, including non-tenths', () => {
  assert.equal(ratioFormula('increase', 20), '1 ＋ 0.2');
  assert.equal(ratioFormula('decrease', 20), '1 − 0.2');
  assert.equal(ratioFormula('direct', 20), '0.2');
  assert.equal(ratioFormula('increase', 15), '1 ＋ 0.15');
  assert.equal(decimal(25), '0.25');
  for (let i = 0; i < 100; i++) {
    const p = createRatioProblem(i, () => (i % 17) / 17);
    assert.ok(['increase', 'decrease', 'direct'].includes(p.answer));
    assert.match(p.text, new RegExp(`${p.percent}％`));
    assert.ok(p.percent > 0 && p.percent < 100);
  }
});
