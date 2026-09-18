import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorize } from '../../../src/db/authorize';
import { validateMovimentacaoPayload } from '../../../src/db/validation';
import type { Movimentacao } from '../../../src/types';

// /api/db/movimentacoes
// GET    -> lista todas as movimentações (qualquer usuário autenticado/ativo)
// POST   -> cria/atualiza (upsert) uma movimentação (ações de patrimônio/inventário/empréstimo/manutenção)
// PUT    -> cria/atualiza (upsert) uma movimentação
// DELETE -> exclui em lote as movimentações de um patrimônio (?patrimonioId=...), somente ADMIN
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'DELETE') {
    const auth = await authorize(req, { roles: ['ADMIN'] });
    if (!auth.ok) return res.status(auth.status ?? 503).json({ error: auth.error });
  } else if (req.method === 'POST' || req.method === 'PUT') {
    const auth = await authorize(req, {
      permissions: ['canCreateAsset', 'canEditAsset', 'canDeleteAsset', 'canPerformInventory', 'canManageLoans', 'canManageMaintenance'],
    });
    if (!auth.ok) return res.status(auth.status ?? 503).json({ error: auth.error });
  } else {
    const auth = await authorize(req);
    if (!auth.ok) return res.status(auth.status ?? 503).json({ error: auth.error });
  }

  if (req.method === 'GET') {
    try {
      const { isDbAvailable, getAllMovimentacoesDb } = await import('../../../src/db/dbService');
      if (!(await isDbAvailable())) return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
      const items = await getAllMovimentacoesDb();
      return res.json({ movimentacoes: items });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || String(error) });
    }
  }

  if (req.method === 'DELETE') {
    const patrimonioId = typeof req.query.patrimonioId === 'string' ? req.query.patrimonioId.trim() : '';
    if (!patrimonioId) {
      return res.status(400).json({ error: 'O parâmetro patrimonioId é obrigatório para exclusão em lote.' });
    }
    try {
      const { isDbAvailable, deleteMovimentacoesByPatrimonioDb } = await import('../../../src/db/dbService');
      if (!(await isDbAvailable())) return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
      await deleteMovimentacoesByPatrimonioDb(patrimonioId);
      return res.json({ status: 'success' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || String(error) });
    }
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const validated = validateMovimentacaoPayload(req.body);
    if (!validated.ok || !validated.data) {
      return res.status(400).json({ error: 'Dados inválidos.', details: validated.errors ?? [] });
    }
    try {
      const { isDbAvailable, upsertMovimentacaoDb } = await import('../../../src/db/dbService');
      if (!(await isDbAvailable())) return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
      await upsertMovimentacaoDb(validated.data as Movimentacao);
      return res.json({ status: 'success' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || String(error) });
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT, DELETE');
  return res.status(405).json({ error: 'Método não permitido.' });
}