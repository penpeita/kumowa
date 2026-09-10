import test from 'node:test';
import assert from 'node:assert/strict';
import { speechText } from '../lib/speech.ts';

test('Japanese reading expands units, percentages and formula symbols', () => {
  assert.equal(
    speechText('100円のものが20％引きでやんす。'),
    '100円のものが20パーセント引きでやんす。',
  );
  assert.equal(
    speechText('200mL、100cm、50L、20g、何cm、何mL、何L、何g'),
    '200ミリリットル、100センチメートル、50リットル、20グラム、なんセンチメートル、なんミリリットル、なんリットル、なんグラム',
  );
  assert.equal(
    speechText('くもわ。1 ＋ 0.2、1 − 0.2、も × わ、く ÷ も'),
    'く、も、わ。1 たす 0.2、1 ひく 0.2、も かける わ、く わる も',
  );
});
