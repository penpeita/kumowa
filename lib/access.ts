export type AccessSession = {
  token: string;
  expiresAt: number;
  preview: boolean;
};

export async function passwordDigest(password: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(password),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export function apiEndpoint(base: string, path: string): string {
  const url = new URL(base);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error('Invalid API URL');
  return `${url.href.replace(/\/$/, '')}/${path}`;
}
