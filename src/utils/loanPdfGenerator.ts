import jsPDF from 'jspdf';
import { Emprestimo, Patrimonio } from '../types';

async function sha256Hex(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) return 'indisponivel-no-navegador';
  const data = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateLoanAgreementPDF(
  emprestimo: Emprestimo,
  patrimonio?: Patrimonio,
  institutionName: string = 'SISPAT - SISTEMA PÚBLICO DE GESTÃO PATRIMONIAL'
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const integrityPayload = JSON.stringify({
    termoId: emprestimo.id, patrimonioId: emprestimo.patrimonioId, codigoPatrimonial: emprestimo.codigoPatrimonial,
    servidorNome: emprestimo.servidorNome, cpfServidor: emprestimo.cpfServidor || '', setor: emprestimo.setor,
    dataRetirada: emprestimo.dataRetirada, previsaoDevolucao: emprestimo.previsaoDevolucao,
    assinaturaDataHora: emprestimo.assinaturaDataHora || '', assinaturaIp: emprestimo.assinaturaIp || '',
  });
  const integrityHash = await sha256Hex(integrityPayload);

  // Header Box
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(10, 10, pageWidth - 20, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TERMO DE RESPONSABILIDADE E CAUTELA PATRIMONIAL', pageWidth / 2, 21, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(institutionName, pageWidth / 2, 29, { align: 'center' });

  // Document Number & Timestamp
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`TERMO Nº: ${emprestimo.id.toUpperCase()}`, 15, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')} - ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth - 15, 42, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(15, 45, pageWidth - 15, 45);

  // Section 1: Dados do Servidor Beneficiário
  let y = 52;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('1. IDENTIFICAÇÃO DO SERVIDOR BENEFICIÁRIO (CAUTELADO)', 15, y);

  y += 5;
  doc.setFillColor(248, 250, 252);
  doc.rect(15, y, pageWidth - 30, 24, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, y, pageWidth - 30, 24, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Nome do Servidor:', 18, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(emprestimo.servidorNome, 52, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('CPF:', 18, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(emprestimo.cpfServidor || 'Não informado', 30, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Cargo / Função:', 90, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(emprestimo.cargoServidor || 'Não informado', 120, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Setor / Lotação:', 18, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(emprestimo.setor, 48, y + 18);

  // Section 2: Dados do Bem Patrimonial
  y += 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. ESPECIFICAÇÃO DO BEM PATRIMONIAL CEDIDO', 15, y);

  y += 5;
  doc.setFillColor(248, 250, 252);
  doc.rect(15, y, pageWidth - 30, 36, 'F');
  doc.rect(15, y, pageWidth - 30, 36, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Código Patrimonial:', 18, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(2, 132, 199);
  doc.text(emprestimo.codigoPatrimonial, 55, y + 6);
  doc.setTextColor(30, 41, 59);

  doc.setFont('helvetica', 'bold');
  doc.text('Descrição do Bem:', 18, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(emprestimo.patrimonioNome, 52, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Marca / Modelo:', 18, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(`${patrimonio?.marca || 'Não informado'} - ${patrimonio?.modelo || 'Não informado'}`, 48, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.text('Número de Série:', 120, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(patrimonio?.numeroSerie || 'Não informado', 152, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.text('Valor Declarado:', 18, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(`R$ ${(patrimonio?.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 48, y + 24);

  doc.setFont('helvetica', 'bold');
  doc.text('Data de Retirada:', 18, y + 30);
  doc.setFont('helvetica', 'normal');
  doc.text(emprestimo.dataRetirada, 48, y + 30);

  doc.setFont('helvetica', 'bold');
  doc.text('Previsão Devolução:', 120, y + 30);
  doc.setFont('helvetica', 'normal');
  doc.text(emprestimo.previsaoDevolucao, 155, y + 30);

  // Section 3: Cláusulas de Cautela e Responsabilidade
  y += 44;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. CLÁUSULAS E COMPROMISSOS DE GUARDA', 15, y);

  const clausulas = [
    'I. O servidor declara receber o bem acima discriminado em perfeito estado de conservação e funcionamento.',
    'II. O beneficiário assume inteira responsabilidade pela guarda, bom uso e conservação do equipamento.',
    'III. Em caso de dano, extravio, furto ou roubo, o servidor compromete-se a comunicar formalmente o setor de patrimônio imediatamente.',
    'IV. O equipamento deverá ser devolvido impreterivelmente na data limite acordada ou mediante solicitação do setor gestor.',
  ];

  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  clausulas.forEach(clausula => {
    y += 4.5;
    const splitClause = doc.splitTextToSize(clausula, pageWidth - 32);
    doc.text(splitClause, 18, y);
    y += (splitClause.length - 1) * 3.5;
  });

  // Section 4: Assinatura Digital do Servidor
  y += 12;
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, y, pageWidth - 30, 42, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('VALIDAÇÃO E ASSINATURA DIGITAL DO BENEFICIÁRIO', 18, y + 6);

  if (emprestimo.assinaturaDigitalUrl) {
    try {
      doc.addImage(emprestimo.assinaturaDigitalUrl, 'PNG', pageWidth / 2 - 35, y + 8, 70, 22);
    } catch (e) {
      doc.text('[Assinatura Registrada via Autenticação Eletrônica]', pageWidth / 2, y + 18, { align: 'center' });
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.text('________________________________________________________', pageWidth / 2, y + 20, { align: 'center' });
    doc.text(emprestimo.servidorNome, pageWidth / 2, y + 25, { align: 'center' });
  }

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Assinado Digitalmente por: ${emprestimo.servidorNome}`, 18, y + 34);
  doc.text(`Data/Hora: ${emprestimo.assinaturaDataHora || new Date().toLocaleString()}`, 18, y + 38);
  doc.text(`Endereço IP: ${emprestimo.assinaturaIp || 'não coletado'}`, pageWidth - 18, y + 38, { align: 'right' });

  // Footer Audit stamp
  doc.setFontSize(6.5);
  doc.text(`Hash SHA-256 de integridade: ${integrityHash.slice(0, 56)}...`, pageWidth / 2, 282, { align: 'center' });
  doc.text('O hash comprova a integridade dos dados deste termo no momento da emissão; não substitui certificado digital ICP-Brasil.', pageWidth / 2, 286, { align: 'center' });

  return doc;
}
