import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { Patrimonio, LabelTemplateModel } from '../types';

/**
 * Gera etiquetas patrimoniais em PDF prontas para impressão em impressoras A4, Zebra, Brother ou Argox.
 */
export async function generateAssetLabelsPDF(
  patrimonios: Patrimonio[],
  template: LabelTemplateModel = 'A4_SHEET_24',
  institutionName: string = 'SISPAT - GESTÃO PATRIMONIAL PÚBLICA'
): Promise<jsPDF> {
  if (template === 'A4_SHEET_24') {
    return await generateA4SheetPDF(patrimonios, institutionName);
  } else if (template === 'ZEBRA_100X50') {
    return await generateThermalLabelPDF(patrimonios, 100, 50, institutionName);
  } else if (template === 'BROTHER_62MM') {
    return await generateThermalLabelPDF(patrimonios, 62, 29, institutionName);
  } else if (template === 'ARGOX_80X40') {
    return await generateThermalLabelPDF(patrimonios, 80, 40, institutionName);
  }

  return await generateA4SheetPDF(patrimonios, institutionName);
}

async function generateA4SheetPDF(patrimonios: Patrimonio[], institutionName: string): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const cols = 3;
  const rows = 8;
  const labelsPerPage = cols * rows;

  const labelWidth = 63.5;
  const labelHeight = 33.9;
  const marginX = 7;
  const marginY = 12.5;
  const gapX = 2.5;
  const gapY = 0;

  let pageIndex = 0;

  for (let i = 0; i < patrimonios.length; i++) {
    const item = patrimonios[i];
    const indexOnPage = i % labelsPerPage;

    if (i > 0 && indexOnPage === 0) {
      doc.addPage();
      pageIndex++;
    }

    const col = indexOnPage % cols;
    const row = Math.floor(indexOnPage / cols);

    const x = marginX + col * (labelWidth + gapX);
    const y = marginY + row * (labelHeight + gapY);

    // QR Code generation
    const qrText = item.qrCode || `SISPAT-${item.codigoPatrimonial}`;
    const qrDataUrl = await QRCode.toDataURL(qrText, { margin: 1, width: 120 });

    // Draw label border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(x, y, labelWidth, labelHeight, 'S');

    // Header bar
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(x, y, labelWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(institutionName.slice(0, 38), x + labelWidth / 2, y + 4.2, { align: 'center' });

    // Add QR Code
    doc.addImage(qrDataUrl, 'PNG', x + 2, y + 7.5, 21, 21);

    // Label fields
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`TOMBO: ${item.codigoPatrimonial}`, x + 24, y + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const splitTitle = doc.splitTextToSize(item.nome, 37);
    doc.text(splitTitle.slice(0, 2), x + 24, y + 15.5);

    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text(`Setor: ${item.laboratorio || item.sala || 'Não informado'}`.slice(0, 35), x + 24, y + 23);
    doc.text(`Série: ${item.numeroSerie || 'Não informado'} | Cat: ${item.categoria}`, x + 24, y + 26.5);

    // Footer bar line
    doc.setDrawColor(226, 232, 240);
    doc.line(x + 2, y + 29, x + labelWidth - 2, y + 29);

    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text('PROPRIEDADE INALIENÁVEL - SISPAT SYSTEM', x + labelWidth / 2, y + 32, { align: 'center' });
  }

  return doc;
}

async function generateThermalLabelPDF(
  patrimonios: Patrimonio[],
  widthMm: number,
  heightMm: number,
  institutionName: string
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: widthMm > heightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [widthMm, heightMm],
  });

  for (let i = 0; i < patrimonios.length; i++) {
    if (i > 0) {
      doc.addPage([widthMm, heightMm]);
    }

    const item = patrimonios[i];
    const qrText = item.qrCode || `SISPAT-${item.codigoPatrimonial}`;
    const qrDataUrl = await QRCode.toDataURL(qrText, { margin: 1, width: 160 });

    // Outer border
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(1, 1, widthMm - 2, heightMm - 2);

    // Header
    doc.setFillColor(0, 0, 0);
    doc.rect(1, 1, widthMm - 2, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(institutionName.slice(0, 42), widthMm / 2, 5.5, { align: 'center' });

    // QR Code
    const qrSize = Math.min(26, heightMm - 14);
    doc.addImage(qrDataUrl, 'PNG', 3, 9, qrSize, qrSize);

    // Text details
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`PATRIMÔNIO: ${item.codigoPatrimonial}`, qrSize + 5, 13);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const titleLines = doc.splitTextToSize(item.nome, widthMm - qrSize - 8);
    doc.text(titleLines.slice(0, 2), qrSize + 5, 18);

    doc.setFontSize(7);
    doc.text(`Local: ${item.laboratorio || item.bloco || 'Não informado'}`.slice(0, 38), qrSize + 5, 26);
    doc.text(`Responsável: ${item.responsavelNome || 'Não informado'}`.slice(0, 38), qrSize + 5, 30);

    if (heightMm >= 40) {
      doc.setFontSize(6);
      doc.text(`Nota Fiscal: ${item.notaFiscal || 'Não informado'} | Adquirido em: ${item.dataAquisicao}`, qrSize + 5, 34);
    }
  }

  return doc;
}
