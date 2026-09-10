import {
  isTestReport,
  REPORT_RETRY_WINDOW,
  type TestReport,
} from './test-report.ts';

export const OUTBOX_KEY = 'kumowa-mail-outbox-v1';
export function readOutbox(raw: string | null): TestReport[] {
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.length > 60 || !value.every(isTestReport))
    throw new Error('Invalid outbox');
  return value;
}
export function retryable(report: TestReport, now = Date.now()) {
  const age = now - Date.parse(report.completedAt);
  return age >= -300000 && age <= REPORT_RETRY_WINDOW;
}

// Merge individual operations with the latest disk value so that another tab's
// completed test cannot be lost while a request is in flight.
export function addPending(queue: TestReport[], report: TestReport) {
  if (queue.some((item) => item.id === report.id)) return queue;
  if (queue.length >= 60) throw new Error('Outbox full');
  return [...queue, report];
}
