export type Role = 'ku' | 'mo' | 'wa';
export type RatioChoice = 'increase' | 'decrease' | 'direct';
export const ROLE_INFO = {
  ku: { letter: 'く', label: '比べる量' },
  mo: { letter: 'も', label: 'もとにする量' },
  wa: { letter: 'わ', label: '割合' },
} as const;
type Term = { text: string; role: Role; explanation: string };
export type Problem = {
  category: string;
  terms: [Term, Term, Term];
  parts: (string | { term: number })[];
  wholePart?: {
    wholeLabel: string;
    partLabel: string;
    fraction: number;
    unit: '人' | '本' | 'ページ';
  };
};
export type RatioProblem = {
  text: string;
  percent: number;
  answer: RatioChoice;
  explanation: string;
  templateId: number;
  technique: {
    baseClue: string;
    focus: string;
    rewrite: string;
    part: string;
    rest: string;
    rule: string;
  };
};
const term = (text: string, role: Role, explanation: string): Term => ({
  text,
  role,
  explanation,
});
const word = (index: number) => ({ term: index });
export type ProblemValues = {
  price?: number;
  percent?: number;
  total?: number;
  multiple?: number;
};
function choose<T>(values: readonly T[], random: () => number): T {
  return values[
    Math.min(
      values.length - 1,
      Math.max(0, Math.floor(random() * values.length)),
    )
  ];
}

