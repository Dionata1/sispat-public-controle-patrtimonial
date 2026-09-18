import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorize } from '../../../db/authorize';
import { validateManutencaoPayload } from '../../../db/validation';
import type { Manutencao } from '../../../types';

// /api/db/manutencoes
// GET  -> lista todas as manutenções (qualquer usuário autenticado/ativo)
// POST -> cria/atualiza (upsert) uma manutenção (somente perfis com canManageMaintenance)
// PUT  -> cria/atualiza (upsert) uma manutenção (somente perfis com canManageMaintenance)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST' || req.method === 'PUT') {
    const auth = await authorize(req, { permission: 'canManageMaintenance' });
    if (!auth.ok) return res.status(auth.status ?? 503).json({ error: auth.error });
  } else {
    const auth = await authorize(req);
    if (!auth.ok) return res.status(auth.status ?? 503).json({ error: auth.error });
  }

  if (req.method === 'GET') {
    try {
      const { isDbAvailable, getAllManutencoesDb } = await import('../../../db/dbService');
      if (!(await isDbAvailable())) {
        return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
      }
      const items = await getAllManutencoesDb();
      return res.json({ manutencoes: items });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || String(error) });
    }
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const validated = validateManutencaoPayload(req.body);
    if (!validated.ok || !validated.data) {
      return res.status(400).json({ error: 'Dados inválidos.', details: validated.errors ?? [] });
    }
    try {
      const { isDbAvailable, upsertManutencaoDb } = await import('../../../db/dbService');
      if (!(await isDbAvailable())) {
        return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
      }
      await upsertManutencaoDb(validated.data as Manutencao);
      return res.json({ status: 'success' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || String(error) });
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT');
  return res.status(405).json({ error: 'Método não permitido.' });
}