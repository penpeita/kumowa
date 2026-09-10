import {
  createProblem,
  createRatioProblem,
  type Problem,
  type RatioProblem,
} from './problems.ts';

export const QUESTION_BANK_SIZE = 1000;
const QUESTIONS_PER_TEMPLATE = 100;
export type BankEntry<T> = {
  id: string;
  templateId: number;
  problem: T;
};

const PRICES = [
  120, 150, 180, 240, 250, 300, 350, 360, 420, 450, 480, 540, 550, 600, 650,
  660, 720, 750, 780, 840, 850, 900, 950, 960,
];
const TOTALS = [
  20, 25, 40, 50, 60, 75, 80, 120, 125, 140, 150, 160, 175, 180, 220, 225, 240,
  250, 260, 275, 280, 300, 320, 325, 350, 360, 375, 400,
];
const PERCENTS = [5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50];
const DIRECT_PERCENTS = [8, 12, 18, 25, 30, 40, 50, 65, 75, 80, 85, 90, 92];
const MULTIPLES = [1.2, 1.25, 1.5, 1.75, 2, 2.5, 3];
const ITEMS = ['ノート', '筆箱', '色鉛筆', '絵の具', 'スケッチブック'];
const FLOWERS = [
  'チューリップ',
  'ヒマワリ',
  'アサガオ',
  'コスモス',
  'パンジー',
];
const BOOKS = ['本', '図鑑', '物語の本', '伝記の本', '科学の本'];
const DUTIES = ['図書係', '放送係', '保健係', '給食係', '体育係'];
const COLORS = [
  ['赤', '青'],
  ['黄', '緑'],
  ['白', '黒'],
  ['青', '黄'],
  ['緑', '赤'],
];

// A fixed seed defines a reproducible bank; each run shuffles it separately.
function bankRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function pick<T>(values: readonly T[], random: () => number): T {
  return values[Math.floor(random() * values.length)];
}
function bankValues(random: () => number, direct = false) {
  const percent = pick(direct ? DIRECT_PERCENTS : PERCENTS, random);
  const suitable = (value: number) => {
    const part = (value * percent) / 100;
    return Number.isInteger(part) && part !== 100 && value - part !== 100;
  };
  return {
    percent,
    price: pick(PRICES.filter(suitable), random),
    total: pick(TOTALS.filter(suitable), random),
    multiple: pick(MULTIPLES, random),
  };
}
function problemText(problem: Problem) {
  return problem.parts
    .map((part) =>
      typeof part === 'string' ? part : problem.terms[part.term].text,
    )
    .join('');
}
function mapKumowaText(
  problem: Problem,
  transform: (text: string) => string,
): Problem {
  return {
    ...problem,
    terms: problem.terms.map((term) => ({
      ...term,
      explanation: transform(term.explanation),
    })) as Problem['terms'],
    parts: problem.parts.map((part) =>
      typeof part === 'string' ? transform(part) : part,
    ),
    ...(problem.wholePart
      ? {
          wholePart: {
            ...problem.wholePart,
            wholeLabel: transform(problem.wholePart.wholeLabel),
            partLabel: transform(problem.wholePart.partLabel),
          },
        }
      : {}),
  };
}
function mapRatioText(
  problem: RatioProblem,
  transform: (text: string) => string,
): RatioProblem {
  return {
    ...problem,
    text: transform(problem.text),
    explanation: transform(problem.explanation),
    technique: {
      baseClue: transform(problem.technique.baseClue),
      focus: transform(problem.technique.focus),
      rewrite: transform(problem.technique.rewrite),
      part: transform(problem.technique.part),
      rest: transform(problem.technique.rest),
      rule: transform(problem.technique.rule),
    },
  };
}
function kumowaScene(template: number, variant: number) {
  return (text: string) => {
    if (template === 0)
      return text.replaceAll('のものが', `の${ITEMS[variant]}が`);
    if (template === 1) return text.replaceAll('図書係', DUTIES[variant]);
    if (template === 2 || template === 8)
      return text.replaceAll('本', BOOKS[variant]);
    if (template === 4) return text.replaceAll('ノート', ITEMS[variant]);
    if (template === 6) return text.replaceAll('品物', ITEMS[variant]);
    if (template === 7)
      return text.replaceAll('チューリップ', FLOWERS[variant]);
    if (template === 5 || template === 9) {
      const [red, blue] = COLORS[variant];
      return text.replace(/赤|青/g, (color) => (color === '赤' ? red : blue));
    }
    return text;
  };
}
function ratioScene(template: number, variant: number) {
  return (text: string) => {
    if ([0, 3, 8].includes(template))
      return text.replace(/もの|品物|ノート/g, ITEMS[variant]);
    if (template === 1)
      return text.replaceAll('チューリップ', FLOWERS[variant]);
    if (template === 2)
      return text.replaceAll(
        'リボン',
        ['リボン', 'ひも', 'ロープ', 'テープ', '毛糸'][variant],
      );
    if (template === 4)
      return text.replaceAll(
        'タンク',
        ['タンク', '水槽', '貯水槽', '小さなプール', '大きな容器'][variant],
      );
    if (template === 5)
      return text.replaceAll(
        'ジュース',
        ['ジュース', '牛乳', 'お茶', '水', '豆乳'][variant],
      );
    if (template === 6)
      return text.replaceAll(
        '図書室',
        ['図書室', '学級文庫', '学校の図書館', '町の図書室', '地域の図書室'][
          variant
        ],
      );
    if (template === 7) return text.replaceAll('本', BOOKS[variant]);
    if (template === 9)
      return text.replaceAll(
        'お菓子',
        ['お菓子', 'クッキー', 'せんべい', 'あめ', 'チョコレート'][variant],
      );
    return text;
  };
}

