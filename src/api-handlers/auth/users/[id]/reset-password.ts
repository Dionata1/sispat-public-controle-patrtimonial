import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../../db/requireAuth';
import { generateTemporaryPasswordNode, hashPasswordNode } from '../../../../db/password';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const auth = requireAuth(req);
  if (!auth.ok) return res.status(auth.status ?? 503).json({ error: auth.error });
  if (auth.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao Administrador Geral.' });
  }

  const id = typeof req.query.id === 'string' ? req.query.id.trim() : '';
  if (!id) return res.status(400).json({ error: 'Identificador do usuário é obrigatório.' });

  try {
    const { isDbAvailable, listUsersDb, upsertUserDb } = await import('../../../../db/dbService');
    if (!(await isDbAvailable())) {
      return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
    }
    const all = await listUsersDb();
    const account = all.find(u => u.id === id);
    if (!account) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const tempPassword = generateTemporaryPasswordNode();
    account.passwordHash = await hashPasswordNode(tempPassword);
    account.forcePasswordChange = true;
    account.tentativasInvalidas = 0;
    await upsertUserDb(account);

    return res.json({ tempPassword });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || String(error) });
  }
}