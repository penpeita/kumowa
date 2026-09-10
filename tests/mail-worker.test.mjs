import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../mail-worker/index.ts';
import {
  makeReport,
  isTestReport,
  reportEmail,
  REPORT_RETRY_WINDOW,
} from '../lib/test-report.ts';
import { apiEndpoint, passwordDigest } from '../lib/access.ts';
import { readOutbox, addPending, retryable } from '../lib/report-outbox.ts';

const now = Date.parse('2026-09-10T06:00:00Z');
const allow = { limit: async () => ({ success: true }) };
const env = {
  APP_ORIGIN: 'https://example.github.io',
  APP_PASSWORD: 'test-entry-password',
  SESSION_SECRET: 'test-session-secret-at-least-thirty-two-characters',
  RESEND_API_KEY: 'test-key',
  REPORT_TO: 'parent@example.com',
  MAIL_FROM: 'practice@example.com',
  LOGIN_LIMITER: allow,
  REPORT_LIMITER: allow,
};
const results = Array.from({ length: 10 }, (_, n) => ({
  text: `練習問題${n + 1}でやんす。`,
  correct: n < 7,
  chosen: ['240円 → も'],
  expected: ['240円 → も'],
  explanation: [],
}));
const report = makeReport(
  'kumowa',
  results,
  '12345678-1234-4234-8234-123456789012',
  new Date(now),
);
const request = (path, body, token = '', origin = env.APP_ORIGIN) =>
  new Request(`https://mail.example.com${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
const neverSend = async () => {
  throw new Error('Unexpected external request');
};
async function login() {
  const response = await handleRequest(
    request('/login', { password: env.APP_PASSWORD }),
    env,
    neverSend,
    now,
  );
  assert.equal(response.status, 200);
  return (await response.json()).token;
}

test('wrong password, unconfigured server, and unapproved origin never unlock', async () => {
  assert.equal(
    (
      await handleRequest(
        request('/login', { password: 'wrong' }),
        env,
        neverSend,
        now,
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await handleRequest(
        request('/login', {}),
        { ...env, SESSION_SECRET: '' },
        neverSend,
        now,
      )
    ).status,
    503,
  );
  const denied = await handleRequest(
    request('/login', {}, '', 'https://attacker.example'),
    env,
    neverSend,
    now,
  );
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get('Access-Control-Allow-Origin'), null);
});
test('preflight allows only the configured app and authentication headers', async () => {
  const response = await handleRequest(
    new Request('https://mail.example.com/report', {
      method: 'OPTIONS',
      headers: { Origin: env.APP_ORIGIN },
    }),
    env,
    neverSend,
    now,
  );
  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get('Access-Control-Allow-Origin'),
    env.APP_ORIGIN,
  );
  assert.match(
    response.headers.get('Access-Control-Allow-Headers'),
    /Authorization/,
  );
});
test('login guess throttling is enforced before password verification', async () => {
  const response = await handleRequest(
    request('/login', { password: env.APP_PASSWORD }),
    { ...env, LOGIN_LIMITER: { limit: async () => ({ success: false }) } },
    neverSend,
    now,
  );
  assert.equal(response.status, 429);
});
test('missing, forged, expired and password-rotated sessions cannot send mail', async () => {
  const token = await login();
  for (const candidate of [
    '',
    token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a'),
  ]) {
    assert.equal(
      (
        await handleRequest(
          request('/report', report, candidate),
          env,
          neverSend,
          now,
        )
      ).status,
      401,
    );
  }
  assert.equal(
    (
      await handleRequest(
        request('/report', report, token),
        env,
        neverSend,
        now + 12 * 3600000,
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await handleRequest(
        request('/report', report, token),
        { ...env, APP_PASSWORD: 'rotated' },
        neverSend,
        now,
      )
    ).status,
    401,
  );
});
test('authorized result uses the server recipient, computed score and a stable idempotency key', async () => {
  const token = await login();
  const sent = [];
  const mock = async (url, options) => {
    sent.push({ url, ...options });
    return Response.json({ id: 'provider-id' });
  };
  for (let n = 0; n < 2; n++) {
    const response = await handleRequest(
      request(
        '/report',
        { ...report, to: 'attacker@example.com', score: 10 },
        token,
      ),
      env,
      mock,
      now,
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { accepted: true });
  }
  const body = JSON.parse(sent[0].body);
  assert.deepEqual(body.to, [env.REPORT_TO]);
  assert.match(body.subject, /7\/10/);
  assert.match(body.text, /選んだ答え/);
  assert.equal(
    sent[0].headers['Idempotency-Key'],
    sent[1].headers['Idempotency-Key'],
  );
  assert.equal(sent[0].body, sent[1].body);
  assert.equal(sent[0].url, 'https://api.resend.com/emails');
});
test('provider failure or missing receipt is never reported as acceptance', async () => {
  const token = await login();
  for (const mock of [
    async () => new Response('', { status: 503 }),
    async () => {
      throw new Error('offline');
    },
    async () => Response.json({}),
  ]) {
    const response = await handleRequest(
      request('/report', report, token),
      env,
      mock,
      now,
    );
    assert.equal(response.status, 502);
    assert.equal((await response.json()).accepted, undefined);
  }
});
test('mail throttle and missing mail credentials prevent provider calls', async () => {
  const token = await login();
  assert.equal(
    (
      await handleRequest(
        request('/report', report, token),
        { ...env, REPORT_LIMITER: { limit: async () => ({ success: false }) } },
        neverSend,
        now,
      )
    ).status,
    429,
  );
  assert.equal(
    (
      await handleRequest(
        request('/report', report, token),
        { ...env, RESEND_API_KEY: '' },
        neverSend,
        now,
      )
    ).status,
    503,
  );
});
test('invalid, partial, oversized, stale and far-future reports are rejected', async () => {
  const token = await login();
  for (const invalid of [
    null,
    { ...report, results: results.slice(0, 9) },
    { ...report, id: 'invalid' },
    {
      ...report,
      completedAt: new Date(now - REPORT_RETRY_WINDOW - 1).toISOString(),
    },
    { ...report, completedAt: new Date(now + 600000).toISOString() },
    { ...report, extra: 'x'.repeat(50000) },
  ]) {
    assert.equal(
      (
        await handleRequest(
          request('/report', invalid, token),
          env,
          neverSend,
          now,
        )
      ).status,
      400,
    );
  }
});
test('outbox preserves exact reports over reload, deduplicates IDs and bounds retries below provider retention', () => {
  assert.ok(isTestReport(report));
  assert.deepEqual(
    readOutbox(JSON.stringify(addPending(addPending([], report), report))),
    [report],
  );
  assert.equal(retryable(report, now + REPORT_RETRY_WINDOW), true);
  assert.equal(retryable(report, now + REPORT_RETRY_WINDOW + 1), false);
  assert.equal(retryable(report, now - 600000), false);
  assert.throws(() => readOutbox('[null]'));
  assert.doesNotMatch(
    JSON.stringify(report),
    /parent@example|test-key|test-entry/,
  );
  assert.match(reportEmail(report).text, /2026\/0?9\/10 15:00/);
});
test('preview password digest is deterministic and API URLs require HTTPS without credentials', async () => {
  assert.equal(await passwordDigest('one'), await passwordDigest('one'));
  assert.notEqual(await passwordDigest('one'), await passwordDigest('two'));
  assert.equal(
    apiEndpoint('https://mail.example.com/', 'login'),
    'https://mail.example.com/login',
  );
  for (const invalid of [
    'http://mail.example.com',
    'https://secret@mail.example.com',
    'https://mail.example.com?secret=key',
  ])
    assert.throws(() => apiEndpoint(invalid, 'login'));
});
