import test from 'node:test';
import assert from 'node:assert/strict';
import { createProblem, createRatioProblem } from '../lib/problems.ts';
import { wholePartVisual } from '../lib/whole-part.ts';

test('60 students contain exactly 6 librarian squares and the whole keyword explains the base', () => {
  const values = [0, 0, 0.34];
  const problem = createProblem(1, () => values.shift());
  const diagram = wholePartVisual(problem);
  assert.deepEqual(
    problem.terms.map((term) => [term.text, term.role]),
    [
      ['60人', 'mo'],
      ['6人', 'ku'],
      ['何％', 'wa'],
    ],
  );
  assert.match(problem.terms[0].explanation, /全体.*元/);
  assert.equal(diagram.wholeLabel, '学年全体');
  assert.equal(diagram.partLabel, '図書係');
  assert.equal(diagram.squareTotal, 60);
  assert.equal(diagram.squarePart, 6);
  assert.equal(diagram.fraction, 6 / 60);
  assert.equal(diagram.unit, '人');
});

test('whole-part diagrams follow the quantities and never turn unknowns into counted squares', () => {
  for (let index = 0; index < 400; index++) {
    const problem = createProblem(index, () => (index % 97) / 97);
    const diagram = wholePartVisual(problem);
    if (!diagram) continue;
    const whole = problem.terms.find((term) => term.role === 'mo');
    const part = problem.terms.find((term) => term.role === 'ku');
    assert.equal(diagram.wholeText, whole.text);
    assert.equal(diagram.partText, part.text);
    assert.ok(diagram.fraction > 0 && diagram.fraction < 1);
    if (diagram.squareTotal !== null) {
      assert.equal(diagram.squareTotal, Number.parseFloat(whole.text));
      assert.equal(diagram.squarePart, Number.parseFloat(part.text));
      assert.equal(diagram.fraction, diagram.squarePart / diagram.squareTotal);
      assert.ok(diagram.squareTotal <= 80);
    }
    if (/何/.test(whole.text + part.text)) {
      assert.equal(diagram.squareTotal, null);
      assert.equal(diagram.squarePart, null);
    }
  }
  // Separate ribbons are comparisons, not a subset contained in one ribbon.
  assert.equal(wholePartVisual(createProblem(9)), null);
});

test('large groups stay compact and both courses have no hint content', () => {
  const problem = createProblem(1, () => 0.99);
  assert.equal(wholePartVisual(problem).wholeText, '160人');
  assert.equal(wholePartVisual(problem).squareTotal, null);
  for (let index = 0; index < 10; index++) {
    assert.equal(createProblem(index).hint, undefined);
    assert.equal(createRatioProblem(index).hint, undefined);
  }
});
