import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorize } from '../../../db/authorize.js';

// /api/db/emprestimos/[id]
// DELETE -> exclui um empréstimo pelo id (somente ADMIN)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await authorize(req, { roles: ['ADMIN'] });
  if (!auth.ok) return res.status(auth.status ?? 503).json({ error: auth.error });

  const id = typeof req.query.id === 'string' ? req.query.id.trim() : '';
  if (!id) {
    return res.status(400).json({ error: 'Identificador do empréstimo é obrigatório.' });
  }

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const { isDbAvailable, deleteEmprestimoDb } = await import('../../../db/dbService.js');
    if (!(await isDbAvailable())) {
      return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
    }
    await deleteEmprestimoDb(id);
    return res.json({ status: 'success' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || String(error) });
  }
}