import { writeFileSync } from 'node:fs';
import { getKumowaBank, getRatioBank } from '../lib/question-bank.ts';
import { ROLE_INFO, ratioFormula } from '../lib/problems.ts';
import { problemText, BASIC_RATIO_TEMPLATES } from '../lib/session.ts';
import { kumowaReadingRules } from '../lib/kumowa-rules.ts';
import { ratioReadingRule } from '../lib/ratio-rules.ts';

const destination = process.argv[2];
if (!destination) throw new Error('Pass a destination CSV path.');
const rows = [['コース', '問題ID', '難易度', '問題', '正解', '解説']];
for (const { id, problem } of getKumowaBank()) {
  rows.push([
    'くもわ',
    id,
    '混合',
    problemText(problem),
    problem.terms
      .map((term) => `${term.text} → ${ROLE_INFO[term.role].letter}`)
      .join(' ／ '),
    kumowaReadingRules(problem)
      .map(
        (rule) =>
          `${rule.clue} → ${ROLE_INFO[rule.role].letter}。${rule.subject}今回は${rule.text}でやんす。`,
      )
      .join(' '),
  ]);
}
for (const { id, problem } of getRatioBank()) {
  const rule = ratioReadingRule(problem);
  rows.push([
    '使う割合',
    id,
    BASIC_RATIO_TEMPLATES.includes(problem.templateId) ? '初級' : '上級',
    problem.text,
    ratioFormula(problem.answer, problem.percent),
    `${rule.clues.join(rule.connector ? ` ${rule.connector} ` : ' ＋ ')} → ${rule.action} ${ratioFormula(problem.answer, problem.percent)}でやんす。`,
  ]);
}
const csv = rows
  .map((row) =>
    row.map((value) => `"${value.replaceAll('"', '""')}"`).join(','),
  )
  .join('\r\n');
writeFileSync(destination, `\uFEFF${csv}\r\n`, 'utf8');
process.stdout.write(`Exported ${rows.length - 1} questions.\n`);
