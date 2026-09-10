import test from 'node:test';
import assert from 'node:assert/strict';
import { ratioReadingRule } from '../lib/ratio-rules.ts';
import { createRatioProblem } from '../lib/problems.ts';
import { getRatioBank } from '../lib/question-bank.ts';

test('advanced rules focus on the requested quantity instead of the misleading verb', () => {
  assert.deepEqual(ratioReadingRule(createRatioProblem(5)), {
    clues: ['増やす', 'だけ'],
    connector: '',
    action: 'そのまま！',
  });
  assert.equal(ratioReadingRule(createRatioProblem(7)).action, '引く！');
  assert.deepEqual(ratioReadingRule(createRatioProblem(3)), {
    clues: ['引き', '値引きされる金額'],
    connector: 'でも',
    action: 'そのまま！',
  });
});
test('all ratio bank questions have short clues and the correct action', () => {
  for (const { problem } of getRatioBank()) {
    const rule = ratioReadingRule(problem);
    assert.ok(
      rule.clues.length > 0 &&
        rule.clues.every((c) => c.length > 0 && c.length <= 12),
    );
    assert.equal(
      rule.action,
      { increase: '足す！', decrease: '引く！', direct: 'そのまま！' }[
        problem.answer
      ],
    );
    if (problem.templateId === 8)
      assert.ok(rule.clues[0].includes(`${problem.percent}％`));
  }
});
