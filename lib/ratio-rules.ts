import type { RatioProblem } from './problems.ts';

export function ratioReadingRule(problem: RatioProblem) {
  const clues: string[][] = [
    ['引き', '売る値段'],
    ['そのうち', `${problem.percent}％`],
    ['増やす', 'あとの全部'],
    ['引き', '値引きされる金額'],
    ['減らす', '残り'],
    ['増やす', 'だけ'],
    ['増えた', '今年の全部'],
    ['まだ読んでいない', '残り'],
    [`${problem.percent}${problem.technique.focus}`],
    ['増やした', '袋の全部'],
  ];
  return {
    clues: clues[problem.templateId],
    connector: problem.templateId === 3 ? 'でも' : '',
    action:
      problem.answer === 'increase'
        ? '足す！'
        : problem.answer === 'decrease'
          ? '引く！'
          : 'そのまま！',
  };
}
