import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { verifyToken } from "./src/db/jwt";
import loginHandler from "./api/auth/login";
import meHandler from "./api/auth/me";
import changePasswordHandler from "./api/auth/change-password";
import usersHandler from "./api/auth/users/index";
import userByIdHandler from "./api/auth/users/[id]";
import resetUserPasswordHandler from "./api/auth/users/[id]/reset-password";
import patrimoniosHandler from "./api/db/patrimonios/index";
import patrimonioByIdHandler from "./api/db/patrimonios/[id]";
import emprestimosHandler from "./api/db/emprestimos/index";
import emprestimoByIdHandler from "./api/db/emprestimos/[id]";
import manutencoesHandler from "./api/db/manutencoes/index";
import manutencaoByIdHandler from "./api/db/manutencoes/[id]";
import sectorsHandler from "./api/db/sectors/index";
import sectorByIdHandler from "./api/db/sectors/[id]";
import movimentacoesHandler from "./api/db/movimentacoes/index";
import movimentacaoByIdHandler from "./api/db/movimentacoes/[id]";
import inventariosHandler from "./api/db/inventarios/index";
import inventarioByIdHandler from "./api/db/inventarios/[id]";
import auditLogsHandler from "./api/db/audit-logs/index";
import auditLogByIdHandler from "./api/db/audit-logs/[id]";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(self), geolocation=(self)");
  next();
});

const requireInternalApiKey: express.RequestHandler = (req, res, next) => {
  // JWT Bearer (autenticação central) tem prioridade sobre a chave legada.
  const authHeader = req.header("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const payload = verifyToken(authHeader.slice("Bearer ".length).trim());
    if (payload) return next();
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }

  const expected = process.env.SISPAT_API_KEY;
  if (!expected) {
    if (process.env.NODE_ENV === "production") return res.status(503).json({ error: "SISPAT_API_KEY não configurada no servidor." });
    return next();
  }
  const provided = req.header("x-sispat-api-key");
  if (!provided || provided !== expected) return res.status(401).json({ error: "Credencial interna inválida." });
  next();
};

// Mounts a Vercel-style handler (api/*) onto the desktop Express server.
// Usado pelos endpoints de autenticação central (JWT).
const mountApiHandler = (
  method: "get" | "post" | "put" | "delete",
  route: string,
  handler: (req: any, res: any) => Promise<unknown>
) => {
  (app as any)[method](route, async (req: express.Request, res: express.Response) => {
    try {
      const vercelReq = req as express.Request & { query: Record<string, string>; params: Record<string, string> };
      if (vercelReq.params?.id && !vercelReq.query.id) {
        vercelReq.query = { ...vercelReq.query, id: vercelReq.params.id };
      }
      await handler(req, res);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || String(error) });
    }
  });
};

