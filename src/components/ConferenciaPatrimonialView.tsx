import React, { useMemo, useState } from 'react';
import {
  ShieldCheck, AlertTriangle, FileText, FileSpreadsheet, Search, CheckCircle2,
  Database, Tag, ImageOff, MapPin, FileWarning, Wrench, Info
} from 'lucide-react';
import { Patrimonio, UserProfile } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ConferenciaPatrimonialViewProps {
  patrimonios: Patrimonio[];
  currentUser: UserProfile;
  onSaveAsset: (asset: Patrimonio | Patrimonio[]) => void;
}

type QualityIssue = {
  asset: Patrimonio;
  issues: string[];
};

export const ConferenciaPatrimonialView: React.FC<ConferenciaPatrimonialViewProps> = ({ patrimonios, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'all' | 'incomplete' | 'alerts' | 'duplicates'>('all');

  const metrics = useMemo(() => {
    const barcodeCounts = new Map<string, number>();
    const qrCounts = new Map<string, number>();
    const codeCounts = new Map<string, number>();
    patrimonios.forEach(p => {
      barcodeCounts.set(p.codigoBarras, (barcodeCounts.get(p.codigoBarras) || 0) + 1);
      qrCounts.set(p.qrCode, (qrCounts.get(p.qrCode) || 0) + 1);
      codeCounts.set(p.codigoPatrimonial, (codeCounts.get(p.codigoPatrimonial) || 0) + 1);
    });

    const quality: QualityIssue[] = patrimonios.map(asset => {
      const issues: string[] = [];
      if (!asset.numeroSerie || /^(S\/N|N\/I|SEM|NAO INFORMADO|NÃO INFORMADO)$/i.test(asset.numeroSerie.trim())) issues.push('Número de série ausente/genérico');
      if (!asset.fotoUrl) issues.push('Sem foto principal');
      if (!asset.notaFiscal || /N\/I|SEM/i.test(asset.notaFiscal)) issues.push('Nota fiscal não informada');
      if (!asset.fornecedor || /N\/I/i.test(asset.fornecedor)) issues.push('Fornecedor não informado');
      if (!asset.bloco || !asset.sala) issues.push('Localização incompleta');
      if (!asset.responsavelNome) issues.push('Sem responsável/custodiante');
      if ((barcodeCounts.get(asset.codigoBarras) || 0) > 1) issues.push('EAN-13 duplicado');
      if ((qrCounts.get(asset.qrCode) || 0) > 1) issues.push('QR Code duplicado');
      if ((codeCounts.get(asset.codigoPatrimonial) || 0) > 1) issues.push('Tombo duplicado');
      return { asset, issues };
    });

    const duplicateAssets = quality.filter(q => q.issues.some(i => i.includes('duplicado')));
    const incomplete = quality.filter(q => q.issues.length > 0);
    const operationalAlerts = patrimonios.filter(p => ['Danificado', 'Extraviado', 'Em manutenção'].includes(p.situacao) || ['Ruim', 'Inoperante'].includes(p.estadoConservacao));
    const complete = patrimonios.length - incomplete.length;
    const completeness = patrimonios.length ? Math.round((complete / patrimonios.length) * 100) : 100;

    return {
      quality, duplicateAssets, incomplete, operationalAlerts, complete, completeness,
      uniqueBarcodes: barcodeCounts.size,
      uniqueQr: qrCounts.size,
      uniqueCodes: codeCounts.size,
      withoutPhoto: patrimonios.filter(p => !p.fotoUrl).length,
      genericSerial: patrimonios.filter(p => !p.numeroSerie || /^(S\/N|N\/I|SEM|NAO INFORMADO|NÃO INFORMADO)$/i.test(p.numeroSerie.trim())).length,
      withoutLocation: patrimonios.filter(p => !p.bloco || !p.sala).length,
      withoutNF: patrimonios.filter(p => !p.notaFiscal || /N\/I|SEM/i.test(p.notaFiscal)).length,
    };
  }, [patrimonios]);

  const displayed = useMemo(() => {
    let rows = metrics.quality;
    if (view === 'incomplete') rows = metrics.incomplete;
    if (view === 'duplicates') rows = metrics.duplicateAssets;
    if (view === 'alerts') {
      const ids = new Set(metrics.operationalAlerts.map(p => p.id));
      rows = metrics.quality.filter(q => ids.has(q.asset.id));
    }
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(({ asset, issues }) => [asset.codigoPatrimonial, asset.nome, asset.codigoBarras, asset.qrCode, asset.bloco, asset.laboratorio, asset.sala, ...issues].join(' ').toLowerCase().includes(term));
  }, [metrics, view, searchTerm]);

  const generatePDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('SISPAT Public 3.1 - Relatório de Qualidade e Conferência Patrimonial', 14, 16);
    doc.setFontSize(9);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} por ${currentUser.name}`, 14, 23);
    doc.text(`Base atual: ${patrimonios.length} bens | Completude: ${metrics.completeness}% | Alertas operacionais: ${metrics.operationalAlerts.length}`, 14, 29);
    autoTable(doc, {
      startY: 35,
      head: [['Tombo', 'Bem', 'EAN-13', 'Local', 'Situação', 'Pendências cadastrais']],
      body: displayed.map(({ asset, issues }) => [
        asset.codigoPatrimonial, asset.nome, asset.codigoBarras,
        `${asset.bloco} / ${asset.laboratorio} / ${asset.sala}`,
        `${asset.situacao} / ${asset.estadoConservacao}`,
        issues.length ? issues.join('; ') : 'Cadastro consistente',
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42] },
    });
    doc.save(`SISPAT_Conferencia_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const generateExcel = () => {
    const wb = XLSX.utils.book_new();
    const resumo = [{
      'Data': new Date().toLocaleString('pt-BR'), 'Total de bens': patrimonios.length,
      'Tombos únicos': metrics.uniqueCodes, 'EAN-13 únicos': metrics.uniqueBarcodes, 'QR únicos': metrics.uniqueQr,
      'Cadastros completos': metrics.complete, 'Completude (%)': metrics.completeness,
      'Sem foto': metrics.withoutPhoto, 'Série ausente/genérica': metrics.genericSerial,
      'Sem NF': metrics.withoutNF, 'Localização incompleta': metrics.withoutLocation,
      'Alertas operacionais': metrics.operationalAlerts.length,
    }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo), 'Resumo');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(metrics.quality.map(({asset, issues}) => ({
      Tombo: asset.codigoPatrimonial, Bem: asset.nome, EAN13: asset.codigoBarras, QR: asset.qrCode,
      Bloco: asset.bloco, Ambiente: asset.laboratorio, Sala: asset.sala, Situacao: asset.situacao,
      Conservacao: asset.estadoConservacao, Serie: asset.numeroSerie, NF: asset.notaFiscal, Fornecedor: asset.fornecedor,
      Pendencias: issues.join('; '),
    }))), 'Qualidade Cadastral');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(metrics.operationalAlerts.map(asset => ({
      Tombo: asset.codigoPatrimonial, Bem: asset.nome, Situacao: asset.situacao, Conservacao: asset.estadoConservacao,
      Local: `${asset.bloco} / ${asset.laboratorio} / ${asset.sala}`, Responsavel: asset.responsavelNome,
    }))), 'Alertas Operacionais');
    XLSX.writeFile(wb, `SISPAT_Conferencia_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const cards = [
    { label: 'Bens na base atual', value: patrimonios.length, icon: Database, tone: 'text-blue-400' },
    { label: 'Completude cadastral', value: `${metrics.completeness}%`, icon: CheckCircle2, tone: 'text-emerald-400' },
    { label: 'Sem foto', value: metrics.withoutPhoto, icon: ImageOff, tone: 'text-amber-400' },
    { label: 'Série ausente/genérica', value: metrics.genericSerial, icon: Tag, tone: 'text-orange-400' },
    { label: 'Alertas operacionais', value: metrics.operationalAlerts.length, icon: Wrench, tone: 'text-rose-400' },
    { label: 'Identificadores duplicados', value: metrics.duplicateAssets.length, icon: AlertTriangle, tone: 'text-fuchsia-400' },
  ];

  return <div className="space-y-6">
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider"><ShieldCheck className="w-4 h-4" /> Conferência baseada na base vigente</div>
          <h1 className="text-2xl font-black text-white mt-1">Qualidade, integridade e rastreabilidade cadastral</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">Os indicadores abaixo são calculados em tempo real. Não há números fixos de auditorias antigas nem fontes externas simuladas.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={generatePDF} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold"><FileText className="w-4 h-4" /> PDF</button>
          <button onClick={generateExcel} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold"><FileSpreadsheet className="w-4 h-4" /> Excel</button>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">{cards.map(c => <div key={c.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4"><c.icon className={`w-5 h-5 ${c.tone}`} /><div className="text-2xl font-black text-white mt-3">{c.value}</div><div className="text-[10px] text-slate-500 uppercase font-bold mt-1">{c.label}</div></div>)}</div>

    <div className="bg-blue-950/20 border border-blue-900/50 rounded-2xl p-4 flex gap-3 text-xs text-slate-300">
      <Info className="w-5 h-5 text-blue-400 shrink-0" />
      <div><strong className="text-white">Escopo desta conferência:</strong> valida a consistência interna dos registros presentes no SISPAT. Para reconciliação contra planilha oficial, notas fiscais ou inventário físico externo, importe essas fontes em uma etapa própria; o sistema não inventa totais externos.</div>
    </div>

    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {([
            ['all','Todos'], ['incomplete','Pendências cadastrais'], ['alerts','Alertas operacionais'], ['duplicates','Duplicidades']
          ] as const).map(([id,label]) => <button key={id} onClick={() => setView(id)} className={`px-3 py-2 rounded-xl text-xs font-bold border ${view===id?'bg-blue-600 border-blue-500 text-white':'bg-slate-950 border-slate-800 text-slate-400'}`}>{label}</button>)}
        </div>
        <div className="relative w-full md:w-96"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Pesquisar tombo, bem, local ou pendência..." className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs" /></div>
      </div>

      <div className="overflow-auto border border-slate-800 rounded-xl">
        <table className="w-full text-xs min-w-[900px]"><thead className="bg-slate-950 text-slate-400"><tr><th className="text-left p-3">Tombo / EAN</th><th className="text-left p-3">Bem</th><th className="text-left p-3">Local</th><th className="text-left p-3">Situação</th><th className="text-left p-3">Qualidade</th></tr></thead><tbody>{displayed.map(({asset,issues}) => <tr key={asset.id} className="border-t border-slate-800 hover:bg-slate-800/30"><td className="p-3 font-mono"><div className="text-blue-400">{asset.codigoPatrimonial}</div><div className="text-slate-500 text-[10px]">{asset.codigoBarras}</div></td><td className="p-3"><strong className="text-white">{asset.nome}</strong><div className="text-slate-500">{asset.marca} • {asset.modelo}</div></td><td className="p-3 text-slate-300"><div className="flex gap-1"><MapPin className="w-3 h-3 mt-0.5 text-slate-500" /> {asset.bloco} / {asset.laboratorio} / {asset.sala}</div></td><td className="p-3"><span className="text-slate-200">{asset.situacao}</span><div className="text-slate-500 text-[10px]">{asset.estadoConservacao}</div></td><td className="p-3">{issues.length ? <div className="space-y-1">{issues.map(i => <div key={i} className="flex gap-1.5 text-amber-300"><FileWarning className="w-3 h-3 mt-0.5" />{i}</div>)}</div> : <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3 h-3" /> Cadastro consistente</span>}</td></tr>)}</tbody></table>
        {displayed.length===0 && <div className="p-10 text-center text-xs text-slate-500">Nenhum registro encontrado para este filtro.</div>}
      </div>
    </div>
  </div>;
};
