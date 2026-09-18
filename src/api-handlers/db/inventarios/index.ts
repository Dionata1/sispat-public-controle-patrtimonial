import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorize } from '../../../db/authorize.js';
import { validateInventarioPayload } from '../../../db/validation.js';
import type { InventarioSessao } from '../../../types';

// /api/db/inventarios
// GET  -> lista todas as sessões de inventário (qualquer usuário autenticado/ativo)
// POST -> cria/atualiza (upsert) uma sessão (somente perfis com permissão de inventário)
// PUT  -> cria/atualiza (upsert) uma sessão
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST' || req.method === 'PUT') {
    const auth = await authorize(req, { permission: 'canPerformInventory' });
    if (!auth.ok) return res.status(auth.status ?? 503).json({ error: auth.error });
  } else {
    const auth = await authorize(req);
    if (!auth.ok) return res.status(auth.status ?? 503).json({ error: auth.error });
  }

  if (req.method === 'GET') {
    try {
      const { isDbAvailable, getAllInventariosDb } = await import('../../../db/dbService.js');
      if (!(await isDbAvailable())) return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
      const items = await getAllInventariosDb();
      return res.json({ inventarios: items });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || String(error) });
    }
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const validated = validateInventarioPayload(req.body);
    if (!validated.ok || !validated.data) {
      return res.status(400).json({ error: 'Dados inválidos.', details: validated.errors ?? [] });
    }
    try {
      const { isDbAvailable, upsertInventarioDb } = await import('../../../db/dbService.js');
      if (!(await isDbAvailable())) return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
      await upsertInventarioDb(validated.data as InventarioSessao);
      return res.json({ status: 'success' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || String(error) });
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT');
  return res.status(405).json({ error: 'Método não permitido.' });
}