import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));

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
      database: active ? "Cloud SQL (PostgreSQL) Connected" : "Local Storage (Fallback)",
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    });
  } catch (error: any) {
    return res.json({
      status: "ok",
      database: "Local Storage (Fallback)",
      error: error.message,
    });
  }
});

app.get("/api/db/patrimonios", async (_req, res) => {
  try {
    const { isDbAvailable, getAllPatrimoniosDb } = await import("./src/db/dbService");
    if (!(await isDbAvailable())) {
      return res.status(503).json({ error: "Cloud SQL indisponível no momento" });
    }
    const items = await getAllPatrimoniosDb();
    return res.json({ patrimonios: items });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/db/patrimonios", async (req, res) => {
  try {
    const { isDbAvailable, upsertPatrimonioDb } = await import("./src/db/dbService");
    if (!(await isDbAvailable())) {
      return res.status(503).json({ error: "Cloud SQL indisponível" });
    }
    await upsertPatrimonioDb(req.body);
    return res.json({ status: "success" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// AI Audit Assistant endpoint
app.post("/api/ai/assistant", async (req, res) => {
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
