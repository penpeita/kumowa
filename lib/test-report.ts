import type { Course, QuestionResult } from './session.ts';

export type TestReport = {
  id: string;
  course: Course;
  completedAt: string;
  results: {
    text: string;
    correct: boolean;
    chosen: string[];
    expected: string[];
  }[];
};
export const REPORT_RETRY_WINDOW = 23 * 60 * 60 * 1000;
export function makeReport(
  course: Course,
  results: readonly QuestionResult[],
  id = crypto.randomUUID(),
  now = new Date(),
): TestReport {
  return {
    id,
    course,
    completedAt: now.toISOString(),
    results: results.map(({ text, correct, chosen, expected }) => ({
      text,
      correct,
      chosen: [...chosen],
      expected: [...expected],
    })),
  };
}

export function isTestReport(value: unknown): value is TestReport {
  if (!value || typeof value !== 'object') return false;
  const r = value as Partial<TestReport>;
  const short = (text: unknown, limit: number) =>
    typeof text === 'string' && text.length > 0 && text.length <= limit;
  const labels = (list: unknown) =>
    Array.isArray(list) &&
    list.length >= 1 &&
    list.length <= 3 &&
    list.every((item) => short(item, 300));
  return (
    typeof r.id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      r.id,
    ) &&
    (r.course === 'kumowa' || r.course === 'ratio') &&
    typeof r.completedAt === 'string' &&
    r.completedAt.length <= 30 &&
    Number.isFinite(Date.parse(r.completedAt)) &&
    Array.isArray(r.results) &&
    r.results.length === 10 &&
    r.results.every(
      (q) =>
        q &&
        typeof q === 'object' &&
        short(q.text, 1000) &&
        typeof q.correct === 'boolean' &&
        labels(q.chosen) &&
        labels(q.expected),
    )
  );
}

export function reportEmail(report: TestReport) {
  const name = report.course === 'kumowa' ? 'くもわ' : '使う割合';
  const score = report.results.filter((result) => result.correct).length;
  const date = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(report.completedAt));
  return {
    subject: `【くもわの練習】${name} ${score}/10問正解でやんす`,
    text: [
      `${name}のテスト結果でやんす。`,
      `終了日時：${date}（日本時間）でやんす。`,
      `${score}/10問正解でやんす。`,
      '',
      ...report.results.flatMap((r, index) => [
        `第${index + 1}問：${r.correct ? '正解' : '振り返り'}でやんす。`,
        r.text,
        `選んだ答え：${r.chosen.join(' ／ ')}でやんす。`,
        `正解：${r.expected.join(' ／ ')}でやんす。`,
        '',
      ]),
      '今日の間違いは、アプリの「今日の復習」で解き直せるでやんす。',
    ].join('\n'),
  };
}
