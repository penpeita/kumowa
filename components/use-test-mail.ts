'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiEndpoint, type AccessSession } from '@/lib/access';
import { makeReport, type TestReport } from '@/lib/test-report';
import {
  addPending,
  OUTBOX_KEY,
  readOutbox,
  retryable,
} from '@/lib/report-outbox';
import type { Course, QuestionResult } from '@/lib/session';
import { REPORT_API } from './access-gate';

async function outboxLock<T>(action: () => T): Promise<T> {
  return navigator.locks
    ? navigator.locks.request(OUTBOX_KEY, action)
    : action();
}
const read = () => readOutbox(localStorage.getItem(OUTBOX_KEY));
const save = (queue: TestReport[]) =>
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(queue));

export function useTestMail(session: AccessSession) {
  const [message, setMessage] = useState('');
  const running = useRef(false);
  const alive = useRef(true);
  const volatile = useRef<TestReport[]>([]);

  const flush = useCallback(async () => {
    if (session.preview || !REPORT_API || running.current || !alive.current)
      return;
    running.current = true;
    const announce = (value: string) => {
      if (alive.current) setMessage(value);
    };
    try {
      let stored: TestReport[] = [];
      try {
        stored = read();
      } catch {
        announce(
          '送信待ちの記録を読み込めないでやんす。おうちの人に伝えるでやんす。',
        );
      }
      const pending = [
        ...new Map(
          [...stored, ...volatile.current].map((r) => [r.id, r]),
        ).values(),
      ];
      for (const report of pending) {
        if (!alive.current) break;
        if (!retryable(report)) {
          announce(
            '送れなかった結果があるでやんす。おうちの人に伝えるでやんす。',
          );
          continue;
        }
        announce('結果をメールで送っているでやんす。');
        const response = await fetch(apiEndpoint(REPORT_API, 'report'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify(report),
          signal: AbortSignal.timeout(15000),
          keepalive: true,
        });
        if (response.status === 401) {
          announce(
            'メール送信には、入り直しが必要でやんす。結果は送信待ちでやんす。',
          );
          break;
        }
        if (!response.ok) throw new Error('Delivery failed');
        const result = (await response.json()) as { accepted?: boolean };
        if (result.accepted !== true) throw new Error('Delivery not accepted');
        volatile.current = volatile.current.filter(
          (item) => item.id !== report.id,
        );
        let cleared = true;
        try {
          await outboxLock(() =>
            save(read().filter((item) => item.id !== report.id)),
          );
        } catch {
          cleared = false;
        }
        announce(
          cleared
            ? '結果のメール送信を受け付けたでやんす。'
            : '送信は受け付けたでやんす。端末の記録を更新できないでやんす。',
        );
      }
    } catch {
      announce(
        volatile.current.length
          ? '結果はまだ送れていないでやんす。この画面を開いたまま通信を確かめるでやんす。'
          : '結果は送信待ちでやんす。通信が戻ったら自動で送り直すでやんす。',
      );
    } finally {
      running.current = false;
    }
  }, [session]);

  useEffect(() => {
    alive.current = true;
    void flush();
    const retry = () => {
      void flush();
    };
    const timer = window.setInterval(retry, 60000);
    window.addEventListener('online', retry);
    window.addEventListener('focus', retry);
    return () => {
      alive.current = false;
      window.clearInterval(timer);
      window.removeEventListener('online', retry);
      window.removeEventListener('focus', retry);
    };
  }, [flush]);

  async function enqueue(
    course: Course,
    results: QuestionResult[],
    id: string,
  ) {
    if (session.preview || !REPORT_API) {
      setMessage('メール送信は準備中でやんす。今は送信されないでやんす。');
      return;
    }
    const report = makeReport(course, results, id);
    try {
      await outboxLock(() => save(addPending(read(), report)));
    } catch {
      volatile.current = addPending(volatile.current, report);
    }
    void flush();
  }
  return { message, enqueue };
}