function buildBank<T extends Problem | RatioProblem>(
  course: 'kumowa' | 'ratio',
  create: (template: number, random: () => number) => T,
): readonly BankEntry<T>[] {
  const bank: BankEntry<T>[] = [];
  const seen = new Set<string>();
  for (let template = 0; template < 10; template++) {
    const random = bankRandom(
      (course === 'kumowa' ? 20260910 : 20260911) + template * 7919,
    );
    let count = 0;
    for (
      let attempt = 0;
      count < QUESTIONS_PER_TEMPLATE && attempt < 5000;
      attempt++
    ) {
      const problem = create(template, random);
      const text = 'parts' in problem ? problemText(problem) : problem.text;
      if (seen.has(text) || /(?<!\d)100(?!\d)/u.test(JSON.stringify(problem)))
        continue;
      seen.add(text);
      count++;
      bank.push({
        id: `${course}-${template}-${count}`,
        templateId: template,
        problem,
      });
    }
    if (count !== QUESTIONS_PER_TEMPLATE)
      throw new Error(`Question bank is incomplete: ${course}/${template}`);
  }
  return bank;
}

let kumowaBank: readonly BankEntry<Problem>[] | undefined;
let ratioBank: readonly BankEntry<RatioProblem>[] | undefined;

export function getKumowaBank() {
  kumowaBank ??= buildBank('kumowa', (template, random) => {
    const values = bankValues(random);
    return mapKumowaText(
      createProblem(template + 10, random, values),
      kumowaScene(template, Math.floor(random() * 5)),
    );
  });
  return kumowaBank;
}
export function getRatioBank() {
  ratioBank ??= buildBank('ratio', (template, random) => {
    const values = bankValues(random, template === 8);
    const variant = Math.floor(random() * 5);
    const problem = mapRatioText(
      createRatioProblem(template + 10, random, values),
      ratioScene(template, variant),
    );
    if (template === 8 && variant % 2 === 1) {
      problem.text = `${values.price}円の${ITEMS[variant]}が、元の値段の${values.percent}％になったでやんす。売る値段はいくらでやんすか。`;
      problem.technique.focus = '％になった';
      problem.technique.rule = '「○％になった」は、その割合を使うでやんす。';
      problem.explanation = `元の値段の${values.percent}％なので、そのまま${values.percent / 100}を使うでやんす。`;
    }
    return problem;
  });
  return ratioBank;
}
