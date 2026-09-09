import { db } from './index';
import { patrimonios, emprestimos, manutencoes, inventarios, auditLogs } from './schema';
import { eq } from 'drizzle-orm';
import { Patrimonio, Emprestimo, Manutencao, InventarioSessao, AuditLog } from '../types';

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
  return rows as unknown as Patrimonio[];
}

export async function upsertPatrimonioDb(item: Patrimonio): Promise<void> {
  await db.insert(patrimonios).values({
    id: item.id,
    codigoPatrimonial: item.codigoPatrimonial,
    codigoBarras: item.codigoBarras,
    qrCode: item.qrCode || `SISPAT-${item.codigoPatrimonial}`,
    nome: item.nome,
    categoria: item.categoria,
    marca: item.marca,
    modelo: item.modelo,
    numeroSerie: item.numeroSerie,
    fornecedor: item.fornecedor,
    notaFiscal: item.notaFiscal,
    dataAquisicao: item.dataAquisicao,
    valor: item.valor,
    valorResidual: item.valorResidual || 0,
    taxaDepreciacaoAnual: item.taxaDepreciacaoAnual || 0,
    garantiaVencimento: item.garantiaVencimento,
    vidaUtilAnos: item.vidaUtilAnos,
    estadoConservacao: item.estadoConservacao,
    situacao: item.situacao,
    bloco: item.bloco,
    laboratorio: item.laboratorio,
    sala: item.sala,
    setor: item.setor || '',
    centroCusto: item.centroCusto || '',
    responsavelNome: item.responsavelNome,
    responsavelCpf: item.responsavelCpf,
    observacoes: item.observacoes,
    fotoUrl: item.fotoUrl || '',
    fotosAdicionais: item.fotosAdicionais || [],
    anexosDocs: item.anexosDocs || [],
    dataCadastro: item.dataCadastro,
    ultimaAtualizacao: item.ultimaAtualizacao,
  }).onConflictDoUpdate({
    target: patrimonios.id,
    set: {
      nome: item.nome,
      categoria: item.categoria,
      marca: item.marca,
      modelo: item.modelo,
      valor: item.valor,
      estadoConservacao: item.estadoConservacao,
      situacao: item.situacao,
      codigoBarras: item.codigoBarras,
      qrCode: item.qrCode,
      fornecedor: item.fornecedor,
      fotoUrl: item.fotoUrl || '',
      bloco: item.bloco,
      laboratorio: item.laboratorio,
      sala: item.sala,
      responsavelNome: item.responsavelNome,
      ultimaAtualizacao: item.ultimaAtualizacao,
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
  await db.insert(emprestimos).values({
    id: item.id,
    patrimonioId: item.patrimonioId,
    codigoPatrimonial: item.codigoPatrimonial,
    patrimonioNome: item.patrimonioNome,
    servidorNome: item.servidorNome,
    cpfServidor: item.cpfServidor || '',
    cargoServidor: item.cargoServidor || '',
    setor: item.setor,
    dataRetirada: item.dataRetirada,
    previsaoDevolucao: item.previsaoDevolucao,
    dataDevolucao: item.dataDevolucao || null,
    status: item.status,
    observacoes: item.observacoes,
    assinaturaDigitalUrl: item.assinaturaDigitalUrl || null,
    assinaturaIp: item.assinaturaIp || null,
    assinaturaDataHora: item.assinaturaDataHora || null,
    termoPdfGerado: item.termoPdfGerado || false,
  }).onConflictDoUpdate({
    target: emprestimos.id,
    set: {
      status: item.status,
      observacoes: item.observacoes,
      assinaturaDigitalUrl: item.assinaturaDigitalUrl || null,
      assinaturaDataHora: item.assinaturaDataHora || null,
    }
  });
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
