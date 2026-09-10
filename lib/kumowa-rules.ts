import type { Problem, Role } from './problems.ts';

export function kumowaReadingRules(problem: Problem) {
  return (['mo', 'ku', 'wa'] as Role[]).map((role) => {
    const term = problem.terms.find((item) => item.role === role)!;
    let clue: string;
    let subject = '';
    if (role === 'wa') clue = term.text.includes('倍') ? '倍！' : '％！';
    else if (role === 'ku') {
      clue = `${problem.wholePart?.partLabel ?? term.explanation.replace('を比べるでやんす。', '')}！`;
    } else if (term.explanation.includes('の○倍')) {
      clue = '「の○倍」の前！';
      subject = `${term.explanation.match(/の前の(.+)が元/)![1]}が元でやんす。`;
    } else if (term.explanation.includes('値引き前')) clue = '値引き前！';
    else if (term.explanation.includes('定価')) clue = '定価！';
    else if (term.explanation.includes('全体')) clue = '全体！';
    else clue = '全部！';
    return { role, text: term.text, clue, subject };
  });
}
