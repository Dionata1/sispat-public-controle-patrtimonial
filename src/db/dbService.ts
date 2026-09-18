import { db } from './index.js';
import { patrimonios, emprestimos, manutencoes, inventarios, auditLogs, users, sectors, movimentacoes } from './schema.js';
import { eq } from 'drizzle-orm';
import { Patrimonio, Emprestimo, Manutencao, InventarioSessao, AuditLog, UserAccount, UserRole, SectorItem, Movimentacao } from '../types';

const toText = (value: unknown): string => (typeof value === 'string' ? value : '');
const toNullableText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};
const toNumber = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const toJsonArray = <T>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : []);

export async function isDbAvailable(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    await db.select().from(patrimonios).limit(1);
    return true;
  } catch (err) {
    console.error('Cloud SQL database check:', err);
    return false;
  }
}

export async function getAllPatrimoniosDb(): Promise<Patrimonio[]> {
  const rows = await db.select().from(patrimonios);
  return (rows as unknown as Patrimonio[]).map((p) => ({
    ...p,
    codigoBarras: p.codigoBarras ?? '',
    fotosAdicionais: toJsonArray(p.fotosAdicionais),
    anexosDocs: toJsonArray(p.anexosDocs),
  }));
}

export async function upsertPatrimonioDb(item: Patrimonio): Promise<void> {
  const codigoBarras = toNullableText(item.codigoBarras);
  const valores = {
    codigoPatrimonial: toText(item.codigoPatrimonial),
    codigoBarras,
    qrCode: toText(item.qrCode) || `SISPAT-${toText(item.codigoPatrimonial)}`,
    nome: toText(item.nome),
    categoria: toText(item.categoria),
    marca: toText(item.marca),
    modelo: toText(item.modelo),
    numeroSerie: toText(item.numeroSerie),
    fornecedor: toText(item.fornecedor),
    notaFiscal: toText(item.notaFiscal),
    dataAquisicao: toText(item.dataAquisicao),
    valor: toNumber(item.valor),
    valorResidual: toNumber(item.valorResidual),
    taxaDepreciacaoAnual: toNumber(item.taxaDepreciacaoAnual),
    garantiaVencimento: toText(item.garantiaVencimento),
    vidaUtilAnos: toNumber(item.vidaUtilAnos),
    estadoConservacao: toText(item.estadoConservacao),
    situacao: toText(item.situacao),
    bloco: toText(item.bloco),
    laboratorio: toText(item.laboratorio),
    sala: toText(item.sala),
    setor: toText(item.setor),
    centroCusto: toText(item.centroCusto),
    responsavelNome: toText(item.responsavelNome),
    responsavelCpf: toText(item.responsavelCpf),
    observacoes: toText(item.observacoes),
    fotoUrl: toText(item.fotoUrl),
    fotosAdicionais: toJsonArray(item.fotosAdicionais),
    anexosDocs: toJsonArray(item.anexosDocs),
    ultimaAtualizacao: toText(item.ultimaAtualizacao),
  };

  await db.insert(patrimonios).values({
    id: toText(item.id),
    ...valores,
    dataCadastro: toText(item.dataCadastro),
  }).onConflictDoUpdate({
    target: patrimonios.id,
    set: {
      ...valores,
    }
  });
}

export async function deletePatrimonioDb(id: string): Promise<void> {
  await db.delete(patrimonios).where(eq(patrimonios.id, id));
}

export async function getAllEmprestimosDb(): Promise<Emprestimo[]> {
  const rows = await db.select().from(emprestimos);
  return rows as unknown as Emprestimo[];
}

export async function upsertEmprestimoDb(item: Emprestimo): Promise<void> {
  const values = {
    patrimonioId: toText(item.patrimonioId),
    codigoPatrimonial: toText(item.codigoPatrimonial),
    patrimonioNome: toText(item.patrimonioNome),
    servidorNome: toText(item.servidorNome),
    cpfServidor: toNullableText(item.cpfServidor),
    cargoServidor: toNullableText(item.cargoServidor),
    setor: toText(item.setor),
    dataRetirada: toText(item.dataRetirada),
    previsaoDevolucao: toText(item.previsaoDevolucao),
    dataDevolucao: toNullableText(item.dataDevolucao),
    status: toText(item.status),
    observacoes: toText(item.observacoes),
    assinaturaDigitalUrl: toNullableText(item.assinaturaDigitalUrl),
    assinaturaIp: toNullableText(item.assinaturaIp),
    assinaturaDataHora: toNullableText(item.assinaturaDataHora),
    termoPdfGerado: item.termoPdfGerado === true,
  };
  await db.insert(emprestimos).values({
    id: toText(item.id),
    ...values,
  }).onConflictDoUpdate({
    target: emprestimos.id,
    set: values,
  });
}

