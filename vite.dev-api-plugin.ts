import type { ServerResponse, IncomingMessage } from 'node:http';
import type { Plugin } from 'vite';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import apiHandler from './api/index.js';

// Middleware de desenvolvimento: intercepta /api/* no Vite (npm run dev) e
// despacha para o MESMO dispatcher de produção (api/index.ts), sem duplicar
// roteamento nem lógica de negócio. É um shim mínimo de VercelRequest/Response.

type NextFn = (err?: unknown) => void;

function respondJson(res: ServerResponse, status: number, headers: Record<string, string>, body: unknown) {
  res.statusCode = status;
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  if (!(headers['Content-Type'] ?? '').startsWith('application/json')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      resolve(undefined);
      return;
    }
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({ rawPayload: raw });
      }
    });
    req.on('error', () => resolve(undefined));
  });
}

async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const rawUrl = req.url ?? '/';
  const pathname = rawUrl.split('?')[0];

  if (pathname === '/api/health') {
    respondJson(res, 200, {}, { status: 'ok', service: 'SISPAT Public Backend' });
    return true;
  }

  if (pathname === '/api/client-info') {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwarded)
      ? forwarded[0]
      : String(forwarded ?? req.socket?.remoteAddress ?? '').split(',')[0].trim();
    respondJson(res, 200, {}, { ip: ip || 'não coletado', userAgent: req.headers['user-agent'] || '' });
    return true;
  }

  const parsedUrl = new URL(rawUrl, 'http://localhost');
  const query: Record<string, string | string[]> = {};
  parsedUrl.searchParams.forEach((value, key) => {
    const current = query[key];
    if (current === undefined) query[key] = value;
    else if (Array.isArray(current)) current.push(value);
    else query[key] = [current, value];
  });

  const body = await readBody(req);

  let responseStatus = 200;
  const headers: Record<string, string> = {};
  const chunks: Buffer[] = [];

  const vercelRes = {
    status(code: number) {
      responseStatus = code;
      return vercelRes;
    },
    setHeader(name: string, value: string | number | string[]) {
      headers[name] = String(value);
      return vercelRes;
    },
    json(payload: unknown) {
      headers['Content-Type'] = headers['Content-Type'] ?? 'application/json; charset=utf-8';
      chunks.push(Buffer.from(JSON.stringify(payload ?? null)));
    },
    send(payload: unknown) {
      if (typeof payload === 'string') chunks.push(Buffer.from(payload));
      else if (payload !== undefined && payload !== null) chunks.push(Buffer.from(JSON.stringify(payload)));
      headers['Content-Type'] = headers['Content-Type'] ?? 'text/plain; charset=utf-8';
    },
  } as unknown as VercelResponse;

  const vercelReq = {
    method: req.method ?? 'GET',
    url: rawUrl,
    headers: req.headers,
    query,
    body,
    cookies: {},
  } as unknown as VercelRequest;

  try {
    await apiHandler(vercelReq, vercelRes);
  } catch (error: any) {
    responseStatus = 500;
    headers['Content-Type'] = 'application/json; charset=utf-8';
    chunks.length = 0;
    chunks.push(Buffer.from(JSON.stringify({ error: error?.message ?? String(error) })));
  }

  if (!res.headersSent) {
    res.statusCode = chunks.length === 0 ? 500 : responseStatus;
    for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  }
  if (chunks.length === 0) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Handler não escreveu resposta.' }));
  } else {
    res.end(Buffer.concat(chunks));
  }
  return true;
}

export function devApiPlugin(): Plugin {
  return {
    name: 'sispat-dev-api',
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: NextFn) => {
        const rawUrl = req.url ?? '/';
        const pathname = rawUrl.split('?')[0];
        if (!pathname.startsWith('/api/')) {
          next();
          return;
        }
        handleApiRequest(req, res).catch((error: any) => {
          respondJson(res, 500, {}, { error: error?.message ?? String(error) });
        });
      });
    },
  };
}