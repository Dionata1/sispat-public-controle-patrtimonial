// ============================================================================
// Persistência local de DADOS DE NEGÓCIO foi DESATIVADA (Etapa 8).
//
// O SISPAT é 100% centralizado no PostgreSQL (Neon): usuários, setores,
// patrimônios, empréstimos, manutenções, movimentações, inventários e a trilha
// de auditoria vivem exclusivamente no banco central. Nenhum cadastro/registro
// de negócio é gravado em IndexedDB ou localStorage.
//
// Este módulo permanece apenas como compatibilidade:
//   - initDesktopDatabase(): purga (best-effort) o banco IndexedDB legado
//     "SISPAT_PUBLIC_DESKTOP", que espelhava chaves sispat_* da fase antiga.
//   - getLocalDatabaseStatus(): reporta que o banco local está desativado.
//   - downloadLocalBackup()/restoreLocalBackup(): sempre bloqueados, pois um
//     backup/restauração local de dados de negócio não existe mais.
//
// Sessão/JWT permanecem em sessionStorage (apiClient) e as chaves de sessão em
// localStorage (SESSION_KEYS) — são dados de sessão, não dados de negócio.
// ============================================================================

const LEGACY_DB_NAME = 'SISPAT_PUBLIC_DESKTOP';

// Remove (best-effort) o banco IndexedDB legado que espelhava chaves sispat_*.
// Nada é lido nem restaurado deles: o Neon é a única fonte de verdade dos dados.
export async function initDesktopDatabase() {
  try {
    if (typeof indexedDB === 'undefined') return;
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(LEGACY_DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  } catch {
    // Purga de legado é best-effort e nunca deve quebrar a inicialização.
  }
}

// Bloqueados: não existe mais backup local de dados de negócio.
export function downloadLocalBackup(): Promise<void> {
  return Promise.reject(
    new Error('Backup local desativado: todos os dados do SISPAT são centralizados no banco Neon (PostgreSQL).')
  );
}

export function restoreLocalBackup(_file: File): Promise<void> {
  return Promise.reject(
    new Error('Restauração local desativada: todos os dados do SISPAT são centralizados no banco Neon (PostgreSQL).')
  );
}

// Relata o estado atual: o banco local está desativado — fonte única é o Neon.
export async function getLocalDatabaseStatus() {
  return {
    connected: false,
    type: 'Banco local desativado — fonte única: Neon (PostgreSQL)',
    entries: 0,
    approxBytes: 0,
    profilePath: '',
  };
}