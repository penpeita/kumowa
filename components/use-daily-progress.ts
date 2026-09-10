'use client';

import { useEffect, useRef, useState } from 'react';
import {
  addTestMistakes,
  consumeTest,
  DAILY_STORAGE_KEY,
  DAILY_TEST_LIMIT,
  readDailyProgress,
  reviewQuestions,
  type DailyProgress,
} from '@/lib/daily-progress';
import type { Course, QuestionResult } from '@/lib/session';

function readCurrent() {
  return readDailyProgress(window.localStorage.getItem(DAILY_STORAGE_KEY));
}
async function locked<T>(action: () => T): Promise<T> {
  if (navigator.locks)
    return navigator.locks.request(DAILY_STORAGE_KEY, action);
  return action();
}
const STORAGE_ERROR =
  '今日の記録を保存できないでやんす。ブラウザの保存設定を確かめるでやんす。';

export function useDailyProgress() {
  const [progress, setProgress] = useState<DailyProgress | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    const refresh = () => {
      try {
        setProgress(readCurrent());
        setError('');
      } catch {
        setError(STORAGE_ERROR);
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  async function beginTest(course: Course): Promise<string | null> {
    if (pending.current) return null;
    pending.current = true;
    setBusy(true);
    try {
      return await locked(() => {
        const current = readCurrent();
        const next = consumeTest(current, course);
        if (!next) {
          setProgress(current);
          return null;
        }
        window.localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(next));
        setProgress(next);
        setError('');
        return next.date;
      });
    } catch {
      setError(STORAGE_ERROR);
      return null;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function saveMistakes(
    results: readonly QuestionResult[],
    testDate: string,
  ) {
    try {
      await locked(() => {
        const next = addTestMistakes(readCurrent(), results, testDate);
        window.localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(next));
        setProgress(next);
        setError('');
      });
    } catch {
      setError(STORAGE_ERROR);
    }
  }
  function getReview() {
    try {
      const current = readCurrent();
      setProgress(current);
      return { date: current.date, questions: reviewQuestions(current) };
    } catch {
      setError(STORAGE_ERROR);
      return null;
    }
  }
  const remaining = (course: Course) =>
    progress ? DAILY_TEST_LIMIT - progress.attempts[course] : 0;
  return {
    progress,
    error,
    busy,
    remaining,
    canTest: (course: Course) =>
      !!progress && !busy && !error && remaining(course) > 0,
    mistakes: progress ? reviewQuestions(progress) : [],
    beginTest,
    saveMistakes,
    getReview,
  };
}
