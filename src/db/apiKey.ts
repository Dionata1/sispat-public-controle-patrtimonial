type KeyCheckInput = {
  headers: { [key: string]: string | string[] | undefined };
};

export type KeyCheckResult = {
  ok: boolean;
  status?: number;
  error?: string;
};

// Mesmo comportamento do middleware requireInternalApiKey do server.ts:
// em desenvolvimento, sem SISPAT_API_KEY configurada, libera o acesso.
export function checkApiKey(req: KeyCheckInput): KeyCheckResult {
  const expected = process.env.SISPAT_API_KEY;
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, status: 503, error: "SISPAT_API_KEY não configurada no servidor." };
    }
    return { ok: true };
  }
  const raw = req.headers["x-sispat-api-key"];
  const provided = Array.isArray(raw) ? raw[0] : raw;
  if (!provided || provided !== expected) {
    return { ok: false, status: 401, error: "Credencial interna inválida." };
  }
  return { ok: true };
}