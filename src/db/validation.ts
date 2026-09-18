import type { Patrimonio, Emprestimo, Manutencao, Movimentacao, InventarioSessao, AuditLog, SectorItem } from '../types';

export type ValidationResult<T = Patrimonio> = {
  ok: boolean;
  data?: T;
  errors?: string[];
};

// Campos de texto do patrimônio que, quando ausentes/vazios, devem ser
// persistidos como string vazia (colunas NOT NULL no PostgreSQL).
const TEXT_FIELDS: Array<keyof Patrimonio> = [
  'codigoBarras',
  'qrCode',
  'categoria',
  'marca',
  'modelo',
  'numeroSerie',
  'fornecedor',
  'notaFiscal',
  'dataAquisicao',
  'garantiaVencimento',
  'estadoConservacao',
  'situacao',
  'bloco',
  'laboratorio',
  'sala',
  'setor',
  'centroCusto',
  'responsavelNome',
  'responsavelCpf',
  'observacoes',
  'fotoUrl',
  'dataCadastro',
  'ultimaAtualizacao',
];

export function validatePatrimonioPayload(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['O corpo da requisição deve ser um objeto de patrimônio.'] };
  }

  const raw = body as Record<string, unknown>;
  const errors: string[] = [];

  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const codigoPatrimonial = typeof raw.codigoPatrimonial === 'string' ? raw.codigoPatrimonial.trim() : '';
  const nome = typeof raw.nome === 'string' ? raw.nome.trim() : '';

  if (!id) errors.push('O campo id é obrigatório.');
  if (!codigoPatrimonial) errors.push('O campo codigoPatrimonial é obrigatório.');
  if (!nome) errors.push('O campo nome é obrigatório.');

  if (raw.valor !== undefined && typeof raw.valor !== 'number') {
    errors.push('O campo valor deve ser numérico.');
  }
  if (raw.vidaUtilAnos !== undefined && (typeof raw.vidaUtilAnos !== 'number' || !Number.isInteger(raw.vidaUtilAnos))) {
    errors.push('O campo vidaUtilAnos deve ser um número inteiro.');
  }

  if (errors.length > 0) return { ok: false, errors };

  const data: Record<string, unknown> = { ...raw, id, codigoPatrimonial, nome };

  for (const field of TEXT_FIELDS) {
    const value = data[field];
    data[field] = value === undefined || value === null ? '' : String(value);
  }

  data.valor = typeof raw.valor === 'number' ? raw.valor : 0;
  data.vidaUtilAnos = typeof raw.vidaUtilAnos === 'number' ? raw.vidaUtilAnos : 0;

  return { ok: true, data: data as unknown as Patrimonio };
}

const OR_NULL_TEXT_FIELDS: Array<keyof Emprestimo> = [
  'cpfServidor',
  'cargoServidor',
  'dataDevolucao',
  'assinaturaDigitalUrl',
  'assinaturaIp',
  'assinaturaDataHora',
];

// Campos de texto do empréstimo que, quando ausentes/vazios, devem ser
// persistidos como string vazia (colunas NOT NULL no PostgreSQL).
const EMPRESTIMO_TEXT_FIELDS: Array<keyof Emprestimo> = [
  'patrimonioId',
  'codigoPatrimonial',
  'patrimonioNome',
  'servidorNome',
  'setor',
  'dataRetirada',
  'previsaoDevolucao',
  'status',
  'observacoes',
];

