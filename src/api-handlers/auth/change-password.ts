import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../db/requireAuth.js';
import { validatePasswordStrengthNode, verifyPasswordNode, hashPasswordNode } from '../../db/password.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const auth = requireAuth(req);
  if (!auth.ok) return res.status(auth.status ?? 503).json({ error: auth.error });
  if (!auth.user?.id) return res.status(401).json({ error: 'Token inválido.' });

  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!password) {
    return res.status(400).json({ error: 'Informe a nova senha.' });
  }

  const strengthError = validatePasswordStrengthNode(password);
  if (strengthError) return res.status(400).json({ error: strengthError });

  try {
    const { isDbAvailable, listUsersDb, upsertUserDb } = await import('../../db/dbService.js');
    if (!(await isDbAvailable())) {
      return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
    }
    const all = await listUsersDb();
    const account = all.find(u => u.id === auth.user!.id);
    if (!account) return res.status(401).json({ error: 'Usuário não encontrado.' });

    if (verifyPasswordNode(password, account.passwordHash).valid) {
      return res.status(400).json({ error: 'A nova senha não pode ser igual à senha atual.' });
    }

    account.passwordHash = hashPasswordNode(password);
    account.forcePasswordChange = false;
    account.tentativasInvalidas = 0;
    await upsertUserDb(account);

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || String(error) });
  }
}