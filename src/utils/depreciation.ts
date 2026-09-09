import { Patrimonio } from '../types';

export interface DepreciationCalculation {
  valorOriginal: number;
  valorResidual: number;
  vidaUtilAnos: number;
  idadeMeses: number;
  depreciacaoMensal: number;
  depreciacaoAcumulada: number;
  valorContabilAtual: number;
  percentualDepreciado: number;
  mesesRestantes: number;
  statusVidaUtil: 'Novo' | 'Em Uso' | 'Próximo do Fim' | 'Depreciado Totalmente';
}

/**
 * Calcula a depreciação linear de um patrimônio público ou empresarial.
 * Método Linear conforme CPC 27 e Instruções da Secretaria do Tesouro Nacional (STN).
 */
export function calculateDepreciation(patrimonio: Patrimonio): DepreciationCalculation {
  const valorOriginal = patrimonio.valor || 0;
  const valorResidual = patrimonio.valorResidual ?? 0;

  const vidaUtilAnos = patrimonio.vidaUtilAnos || 0;
  const totalMesesVidaUtil = vidaUtilAnos * 12;

  const agora = new Date();
  let idadeMeses = 0;
  if (patrimonio.dataAquisicao) {
    const dataAquisicao = new Date(`${patrimonio.dataAquisicao}T00:00:00`);
    if (!Number.isNaN(dataAquisicao.getTime())) {
      idadeMeses = (agora.getFullYear() - dataAquisicao.getFullYear()) * 12 + (agora.getMonth() - dataAquisicao.getMonth());
      if (idadeMeses < 0) idadeMeses = 0;
    }
  }

  const valorDepreciavel = Math.max(0, valorOriginal - valorResidual);
  const depreciacaoMensal = totalMesesVidaUtil > 0 ? valorDepreciavel / totalMesesVidaUtil : 0;

  const mesesEfetivos = Math.min(idadeMeses, totalMesesVidaUtil);
  const depreciacaoAcumulada = Math.min(valorDepreciavel, depreciacaoMensal * mesesEfetivos);
  
  const valorContabilAtual = Math.max(valorResidual, valorOriginal - depreciacaoAcumulada);

  const percentualDepreciado = valorDepreciavel > 0 
    ? Math.min(100, (depreciacaoAcumulada / valorDepreciavel) * 100)
    : 0;

  const mesesRestantes = Math.max(0, totalMesesVidaUtil - idadeMeses);

  let statusVidaUtil: 'Novo' | 'Em Uso' | 'Próximo do Fim' | 'Depreciado Totalmente' = 'Em Uso';
  if (idadeMeses <= 3) {
    statusVidaUtil = 'Novo';
  } else if (mesesRestantes === 0) {
    statusVidaUtil = 'Depreciado Totalmente';
  } else if (mesesRestantes <= 12) {
    statusVidaUtil = 'Próximo do Fim';
  }

  return {
    valorOriginal,
    valorResidual,
    vidaUtilAnos,
    idadeMeses,
    depreciacaoMensal,
    depreciacaoAcumulada,
    valorContabilAtual,
    percentualDepreciado,
    mesesRestantes,
    statusVidaUtil,
  };
}