export function validateEmprestimoPayload(body: unknown): ValidationResult<Emprestimo> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['O corpo da requisição deve ser um objeto de empréstimo.'] };
  }

  const raw = body as Record<string, unknown>;
  const errors: string[] = [];

  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const patrimonioId = typeof raw.patrimonioId === 'string' ? raw.patrimonioId.trim() : '';
  const codigoPatrimonial = typeof raw.codigoPatrimonial === 'string' ? raw.codigoPatrimonial.trim() : '';
  const patrimonioNome = typeof raw.patrimonioNome === 'string' ? raw.patrimonioNome.trim() : '';
  const servidorNome = typeof raw.servidorNome === 'string' ? raw.servidorNome.trim() : '';
  const setor = typeof raw.setor === 'string' ? raw.setor.trim() : '';
  const dataRetirada = typeof raw.dataRetirada === 'string' ? raw.dataRetirada.trim() : '';
  const previsaoDevolucao = typeof raw.previsaoDevolucao === 'string' ? raw.previsaoDevolucao.trim() : '';
  const status = typeof raw.status === 'string' ? raw.status.trim() : '';

  if (!id) errors.push('O campo id é obrigatório.');
  if (!patrimonioId) errors.push('O campo patrimonioId é obrigatório.');
  if (!codigoPatrimonial) errors.push('O campo codigoPatrimonial é obrigatório.');
  if (!patrimonioNome) errors.push('O campo patrimonioNome é obrigatório.');
  if (!servidorNome) errors.push('O campo servidorNome é obrigatório.');
  if (!setor) errors.push('O campo setor é obrigatório.');
  if (!dataRetirada) errors.push('O campo dataRetirada é obrigatório.');
  if (!previsaoDevolucao) errors.push('O campo previsaoDevolucao é obrigatório.');
  if (!status) errors.push('O campo status é obrigatório.');

  if (errors.length > 0) return { ok: false, errors };

  const data: Record<string, unknown> = { ...raw, id, patrimonioId, codigoPatrimonial, patrimonioNome, servidorNome, setor, dataRetirada, previsaoDevolucao, status };

  for (const field of EMPRESTIMO_TEXT_FIELDS) {
    const value = data[field];
    data[field] = value === undefined || value === null ? '' : String(value);
  }
  for (const field of OR_NULL_TEXT_FIELDS) {
    const value = data[field];
    data[field] = value === undefined || value === null ? null : String(value).trim() || null;
  }
  data.termoPdfGerado = raw.termoPdfGerado === true;

  return { ok: true, data: data as unknown as Emprestimo };
}

// Campos de texto da manutenção que, quando ausentes/vazios, devem ser
// persistidos como string vazia (colunas NOT NULL no PostgreSQL).
const MANUTENCAO_TEXT_FIELDS: Array<keyof Manutencao> = [
  'patrimonioId',
  'codigoPatrimonial',
  'patrimonioNome',
  'defeito',
  'prioridade',
  'tecnicoEmpresa',
  'dataAbertura',
  'previsaoConclusao',
  'status',
  'laudoTecnico',
];

export function validateManutencaoPayload(body: unknown): ValidationResult<Manutencao> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['O corpo da requisição deve ser um objeto de manutenção.'] };
  }

  const raw = body as Record<string, unknown>;
  const errors: string[] = [];

  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const patrimonioId = typeof raw.patrimonioId === 'string' ? raw.patrimonioId.trim() : '';
  const codigoPatrimonial = typeof raw.codigoPatrimonial === 'string' ? raw.codigoPatrimonial.trim() : '';
  const patrimonioNome = typeof raw.patrimonioNome === 'string' ? raw.patrimonioNome.trim() : '';
  const defeito = typeof raw.defeito === 'string' ? raw.defeito.trim() : '';
  const prioridade = typeof raw.prioridade === 'string' ? raw.prioridade.trim() : '';
  const status = typeof raw.status === 'string' ? raw.status.trim() : '';

  if (!id) errors.push('O campo id é obrigatório.');
  if (!patrimonioId) errors.push('O campo patrimonioId é obrigatório.');
  if (!codigoPatrimonial) errors.push('O campo codigoPatrimonial é obrigatório.');
  if (!patrimonioNome) errors.push('O campo patrimonioNome é obrigatório.');
  if (!defeito) errors.push('O campo defeito é obrigatório.');
  if (!prioridade) errors.push('O campo prioridade é obrigatório.');
  if (!status) errors.push('O campo status é obrigatório.');

  if (raw.custo !== undefined && typeof raw.custo !== 'number') {
    errors.push('O campo custo deve ser numérico.');
  }
  if (raw.garantiaServicoMeses !== undefined && (typeof raw.garantiaServicoMeses !== 'number' || !Number.isInteger(raw.garantiaServicoMeses))) {
    errors.push('O campo garantiaServicoMeses deve ser um número inteiro.');
  }

  if (errors.length > 0) return { ok: false, errors };

  const data: Record<string, unknown> = { ...raw, id, patrimonioId, codigoPatrimonial, patrimonioNome, defeito, prioridade, status };

  for (const field of MANUTENCAO_TEXT_FIELDS) {
    const value = data[field];
    data[field] = value === undefined || value === null ? '' : String(value);
  }

  const dataConclusao = data['dataConclusao'];
  data['dataConclusao'] = typeof dataConclusao === 'string' ? dataConclusao.trim() || null : null;

  data.custo = typeof raw.custo === 'number' ? raw.custo : 0;
  data.garantiaServicoMeses = typeof raw.garantiaServicoMeses === 'number' ? raw.garantiaServicoMeses : 0;

  return { ok: true, data: data as unknown as Manutencao };
}

