# SISPAT Public 3.1

Sistema de controle patrimonial, inventário, auditoria, empréstimos e manutenção de bens.

## O que muda na versão 3.1

Esta versão foi preparada para uso **a partir de uma base vazia**. Nenhum patrimônio, valor, fornecedor, nota fiscal, local, responsável, manutenção, empréstimo, setor ou usuário de demonstração é carregado automaticamente.

O administrador pode:

- cadastrar patrimônios do zero;
- informar manualmente os valores financeiros;
- editar todos os campos do patrimônio;
- excluir patrimônio definitivamente;
- cadastrar, editar e excluir manutenções;
- cadastrar, editar e excluir empréstimos;
- cadastrar, editar, ativar, desativar e excluir usuários;
- cadastrar, editar e excluir setores;
- zerar completamente a base operacional pelo botão **Zerar**;
- manter somente o acesso administrativo depois de zerar o sistema.

## Primeiro acesso

- Login: `admin`
- Senha temporária: `Admin#2026!SisPat`

No primeiro acesso o sistema exige a troca da senha temporária.

## Instalação

Requisitos:

- Node.js 20 ou superior
- npm

No Windows/PowerShell:

```powershell
npm ci
npm run dev
```

Depois abra:

`http://localhost:3000`

> O ZIP não inclui `node_modules`. Isso evita incompatibilidade de binários entre Windows, Linux e outros ambientes.

## Cadastro patrimonial completo

O formulário individual permite informar manualmente:

- tombo;
- código de barras;
- conteúdo do QR Code;
- descrição;
- categoria;
- marca;
- modelo;
- número de série;
- fornecedor;
- nota fiscal;
- data de aquisição;
- valor de aquisição;
- valor residual;
- taxa de depreciação;
- vida útil;
- garantia;
- bloco;
- laboratório/recinto;
- sala;
- setor;
- centro de custo;
- responsável;
- CPF/identificação;
- estado de conservação;
- situação;
- observações;
- URL da imagem.

Campos não obrigatórios podem permanecer vazios e serem preenchidos depois.

## Zerar sistema

O botão **Zerar**, visível para o perfil ADMIN, exige duas confirmações. Ele remove:

- patrimônios;
- movimentações;
- manutenções;
- empréstimos;
- inventários e histórico;
- setores;
- usuários adicionais;
- logs locais.

O usuário `admin` é mantido para que o sistema continue acessível.

## Segurança

- Senhas locais usam PBKDF2 + SHA-256 com salt individual e 150.000 iterações.
- A senha inicial deve ser alterada no primeiro acesso.
- Operações de exclusão e zeragem são restritas ao ADMIN.
- O pacote não contém arquivo `.env` com segredos.

## Persistência

A versão 3.1 continua funcionando em modo local (`localStorage`) por compatibilidade. Para vários computadores compartilharem a mesma base em tempo real, a migração integral para PostgreSQL ainda é a próxima etapa arquitetural recomendada.
