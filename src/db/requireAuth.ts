import { verifyToken } from './jwt.js';

export type AuthUser = {
  id: string;
  login: string;
  role: string;
};

export type AuthResult = {
  ok: boolean;
  status?: number;
  error?: string;
  user?: AuthUser;
};

type AuthInput = {
  headers: { [key: string]: string | string[] | undefined };
};

// Autentica requisições da API exclusivamente via JWT Bearer.
// Sem Authorization: Bearer <JWT> válido -> 401 imediato.
// A chave legada SISPAT_API_KEY não é mais aceita neste fluxo
// (apiKey.ts permanece apenas para compatibilidade/documentação legada).
export function requireAuth(req: AuthInput): AuthResult {
  const authHeader = req.headers['authorization'];
  const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;

  if (!raw || !raw.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Autenticação obrigatória: informe um token JWT válido.' };
  }

  const token = raw.slice('Bearer '.length).trim();
  const payload = verifyToken(token);
  if (!payload) {
    return { ok: false, status: 401, error: 'Token inválido ou expirado.' };
  }
  return { ok: true, user: { id: payload.sub, login: payload.login, role: payload.role } };
}
