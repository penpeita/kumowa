'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ReadAloud, useSoundEffects } from '@/components/practice-audio';
import { KumowaBoard } from '@/components/kumowa-board';
import { KumowaExplanation } from '@/components/kumowa-explanation';
import { KumowaReview } from '@/components/kumowa-review';
import { RatioExplanation } from '@/components/ratio-explanation';
import { useDailyProgress } from '@/components/use-daily-progress';
import { AccessGate } from '@/components/access-gate';
import { useTestMail } from '@/components/use-test-mail';
import {
  YansuFeedback,
  YansuPortrait,
  YansuPreload,
} from '@/components/yansu-feedback';
import type { AccessSession } from '@/lib/access';
import { dayKey, type ReviewQuestion } from '@/lib/daily-progress';
import {
  evaluateAnswers,
  getNextEmptySlot,
  ROLE_INFO,
  ratioFormula,
  decimal,
  type Role,
  type RatioChoice,
} from '@/lib/problems';
import {
  assignTerm,
  makeTest,
  createKumowaPractice,
  createRatioPractice,
  problemText,
  scoreTest,
  recordKumowaResult,
  reviewKumowaAnswers,
  TEST_LENGTH,
  BEGINNER_COUNT,
  type Course,
  type SessionKind,
  type Difficulty,
  type QuestionResult,
} from '@/lib/session';

const CHOICES: { id: RatioChoice; label: string; symbol: string }[] = [
  { id: 'increase', label: '増やす', symbol: '＋' },
  { id: 'decrease', label: '減らす', symbol: '−' },
  { id: 'direct', label: 'そのまま', symbol: '×' },
];
type RunProps = {
  kind: SessionKind;
  difficulty?: Difficulty;
  onFeedback: (success: boolean) => void;
  onFinish: (results: QuestionResult[]) => void;
  review?: {
    question: ReviewQuestion;
    number: number;
    total: number;
    onNext: () => void;
  };
};
type RunState = {
  course: Course;
  kind: SessionKind;
  difficulty: Difficulty;
  id: number;
  testDate?: string;
  reportId?: string;
  review?: { questions: ReviewQuestion[]; index: number; date: string };
};

function MiniCircle({ className = '' }: { className?: string }) {
  return (
    <span className={`mini-circle ${className}`} aria-hidden="true">
      <span>く</span>
      <span>も</span>
      <span>わ</span>
    </span>
  );
}
function ProblemBar({
  number,
  isTest,
  category,
}: {
  number: number;
  isTest: boolean;
  category: string;
}) {
  return (
    <div className="problem-bar">
      <span className="question-number">
        第 <b>{number + 1}</b> 問{isTest && ` / ${TEST_LENGTH}`}
      </span>
      <span className={`topic ${isTest ? 'test-label' : ''}`}>
        {isTest
          ? `${number < BEGINNER_COUNT ? '初級' : '中級'}テストでやんす`
          : category}
      </span>
    </div>
  );
}

