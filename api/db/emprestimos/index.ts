import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorize } from '../../../src/db/authorize';
import { validateEmprestimoPayload } from '../../../src/db/validation';
import type { Emprestimo } from '../../../src/types';

// /api/db/emprestimos
// GET  -> lista todos os empréstimos (qualquer usuário autenticado/ativo)
// POST -> cria/atualiza (upsert) um empréstimo (somente perfis com canManageLoans)
// PUT  -> cria/atualiza (upsert) um empréstimo (somente perfis com canManageLoans)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST' || req.method === 'PUT') {
    const auth = await authorize(req, { permission: 'canManageLoans' });
    if (!auth.ok) return res.status(auth.status ?? 503).json({ error: auth.error });
  } else {
    const auth = await authorize(req);
    if (!auth.ok) return res.status(auth.status ?? 503).json({ error: auth.error });
  }

  if (req.method === 'GET') {
    try {
      const { isDbAvailable, getAllEmprestimosDb } = await import('../../../src/db/dbService');
      if (!(await isDbAvailable())) {
        return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
      }
      const items = await getAllEmprestimosDb();
      return res.json({ emprestimos: items });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || String(error) });
    }
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const validated = validateEmprestimoPayload(req.body);
    if (!validated.ok || !validated.data) {
      return res.status(400).json({ error: 'Dados inválidos.', details: validated.errors ?? [] });
    }
    try {
      const { isDbAvailable, upsertEmprestimoDb } = await import('../../../src/db/dbService');
      if (!(await isDbAvailable())) {
        return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
      }
      await upsertEmprestimoDb(validated.data as Emprestimo);
      return res.json({ status: 'success' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || String(error) });
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT');
  return res.status(405).json({ error: 'Método não permitido.' });
}