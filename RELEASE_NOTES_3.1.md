# SISPAT Public 3.1.0 — Notas da versão

## Base limpa

- Removidos os 898 patrimônios de demonstração da inicialização.
- Removidos setores fictícios.
- Removidos usuários fictícios.
- Mantido somente o usuário administrativo necessário para o primeiro acesso.
- Novas chaves de armazenamento `v31` impedem que a base demonstrativa da versão anterior reapareça automaticamente no mesmo navegador.

## Acesso

- Login administrativo alterado para `admin`.
- Nome exibido: `Administrador`.
- Senha temporária inicial: `Admin#2026!SisPat`.
- Troca de senha obrigatória no primeiro acesso.

## Cadastro patrimonial

- Cadastro individual passa a abrir vazio.
- Removidos preenchimentos automáticos de R$ 1.500, fornecedor, NF, datas, local e responsável.
- Todos os campos relevantes passam a ficar visíveis e editáveis.
- Código de barras e QR Code podem ser informados manualmente ou deixados vazios.
- Tombos, códigos de barras e QR Codes informados são validados contra duplicidade.
- Cadastro em lote exige categoria, estado e situação informados pelo usuário; o sistema não inventa esses valores.
- Campos financeiros podem ser cadastrados, alterados, zerados ou removidos.
- Edição permite limpar campos previamente preenchidos.

## Exclusão

- Patrimônio pode ser excluído definitivamente pelo ADMIN.
- A exclusão remove manutenções, empréstimos e movimentações operacionais vinculadas ao bem.
- A situação `Baixado` continua disponível como opção cadastral quando o administrador desejar manter o histórico do bem sem excluí-lo.

## Inventário

- Sessões de inventário podem ser excluídas individualmente pelo ADMIN.
- O botão Zerar também remove a sessão atual e todo o histórico de inventários.

## Manutenção

- Removidos custos, datas, técnicos e laudos pré-preenchidos.
- Inclusão de edição de OS.
- Inclusão de exclusão definitiva de OS.
- Todos os principais dados da OS podem ser alterados manualmente.

## Empréstimos

- Removidos cargo, setor, CPF, datas e observações fictícias.
- Inclusão de edição de empréstimo.
- Inclusão de exclusão definitiva de empréstimo.
- Termo PDF passa a mostrar “Não informado” quando um campo realmente não foi cadastrado.

## Usuários e setores

- Novo usuário pode receber login escolhido pelo administrador.
- Cargo e setor não recebem valores fictícios automaticamente.
- Setor pode ser digitado ou escolhido entre setores já cadastrados.

## Zerar todo o sistema

- Novo botão **Zerar** no cabeçalho para ADMIN.
- Confirmação em duas etapas, incluindo digitação da palavra `ZERAR`.
- Limpa patrimônio, movimentações, manutenção, empréstimos, inventário, histórico, setores, usuários adicionais e logs.
- Mantém somente o acesso `admin` para evitar bloqueio do sistema.

## Validação

- `tsc --noEmit`: aprovado sem erros.
- Pacote final distribuído sem `node_modules`.