export async function deleteEmprestimoDb(id: string): Promise<void> {
  await db.delete(emprestimos).where(eq(emprestimos.id, id));
}

export async function getAllManutencoesDb(): Promise<Manutencao[]> {
  const rows = await db.select().from(manutencoes);
  return rows as unknown as Manutencao[];
}

export async function upsertManutencaoDb(item: Manutencao): Promise<void> {
  const values = {
    patrimonioId: toText(item.patrimonioId),
    codigoPatrimonial: toText(item.codigoPatrimonial),
    patrimonioNome: toText(item.patrimonioNome),
    defeito: toText(item.defeito),
    prioridade: toText(item.prioridade),
    tecnicoEmpresa: toText(item.tecnicoEmpresa),
    custo: toNumber(item.custo),
    dataAbertura: toText(item.dataAbertura),
    previsaoConclusao: toText(item.previsaoConclusao),
    dataConclusao: toNullableText(item.dataConclusao),
    status: toText(item.status),
    laudoTecnico: toText(item.laudoTecnico),
    garantiaServicoMeses: toNumber(item.garantiaServicoMeses),
  };
  await db.insert(manutencoes).values({
    id: toText(item.id),
    ...values,
  }).onConflictDoUpdate({
    target: manutencoes.id,
    set: values,
  });
}

export async function deleteManutencaoDb(id: string): Promise<void> {
  await db.delete(manutencoes).where(eq(manutencoes.id, id));
}

export async function getAllAuditLogsDb(): Promise<AuditLog[]> {
  const rows = await db.select().from(auditLogs);
  return rows as unknown as AuditLog[];
}

export async function insertAuditLogDb(log: AuditLog): Promise<void> {
  await db.insert(auditLogs).values({
    id: log.id,
    dataHora: log.dataHora,
    usuarioNome: log.usuarioNome,
    usuarioPerfil: log.usuarioPerfil,
    acao: log.acao,
    entidade: log.entidade,
    entidadeId: log.entidadeId,
    detalhe: log.detalhe,
    ip: log.ip,
    browser: log.browser || '',
    alteracoes: log.alteracoes || [],
  });
}

export async function deleteAuditLogDb(id: string): Promise<void> {
  await db.delete(auditLogs).where(eq(auditLogs.id, id));
}

// --- USUÁRIOS CENTRALIZADOS (autenticação JWT) ---

export async function listUsersDb(): Promise<UserAccount[]> {
  const rows = await db.select().from(users);
  return rows.map((r) => ({
    id: r.id,
    login: r.login,
    nomeCompleto: r.nomeCompleto,
    cpf: r.cpf,
    matricula: r.matricula,
    email: r.email,
    telefone: r.telefone || '',
    cargo: r.cargo,
    setor: r.setor,
    role: r.role as UserRole,
    situacao: r.situacao as 'Ativo' | 'Inativo' | 'Bloqueado',
    passwordHash: r.passwordHash,
    forcePasswordChange: r.forcePasswordChange,
    dataCriacao: r.dataCriacao,
    ultimoAcesso: r.ultimoAcesso || undefined,
    tentativasInvalidas: r.tentativasInvalidas,
  }));
}

export async function upsertUserDb(account: UserAccount): Promise<void> {
  const values = {
    id: account.id,
    login: account.login,
    nomeCompleto: account.nomeCompleto,
    cpf: account.cpf,
    matricula: account.matricula,
    email: account.email,
    telefone: account.telefone || null,
    cargo: account.cargo,
    setor: account.setor,
    role: account.role,
    situacao: account.situacao,
    passwordHash: account.passwordHash,
    forcePasswordChange: account.forcePasswordChange,
    tentativasInvalidas: account.tentativasInvalidas || 0,
    dataCriacao: account.dataCriacao,
    ultimoAcesso: account.ultimoAcesso || null,
  };
  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.id,
    set: values,
  });
}

export async function deleteUserDb(id: string): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}

// --- SETORES (tabela sectors) ---

export async function getAllSectorsDb(): Promise<SectorItem[]> {
  const rows = await db.select().from(sectors);
  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    sigla: r.sigla,
    responsavel: r.responsavel,
    emailContact: r.emailContact || undefined,
    totalPatrimonios: r.totalPatrimonios ?? undefined,
  }));
}

export async function upsertSectorDb(item: SectorItem): Promise<void> {
  const values = {
    nome: toText(item.nome).trim(),
    sigla: toText(item.sigla).trim(),
    responsavel: toText(item.responsavel).trim(),
    emailContact: toNullableText(item.emailContact),
    totalPatrimonios: item.totalPatrimonios != null && Number.isFinite(item.totalPatrimonios) ? item.totalPatrimonios : null,
  };
  await db.insert(sectors).values({ id: toText(item.id), ...values }).onConflictDoUpdate({
    target: sectors.id,
    set: values,
  });
}

