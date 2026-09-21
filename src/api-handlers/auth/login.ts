import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyPasswordNode, hashPasswordNode } from '../../db/password.js';
import { createToken } from '../../db/jwt.js';
import type { UserAccount, UserProfile } from '../../types';

function toUserProfile(account: UserAccount): UserProfile {
  return {
    id: account.id,
    role: account.role,
    name: account.nomeCompleto,
    email: account.email,
    cpf: account.cpf,
    matricula: account.matricula,
    setor: account.setor,
    cargo: account.cargo,
    telefone: account.telefone,
    situacao: account.situacao,
    login: account.login,
    forcePasswordChange: account.forcePasswordChange,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const identifier = typeof req.body?.loginOrEmailOrCpf === 'string' ? req.body.loginOrEmailOrCpf.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Informe usuário e senha.' });
  }

  try {
    const { isDbAvailable, listUsersDb, upsertUserDb } = await import('../../db/dbService.js');
    if (!(await isDbAvailable())) {
      return res.status(503).json({ error: 'PostgreSQL indisponível no momento.' });
    }

    let all: UserAccount[];
    try {
      all = await listUsersDb();
    } catch (dbError: any) {
      const nestedCode = dbError?.cause?.code || dbError?.code;
      const nestedMessage = `${dbError?.cause?.message || ''} ${dbError?.message || ''}`;
      if (nestedCode === '42P01' || /does not exist/.test(nestedMessage)) {
        return res.status(503).json({
          error: 'Autenticação central ainda não inicializada. Aplique a migration de usuários (db:migrate).',
        });
      }
      throw dbError;
    }

    const cleanInput = identifier.toLowerCase();
    const cleanDigits = identifier.replace(/\D/g, '');
    const account = all.find(
      u =>
        u.login.toLowerCase() === cleanInput ||
        u.email.toLowerCase() === cleanInput ||
        (cleanDigits.length > 5 && u.cpf.replace(/\D/g, '') === cleanDigits)
    );

    if (!account) {
      return res.status(401).json({
        error: 'Usuário não encontrado. Entre em contato com o Administrador Geral do SISPAT para cadastramento de conta.',
      });
    }
    if (account.situacao === 'Inativo') {
      return res.status(403).json({ error: 'Conta inativa. Entre em contato com o Administrador Geral para ativá-la.' });
    }
    if (account.situacao === 'Bloqueado') {
      return res.status(403).json({ error: 'Conta bloqueada por motivos de segurança. Contate o Administrador Geral para desbloqueio.' });
    }

    const check = verifyPasswordNode(password, account.passwordHash);
    if (check.needsMigration) {
      // Re-hash automático no formato atual. O campo force_password_change não
      // bloqueia o login normal — a senha digitada continua autenticando.
      account.passwordHash = hashPasswordNode(password);
    }

    if (!check.valid) {
      account.tentativasInvalidas = (account.tentativasInvalidas || 0) + 1;
      if (account.tentativasInvalidas >= 5) account.situacao = 'Bloqueado';
      await upsertUserDb(account);
      const message = account.situacao === 'Bloqueado'
        ? 'Conta bloqueada por exceder 5 tentativas com senha inválida. Solicite desbloqueio ao Administrador Geral.'
        : `Senha incorreta. (${account.tentativasInvalidas}/5 tentativas).`;
      return res.status(401).json({ error: message });
    }

    account.tentativasInvalidas = 0;
    account.ultimoAcesso = new Date().toISOString();
    await upsertUserDb(account);

    const tokenResult = createToken({ id: account.id, login: account.login, role: account.role });
    if (!tokenResult) {
      return res.status(503).json({ error: 'JWT_SECRET não configurada no servidor.' });
    }

    return res.json({
      token: tokenResult.token,
      expiresIn: tokenResult.expiresIn,
      user: toUserProfile(account),
      forcePasswordChange: account.forcePasswordChange,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || String(error) });
  }
}