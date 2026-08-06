import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'jedna-session';

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.SESSION_SECRET ?? 'fallback-dev-secret');
}

export async function createSession(): Promise<string> {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySession(token);
}

export { COOKIE_NAME };
