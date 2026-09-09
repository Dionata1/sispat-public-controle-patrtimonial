import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { initDesktopDatabase } from './services/desktopPersistence.ts';
import './index.css';

async function bootstrap() {
  try {
    await initDesktopDatabase();
  } catch (error) {
    console.error('Falha ao inicializar banco local do SISPAT:', error);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

void bootstrap();
