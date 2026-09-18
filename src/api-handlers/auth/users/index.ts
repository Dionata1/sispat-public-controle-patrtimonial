import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorize } from '../../../db/authorize.js';
import { generateTemporaryPasswordNode, hashPasswordNode } from '../../../db/password.js';
import type { UserAccount, UserRole } from '../../../types';

const ALLOWED_ROLES: UserRole[] = ['ADMIN', 'GESTOR', 'AUDITOR', 'OPERADOR', 'CONSULTOR', 'SERVIDOR', 'PROFESSOR', 'TECNICO'];
export type PublicUser = Omit<UserAccount, 'passwordHash'>;

export function publicUserOf(account: UserAccount): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = account;
  return publicUser;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await authorize(req, { roles: ['ADMIN'] });
  if (!auth.ok) return res.status(auth.status ?? 503).json({ error: auth.error });

  if (req.method === 'GET') {
    try {
      const { isDbAvailable, listUsersDb } = await import('../../../db/dbService.js');
      if (!(await isDbAvailable())) {
        return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
      }
      const all = await listUsersDb();
      return res.json({ users: all.map(publicUserOf) });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || String(error) });
    }
  }

  if (req.method === 'POST') {
    try {
      const { isDbAvailable, listUsersDb, upsertUserDb } = await import('../../../db/dbService.js');
      if (!(await isDbAvailable())) {
        return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
      }
      const all = await listUsersDb();
      const body = (req.body || {}) as Record<string, unknown>;

      const cleanEmail = String(body.email || '').trim().toLowerCase();
      const cleanCpf = String(body.cpf || '').trim();

      if (all.some(u => u.email.toLowerCase() === cleanEmail && cleanEmail)) {
        return res.status(400).json({ error: `O e-mail institucional "${cleanEmail}" já está cadastrado.` });
      }
      if (cleanCpf && all.some(u => u.cpf.replace(/\D/g, '') === cleanCpf.replace(/\D/g, ''))) {
        return res.status(400).json({ error: `O CPF "${cleanCpf}" já possui um cadastro ativo.` });
      }

      let baseLogin = String(body.login || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
      if (!baseLogin) baseLogin = cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9.]/g, '');
      if (!baseLogin) baseLogin = String(body.nomeCompleto || 'usuario').toLowerCase().split(' ').slice(0, 2).join('.');

      let login = baseLogin;
      let counter = 1;
      while (all.some(u => u.login.toLowerCase() === login.toLowerCase())) {
        login = `${baseLogin}${counter}`;
        counter += 1;
      }

      const tempPassword = generateTemporaryPasswordNode();
      const account: UserAccount = {
        id: 'usr-' + Date.now(),
        login,
        nomeCompleto: String(body.nomeCompleto || '').trim(),
        cpf: cleanCpf,
        matricula: String(body.matricula || '').trim(),
        email: cleanEmail,
        telefone: String(body.telefone || '').trim(),
        cargo: String(body.cargo || '').trim(),
        setor: String(body.setor || '').trim(),
        role: ALLOWED_ROLES.includes(body.role as UserRole) ? (body.role as UserRole) : 'OPERADOR',
        situacao: 'Ativo',
        passwordHash: await hashPasswordNode(tempPassword),
        forcePasswordChange: true,
        dataCriacao: new Date().toISOString(),
      };

      await upsertUserDb(account);
      return res.status(201).json({ user: publicUserOf(account), tempPassword });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || String(error) });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Método não permitido.' });
}