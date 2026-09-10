# Deploy no Vercel (SISPAT Public)

O SISPAT é publicado no Vercel como uma aplicação React/Vite estática. Os dados operacionais desta versão continuam no navegador de cada usuário, via IndexedDB e localStorage.

## Configuração

1. Envie esta pasta para um repositório GitHub, GitLab ou Bitbucket.
2. No Vercel, importe o repositório.
3. Mantenha as configurações detectadas:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Clique em **Deploy**.

O arquivo `vercel.json` já direciona qualquer URL da interface para `index.html`, evitando erro 404 ao atualizar uma página interna.

## Importante sobre os dados

Não configure `DATABASE_URL`, `SISPAT_API_KEY` ou `GEMINI_API_KEY` para este deploy estático: elas pertencem ao servidor local/desktop e não são usadas pela interface publicada. O Vercel não inicia o `server.ts` desta versão.

Cada navegador terá sua própria base local. Para uma base única e compartilhada entre computadores, será necessária uma próxima etapa de migração do armazenamento local para um banco de dados e uma API autenticada.
