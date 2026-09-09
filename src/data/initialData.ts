import {
  Patrimonio,
  Movimentacao,
  Manutencao,
  Emprestimo,
  AuditLog,
  InventarioSessao,
} from '../types';

// A versão 3.1 inicia SEM dados demonstrativos.
// O administrador cadastra a base patrimonial real do zero.
export const INITIAL_PATRIMONIOS: Patrimonio[] = [];
export const INITIAL_MOVIMENTACOES: Movimentacao[] = [];
export const INITIAL_MANUTENCOES: Manutencao[] = [];
export const INITIAL_EMPRESTIMOS: Emprestimo[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export const INITIAL_INVENTARIO_SESSAO: InventarioSessao = {
  id: 'inv-vazio',
  titulo: '',
  bloco: '',
  laboratorio: '',
  sala: '',
  dataInicio: '',
  dataFim: null,
  responsavelSessao: '',
  totalEsperado: 0,
  totalEncontrados: 0,
  encontradosIds: [],
  pendentesIds: [],
  divergencias: [],
  status: 'Pausado',
};
