import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorize } from '../../../db/authorize.js';
import { validatePatrimonioPayload } from '../../../db/validation.js';
import type { Patrimonio } from '../../../types';

// Detecta violação de unicidade do PostgreSQL (código 23505) e converte em 409
// com mensagem clara, identificando o campo conflitante pela constraint.
function uniquenessErrorDetail(err: unknown): string | null {
  const raw: any = err;
  const candidate = ((err: any) => {
    for (const e of [err, err?.cause, err?.originalError, err?.inner]) {
      if (e && typeof e === 'object') {
        if (typeof e.code === 'string' && e.code === '23505') return e;
        if (typeof e.message === 'string' && e.message.includes('duplicate key value violates unique constraint')) return e;
      }
    }
    return null;
  })(raw);

  if (!candidate) return null;

  const constraint: string = candidate.constraint || '';
  const detail: string = candidate.detail || candidate.message || '';
  const fieldFromConstraint =
    constraint.includes('codigo_barras') ? 'código de barras' :
    constraint.includes('qr_code') ? 'QR Code' :
    constraint.includes('codigo_patrimonial') ? 'tombo/código patrimonial' : null;
  const match = detail.match(/Key \((.+?)\)=\((.+?)\)/);

  if (fieldFromConstraint && match && match[2]) {
    return `Já existe um patrimônio com o ${fieldFromConstraint} '${match[2]}'.`;
  }
  if (fieldFromConstraint) {
    return `Já existe um patrimônio com este ${fieldFromConstraint}.`;
  }
  if (match) {
    return `Já existe um patrimônio com o mesmo valor para '${match[1]}'.`;
  }
  return 'Já existe um patrimônio com dados duplicados (tombo, código de barras ou QR Code).';
}

// /api/db/patrimonios
// GET  -> lista todos os patrimônios (qualquer usuário autenticado/ativo)
// POST -> cria/atualiza (upsert) um patrimônio (somente perfis com canCreateAsset)
// PUT  -> cria/atualiza (upsert) um patrimônio (somente perfis com canEditAsset)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const auth = await authorize(req, { permission: 'canCreateAsset' });
    if (!auth.ok) return res.status(auth.status ?? 503).json({ error: auth.error });
  } else if (req.method === 'PUT') {
    const auth = await authorize(req, { permission: 'canEditAsset' });
    if (!auth.ok) return res.status(auth.status ?? 503).json({ error: auth.error });
  } else {
    const auth = await authorize(req);
    if (!auth.ok) return res.status(auth.status ?? 503).json({ error: auth.error });
  }

  if (req.method === 'GET') {
    try {
      const { isDbAvailable, getAllPatrimoniosDb } = await import('../../../db/dbService.js');
      if (!(await isDbAvailable())) {
        return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
      }
      const items = await getAllPatrimoniosDb();
      return res.json({ patrimonios: items });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || String(error) });
    }
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const validated = validatePatrimonioPayload(req.body);
    if (!validated.ok || !validated.data) {
      return res.status(400).json({ error: 'Dados inválidos.', details: validated.errors ?? [] });
    }
    try {
      const { isDbAvailable, upsertPatrimonioDb } = await import('../../../db/dbService.js');
      if (!(await isDbAvailable())) {
        return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
      }
      await upsertPatrimonioDb(validated.data as Patrimonio);
      return res.json({ status: 'success' });
    } catch (error: any) {
      const duplicate = uniquenessErrorDetail(error);
      if (duplicate) {
        return res.status(409).json({ error: duplicate });
      }
      return res.status(500).json({ error: error.message || String(error) });
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT');
  return res.status(405).json({ error: 'Método não permitido.' });
}