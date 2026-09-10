'use client';

import { useEffect, useState, type SubmitEvent, type ReactNode } from 'react';
import { LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiEndpoint, passwordDigest, type AccessSession } from '@/lib/access';

export const REPORT_API = import.meta.env.VITE_REPORT_API_URL || '';
// Preview-only digest is removed from production; production verifies on the server.
const PREVIEW_DIGEST = import.meta.env.DEV
  ? import.meta.env.VITE_PREVIEW_PASSWORD_SHA256
  : '';

export function AccessGate({
  children,
}: {
  children: (session: AccessSession) => ReactNode;
}) {
  const [session, setSession] = useState<AccessSession | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!session) return;
    const expire = () => setSession(null);
    const timer = window.setTimeout(
      expire,
      Math.max(0, session.expiresAt - Date.now()),
    );
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) expire();
    };
    window.addEventListener('pageshow', restore);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pageshow', restore);
    };
  }, [session]);

  async function unlock(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (!REPORT_API && PREVIEW_DIGEST) {
        if ((await passwordDigest(password)) !== PREVIEW_DIGEST) {
          setError('パスワードが違うでやんす。もう一度入れるでやんす。');
          return;
        }
        setSession({
          token: '',
          expiresAt: Date.now() + 12 * 60 * 60 * 1000,
          preview: true,
        });
      } else if (REPORT_API) {
        const response = await fetch(apiEndpoint(REPORT_API, 'login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
          signal: AbortSignal.timeout(12000),
        });
        if (!response.ok) {
          setError(
            response.status === 401
              ? 'パスワードが違うでやんす。もう一度入れるでやんす。'
              : response.status === 429
                ? '少し待ってから、もう一度入れるでやんす。'
                : '入口につながらないでやんす。少し待って試すでやんす。',
          );
          return;
        }
        const data = (await response.json()) as Partial<AccessSession>;
        if (
          typeof data.token !== 'string' ||
          !data.token ||
          typeof data.expiresAt !== 'number' ||
          data.expiresAt <= Date.now()
        )
          throw new Error('Invalid session');
        setSession({
          token: data.token,
          expiresAt: data.expiresAt,
          preview: false,
        });
      } else {
        setError('おうちの人が入口を準備しているでやんす。');
        return;
      }
      setPassword('');
    } catch {
      setError('入口につながらないでやんす。通信を確かめるでやんす。');
    } finally {
      setBusy(false);
    }
  }

  if (session) return children(session);
  return (
    <main className="access-screen">
      <section className="access-card" aria-labelledby="access-title">
        <span className="access-icon">
          <LockKeyhole aria-hidden="true" />
        </span>
        <h1 id="access-title">くもわの練習でやんす</h1>
        <p>パスワードを入れて始めるでやんす。</p>
        <form onSubmit={unlock}>
          <label htmlFor="entry-password">パスワードでやんす</label>
          <input
            id="entry-password"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            maxLength={128}
            aria-describedby={error ? 'entry-error' : undefined}
          />
          {error && (
            <output
              id="entry-error"
              className="access-error"
              aria-live="polite"
            >
              {error}
            </output>
          )}
          <Button
            type="submit"
            className="main-button"
            disabled={busy || !password}
          >
            {busy ? '確かめているでやんす' : '入るでやんす'}
          </Button>
        </form>
      </section>
    </main>
  );
}