// --- MOVIMENTAÇÕES ---

const TIPOS_MOVIMENTACAO: Array<Movimentacao['tipoOperacao']> = [
  'Transferência',
  'Cadastro',
  'Manutenção',
  'Empréstimo',
  'Baixa',
  'Inventário',
];

const MOVIMENTACAO_TEXT_FIELDS: Array<keyof Movimentacao> = [
  'patrimonioId',
  'codigoPatrimonial',
  'patrimonioNome',
  'dataHora',
  'usuarioNome',
  'usuarioPerfil',
  'localAnterior',
  'localNovo',
  'responsavelAnterior',
  'responsavelNovo',
  'motivo',
  'tipoOperacao',
];

export function validateMovimentacaoPayload(body: unknown): ValidationResult<Movimentacao> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['O corpo da requisição deve ser um objeto de movimentação.'] };
  }

  const raw = body as Record<string, unknown>;
  const errors: string[] = [];

  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const patrimonioId = typeof raw.patrimonioId === 'string' ? raw.patrimonioId.trim() : '';
  const codigoPatrimonial = typeof raw.codigoPatrimonial === 'string' ? raw.codigoPatrimonial.trim() : '';
  const dataHora = typeof raw.dataHora === 'string' ? raw.dataHora.trim() : '';

  if (!id) errors.push('O campo id é obrigatório.');
  if (!patrimonioId) errors.push('O campo patrimonioId é obrigatório.');
  if (!codigoPatrimonial) errors.push('O campo codigoPatrimonial é obrigatório.');
  if (!dataHora) errors.push('O campo dataHora é obrigatório.');

  if (raw.tipoOperacao !== undefined && !TIPOS_MOVIMENTACAO.includes(raw.tipoOperacao as Movimentacao['tipoOperacao'])) {
    errors.push(`O campo tipoOperacao deve ser um de: ${TIPOS_MOVIMENTACAO.join(', ')}.`);
  }

  if (errors.length > 0) return { ok: false, errors };

  const data: Record<string, unknown> = { ...raw, id, patrimonioId, codigoPatrimonial, dataHora };
  for (const field of MOVIMENTACAO_TEXT_FIELDS) {
    const value = data[field];
    data[field] = value === undefined || value === null ? '' : String(value);
  }
  if (!data.tipoOperacao) data.tipoOperacao = 'Transferência';

  return { ok: true, data: data as unknown as Movimentacao };
}

// --- AUDITORIA ---

const ENTIDADES_AUDIT: Array<AuditLog['entidade']> = [
  'Patrimônio',
  'Inventário',
  'Manutenção',
  'Empréstimo',
  'Movimentação',
  'Sistema',
  'Usuário',
];

const AUDIT_TEXT_FIELDS: Array<keyof AuditLog> = [
  'dataHora',
  'usuarioNome',
  'usuarioPerfil',
  'acao',
  'entidade',
  'entidadeId',
  'detalhe',
  'ip',
];

export function validateAuditLogPayload(body: unknown): ValidationResult<AuditLog> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['O corpo da requisição deve ser um objeto de auditoria.'] };
  }

  const raw = body as Record<string, unknown>;
  const errors: string[] = [];

  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const dataHora = typeof raw.dataHora === 'string' ? raw.dataHora.trim() : '';
  const acao = typeof raw.acao === 'string' ? raw.acao.trim() : '';

  if (!id) errors.push('O campo id é obrigatório.');
  if (!dataHora) errors.push('O campo dataHora é obrigatório.');
  if (!acao) errors.push('O campo acao é obrigatório.');
  if (raw.entidade !== undefined && !ENTIDADES_AUDIT.includes(raw.entidade as AuditLog['entidade'])) {
    errors.push(`O campo entidade deve ser um de: ${ENTIDADES_AUDIT.join(', ')}.`);
  }

  if (errors.length > 0) return { ok: false, errors };

  const data: Record<string, unknown> = { ...raw, id, dataHora, acao };
  for (const field of AUDIT_TEXT_FIELDS) {
    const value = data[field];
    data[field] = value === undefined || value === null ? '' : String(value);
  }
  if (!data.entidade) data.entidade = 'Sistema';
  data.browser = typeof raw.browser === 'string' ? raw.browser : '';
  data.alteracoes = Array.isArray(raw.alteracoes) ? raw.alteracoes : [];

  return { ok: true, data: data as unknown as AuditLog };
}

