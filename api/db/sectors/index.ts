import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorize } from '../../../src/db/authorize';
import type { SectorItem } from '../../../src/types';

// /api/db/sectors
// GET  -> lista todos os setores (qualquer usuário autenticado/ativo)
// POST -> cria/atualiza (upsert) um setor (somente ADMIN)
// PUT  -> cria/atualiza (upsert) um setor (somente ADMIN)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const auth = await authorize(req);
    if (!auth.ok) return res.status(auth.status ?? 503).json({ error: auth.error });
  } else if (req.method === 'POST' || req.method === 'PUT') {
    const auth = await authorize(req, { roles: ['ADMIN'] });
    if (!auth.ok) return res.status(auth.status ?? 503).json({ error: auth.error });
  } else {
    res.setHeader('Allow', 'GET, POST, PUT');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  if (req.method === 'GET') {
    try {
      const { isDbAvailable, getAllSectorsDb } = await import('../../../src/db/dbService');
      if (!(await isDbAvailable())) return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
      const items = await getAllSectorsDb();
      return res.json({ sectors: items });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || String(error) });
    }
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const body = (req.body || {}) as Record<string, unknown>;
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    const sigla = typeof body.sigla === 'string' ? body.sigla.trim() : '';
    const responsavel = typeof body.responsavel === 'string' ? body.responsavel.trim() : '';

    if (!id) return res.status(400).json({ error: 'O campo id é obrigatório.' });
    if (!nome) return res.status(400).json({ error: 'O campo nome é obrigatório.' });
    if (!sigla) return res.status(400).json({ error: 'O campo sigla é obrigatório.' });
    if (!responsavel) return res.status(400).json({ error: 'O campo responsavel é obrigatório.' });

    try {
      const { isDbAvailable, upsertSectorDb } = await import('../../../src/db/dbService');
      if (!(await isDbAvailable())) return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
      const item: SectorItem = {
        id,
        nome,
        sigla,
        responsavel,
        emailContact: typeof body.emailContact === 'string' ? body.emailContact : undefined,
        totalPatrimonios: typeof body.totalPatrimonios === 'number' ? body.totalPatrimonios : undefined,
      };
      await upsertSectorDb(item);
      return res.json({ sector: item });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || String(error) });
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT');
  return res.status(405).json({ error: 'Método não permitido.' });
}