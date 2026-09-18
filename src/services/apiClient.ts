import type { Patrimonio, Emprestimo, Manutencao, Movimentacao, InventarioSessao, AuditLog, UserAccount, UserProfile, UserRole, SectorItem } from '../types';

// Cliente HTTP da API central (JWT). O token é mantido em sessionStorage
// (dados de sessão — permitido). Nenhum dado de negócio é gravado
// localmente; o Neon é a única fonte de verdade.

export const TOKEN_KEY = 'sispat_jwt_token_v40';
export const API_BASE = '';

export type PublicUser = Omit<UserAccount, 'passwordHash'>;

export class ApiRequestError extends Error {
  status?: number;
  tipo: 'offline' | 'http' | 'network';
  constructor(message: string, tipo: 'offline' | 'http' | 'network', status?: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.tipo = tipo;
    this.status = status;
  }
}

export function getAuthToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export function clearAuthToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean; timeoutMs?: number } = {}
): Promise<T> {
  if (!isOnline()) {
    throw new ApiRequestError('Sem conexão com a internet.', 'offline');
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 8000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.auth !== false) {
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ApiRequestError('A API central demorou para responder.', 'network');
    }
    throw new ApiRequestError('Falha de rede ao acessar a API central.', 'network');
  } finally {
    clearTimeout(timer);
  }

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    const message =
      json && typeof json.error === 'string' ? json.error : `Erro HTTP ${response.status} na API central.`;
    throw new ApiRequestError(message, 'http', response.status);
  }

  return json as T;
}

export type ApiLoginResponse = {
  token: string;
  expiresIn: number;
  user: UserProfile;
  forcePasswordChange: boolean;
};

export async function apiLogin(
  loginOrEmailOrCpf: string,
  password: string
): Promise<ApiLoginResponse> {
  return apiRequest<ApiLoginResponse>('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: { loginOrEmailOrCpf, password },
  });
}

export async function apiMe(): Promise<{ user: UserProfile }> {
  return apiRequest<{ user: UserProfile }>('/api/auth/me');
}

export async function apiChangePassword(password: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>('/api/auth/change-password', {
    method: 'POST',
    body: { password },
  });
}

export async function apiListUsers(): Promise<{ users: PublicUser[] }> {
  return apiRequest<{ users: PublicUser[] }>('/api/auth/users');
}

export async function apiCreateUser(data: Partial<UserAccount>): Promise<{ user: PublicUser; tempPassword: string }> {
  return apiRequest<{ user: PublicUser; tempPassword: string }>('/api/auth/users', {
    method: 'POST',
    body: data,
  });
}

export async function apiUpdateUser(id: string, data: Partial<UserAccount>): Promise<{ user: PublicUser }> {
  return apiRequest<{ user: PublicUser }>(`/api/auth/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: data,
  });
}

export async function apiDeleteUser(id: string): Promise<{ status: string }> {
  return apiRequest<{ status: string }>(`/api/auth/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function apiResetUserPassword(id: string): Promise<{ tempPassword: string }> {
  return apiRequest<{ tempPassword: string }>(
    `/api/auth/users/${encodeURIComponent(id)}/reset-password`,
    { method: 'PUT' }
  );
}

// --- PATRIMÔNIOS (fonte central única: PostgreSQL/Neon) ---
// Nenhum patrimônio é gravado em localStorage/IndexedDB nesta etapa. A lista em
// memória é alimentada exclusivamente por estas chamadas à API central.

export async function apiGetPatrimonios(): Promise<{ patrimonios: Patrimonio[] }> {
  return apiRequest<{ patrimonios: Patrimonio[] }>('/api/db/patrimonios');
}

export async function apiSavePatrimonio(patrimonio: Patrimonio): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/api/db/patrimonios', {
    method: 'POST',
    body: patrimonio,
  });
}

export async function apiDeletePatrimonio(id: string): Promise<{ status: string }> {
  return apiRequest<{ status: string }>(`/api/db/patrimonios/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// --- EMPRÉSTIMOS (fonte central única: PostgreSQL/Neon) ---
// Assim como patrimônios, os empréstimos são centralizados: a lista em memória
// é alimentada exclusivamente por estas chamadas à API central.

export async function apiGetEmprestimos(): Promise<{ emprestimos: Emprestimo[] }> {
  return apiRequest<{ emprestimos: Emprestimo[] }>('/api/db/emprestimos');
}

export async function apiSaveEmprestimo(emprestimo: Emprestimo): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/api/db/emprestimos', {
    method: 'POST',
    body: emprestimo,
  });
}

export async function apiDeleteEmprestimo(id: string): Promise<{ status: string }> {
  return apiRequest<{ status: string }>(`/api/db/emprestimos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// --- MANUTENÇÕES (fonte central única: PostgreSQL/Neon) ---

export async function apiGetManutencoes(): Promise<{ manutencoes: Manutencao[] }> {
  return apiRequest<{ manutencoes: Manutencao[] }>('/api/db/manutencoes');
}

export async function apiSaveManutencao(manutencao: Manutencao): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/api/db/manutencoes', {
    method: 'POST',
    body: manutencao,
  });
}

