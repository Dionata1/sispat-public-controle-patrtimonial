# Checklist de Configuração e Deploy Vercel (SISPAT)

## Mudanças Efetuadas para Resolução de Erros de Deploy (404 / Port)

- [x] **Porta Dinâmica (`server.ts`)**: Atualizado `const PORT = process.env.PORT || 3000;` para escutar em portas alocadas dinamicamente pela Vercel e Cloud Run.
- [x] **Fallback SPA & Static Cache (`server.ts`)**: Configurado middleware estático Express com cabeçalhos de controle de cache e fallback para `index.html` com tratamento de erro em rotas de navegação direta.
- [x] **Logs de Inicialização (`server.ts`)**: Adicionados logs de ambiente e tratamento `try/catch` na inicialização do servidor.
- [x] **Configuração de Build no Vite (`vite.config.ts`)**: Adicionado bloco `build` especificando `outDir: 'dist'`, hashing de ativos e empacotamento otimizado.
- [x] **Arquivo de Roteamento Vercel (`vercel.json`)**: Criado `vercel.json` (Versão 2) roteando chamadas `/api/*` e `/*` para o bundle Node `dist/server.cjs`.
- [x] **Filtros de Deploy (`.vercelignore`)**: Criado `.vercelignore` para ignorar arquivos desnecessários na esteira de compilação.
- [x] **Scripts do npm (`package.json`)**: Verificados os scripts de `build` (`vite build && esbuild server.ts ...`), `start` e `lint`.

---

## Instruções para Deploy na Vercel

1. **Testar Build Local**:
   ```bash
   npm run build
   NODE_ENV=production PORT=3000 npm start
   ```

2. **Commit e Push para o Repositório**:
   ```bash
   git add .
   git commit -m "fix: configure project for Vercel deployment and SPA fallback"
   git push
   ```

3. **Re-Deploy na Vercel**:
   - Acesse o painel da Vercel.
   - Navegue até o projeto e selecione **Redeploy** na última compilação.
