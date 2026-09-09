const encoder = new TextEncoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function hashPassword(password: string, iterations = 150000): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Este navegador não oferece Web Crypto API necessária para proteger senhas.');
  }
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMaterial,
    256
  );
  return `pbkdf2$${iterations}$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<{ valid: boolean; needsMigration: boolean }> {
  if (!stored.startsWith('pbkdf2$')) {
    // Compatibilidade temporária para contas antigas. Após login correto, a senha é migrada.
    return { valid: stored === password, needsMigration: stored === password };
  }

  const [, iterText, saltB64, expectedB64] = stored.split('$');
  const iterations = Number(iterText);
  if (!iterations || !saltB64 || !expectedB64 || !globalThis.crypto?.subtle) {
    return { valid: false, needsMigration: false };
  }

  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: base64ToBytes(saltB64), iterations },
    keyMaterial,
    256
  );
  const actual = new Uint8Array(bits);
  const expected = base64ToBytes(expectedB64);
  if (actual.length !== expected.length) return { valid: false, needsMigration: false };

  let diff = 0;
  for (let i = 0; i < actual.length; i += 1) diff |= actual[i] ^ expected[i];
  return { valid: diff === 0, needsMigration: false };
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 10) return 'A senha deve possuir no mínimo 10 caracteres.';
  if (!/[A-Z]/.test(password)) return 'Inclua ao menos uma letra maiúscula.';
  if (!/[a-z]/.test(password)) return 'Inclua ao menos uma letra minúscula.';
  if (!/\d/.test(password)) return 'Inclua ao menos um número.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Inclua ao menos um caractere especial.';
  return null;
}

export function generateTemporaryPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const nums = '23456789';
  const special = '!@#$%&*';
  const all = upper + lower + nums + special;
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const pick = (chars: string, i: number) => chars[bytes[i] % chars.length];
  const required = [pick(upper,0), pick(lower,1), pick(nums,2), pick(special,3)];
  for (let i = 4; i < 14; i += 1) required.push(pick(all,i));
  return required.sort((a,b) => (a.charCodeAt(0) + bytes[(a.charCodeAt(0)+b.charCodeAt(0)) % bytes.length]) - (b.charCodeAt(0) + bytes[(b.charCodeAt(0)+a.charCodeAt(0)) % bytes.length])).join('');
}