export async function apiDeleteManutencao(id: string): Promise<{ status: string }> {
  return apiRequest<{ status: string }>(`/api/db/manutencoes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// --- SETORES (fonte única central: PostgreSQL/Neon) ---
// Leitura e gravação central; nenhum setor é espelhado/gravado localmente.

export async function apiGetSectors(): Promise<{ sectors: SectorItem[] }> {
  return apiRequest<{ sectors: SectorItem[] }>('/api/db/sectors');
}

export async function apiSaveSector(sector: SectorItem): Promise<{ sector: SectorItem }> {
  return apiRequest<{ sector: SectorItem }>('/api/db/sectors', {
    method: 'POST',
    body: sector,
  });
}

export async function apiDeleteSector(id: string): Promise<{ status: string }> {
  return apiRequest<{ status: string }>(`/api/db/sectors/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// --- MOVIMENTAÇÕES (fonte central única: PostgreSQL/Neon) ---
// Rastreabilidade de transferências/cadastros/baixas é gravada exclusivamente
// no banco central; nenhuma movimentação usa localStorage/IndexedDB.

export async function apiGetMovimentacoes(): Promise<{ movimentacoes: Movimentacao[] }> {
  return apiRequest<{ movimentacoes: Movimentacao[] }>('/api/db/movimentacoes');
}

export async function apiSaveMovimentacao(movimentacao: Movimentacao): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/api/db/movimentacoes', {
    method: 'POST',
    body: movimentacao,
  });
}

export async function apiDeleteMovimentacao(id: string): Promise<{ status: string }> {
  return apiRequest<{ status: string }>(`/api/db/movimentacoes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function apiDeleteMovimentacoesByPatrimonio(patrimonioId: string): Promise<{ status: string }> {
  const params = new URLSearchParams({ patrimonioId });
  return apiRequest<{ status: string }>(`/api/db/movimentacoes?${params.toString()}`, {
    method: 'DELETE',
  });
}

// --- INVENTÁRIOS / CONFERÊNCIAS (fonte central única: PostgreSQL/Neon) ---
// Sessões de inventário e histórico vivem exclusivamente no banco central.

export async function apiGetInventarios(): Promise<{ inventarios: InventarioSessao[] }> {
  return apiRequest<{ inventarios: InventarioSessao[] }>('/api/db/inventarios');
}

export async function apiSaveInventario(inventario: InventarioSessao): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/api/db/inventarios', {
    method: 'POST',
    body: inventario,
  });
}

export async function apiDeleteInventario(id: string): Promise<{ status: string }> {
  return apiRequest<{ status: string }>(`/api/db/inventarios/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// --- AUDITORIA / TRILHA (fonte central única: PostgreSQL/Neon) ---
// Os logs são gravados no banco central; a leitura é restrita a perfis com
// canViewAudit (ADMIN, GESTOR, AUDITOR).

export async function apiGetAuditLogs(): Promise<{ auditLogs: AuditLog[] }> {
  return apiRequest<{ auditLogs: AuditLog[] }>('/api/db/audit-logs');
}

export async function apiSaveAuditLog(log: AuditLog): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/api/db/audit-logs', {
    method: 'POST',
    body: log,
  });
}

export async function apiDeleteAuditLog(id: string): Promise<{ status: string }> {
  return apiRequest<{ status: string }>(`/api/db/audit-logs/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// Converte uma falha da API central em mensagem compreensível ao usuário.
export function userFacingApiError(err: unknown): string {
  if (err instanceof ApiRequestError) {
    if (err.tipo === 'offline') {
      return 'Sem conexão com a internet. Operação bloqueada no momento.';
    }
    if (err.tipo === 'network') {
      return 'Banco central indisponível. Operação não concluída — tente novamente em instantes.';
    }
    switch (err.status) {
      case 401:
        return 'Sessão expirada ou inválida. Entre novamente com sua conta.';
      case 403:
        return 'Acesso negado: você não possui permissão para esta ação.';
      case 409:
        return err.message || 'Já existe um patrimônio com este tombo/código de barras/QR Code.';
      case 503:
        return 'Banco central indisponível. Operação não concluída — tente novamente em instantes.';
      default:
        return err.message || 'Erro inesperado ao acessar o banco central.';
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Erro inesperado ao acessar o banco central.';
}

// Utilitário de consulta: mantém os perfis locais sincronizados com o centra
// sempre que o usuário central se autentica.
export function buildProfileFromUser(user: PublicUser | UserProfile): UserProfile {
  return {
    id: user.id,
    role: user.role as UserRole,
    name: (user as PublicUser).nomeCompleto || (user as UserProfile).name,
    email: user.email,
    cpf: user.cpf,
    matricula: user.matricula,
    setor: user.setor,
    cargo: user.cargo,
    telefone: user.telefone,
    situacao: user.situacao,
    login: user.login,
    forcePasswordChange: user.forcePasswordChange,
  };
}