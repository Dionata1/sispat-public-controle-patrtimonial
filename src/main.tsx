import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { initDesktopDatabase } from './services/desktopPersistence.ts';
import './index.css';

async function bootstrap() {
  // Purga (best-effort) do banco IndexedDB legado que espelhava chaves
  // sispat_* da fase local. O SISPAT é 100% centralizado no PostgreSQL (Neon):
  // nenhum dado de negócio é persistido em IndexedDB/localStorage nesta versão.
  try {
    await initDesktopDatabase();
  } catch (error) {
    console.error('Falha ao limpar banco local legado do SISPAT:', error);
  }

  // Etapa 3/4: as chaves legadas de patrimônios, empréstimos e manutenções
  // (sispat_patrimonios_v40, sispat_emprestimos_v40, sispat_manutencoes_v40)
  // são removidas automaticamente pelo StorageService SOMENTE após a primeira
  // carga bem-sucedida vinda do banco central (Neon). Nada é apagado aqui para
  // evitar perda de dados caso o banco central esteja indisponível no primeiro
  // carregamento.

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

void bootstrap();
