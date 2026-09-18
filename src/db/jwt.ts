import { createHmac, timingSafeEqual } from 'node:crypto';

// JWT minimalista HS256 (RFC 7519) usando apenas node:crypto.
// Senha: JWT_SECRET (obrigatória em produção; em desenvolvimento cai num segredo
// fixo local para permitir testes sem configuração).

const JWT_TTL_SECONDS = 12 * 60 * 60; // 12 horas
const DEV_FALLBACK_SECRET = 'sispat-dev-only-do-not-use-in-production';

export type JwtPayload = {
  sub: string;
  login: string;
  role: string;
  iat: number;
  exp: number;
};

function getSecret(): string | null {
  const configured = process.env.JWT_SECRET;
  if (configured && configured.trim()) return configured.trim();
  if (process.env.NODE_ENV === 'production') return null;
  return DEV_FALLBACK_SECRET;
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function sign(payload: Record<string, unknown>, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verify(token: string, secret: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [b64Header, b64Payload, signature] = parts;
  if (!b64Header || !b64Payload || !signature) return null;

  const data = `${b64Header}.${b64Payload}`;
  const expected = createHmac('sha256', secret).update(data).digest('base64url');
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8')) as JwtPayload;
    if (!payload || typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createToken(user: { id: string; login: string; role: string }): { token: string; expiresIn: number } | null {
  const secret = getSecret();
  if (!secret) return null;
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: user.id, login: user.login, role: user.role, iat: now, exp: now + JWT_TTL_SECONDS };
  return { token: sign(payload, secret), expiresIn: JWT_TTL_SECONDS };
}

export function verifyToken(token: string): JwtPayload | null {
  const secret = getSecret();
  if (!secret) return null;
  return verify(token, secret);
}