export function createProblem(
  index: number,
  random: () => number = Math.random,
  values: ProblemValues = {},
): Problem {
  const price =
    values.price ??
    (index === 0
      ? 240
      : choose([120, 180, 240, 360, 480, 600, 720, 960], random));
  const percent =
    values.percent ??
    (index === 0 ? 20 : choose([10, 20, 25, 30, 40, 50], random));
  const total = values.total ?? choose([20, 40, 60, 80, 120, 160], random);
  const part = (total * percent) / 100;
  // Cycle the contexts and unknown roles; regenerate the quantities every cycle.
  switch (index % 10) {
    case 0:
      return {
        category: '買い物・百分率',
        terms: [
          term(`${price}円`, 'mo', '値引き前の値段が元でやんす。'),
          term(`${percent}％引き`, 'wa', '「％・倍」が目印でやんす。'),
          term('いくら', 'ku', '売る値段を比べるでやんす。'),
        ],
        parts: [
          word(0),
          'のものが',
          word(1),
          'で売っていたでやんす。',
          word(2),
          'でやんすか。',
        ],
      };
    case 1:
      return {
        category: '学校・割合',
        terms: [
          term(`${total}人`, 'mo', '「学年全体」の全体が元でやんす。'),
          term(`${part}人`, 'ku', '図書係の人数を比べるでやんす。'),
          term('何％', 'wa', '「％・倍」が目印でやんす。'),
        ],
        parts: [
          '学年に',
          word(0),
          'いるでやんす。そのうち',
          word(1),
          'が図書係でやんす。図書係は学年全体の',
          word(2),
          'でやんすか。',
        ],
        wholePart: {
          wholeLabel: '学年全体',
          partLabel: '図書係',
          fraction: percent / 100,
          unit: '人',
        },
      };
    case 2:
      return {
        category: '読書・百分率',
        terms: [
          term(`${total}ページ`, 'mo', '本1冊全部が元でやんす。'),
          term(`${percent}％`, 'wa', '「％・倍」が目印でやんす。'),
          term('何ページ', 'ku', '読んだページ数を比べるでやんす。'),
        ],
        parts: [
          word(0),
          'の本の',
          word(1),
          'を読んだでやんす。読んだのは',
          word(2),
          'でやんすか。',
        ],
        wholePart: {
          wholeLabel: '本1冊全部',
          partLabel: '読んだ分',
          fraction: percent / 100,
          unit: 'ページ',
        },
      };
    case 3:
      return {
        category: 'スポーツ・割合',
        terms: [
          term(`${part}本`, 'ku', '入った本数を比べるでやんす。'),
          term(`${percent}％`, 'wa', '「％・倍」が目印でやんす。'),
          term('何本', 'mo', '「打ったシュート全体」が元でやんす。'),
        ],
        parts: [
          'シュートが',
          word(0),
          '入ったでやんす。これは、打ったシュート全体の',
          word(1),
          'でやんす。全部で',
          word(2),
          '打ったでやんすか。',
        ],
        wholePart: {
          wholeLabel: '打ったシュート全体',
          partLabel: '入った分',
          fraction: percent / 100,
          unit: '本',
        },
      };
    case 4:
      return {
        category: '買い物・値引き',
        terms: [
          term(`${price}円`, 'mo', '値引き前の値段が元でやんす。'),
          term(`${percent}％引き`, 'wa', '「％・倍」が目印でやんす。'),
          term('何円', 'ku', '値引きする金額を比べるでやんす。'),
        ],
        parts: [
          word(0),
          'のノートを',
          word(1),
          'で買うでやんす。値引きされる金額は',
          word(2),
          'でやんすか。',
        ],
      };
    case 5:
      return {
        category: 'リボン・小数の割合',
        terms: [
          term(`${total}cm`, 'mo', '「の○倍」の前の赤が元でやんす。'),
          term(`${decimal(percent)}倍`, 'wa', '「％・倍」が目印でやんす。'),
          term('何cm', 'ku', '青いリボンの長さを比べるでやんす。'),
        ],
        parts: [
          '赤いリボンは',
          word(0),
          'でやんす。青いリボンは赤いリボンの',
          word(1),
          'の長さでやんす。青いリボンは',
          word(2),
          'でやんすか。',
        ],
      };
    case 6:
      return {
        category: '買い物・元の量',
        terms: [
          term(`${percent}％`, 'wa', '「％・倍」が目印でやんす。'),
          term(
            `${(price * percent) / 100}円`,
            'ku',
            '売る値段を比べるでやんす。',
          ),
          term('何円', 'mo', '「定価」が元でやんす。'),
        ],
        parts: [
          'ある品物を定価の',
          word(0),
          'の値段で売ったら、',
          word(1),
          'だったでやんす。定価は',
          word(2),
          'でやんすか。',
        ],
      };
    case 7:
      return {
        category: '花壇・百分率',
        terms: [
          term(`${part}本`, 'ku', 'チューリップの本数を比べるでやんす。'),
          term(`${total}本`, 'mo', '「花は全部」の全部が元でやんす。'),
          term('何％', 'wa', '「％・倍」が目印でやんす。'),
        ],
        parts: [
          'チューリップが',
          word(0),
          '咲いているでやんす。花壇の花は全部で',
          word(1),
          'でやんす。チューリップは全体の',
          word(2),
          'でやんすか。',
        ],
        wholePart: {
          wholeLabel: '花全部',
          partLabel: 'チューリップ',
          fraction: percent / 100,
          unit: '本',
        },
      };
    case 8:
      return {
        category: '読書・元の量',
        terms: [
          term(`${percent}％`, 'wa', '「％・倍」が目印でやんす。'),
          term(`${part}ページ`, 'ku', '読んだページ数を比べるでやんす。'),
          term('何ページ', 'mo', '本1冊全部が元でやんす。'),
        ],
        parts: [
          '本の',
          word(0),
          'にあたる',
          word(1),
          'を読んだでやんす。この本は全部で',
          word(2),
          'あるでやんすか。',
        ],
        wholePart: {
          wholeLabel: '本1冊全部',
          partLabel: '読んだ分',
          fraction: percent / 100,
          unit: 'ページ',
        },
      };
    default: {
      const multiple = values.multiple ?? choose([1.2, 1.5, 2], random);
      return {
        category: 'リボン・1より大きい割合',
        terms: [
          term(`${total}cm`, 'mo', '「の○倍」の前の青が元でやんす。'),
          term(
            `${total * multiple}cm`,
            'ku',
            '赤いリボンの長さを比べるでやんす。',
          ),
          term('何倍', 'wa', '「％・倍」が目印でやんす。'),
        ],
        parts: [
          '青いリボンは',
          word(0),
          '、赤いリボンは',
          word(1),
          'でやんす。赤いリボンは青いリボンの',
          word(2),
          'の長さでやんすか。',
        ],
      };
    }
  }
}

