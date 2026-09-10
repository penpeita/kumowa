import { passwordDigest } from '../lib/access.ts';
import {
  isTestReport,
  reportEmail,
  REPORT_RETRY_WINDOW,
} from '../lib/test-report.ts';

type Limiter = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};
export type Env = {
  APP_ORIGIN: string;
  APP_PASSWORD: string;
  SESSION_SECRET: string;
  RESEND_API_KEY: string;
  REPORT_TO: string;
  MAIL_FROM: string;
  LOGIN_LIMITER: Limiter;
  REPORT_LIMITER: Limiter;
};
const encoder = new TextEncoder();
const SESSION_MS = 12 * 60 * 60 * 1000;
const hex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
async function key(env: Env) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(`${env.SESSION_SECRET}:${env.APP_PASSWORD}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}
async function session(env: Env, now: number) {
  const expiresAt = now + SESSION_MS;
  const payload = `${expiresAt}.${crypto.randomUUID()}`;
  return {
    token: `${payload}.${hex(await crypto.subtle.sign('HMAC', await key(env), encoder.encode(payload)))}`,
    expiresAt,
  };
}
async function authenticated(request: Request, env: Env, now: number) {
  const auth = request.headers.get('Authorization') || '';
  const match = /^Bearer (\d{13})\.([0-9a-f-]{36})\.([0-9a-f]{64})$/.exec(auth);
  if (!match || Number(match[1]) <= now || Number(match[1]) > now + SESSION_MS)
    return false;
  const signature = Uint8Array.from(match[3].match(/../g)!, (byte) =>
    parseInt(byte, 16),
  );
  return crypto.subtle.verify(
    'HMAC',
    await key(env),
    signature,
    encoder.encode(`${match[1]}.${match[2]}`),
  );
}
async function readBody(request: Request): Promise<unknown> {
  if (!request.headers.get('Content-Type')?.startsWith('application/json'))
    throw new Error('body');
  // Bound the actual stream, including requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new Error('body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 48000) {
      await reader.cancel();
      throw new Error('body');
    }
    chunks.push(value);
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(buffer));
}

export async function handleRequest(
  request: Request,
  env: Env,
  send: typeof fetch = fetch,
  now = Date.now(),
): Promise<Response> {
  const origin = request.headers.get('Origin');
  const allowed = !!env.APP_ORIGIN && origin === env.APP_ORIGIN;
  const headers = new Headers({
    'Cache-Control': 'no-store',
    Vary: 'Origin',
    'X-Content-Type-Options': 'nosniff',
  });
  if (allowed) {
    headers.set('Access-Control-Allow-Origin', env.APP_ORIGIN);
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  const reply = (status: number, value: object) =>
    Response.json(value, { status, headers });
  if (!allowed) return reply(403, { error: 'origin' });
  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply(405, { error: 'method' });
  if (
    !env.APP_PASSWORD ||
    !env.SESSION_SECRET ||
    env.SESSION_SECRET.length < 32 ||
    !env.LOGIN_LIMITER ||
    !env.REPORT_LIMITER
  )
    return reply(503, { error: 'configuration' });
  const path = new URL(request.url).pathname;
  try {
    if (path === '/login') {
      // Single-family application: cap guesses for the whole family per location.
      if (!(await env.LOGIN_LIMITER.limit({ key: 'family-login' })).success)
        return reply(429, { error: 'rate' });
      const body = (await readBody(request)) as { password?: unknown };
      if (
        !body ||
        typeof body.password !== 'string' ||
        body.password.length > 128
      )
        return reply(400, { error: 'body' });
      const supplied = await passwordDigest(body.password);
      const expected = await passwordDigest(env.APP_PASSWORD);
      let mismatch = 0;
      for (let n = 0; n < expected.length; n++)
        mismatch |= supplied.charCodeAt(n) ^ expected.charCodeAt(n);
      if (mismatch) return reply(401, { error: 'password' });
      return reply(200, await session(env, now));
    }
    if (path !== '/report') return reply(404, { error: 'path' });
    if (!(await authenticated(request, env, now)))
      return reply(401, { error: 'session' });
    if (!env.RESEND_API_KEY || !env.REPORT_TO || !env.MAIL_FROM)
      return reply(503, { error: 'configuration' });
    if (!(await env.REPORT_LIMITER.limit({ key: 'family-reports' })).success)
      return reply(429, { error: 'rate' });
    const body = await readBody(request);
    if (!isTestReport(body)) return reply(400, { error: 'body' });
    const age = now - Date.parse(body.completedAt);
    if (age < -5 * 60 * 1000 || age > REPORT_RETRY_WINDOW)
      return reply(400, { error: 'date' });
    try {
      const response = await send('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `kumowa-test/${body.id}`,
        },
        body: JSON.stringify({
          from: env.MAIL_FROM,
          to: [env.REPORT_TO],
          ...reportEmail(body),
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return reply(502, { error: 'delivery' });
      const delivery = (await response.json()) as { id?: unknown };
      if (typeof delivery.id !== 'string' || !delivery.id)
        return reply(502, { error: 'delivery' });
      // Provider acceptance is not a delivery receipt; do not call this inbox delivery.
      return reply(200, { accepted: true });
    } catch {
      return reply(502, { error: 'delivery' });
    }
  } catch {
    return reply(400, { error: 'request' });
  }
}
const worker = {
  fetch(request: Request, env: Env) {
    return handleRequest(request, env);
  },
};
export default worker;