// --- INVENTÁRIOS / CONFERÊNCIAS ---

const STATUS_INVENTARIO: Array<InventarioSessao['status']> = ['Em_Andamento', 'Concluído', 'Pausado'];

export function validateInventarioPayload(body: unknown): ValidationResult<InventarioSessao> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['O corpo da requisição deve ser um objeto de inventário.'] };
  }

  const raw = body as Record<string, unknown>;
  const errors: string[] = [];

  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const titulo = typeof raw.titulo === 'string' ? raw.titulo.trim() : '';
  const dataInicio = typeof raw.dataInicio === 'string' ? raw.dataInicio.trim() : '';

  if (!id) errors.push('O campo id é obrigatório.');
  if (!titulo) errors.push('O campo titulo é obrigatório.');
  if (!dataInicio) errors.push('O campo dataInicio é obrigatório.');
  if (raw.status !== undefined && !STATUS_INVENTARIO.includes(raw.status as InventarioSessao['status'])) {
    errors.push(`O campo status deve ser um de: ${STATUS_INVENTARIO.join(', ')}.`);
  }

  if (errors.length > 0) return { ok: false, errors };

  const data: Record<string, unknown> = {
    ...raw,
    id,
    titulo,
    dataInicio,
    bloco: typeof raw.bloco === 'string' ? raw.bloco : '',
    laboratorio: typeof raw.laboratorio === 'string' ? raw.laboratorio : '',
    sala: typeof raw.sala === 'string' ? raw.sala : '',
    responsavelSessao: typeof raw.responsavelSessao === 'string' ? raw.responsavelSessao : '',
    dataFim: typeof raw.dataFim === 'string' && raw.dataFim.trim() ? raw.dataFim.trim() : null,
    totalEsperado: typeof raw.totalEsperado === 'number' ? raw.totalEsperado : 0,
    totalEncontrados: typeof raw.totalEncontrados === 'number' ? raw.totalEncontrados : 0,
    encontradosIds: Array.isArray(raw.encontradosIds) ? raw.encontradosIds : [],
    pendentesIds: Array.isArray(raw.pendentesIds) ? raw.pendentesIds : [],
    divergencias: Array.isArray(raw.divergencias) ? raw.divergencias : [],
    status: STATUS_INVENTARIO.includes(raw.status as InventarioSessao['status']) ? raw.status : 'Em_Andamento',
    coordenadasGps: raw.coordenadasGps && typeof raw.coordenadasGps === 'object' ? raw.coordenadasGps : null,
  };

  return { ok: true, data: data as unknown as InventarioSessao };
}

// --- SETORES ---

export function validateSectorPayload(body: unknown): ValidationResult<SectorItem> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['O corpo da requisição deve ser um objeto de setor.'] };
  }

  const raw = body as Record<string, unknown>;
  const errors: string[] = [];

  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const nome = typeof raw.nome === 'string' ? raw.nome.trim() : '';
  const sigla = typeof raw.sigla === 'string' ? raw.sigla.trim() : '';
  const responsavel = typeof raw.responsavel === 'string' ? raw.responsavel.trim() : '';

  if (!id) errors.push('O campo id é obrigatório.');
  if (!nome) errors.push('O campo nome é obrigatório.');
  if (!sigla) errors.push('O campo sigla é obrigatório.');
  if (!responsavel) errors.push('O campo responsavel é obrigatório.');

  if (errors.length > 0) return { ok: false, errors };

  const data: Record<string, unknown> = {
    ...raw,
    id,
    nome,
    sigla,
    responsavel,
    emailContact: typeof raw.emailContact === 'string' ? raw.emailContact : undefined,
    totalPatrimonios: typeof raw.totalPatrimonios === 'number' && Number.isFinite(raw.totalPatrimonios) ? raw.totalPatrimonios : undefined,
  };

  return { ok: true, data: data as unknown as SectorItem };
}