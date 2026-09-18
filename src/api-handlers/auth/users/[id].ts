import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorize } from '../../../db/authorize.js';
import type { UserAccount, UserRole } from '../../../types';
import { publicUserOf } from './index.js';

const ALLOWED_ROLES: UserRole[] = ['ADMIN', 'GESTOR', 'AUDITOR', 'OPERADOR', 'CONSULTOR', 'SERVIDOR', 'PROFESSOR', 'TECNICO'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await authorize(req, { roles: ['ADMIN'] });
  if (!auth.ok) return res.status(auth.status ?? 503).json({ error: auth.error });

  const id = typeof req.query.id === 'string' ? req.query.id.trim() : '';
  if (!id) return res.status(400).json({ error: 'Identificador do usuário é obrigatório.' });

  if (req.method === 'DELETE') {
    try {
      const { isDbAvailable, listUsersDb, deleteUserDb } = await import('../../../db/dbService.js');
      if (!(await isDbAvailable())) {
        return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
      }
      const all = await listUsersDb();
      const target = all.find(u => u.id === id);
      if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });
      if (target.role === 'ADMIN') {
        const activeAdmins = all.filter(u => u.role === 'ADMIN' && u.id !== id && u.situacao === 'Ativo');
        if (activeAdmins.length === 0) {
          return res.status(400).json({ error: 'Não é possível excluir o único Administrador Geral do sistema.' });
        }
      }
      await deleteUserDb(id);
      return res.json({ status: 'success' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || String(error) });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { isDbAvailable, listUsersDb, upsertUserDb } = await import('../../../db/dbService.js');
      if (!(await isDbAvailable())) {
        return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
      }
      const all = await listUsersDb();
      const account = all.find(u => u.id === id);
      if (!account) return res.status(404).json({ error: 'Usuário não encontrado.' });

      const body = (req.body || {}) as Record<string, unknown>;
      const newRole = ALLOWED_ROLES.includes(body.role as UserRole) ? (body.role as UserRole) : account.role;
      const newSituacao = body.situacao === 'Ativo' || body.situacao === 'Inativo' || body.situacao === 'Bloqueado'
        ? (body.situacao as UserAccount['situacao'])
        : account.situacao;

      if (account.role === 'ADMIN' && (newRole !== 'ADMIN' || newSituacao !== 'Ativo')) {
        const activeAdmins = all.filter(u => u.role === 'ADMIN' && u.situacao === 'Ativo');
        if (activeAdmins.length <= 1) {
          return res.status(400).json({ error: 'Operação negada: O sistema não pode ficar sem nenhum Administrador Geral ativo.' });
        }
      }

      const updated: UserAccount = {
        ...account,
        nomeCompleto: typeof body.nomeCompleto === 'string' ? body.nomeCompleto : account.nomeCompleto,
        cpf: typeof body.cpf === 'string' ? body.cpf : account.cpf,
        matricula: typeof body.matricula === 'string' ? body.matricula : account.matricula,
        email: typeof body.email === 'string' ? body.email : account.email,
        telefone: typeof body.telefone === 'string' ? body.telefone : account.telefone,
        cargo: typeof body.cargo === 'string' ? body.cargo : account.cargo,
        setor: typeof body.setor === 'string' ? body.setor : account.setor,
        role: newRole,
        situacao: newSituacao,
      };

      await upsertUserDb(updated);
      return res.json({ user: publicUserOf(updated) });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || String(error) });
    }
  }

  res.setHeader('Allow', 'PUT, DELETE');
  return res.status(405).json({ error: 'Método não permitido.' });
}