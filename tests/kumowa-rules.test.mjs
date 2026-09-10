import test from 'node:test';
import assert from 'node:assert/strict';
import { kumowaReadingRules } from '../lib/kumowa-rules.ts';
import { createProblem } from '../lib/problems.ts';
import { getKumowaBank } from '../lib/question-bank.ts';

test('the whole is still mo when unknown, and the percentage remains wa when unknown', () => {
  const unknownWhole = kumowaReadingRules(createProblem(3));
  assert.equal(unknownWhole[0].clue, '全体！');
  assert.equal(unknownWhole[0].text, '何本');
  const unknownPercent = kumowaReadingRules(createProblem(1));
  assert.equal(unknownPercent[2].clue, '％！');
  assert.equal(unknownPercent[2].text, '何％');
});
test('ribbon rules emphasize the thing before の○倍, preserve scene colors, and avoid calculations', () => {
  for (const { problem } of getKumowaBank()) {
    const rules = kumowaReadingRules(problem);
    assert.deepEqual(
      rules.map((r) => r.role),
      ['mo', 'ku', 'wa'],
    );
    for (const r of rules) {
      assert.equal(r.text, problem.terms.find((t) => t.role === r.role).text);
      assert.ok(r.clue.length <= 16);
    }
    assert.doesNotMatch(JSON.stringify(rules), /(?<!\d)100(?!\d)|×|÷|＝/);
    if (problem.category.includes('リボン')) {
      assert.equal(rules[0].clue, '「の○倍」の前！');
      assert.ok(
        problem.terms
          .find((t) => t.role === 'mo')
          .explanation.includes(rules[0].subject),
      );
    }
  }
});