export function decimal(percent: number): string {
  return String(percent / 100);
}
export function ratioFormula(choice: RatioChoice, percent: number): string {
  const value = decimal(percent);
  return choice === 'increase'
    ? `1 ＋ ${value}`
    : choice === 'decrease'
      ? `1 − ${value}`
      : value;
}

export function createRatioProblem(
  index: number,
  random: () => number = Math.random,
  values: ProblemValues = {},
): RatioProblem {
  const percent =
    values.percent ??
    (index === 0 ? 20 : choose([10, 15, 20, 25, 30, 40, 50], random));
  const price =
    values.price ??
    (index === 0
      ? 240
      : choose([120, 180, 240, 360, 480, 600, 720, 960], random));
  const total = values.total ?? choose([120, 160, 240, 320, 480], random);
  const variants: Omit<RatioProblem, 'percent' | 'templateId' | 'technique'>[] =
    [
      {
        text: `${price}円のものが${percent}％引きで売っていたでやんす。売る値段はいくらでやんすか。`,
        answer: 'decrease',
        explanation: `聞かれているのは、値引きしたあとの値段でやんす。元の1から、値引きする分の${decimal(percent)}を引くでやんす。`,
      },
      {
        text: `花壇に花が${total}本咲いているでやんす。そのうち${percent}％がチューリップでやんす。チューリップは何本でやんすか。`,
        answer: 'direct',
        explanation: `知りたいのは全体の${percent}％にあたる分でやんす。そのまま${decimal(percent)}を使うでやんす。`,
      },
      {
        text: `リボンの長さは${total}cmでやんす。この長さを${percent}％増やすと、何cmになるでやんすか。`,
        answer: 'increase',
        explanation: `知りたいのは増やしたあとの長さでやんす。元の1に、増やす分の${decimal(percent)}を足すでやんす。`,
      },
      {
        text: `${price}円の品物を${percent}％引きで買うでやんす。値引きされる金額はいくらでやんすか。`,
        answer: 'direct',
        explanation: `「引き」と書いてあるけれど、知りたいのは値引きする分だけでやんす。そのまま${decimal(percent)}を使うでやんす。`,
      },
      {
        text: `タンクに水が${total}L入っているでやんす。水の量を${percent}％減らすと、残りは何Lでやんすか。`,
        answer: 'decrease',
        explanation: `知りたいのは減らしたあとの量でやんす。元の1から、減らす分の${decimal(percent)}を引くでやんす。`,
      },
      {
        text: `ジュースが${total}mLあるでやんす。量を${percent}％増やすでやんす。増やす分だけなら何mLでやんすか。`,
        answer: 'direct',
        explanation: `知りたいのは増やす分だけでやんす。元の量を入れず、そのまま${decimal(percent)}を使うでやんす。`,
      },
      {
        text: `去年の図書室の本は${total}冊だったでやんす。今年は去年より${percent}％増えたでやんす。今年は何冊でやんすか。`,
        answer: 'increase',
        explanation: `今年の本は、去年の本に増えた分を合わせた数でやんす。元の1に${decimal(percent)}を足すでやんす。`,
      },
      {
        text: `${total}ページの本の${percent}％を読んだでやんす。まだ読んでいないのは何ページでやんすか。`,
        answer: 'decrease',
        explanation: `知りたいのは、まだ読んでいない分でやんす。全体の1から、読んだ分の${decimal(percent)}を引くでやんす。`,
      },
      {
        text: `${price}円のノートを、元の値段の${percent}％の値段で売るでやんす。売る値段はいくらでやんすか。`,
        answer: 'direct',
        explanation: `「${percent}％引き」ではなく「${percent}％の値段」でやんす。そのまま${decimal(percent)}を使うでやんす。`,
      },
      {
        text: `お菓子が${total}gあるでやんす。量を${percent}％増やした袋には、何g入るでやんすか。`,
        answer: 'increase',
        explanation: `知りたいのは、元の量と増やした分の合計でやんす。元の1に${decimal(percent)}を足すでやんす。`,
      },
    ];
  const techniques: RatioProblem['technique'][] = [
    {
      baseClue: '値引き前の値段が元でやんす。',
      focus: '売る値段',
      rewrite: 'いくら払う？',
      part: '値引きする分',
      rest: '払う分',
      rule: '元の値段から、安くなる分を引くでやんす。',
    },
    {
      baseClue: '花壇の花全部が元でやんす。',
      focus: 'チューリップは何本',
      rewrite: 'チューリップだけで何本？',
      part: 'チューリップ',
      rest: 'ほかの花',
      rule: '全体から、チューリップの分だけ取り出すでやんす。',
    },
    {
      baseClue: '増やす前の長さが元でやんす。',
      focus: '何cmになる',
      rewrite: '増やしたあと、全部で何cm？',
      part: '増やす長さ',
      rest: '元の長さ',
      rule: '元の長さに、増やす分を足すでやんす。',
    },
    {
      baseClue: '値引き前の値段が元でやんす。',
      focus: '値引きされる金額',
      rewrite: '何円安くなる？',
      part: '安くなる分',
      rest: '払う分',
      rule: '「安くなる分だけ」を取り出すでやんす。払う金額は聞かれていないでやんす。',
    },
    {
      baseClue: '減らす前の水が元でやんす。',
      focus: '残りは何L',
      rewrite: '使ったあと、水は何L残る？',
      part: '減らす水',
      rest: '残る水',
      rule: '元の水から、減らす分を引くでやんす。',
    },
    {
      baseClue: '増やす前の量が元でやんす。',
      focus: '増やす分だけ',
      rewrite: '何mL足す？',
      part: '足すジュース',
      rest: '元のジュース',
      rule: '「足す分だけ」を取り出すでやんす。元のジュースは含めないでやんす。',
    },
    {
      baseClue: '「去年より」の去年が元でやんす。',
      focus: '今年は何冊',
      rewrite: '増えたあと、全部で何冊？',
      part: '増えた本',
      rest: '去年の本',
      rule: '去年の本に、増えた本を足すでやんす。',
    },
    {
      baseClue: '「本の○％」の本全部が元でやんす。',
      focus: 'まだ読んでいない',
      rewrite: 'あと何ページ残っている？',
      part: '読んだページ',
      rest: 'まだ読んでいないページ',
      rule: '本全体から、読んだ分を引くでやんす。',
    },
    {
      baseClue: '「元の値段の○％」→ 元の値段でやんす。',
      focus: '％の値段',
      rewrite: '元の値段の、この割合分はいくら？',
      part: '売る値段',
      rest: 'それ以外の分',
      rule: '「○％の値段」は、その割合分だけでやんす。「○％引き」と区別するでやんす。',
    },
    {
      baseClue: '増やす前の量が元でやんす。',
      focus: '何g入る',
      rewrite: '増やしたあと、全部で何g？',
      part: '増やすお菓子',
      rest: '元のお菓子',
      rule: '元のお菓子に、増やす分を足すでやんす。',
    },
  ];
  const templateId = index % variants.length;
  return {
    percent,
    templateId,
    technique: techniques[templateId],
    ...variants[templateId],
  };
}

export function evaluateAnswers(
  problem: Problem,
  answers: readonly (Role | null)[],
): boolean[] {
  return problem.terms.map((item, index) => answers[index] === item.role);
}
export function getNextEmptySlot(
  answers: readonly (Role | null)[],
  active: number,
): number | null {
  for (let step = 1; step <= answers.length; step++) {
    const next = (active + step) % answers.length;
    if (answers[next] === null) return next;
  }
  return null;
}
