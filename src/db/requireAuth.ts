import { checkApiKey } from './apiKey.js';
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

// Autentica requisições da API:
// 1. Se houver JWT Bearer válido -> autorizado (carrega usuário no payload).
// 2. Senão, aceita o padrão legado x-sispat-api-key (03/Etapa 1) para
//    compatibilidade com o desktop/server.ts.
// 3. Em desenvolvimento, sem qualquer credencial configurada, libera (igual
//    ao comportamento original do server.ts).
export function requireAuth(req: AuthInput): AuthResult {
  const authHeader = req.headers['authorization'];
  const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;

  if (raw && raw.startsWith('Bearer ')) {
    const token = raw.slice('Bearer '.length).trim();
    const payload = verifyToken(token);
    if (!payload) {
      return { ok: false, status: 401, error: 'Token inválido ou expirado.' };
    }
    return { ok: true, user: { id: payload.sub, login: payload.login, role: payload.role } };
  }

  return checkApiKey(req);
}