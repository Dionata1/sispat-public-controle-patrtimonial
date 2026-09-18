import type { VercelRequest, VercelResponse } from '@vercel/node';

// GET /api/db/health — Verificação de disponibilidade do PostgreSQL
// (mantido sem proteção por API key, igual ao server.ts).
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const { isDbAvailable } = await import('../../db/dbService');
    const active = await isDbAvailable();
    return res.json({
      status: 'ok',
      database: active ? 'PostgreSQL Connected' : 'PostgreSQL/Neon indisponível — sem fallback local de dados de negócio',
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    });
  } catch (error: any) {
    return res.json({
      status: 'ok',
      database: 'PostgreSQL/Neon indisponível — sem fallback local de dados de negócio',
      error: error?.message || String(error),
    });
  }
}