mountApiHandler("post", "/api/auth/login", loginHandler);
mountApiHandler("get", "/api/auth/me", meHandler);
mountApiHandler("post", "/api/auth/change-password", changePasswordHandler);
mountApiHandler("get", "/api/auth/users", usersHandler);
mountApiHandler("post", "/api/auth/users", usersHandler);
mountApiHandler("put", "/api/auth/users/:id", userByIdHandler);
mountApiHandler("delete", "/api/auth/users/:id", userByIdHandler);
mountApiHandler("put", "/api/auth/users/:id/reset-password", resetUserPasswordHandler);
// Patrimônios: mesmos handlers do serverless (Vercel) para comportamento
// idêntico — GET/POST/PUT upsert, DELETE por id, autenticação JWT e 409
// para violação de unicidade (tombo/barras/QR).
mountApiHandler("get", "/api/db/patrimonios", patrimoniosHandler);
mountApiHandler("post", "/api/db/patrimonios", patrimoniosHandler);
mountApiHandler("put", "/api/db/patrimonios", patrimoniosHandler);
mountApiHandler("delete", "/api/db/patrimonios/:id", patrimonioByIdHandler);
// Empréstimos: mesmos handlers do serverless (Vercel) para comportamento
// idêntico — GET/POST/PUT upsert, DELETE por id, autenticação JWT.
mountApiHandler("get", "/api/db/emprestimos", emprestimosHandler);
mountApiHandler("post", "/api/db/emprestimos", emprestimosHandler);
mountApiHandler("put", "/api/db/emprestimos", emprestimosHandler);
mountApiHandler("delete", "/api/db/emprestimos/:id", emprestimoByIdHandler);
// Manutenções: mesmos handlers do serverless (Vercel) para comportamento
// idêntico — GET/POST/PUT upsert, DELETE por id, autenticação JWT.
mountApiHandler("get", "/api/db/manutencoes", manutencoesHandler);
mountApiHandler("post", "/api/db/manutencoes", manutencoesHandler);
mountApiHandler("put", "/api/db/manutencoes", manutencoesHandler);
mountApiHandler("delete", "/api/db/manutencoes/:id", manutencaoByIdHandler);
// Setores: mesmos handlers do serverless (Vercel) — GET para qualquer usuário
// autenticado/ativo, POST/PUT upsert (ADMIN) e DELETE por id (ADMIN), com
// autorização JWT central.
mountApiHandler("get", "/api/db/sectors", sectorsHandler);
mountApiHandler("post", "/api/db/sectors", sectorsHandler);
mountApiHandler("put", "/api/db/sectors", sectorsHandler);
mountApiHandler("delete", "/api/db/sectors/:id", sectorByIdHandler);
// Movimentações: rastreabilidade central (Neon). GET para qualquer usuário
// autenticado/ativo; POST/PUT upsert exigem permissão de patrimônio/inventário/
// empréstimo/manutenção; DELETE por id e DELETE em lote (por patrimonioId) são
// exclusivos de ADMIN.
mountApiHandler("get", "/api/db/movimentacoes", movimentacoesHandler);
mountApiHandler("post", "/api/db/movimentacoes", movimentacoesHandler);
mountApiHandler("put", "/api/db/movimentacoes", movimentacoesHandler);
mountApiHandler("delete", "/api/db/movimentacoes/:id", movimentacaoByIdHandler);
mountApiHandler("delete", "/api/db/movimentacoes", movimentacoesHandler);
// Inventários/conferências: GET para qualquer usuário autenticado/ativo;
// POST/PUT upsert exigem canPerformInventory; DELETE por id é exclusivo de ADMIN.
mountApiHandler("get", "/api/db/inventarios", inventariosHandler);
mountApiHandler("post", "/api/db/inventarios", inventariosHandler);
mountApiHandler("put", "/api/db/inventarios", inventariosHandler);
mountApiHandler("delete", "/api/db/inventarios/:id", inventarioByIdHandler);
// Auditoria: GET restrito a perfis com canViewAudit; POST registra eventos de
// qualquer usuário autenticado/ativo; DELETE por id é exclusivo de ADMIN.
mountApiHandler("get", "/api/db/audit-logs", auditLogsHandler);
mountApiHandler("post", "/api/db/audit-logs", auditLogsHandler);
mountApiHandler("delete", "/api/db/audit-logs/:id", auditLogByIdHandler);

app.get("/api/client-info", (req, res) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || req.socket.remoteAddress || "").split(",")[0].trim();
  res.json({ ip: ip || "não coletado", userAgent: req.header("user-agent") || "" });
});

// Server-side Gemini AI Client initialization
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Database endpoints
app.get("/api/db/health", async (_req, res) => {
  try {
    const { isDbAvailable } = await import("./src/db/dbService");
    const active = await isDbAvailable();
    return res.json({
      status: "ok",
      database: active ? "Cloud SQL (PostgreSQL) Connected" : "PostgreSQL/Neon indisponível — sem fallback local de dados de negócio",
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    });
  } catch (error: any) {
    return res.json({
      status: "ok",
      database: "PostgreSQL/Neon indisponível — sem fallback local de dados de negócio",
      error: error.message,
    });
  }
});

// AI Audit Assistant endpoint
app.post("/api/ai/assistant", requireInternalApiKey, async (req, res) => {
  try {
    const { prompt, contextSummary } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "O prompt é obrigatório." });
    }

    const ai = getAiClient();

    const systemInstruction = `
Você é o Assistente Virtual do SISPAT Public (Sistema de Controle Patrimonial e Auditoria de Institutos e Escolas Técnicas Públicas).
Sua função é auxiliar auditores, gestores patrimoniais e diretores a consultar dados, analisar rastreabilidade, identificar divergências em inventários, calcular depreciações e emitir pareceres de auditoria técnica.

Responda sempre em português do Brasil com linguagem profissional, clara, objetiva e estruturada (use markdown com tópicos em negrito e listas quando apropriado).

Abaixo estão os dados consolidados do patrimônio atual da instituição em tempo real:
${JSON.stringify(contextSummary, null, 2)}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    return res.json({ answer: response.text });
  } catch (error: any) {
    console.error("Erro no assistente de IA:", error);
    return res.status(500).json({
      error: "Falha ao processar consulta de auditoria via IA.",
      details: error.message || String(error),
    });
  }
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "SISPAT Public Backend" });
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      maxAge: '1d',
      etag: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    }));

    app.get("*", (_req, res) => {
      const indexPath = path.join(distPath, "index.html");
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Erro ao servir index.html:', err);
          res.status(404).send('index.html não encontrado');
        }
      });
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`✅ SISPAT Public Server running on http://0.0.0.0:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(err => {
  console.error('❌ Erro ao iniciar servidor:', err);
  process.exit(1);
});