function KumowaPractice({ kind, onFeedback, onFinish, review }: RunProps) {
  const isTest = kind === 'test';
  const [testQuestions] = useState(() => (isTest ? makeTest('kumowa') : []));
  const [practiceDeck] = useState(() =>
    isTest || review ? null : createKumowaPractice(),
  );
  const [number, setNumber] = useState(0);
  const [problem, setProblem] = useState(() =>
    review?.question.course === 'kumowa'
      ? review.question.problem
      : isTest
        ? testQuestions[0]
        : practiceDeck!.first,
  );
  const [answers, setAnswers] = useState<(Role | null)[]>([null, null, null]);
  const [active, setActive] = useState(0);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const result = evaluateAnswers(problem, answers);
  const submittedProblem = useRef<typeof problem | null>(null);
  const complete = answers.every(Boolean);
  const solved = !isTest && checked && result.every(Boolean);

  function assign(index: number, role: Role) {
    if (solved) return;
    const updated = assignTerm(answers, index, role);
    setAnswers(updated);
    setChecked(false);
    const next = getNextEmptySlot(updated, index);
    setActive(next ?? index);
    setAnnouncement(
      `${problem.terms[index].text}を「${ROLE_INFO[role].letter}」に入れたでやんす。${next === null ? '3つそろったでやんす。' : `次は「${problem.terms[next].text}」でやんす。`}`,
    );
    // Prevent mobile page jumps; keyboard users can proceed directly to submit.
    if (next === null) actionRef.current?.focus({ preventScroll: true });
  }
  function advance() {
    if (review) {
      review.onNext();
      return;
    }
    const nextNumber = number + 1;
    setProblem(isTest ? testQuestions[nextNumber] : practiceDeck!.next());
    setNumber(nextNumber);
    setAnswers([null, null, null]);
    setActive(0);
    setChecked(false);
    setAnnouncement('');
    requestAnimationFrame(() =>
      headingRef.current?.focus({ preventScroll: true }),
    );
  }
  function submit() {
    if (!complete) return;
    if (!isTest) {
      setChecked(true);
      onFeedback(result.every(Boolean));
      const wrong = result.findIndex((correct) => !correct);
      if (wrong !== -1) setActive(wrong);
      return;
    }
    if (submittedProblem.current === problem) return;
    submittedProblem.current = problem;
    const nextResults = [...results, recordKumowaResult(problem, answers)];
    setResults(nextResults);
    if (nextResults.length === TEST_LENGTH) onFinish(nextResults);
    else advance();
  }

  return (
    <>
      <div className="intro">
        <p>
          文の言葉を、<b>く・も・わの円</b>に入れるでやんす。
        </p>
        <span>
          {isTest
            ? '答え合わせは最後でやんす。戻ると最初からでやんす。'
            : review
              ? '今日、間違えた問題を解き直すでやんす。'
              : '言葉をスライド、またはタップして入れるでやんす。'}
        </span>
      </div>
      <section
        className="practice-card kumowa-practice"
        aria-label="くもわを見つける練習"
      >
        <ProblemBar
          number={review?.number ?? number}
          isTest={isTest}
          category={
            review
              ? `今日の復習・全${review.total}問でやんす`
              : problem.category
          }
        />
        <div className="practice-grid drag-practice-grid">
          <div className="question-side">
            <h2 ref={headingRef} tabIndex={-1} className="word-problem">
              {problem.parts.map((part, index) =>
                typeof part === 'string' ? (
                  <span key={index}>{part}</span>
                ) : (
                  <mark
                    key={index}
                    className={
                      part.term === active && !solved ? 'current-word' : ''
                    }
                  >
                    {problem.terms[part.term].text}
                  </mark>
                ),
              )}
            </h2>
            <div className="question-tools">
              <ReadAloud key={`read-${number}`} text={problemText(problem)} />
            </div>
            {isTest && (
              <p className="test-reminder">戻ると最初からでやんす。</p>
            )}
          </div>
          <KumowaBoard
            key={number}
            problem={problem}
            answers={answers}
            active={active}
            checked={!isTest && checked}
            solved={solved}
            onActive={setActive}
            onAssign={assign}
          />
        </div>
        <footer className="practice-footer">
          <output className="feedback" aria-live="polite" aria-atomic="true">
            {checked && !isTest ? (
              solved ? (
                <YansuFeedback success>
                  くもわを見つけられたでやんす。
                </YansuFeedback>
              ) : (
                <YansuFeedback success={false}>
                  もう一度、動かしてみるでやんす。
                </YansuFeedback>
              )
            ) : (
              <>
                <strong>
                  {complete
                    ? '3つ、そろったでやんす！'
                    : `${answers.filter(Boolean).length} / 3 こ 入れたでやんす`}
                </strong>
                <span>
                  {isTest
                    ? '最後にまとめて答え合わせでやんす。'
                    : '数字の答えは、計算しなくていいでやんす。'}
                </span>
              </>
            )}
          </output>
          {solved ? (
            <Button className="main-button" onClick={advance}>
              {review && review.number + 1 === review.total
                ? '復習を終えるでやんす'
                : '次へ進むでやんす'}
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : (
            <Button
              ref={actionRef}
              className="main-button"
              aria-disabled={!complete}
              onClick={submit}
            >
              {isTest
                ? number === TEST_LENGTH - 1
                  ? '結果を見るでやんす'
                  : '次へ進むでやんす'
                : '確かめるでやんす'}
              <ArrowRight aria-hidden="true" />
            </Button>
          )}
        </footer>
        {solved && (
          <div className="explanation">
            <KumowaExplanation problem={problem} />
          </div>
        )}
      </section>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </>
  );
}

function RatioPractice({
  kind,
  difficulty = 'beginner',
  onFeedback,
  onFinish,
  review,
}: RunProps) {
  const isTest = kind === 'test';
  const [testQuestions] = useState(() => (isTest ? makeTest('ratio') : []));
  const [practiceDeck] = useState(() =>
    isTest || review ? null : createRatioPractice(difficulty),
  );
  const [number, setNumber] = useState(0);
  const [problem, setProblem] = useState(() =>
    review?.question.course === 'ratio'
      ? review.question.problem
      : isTest
        ? testQuestions[0]
        : practiceDeck!.first,
  );
  const [answer, setAnswer] = useState<RatioChoice | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const correct = answer === problem.answer;
  const submittedProblem = useRef<typeof problem | null>(null);
  const solved = !isTest && correct;
  function advance() {
    if (review) {
      review.onNext();
      return;
    }
    setProblem(isTest ? testQuestions[number + 1] : practiceDeck!.next());
    setNumber(number + 1);
    setAnswer(null);
    requestAnimationFrame(() =>
      headingRef.current?.focus({ preventScroll: true }),
    );
  }
  function submit() {
    if (!answer) return;
    if (submittedProblem.current === problem) return;
    submittedProblem.current = problem;
    const nextResults = [
      ...results,
      {
        text: problem.text,
        correct,
        chosen: [ratioFormula(answer, problem.percent)],
        expected: [ratioFormula(problem.answer, problem.percent)],
        explanation: [problem.explanation],
        ratioProblem: problem,
      },
    ];
    setResults(nextResults);
    if (nextResults.length === TEST_LENGTH) onFinish(nextResults);
    else advance();
  }
  return (
    <>
      <div className="intro">
        <p>
          元の量に、<b>どの割合</b>をかけるでやんすか？
        </p>
        <span>
          {isTest
            ? '答え合わせは最後でやんす。戻ると最初からでやんす。'
            : review
              ? '今日、間違えた問題を解き直すでやんす。'
              : '増やす・減らす・そのままから、選ぶでやんす。'}
        </span>
      </div>
      <section
        className="practice-card ratio-practice"
        aria-label="使う割合を選ぶ練習"
      >
        <ProblemBar
          number={review?.number ?? number}
          isTest={isTest}
          category={
            review
              ? `今日の復習・全${review.total}問でやんす`
              : `${difficulty === 'beginner' ? '初級' : '上級'}の練習でやんす`
          }
        />
        <div className="ratio-content">
          <h2 ref={headingRef} tabIndex={-1} className="word-problem">
            {problem.text}
          </h2>
          <div className="question-tools">
            <ReadAloud key={`read-${number}`} text={problem.text} />
          </div>
          <div className="ratio-help">
            <span>
              {problem.percent}％ ＝ {decimal(problem.percent)}
            </span>
            <p>掛ける割合を選ぶでやんす。</p>
          </div>
          <fieldset className="ratio-choices" aria-label="掛ける割合">
            {CHOICES.map((choice) => (
              <Button
                key={choice.id}
                variant="ghost"
                className={`ratio-choice choice-${choice.id} ${answer === choice.id ? (isTest ? 'selected' : correct ? 'correct' : 'retry') : ''}`}
                onClick={() => {
                  if (solved) return;
                  setAnswer(choice.id);
                  if (!isTest) onFeedback(choice.id === problem.answer);
                }}
                disabled={solved}
                aria-pressed={answer === choice.id}
                aria-label={`${choice.label}、${ratioFormula(choice.id, problem.percent)}でやんす`}
              >
                <span className="choice-symbol" aria-hidden="true">
                  {choice.symbol}
                </span>
                <span className="choice-label">{choice.label}</span>
                <span className="choice-formula">
                  {ratioFormula(choice.id, problem.percent)}
                </span>
                <span className="choice-status">
                  {answer === choice.id
                    ? isTest
                      ? '選んだでやんす'
                      : correct
                        ? '正解でやんす！'
                        : 'もう一度でやんす'
                    : choice.id === 'direct'
                      ? '書かれた割合でやんす'
                      : choice.id === 'increase'
                        ? '1に足すでやんす'
                        : '1から引くでやんす'}
                </span>
              </Button>
            ))}
          </fieldset>
          {isTest && <p className="test-reminder">戻ると最初からでやんす。</p>}
        </div>
        <footer className="practice-footer">
          <output className="feedback" aria-live="polite" aria-atomic="true">
            {isTest ? (
              <>
                <strong>
                  {answer ? '選べたでやんす！' : '1つ選ぶでやんす。'}
                </strong>
                <span>最後にまとめて答え合わせでやんす。</span>
              </>
            ) : answer === null ? (
              <>
                <strong>知りたいのは、どの部分でやんすか？</strong>
                <span>金額や長さは、計算しなくていいでやんす。</span>
              </>
            ) : solved ? (
              <YansuFeedback success>
                下の法則で確かめるでやんす。
              </YansuFeedback>
            ) : (
              <YansuFeedback success={false}>もう一度でやんす。</YansuFeedback>
            )}
          </output>
          {isTest ? (
            <Button
              className="main-button"
              aria-disabled={!answer}
              onClick={submit}
            >
              {number === TEST_LENGTH - 1
                ? '結果を見るでやんす'
                : '次へ進むでやんす'}
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : (
            solved && (
              <Button className="main-button" onClick={advance}>
                {review && review.number + 1 === review.total
                  ? '復習を終えるでやんす'
                  : '次へ進むでやんす'}
                <ArrowRight aria-hidden="true" />
              </Button>
            )
          )}
        </footer>
        {solved && <RatioExplanation problem={problem} />}
      </section>
    </>
  );
}

function TestResult({
  results,
  onRestart,
  onHome,
  canTest,
  remaining,
  onReview,
  reviewCount,
}: {
  results: QuestionResult[];
  onRestart: () => void;
  onHome: () => void;
  canTest: boolean;
  remaining: number;
  onReview: () => void;
  reviewCount: number;
}) {
  return (
    <section className="test-results" aria-labelledby="result-title">
      <div className="result-header">
        <h2 id="result-title" tabIndex={-1}>
          テスト、おつかれさまでやんす！
        </h2>
        <p className="test-score">
          <b>{scoreTest(results)}</b> / {TEST_LENGTH} 問正解でやんす
        </p>
        <p>できたところも、迷ったところも見るでやんす。</p>
        <p>このコースのテストは、今日あと{remaining}回でやんす。</p>
        <div className="result-actions">
          <Button
            className="main-button"
            onClick={onRestart}
            disabled={!canTest}
          >
            {remaining === 0
              ? '今日のテストは終了でやんす'
              : 'もう一度テストするでやんす'}
          </Button>
          {reviewCount > 0 && (
            <Button variant="outline" onClick={onReview}>
              今日の間違いを復習するでやんす
            </Button>
          )}
          <Button variant="outline" onClick={onHome}>
            入口へ戻るでやんす
          </Button>
        </div>
      </div>
      <div className="result-list">
        {results.map((result, index) => (
          <details
            key={index}
            className={`result-item ${result.correct ? 'correct' : 'retry'}`}
          >
            <summary>
              <YansuPortrait success={result.correct} small />
              <span>
                第{index + 1}問・
                {result.correct ? '正解でやんす' : '振り返るでやんす'}
              </span>
            </summary>
            <div className="result-detail">
              <p>{result.text}</p>
              {result.kumowaProblem ? (
                <KumowaReview
                  problem={result.kumowaProblem}
                  chosen={reviewKumowaAnswers(result)}
                />
              ) : (
                <>
                  <p>
                    <b>選んだ答えでやんす：</b>
                    {result.chosen.join(' ／ ')}
                  </p>
                  <p>
                    <b>正解でやんす：</b>
                    {result.expected.join(' ／ ')}
                  </p>
                </>
              )}
              {result.ratioProblem ? (
                <RatioExplanation problem={result.ratioProblem} />
              ) : result.kumowaProblem ? (
                <KumowaExplanation problem={result.kumowaProblem} />
              ) : (
                result.explanation.map((text, position) => (
                  <p key={position}>{text}</p>
                ))
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <AccessGate>{(session) => <PracticeApp session={session} />}</AccessGate>
  );
}

function PracticeApp({ session }: { session: AccessSession }) {
  const [storedRun, setRun] = useState<RunState | null>(null);
  const [report, setReport] = useState<QuestionResult[] | null>(null);
  const [reviewNotice, setReviewNotice] = useState('');
  const serial = useRef(0);
  const starting = useRef(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const sound = useSoundEffects();
  const daily = useDailyProgress();
  const mail = useTestMail(session);
  const finishedRun = useRef<number | null>(null);
  const reviewExpired =
    !!storedRun?.review &&
    !!daily.progress &&
    storedRun.review.date !== daily.progress.date;
  const run = reviewExpired ? null : storedRun;

  // History stores no answers. Back/forward and bfcache restoration always
  // discard the current run; there is no route for revisiting a test question.
  useEffect(() => {
    const reset = () => {
      serial.current++;
      setRun(null);
      setReport(null);
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) reset();
    };
    window.addEventListener('popstate', reset);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('popstate', reset);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  function activate(nextRun: RunState) {
    const historyState: unknown = window.history.state;
    const currentRun =
      typeof historyState === 'object' &&
      historyState !== null &&
      'kumowaRun' in historyState &&
      historyState.kumowaRun;
    if (currentRun)
      window.history.replaceState(
        { kumowaRun: true },
        '',
        window.location.href,
      );
    else
      window.history.pushState({ kumowaRun: true }, '', window.location.href);
    setRun(nextRun);
    setReport(null);
    setReviewNotice('');
    window.scrollTo({ top: 0 });
  }
  async function start(
    course: Course,
    kind: 'practice' | 'test',
    difficulty: Difficulty = 'beginner',
  ) {
    if (starting.current) return;
    starting.current = true;
    try {
      const id = ++serial.current;
      const testDate =
        kind === 'test' ? await daily.beginTest(course) : undefined;
      if ((kind === 'test' && !testDate) || id !== serial.current) return;
      activate({
        course,
        kind,
        difficulty,
        id,
        testDate: testDate ?? undefined,
        reportId: kind === 'test' ? crypto.randomUUID() : undefined,
      });
    } finally {
      starting.current = false;
    }
  }
  function startReview() {
    const review = daily.getReview();
    if (!review?.questions.length) return;
    activate({
      course: review.questions[0].course,
      kind: 'review',
      difficulty: 'beginner',
      id: ++serial.current,
      review: { ...review, index: 0 },
    });
  }
  function advanceReview() {
    if (!run?.review) return;
    const index = run.review.index + 1;
    if (index === run.review.questions.length) {
      goHome();
      setReviewNotice(
        '今日の復習が終わったでやんす！ 何度でも解き直せるでやんす。',
      );
      return;
    }
    setRun({
      ...run,
      course: run.review.questions[index].course,
      id: ++serial.current,
      review: { ...run.review, index },
    });
    window.scrollTo({ top: 0 });
  }
  function goHome() {
    serial.current++;
    setRun(null);
    setReport(null);
    // Consume the single run entry, so browser Forward cannot restore answers.
    window.history.back();
    requestAnimationFrame(() => titleRef.current?.focus());
  }
  async function finish(results: QuestionResult[]) {
    if (!run || run.kind !== 'test' || finishedRun.current === run.id) return;
    finishedRun.current = run.id;
    const runId = run?.id;
    void mail.enqueue(run.course, results, run.reportId!);
    await daily.saveMistakes(results, run?.testDate ?? dayKey());
    if (runId !== serial.current) return;
    setReport(results);
    sound.play(scoreTest(results) === TEST_LENGTH, false);
    requestAnimationFrame(() => {
      document.getElementById('result-title')?.focus();
      window.scrollTo({ top: 0 });
    });
  }
  const review = run?.review
    ? {
        question: run.review.questions[run.review.index],
        number: run.review.index,
        total: run.review.questions.length,
        onNext: advanceReview,
      }
    : undefined;

  return (
    <main className={`app-shell ${run && !report ? 'is-practicing' : ''}`}>
      <YansuPreload />
      <header className="site-header">
        <div className="brand">
          <MiniCircle />
          <h1 ref={titleRef} tabIndex={-1}>
            くもわの<span>練習でやんす</span>
          </h1>
        </div>
        <div className="header-controls">
          <label className="sound-control" htmlFor="sound-toggle">
            <span>音と声{sound.enabled ? 'オン' : 'オフ'}でやんす</span>
            <Switch
              id="sound-toggle"
              checked={sound.enabled}
              onCheckedChange={(value) => {
                void sound.changeEnabled(value);
              }}
              aria-label="効果音をオン・オフにするでやんす"
            />
          </label>
          {run ? (
            <Button variant="ghost" className="back-button" onClick={goHome}>
              <ArrowLeft aria-hidden="true" />
              入口へ戻るでやんす
            </Button>
          ) : (
            <span className="header-note">計算なしでやんす！</span>
          )}
        </div>
      </header>
      {mail.message && (
        <output className="mail-message" aria-live="polite">
          {mail.message}
        </output>
      )}
      {sound.error && (
        <output className="audio-message" aria-live="polite">
          {sound.error}
        </output>
      )}
      {daily.error && (
        <output className="audio-message" aria-live="polite">
          {daily.error}
        </output>
      )}
      {!run ? (
        <section className="course-picker" aria-labelledby="course-heading">
          <div className="welcome">
            <span className="eyebrow">割合・百分率</span>
            <h2 id="course-heading">どっちを練習するでやんすか？</h2>
            <p>練習は何度でも。テストは10問でやんす。</p>
          </div>
          <div className="course-grid">
            <article className="course-card course-kumowa">
              <span className="course-number">01</span>
              <MiniCircle className="course-diagram" />
              <h3 className="course-title">くもわを見つけるでやんす</h3>
              <p className="course-description">
                3つの言葉を、
                <br />
                くもわの円へ動かすでやんす。
              </p>
              <div className="course-actions">
                <Button
                  className="main-button"
                  onClick={() => start('kumowa', 'practice')}
                >
                  練習するでやんす
                </Button>
                <Button
                  variant="outline"
                  className="test-start-button"
                  onClick={() => start('kumowa', 'test')}
                  disabled={!daily.canTest('kumowa')}
                >
                  {daily.progress && daily.remaining('kumowa') === 0
                    ? '今日のテストは終了でやんす'
                    : 'テストするでやんす'}
                </Button>
                <p className="test-quota">
                  今日のテスト：残り
                  {daily.progress ? daily.remaining('kumowa') : '…'} /
                  3回でやんす。
                </p>
              </div>
            </article>
            <article className="course-card course-ratio">
              <span className="course-number">02</span>
              <span className="course-formulas" aria-hidden="true">
                <span>1 ＋ 0.2</span>
                <span>1 − 0.2</span>
                <span>0.2</span>
              </span>
              <h3 className="course-title">使う割合を選ぶでやんす</h3>
              <p className="course-description">
                増やす・減らす・そのままでやんす。
                <br />
                掛ける割合を見つけるでやんす。
              </p>
              <div className="course-actions">
                <Button
                  className="main-button"
                  onClick={() => start('ratio', 'practice', 'beginner')}
                >
                  初級を練習するでやんす
                </Button>
                <Button
                  variant="outline"
                  className="test-start-button"
                  onClick={() => start('ratio', 'practice', 'advanced')}
                >
                  上級を練習するでやんす
                </Button>
                <Button
                  variant="outline"
                  className="test-start-button"
                  onClick={() => start('ratio', 'test')}
                  disabled={!daily.canTest('ratio')}
                >
                  {daily.progress && daily.remaining('ratio') === 0
                    ? '今日のテストは終了でやんす'
                    : 'テストするでやんす'}
                </Button>
                <p className="test-quota">
                  今日のテスト：残り
                  {daily.progress ? daily.remaining('ratio') : '…'} /
                  3回でやんす。
                </p>
              </div>
            </article>
          </div>
          <section
            className="daily-review-card"
            aria-labelledby="daily-review-title"
          >
            <div>
              <h3 id="daily-review-title">今日の復習でやんす</h3>
              <p>
                {daily.mistakes.length
                  ? `今日のテストで間違えた${daily.mistakes.length}問を解き直すでやんす。`
                  : '今日のテストの間違いは、まだないでやんす。'}
              </p>
              <p>復習はテストの回数に入らないでやんす。</p>
            </div>
            <Button
              className="main-button"
              onClick={startReview}
              disabled={!daily.mistakes.length || !!daily.error}
            >
              間違いだけ復習するでやんす
            </Button>
          </section>
          {(reviewNotice || reviewExpired) && (
            <output className="review-complete" aria-live="polite">
              {reviewExpired
                ? '日付が変わったので、今日の復習に切り替えるでやんす。'
                : reviewNotice}
            </output>
          )}
          <p className="entry-test-note">
            各コース1,000問からランダムで出題するでやんす。
            <br />
            テストは各コース1日3回、1〜7問は初級、8〜10問は中級でやんす。途中で戻っても開始した1回に数えるでやんす。回数と復習は、日本時間の0時に切り替わるでやんす。
          </p>
        </section>
      ) : report ? (
        <TestResult
          results={report}
          onRestart={() => start(run.course, 'test')}
          onHome={goHome}
          canTest={daily.canTest(run.course)}
          remaining={daily.remaining(run.course)}
          onReview={startReview}
          reviewCount={daily.mistakes.length}
        />
      ) : run.course === 'kumowa' ? (
        <KumowaPractice
          key={run.id}
          kind={run.kind}
          onFeedback={sound.play}
          onFinish={finish}
          review={review}
        />
      ) : (
        <RatioPractice
          key={run.id}
          kind={run.kind}
          difficulty={run.difficulty}
          onFeedback={sound.play}
          onFinish={finish}
          review={review}
        />
      )}
      <p className="bottom-note">
        <RotateCcw aria-hidden="true" />
        何度でも、自分のペースでやんす。
      </p>
    </main>
  );
}