export async function deleteSectorDb(id: string): Promise<void> {
  await db.delete(sectors).where(eq(sectors.id, id));
}

// --- MOVIMENTAÇÕES (tabela movimentacoes) ---

export async function getAllMovimentacoesDb(): Promise<Movimentacao[]> {
  const rows = await db.select().from(movimentacoes);
  return rows.map((r) => ({
    id: r.id,
    patrimonioId: r.patrimonioId,
    codigoPatrimonial: r.codigoPatrimonial,
    patrimonioNome: r.patrimonioNome,
    dataHora: r.dataHora,
    usuarioNome: r.usuarioNome,
    usuarioPerfil: r.usuarioPerfil,
    localAnterior: r.localAnterior,
    localNovo: r.localNovo,
    responsavelAnterior: r.responsavelAnterior,
    responsavelNovo: r.responsavelNovo,
    motivo: r.motivo,
    tipoOperacao: r.tipoOperacao as Movimentacao['tipoOperacao'],
  }));
}

export async function upsertMovimentacaoDb(item: Movimentacao): Promise<void> {
  const values = {
    patrimonioId: toText(item.patrimonioId),
    codigoPatrimonial: toText(item.codigoPatrimonial),
    patrimonioNome: toText(item.patrimonioNome),
    dataHora: toText(item.dataHora),
    usuarioNome: toText(item.usuarioNome),
    usuarioPerfil: toText(item.usuarioPerfil),
    localAnterior: toText(item.localAnterior),
    localNovo: toText(item.localNovo),
    responsavelAnterior: toText(item.responsavelAnterior),
    responsavelNovo: toText(item.responsavelNovo),
    motivo: toText(item.motivo),
    tipoOperacao: toText(item.tipoOperacao),
    dataRegistro: toText(item.dataHora),
  };
  await db.insert(movimentacoes).values({ id: toText(item.id), ...values }).onConflictDoUpdate({
    target: movimentacoes.id,
    set: values,
  });
}

export async function deleteMovimentacaoDb(id: string): Promise<void> {
  await db.delete(movimentacoes).where(eq(movimentacoes.id, id));
}

export async function deleteMovimentacoesByPatrimonioDb(patrimonioId: string): Promise<void> {
  await db.delete(movimentacoes).where(eq(movimentacoes.patrimonioId, patrimonioId));
}

// --- INVENTÁRIOS / CONFERÊNCIAS (tabela inventarios) ---

function toInventarioDb(sessao: InventarioSessao) {
  return {
    id: toText(sessao.id),
    titulo: toText(sessao.titulo),
    bloco: toText(sessao.bloco),
    laboratorio: toText(sessao.laboratorio),
    sala: toText(sessao.sala),
    responsavel: toText(sessao.responsavelSessao),
    dataInicio: toText(sessao.dataInicio),
    dataFim: toNullableText(sessao.dataFim),
    totalEsperados: typeof sessao.totalEsperado === 'number' ? sessao.totalEsperado : 0,
    totalEncontrados: typeof sessao.totalEncontrados === 'number' ? sessao.totalEncontrados : 0,
    encontradosIds: toJsonArray(sessao.encontradosIds),
    pendentesIds: toJsonArray(sessao.pendentesIds),
    divergencias: toJsonArray(sessao.divergencias),
    status: toText(sessao.status),
    coordenadasGps: sessao.coordenadasGps || null,
  };
}

function fromInventarioRow(r: Record<string, any>): InventarioSessao {
  return {
    id: r.id,
    titulo: r.titulo,
    bloco: r.bloco,
    laboratorio: r.laboratorio,
    sala: r.sala,
    dataInicio: r.dataInicio,
    dataFim: r.dataFim || null,
    responsavelSessao: r.responsavel,
    totalEsperado: r.totalEsperados,
    totalEncontrados: r.totalEncontrados,
    encontradosIds: toJsonArray(r.encontradosIds),
    pendentesIds: toJsonArray(r.pendentesIds),
    divergencias: toJsonArray(r.divergencias),
    status: r.status,
    coordenadasGps: r.coordenadasGps || undefined,
  };
}

export async function getAllInventariosDb(): Promise<InventarioSessao[]> {
  const rows = await db.select().from(inventarios);
  return rows.map(fromInventarioRow);
}

export async function upsertInventarioDb(sessao: InventarioSessao): Promise<void> {
  const values = toInventarioDb(sessao);
  const { id, ...set } = values;
  await db.insert(inventarios).values(values).onConflictDoUpdate({
    target: inventarios.id,
    set,
  });
}

export async function deleteInventarioDb(id: string): Promise<void> {
  await db.delete(inventarios).where(eq(inventarios.id, id));
}
