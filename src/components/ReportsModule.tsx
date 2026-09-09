import React from 'react';
import { 
  FileText, 
  FileSpreadsheet, 
  QrCode, 
  Printer, 
  Building, 
  Wrench, 
  TrendingDown, 
  ShieldCheck,
  CheckCircle2,
  Download
} from 'lucide-react';
import { Patrimonio, UserProfile } from '../types';

interface ReportsModuleProps {
  patrimonios: Patrimonio[];
  currentUser: UserProfile;
  onExportExcel: () => void;
  onGeneratePDF: (title: string, items: Patrimonio[]) => void;
  onGenerateEtiquetasPDF: (items: Patrimonio[]) => void;
  onNavigateToConferencia?: () => void;
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  patrimonios,
  currentUser,
  onExportExcel,
  onGeneratePDF,
  onGenerateEtiquetasPDF,
  onNavigateToConferencia,
}) => {
  const reportsList = [
    {
      title: 'Relatório de Conferência Patrimonial',
      description: 'Diagnóstico da base atual com qualidade cadastral, identificadores, pendências e alertas operacionais.',
      icon: ShieldCheck,
      color: 'text-amber-400',
      action: () => {
        if (onNavigateToConferencia) onNavigateToConferencia();
      },
    },
    {
      title: 'Relatório Geral de Ativos Tombados',
      description: 'Listagem completa de todos os bens públicos registrados no acervo institucional.',
      icon: FileText,
      color: 'text-blue-400',
      action: () => onGeneratePDF('Relatório Geral de Ativos Tombados', patrimonios),
    },
    {
      title: 'Bens por Laboratório & Sala',
      description: 'Consolidação de patrimônios organizados por bloco, laboratório e ambiente físico.',
      icon: Building,
      color: 'text-emerald-400',
      action: () => onGeneratePDF('Bens por Laboratório e Ambiente', patrimonios),
    },
    {
      title: 'Equipamentos em Manutenção / Defeito',
      description: 'Relatório contendo os bens atualmente em ordem de serviço técnica.',
      icon: Wrench,
      color: 'text-amber-400',
      action: () => {
        const filtered = patrimonios.filter(p => p.situacao === 'Em manutenção' || p.situacao === 'Danificado');
        onGeneratePDF('Relatório de Equipamentos em Manutenção e Defeituosos', filtered);
      },
    },
    {
      title: 'Balanço de Depreciação Financeira',
      description: 'Demonstrativo contábil do valor original, depreciação e saldo residual dos ativos.',
      icon: TrendingDown,
      color: 'text-purple-400',
      action: () => onGeneratePDF('Balanço Contábil e Depreciação de Patrimônio', patrimonios),
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <FileText className="w-4 h-4" /> Central de Relatórios & Documentos Públicos
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            Geração de Relatórios & Etiquetas QR
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Emissão de relatórios gerenciais e documentos de apoio à conferência, inventário e prestação de contas.
          </p>
        </div>

        <button
          onClick={onExportExcel}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-lg shadow-emerald-900/20 active:scale-95"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Exportar Planilha Excel Sincronizada (.xlsx)</span>
        </button>
      </div>

      {/* Printable QR Code Labels Banner */}
      <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900 border border-purple-500/40 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-600/30 text-purple-300 rounded-2xl border border-purple-500/40 shrink-0">
            <QrCode className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">
              Emissor de Etiquetas Patrimoniais QR Code
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Gere a folha de etiquetas em PDF pronta para impressão em papel adesivo, contendo o QR Code exclusivo, código de barras EAN-13, número de tombo e alerta de inviolabilidade.
            </p>
          </div>
        </div>

        <button
          onClick={() => onGenerateEtiquetasPDF(patrimonios)}
          className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs px-6 py-3 rounded-xl transition shadow-lg shadow-purple-900/30 flex items-center gap-2 shrink-0 active:scale-95"
        >
          <Printer className="w-4 h-4" />
          <span>Gerar Folha de Etiquetas PDF</span>
        </button>
      </div>

      {/* Standard Official Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportsList.map((rep, idx) => {
          const Icon = rep.icon;

          return (
            <div 
              key={idx}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-md transition"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 bg-slate-950 rounded-xl border border-slate-800 ${rep.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {rep.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {rep.description}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">
                  Formato: PDF gerado pelo SISPAT
                </span>

                <button
                  onClick={rep.action}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Gerar PDF</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
