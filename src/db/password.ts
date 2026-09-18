import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

// Mesmo formato da implementação do navegador (src/utils/passwordSecurity.ts):
// `pbkdf2$<iteracoes>$<salt-base64>$<hash-base64>` com PBKDF2/SHA-256.

export function hashPasswordNode(password: string, iterations = 150000): string {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  return `pbkdf2$${iterations}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPasswordNode(password: string, stored: string): { valid: boolean; needsMigration: boolean } {
  if (typeof stored !== 'string' || !stored.startsWith('pbkdf2$')) {
    return { valid: stored === password, needsMigration: stored === password };
  }

  const parts = stored.split('$');
  if (parts.length < 4) return { valid: false, needsMigration: false };

  const [, iterText, saltB64, expectedB64] = parts;
  const iterations = Number(iterText);
  if (!iterations || !saltB64 || !expectedB64) return { valid: false, needsMigration: false };

  try {
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(expectedB64, 'base64');
    const actual = pbkdf2Sync(password, salt, iterations, expected.length, 'sha256');
    const sameLength = actual.length === expected.length;
    return { valid: sameLength && timingSafeEqual(actual, expected), needsMigration: false };
  } catch {
    return { valid: false, needsMigration: false };
  }
}

export function validatePasswordStrengthNode(password: string): string | null {
  if (password.length < 10) return 'A senha deve possuir no mínimo 10 caracteres.';
  if (!/[A-Z]/.test(password)) return 'Inclua ao menos uma letra maiúscula.';
  if (!/[a-z]/.test(password)) return 'Inclua ao menos uma letra minúscula.';
  if (!/\d/.test(password)) return 'Inclua ao menos um número.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Inclua ao menos um caractere especial.';
  return null;
}

export function generateTemporaryPasswordNode(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const nums = '23456789';
  const special = '!@#$%&*';
  const all = upper + lower + nums + special;
  const bytes = randomBytes(16);
  const pick = (chars: string, i: number) => chars[bytes[i] % chars.length];
  const required = [pick(upper, 0), pick(lower, 1), pick(nums, 2), pick(special, 3)];
  for (let i = 4; i < 14; i += 1) required.push(pick(all, i));
  return required.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0)).join('');
}