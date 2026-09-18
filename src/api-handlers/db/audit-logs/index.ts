import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authorize } from '../../../db/authorize.js';
import { validateAuditLogPayload } from '../../../db/validation.js';
import type { AuditLog } from '../../../types';

// /api/db/audit-logs
// GET  -> lista todos os logs de auditoria (somente perfis com canViewAudit)
// POST -> grava um log de auditoria (qualquer usuário autenticado/ativo — toda operação registra evento)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const auth = await authorize(req, { permission: 'canViewAudit' });
    if (!auth.ok) return res.status(auth.status ?? 503).json({ error: auth.error });
  } else if (req.method === 'POST') {
    const auth = await authorize(req);
    if (!auth.ok) return res.status(auth.status ?? 503).json({ error: auth.error });
  } else {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  if (req.method === 'GET') {
    try {
      const { isDbAvailable, getAllAuditLogsDb } = await import('../../../db/dbService.js');
      if (!(await isDbAvailable())) return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
      const items = await getAllAuditLogsDb();
      return res.json({ auditLogs: items });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || String(error) });
    }
  }

  if (req.method === 'POST') {
    const validated = validateAuditLogPayload(req.body);
    if (!validated.ok || !validated.data) {
      return res.status(400).json({ error: 'Dados inválidos.', details: validated.errors ?? [] });
    }
    try {
      const { isDbAvailable, insertAuditLogDb } = await import('../../../db/dbService.js');
      if (!(await isDbAvailable())) return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
      await insertAuditLogDb(validated.data as AuditLog);
      return res.json({ status: 'success' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || String(error) });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Método não permitido.' });
}