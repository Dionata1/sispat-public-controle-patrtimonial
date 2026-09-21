import type { VercelRequest, VercelResponse } from '@vercel/node';
import loginHandler from '../src/api-handlers/auth/login.js';
import meHandler from '../src/api-handlers/auth/me.js';
import changePasswordHandler from '../src/api-handlers/auth/change-password.js';
import usersHandler from '../src/api-handlers/auth/users/index.js';
import userByIdHandler from '../src/api-handlers/auth/users/[id].js';
import resetUserPasswordHandler from '../src/api-handlers/auth/users/[id]/reset-password.js';
import healthHandler from '../src/api-handlers/db/health.js';
import patrimoniosHandler from '../src/api-handlers/db/patrimonios/index.js';
import patrimonioByIdHandler from '../src/api-handlers/db/patrimonios/[id].js';
import emprestimosHandler from '../src/api-handlers/db/emprestimos/index.js';
import emprestimoByIdHandler from '../src/api-handlers/db/emprestimos/[id].js';
import manutencoesHandler from '../src/api-handlers/db/manutencoes/index.js';
import manutencaoByIdHandler from '../src/api-handlers/db/manutencoes/[id].js';
import sectorsHandler from '../src/api-handlers/db/sectors/index.js';
import sectorByIdHandler from '../src/api-handlers/db/sectors/[id].js';
import movimentacoesHandler from '../src/api-handlers/db/movimentacoes/index.js';
import movimentacaoByIdHandler from '../src/api-handlers/db/movimentacoes/[id].js';
import inventariosHandler from '../src/api-handlers/db/inventarios/index.js';
import inventarioByIdHandler from '../src/api-handlers/db/inventarios/[id].js';
import auditLogsHandler from '../src/api-handlers/db/audit-logs/index.js';
import auditLogByIdHandler from '../src/api-handlers/db/audit-logs/[id].js';

type ApiHandler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>;

type Route = {
  pattern: string[];
  handler: ApiHandler;
};

type RouteMatch = {
  handler: ApiHandler;
  params: Record<string, string>;
};

type QueryValue = string | string[];

const ROUTES: Route[] = [
  { pattern: ['auth', 'me'], handler: meHandler },
  { pattern: ['auth', 'login'], handler: loginHandler },
  { pattern: ['auth', 'change-password'], handler: changePasswordHandler },
  { pattern: ['auth', 'users'], handler: usersHandler },
  { pattern: ['auth', 'users', ':id'], handler: userByIdHandler },
  { pattern: ['auth', 'users', ':id', 'reset-password'], handler: resetUserPasswordHandler },
  { pattern: ['db', 'health'], handler: healthHandler },
  { pattern: ['db', 'patrimonios'], handler: patrimoniosHandler },
  { pattern: ['db', 'patrimonios', ':id'], handler: patrimonioByIdHandler },
  { pattern: ['db', 'emprestimos'], handler: emprestimosHandler },
  { pattern: ['db', 'emprestimos', ':id'], handler: emprestimoByIdHandler },
  { pattern: ['db', 'manutencoes'], handler: manutencoesHandler },
  { pattern: ['db', 'manutencoes', ':id'], handler: manutencaoByIdHandler },
  { pattern: ['db', 'sectors'], handler: sectorsHandler },
  { pattern: ['db', 'sectors', ':id'], handler: sectorByIdHandler },
  { pattern: ['db', 'movimentacoes'], handler: movimentacoesHandler },
  { pattern: ['db', 'movimentacoes', ':id'], handler: movimentacaoByIdHandler },
  { pattern: ['db', 'inventarios'], handler: inventariosHandler },
  { pattern: ['db', 'inventarios', ':id'], handler: inventarioByIdHandler },
  { pattern: ['db', 'audit-logs'], handler: auditLogsHandler },
  { pattern: ['db', 'audit-logs', ':id'], handler: auditLogByIdHandler },
];

function findRoute(segments: string[]): RouteMatch | null {
  for (const route of ROUTES) {
    if (route.pattern.length !== segments.length) continue;
    const params: Record<string, string> = {};
    let matches = true;
    for (let index = 0; index < route.pattern.length; index++) {
      const expected = route.pattern[index];
      if (expected.startsWith(':')) {
        params[expected.slice(1)] = segments[index];
      } else if (expected !== segments[index]) {
        matches = false;
        break;
      }
    }
    if (matches) return { handler: route.handler, params };
  }
  return null;
}

function collectQuery(
  parsedUrl: URL,
  params: Record<string, string>,
  fallback: Record<string, unknown> | undefined
): Record<string, QueryValue> {
  const query: Record<string, QueryValue> = {};
  parsedUrl.searchParams.forEach((value, key) => {
    const current = query[key];
    if (current === undefined) query[key] = value;
    else if (Array.isArray(current)) current.push(value);
    else query[key] = [current, value];
  });
  for (const [key, value] of Object.entries(params)) {
    if (query[key] === undefined) query[key] = value;
  }
  if (fallback) {
    for (const [key, value] of Object.entries(fallback)) {
      if (value === undefined) continue;
      if (query[key] === undefined) query[key] = value as QueryValue;
    }
  }
  return query;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawUrl = typeof req.url === 'string' && req.url ? req.url : '/api/';
  const parsedUrl = new URL(rawUrl, 'https://internal');
  let segments = parsedUrl.pathname.split('/').filter(Boolean);
  if (segments[0] === 'api') segments = segments.slice(1);

  if (segments.length === 0 || (segments[0] !== 'auth' && segments[0] !== 'db')) {
    const slug = (req.query as Record<string, unknown>).slug;
    if (Array.isArray(slug)) segments = slug as string[];
    else if (typeof slug === 'string') segments = slug.split('/').filter(Boolean);
  }

  const match = findRoute(segments);
  if (!match) {
    return res.status(404).json({ error: 'Rota não encontrada.' });
  }

  const query = collectQuery(parsedUrl, match.params, req.query as Record<string, unknown>);

  const dispatchReq = Object.create(req) as VercelRequest;
  (dispatchReq as { query: unknown }).query = query;

  return match.handler(dispatchReq, res);
}

export { ROUTES, findRoute, collectQuery };