import React, { useState } from 'react';
import { QrCode, Printer, FileText, Check, X, Shield, LayoutGrid, CheckSquare, Square } from 'lucide-react';
import { Patrimonio, LabelTemplateModel } from '../types';
import { generateAssetLabelsPDF } from '../utils/labelGenerator';

interface LabelPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  patrimonios: Patrimonio[];
  initialSelectedId?: string;
}

export const LabelPrintModal: React.FC<LabelPrintModalProps> = ({
  isOpen,
  onClose,
  patrimonios,
  initialSelectedId,
}) => {
  const [template, setTemplate] = useState<LabelTemplateModel>('A4_SHEET_24');
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialSelectedId ? [initialSelectedId] : patrimonios.slice(0, 12).map(p => p.id)
  );
  const [institutionName, setInstitutionName] = useState('SISPAT - GESTÃO PATRIMONIAL PÚBLICA');
  const [generating, setGenerating] = useState(false);

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    if (selectedIds.length === patrimonios.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(patrimonios.map(p => p.id));
    }
  };

  const toggleItem = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handlePrint = async () => {
    const itemsToPrint = patrimonios.filter(p => selectedIds.includes(p.id));
    if (itemsToPrint.length === 0) {
      alert('Selecione ao menos um patrimônio para gerar etiquetas.');
      return;
    }

    try {
      setGenerating(true);
      const doc = await generateAssetLabelsPDF(itemsToPrint, template, institutionName);
      doc.save(`etiquetas-sispat-${template.toLowerCase()}-${Date.now()}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar etiquetas PDF:', error);
      alert('Falha ao gerar o PDF de etiquetas.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Printer className="w-4 h-4" /> Impressão de Etiquetas & Plaquetas QR Code
            </div>
            <h3 className="text-xl font-black text-white mt-1">Gerador de Etiquetas Patrimoniais</h3>
            <p className="text-xs text-slate-400 mt-1">
              Gere arquivos PDF formatados para impressoras térmicas e folhas A4 adesivas padrão.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Selector Grid */}
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-2">
            Selecione o Modelo de Impressora / Papel:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            
            <button
              type="button"
              onClick={() => setTemplate('A4_SHEET_24')}
              className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between space-y-2 ${
                template === 'A4_SHEET_24'
                  ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-lg shadow-indigo-950/40'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <LayoutGrid className="w-5 h-5 text-indigo-400" />
              <div>
                <p className="font-bold text-white text-xs">Folha A4 Adesiva</p>
                <p className="text-[10px] text-slate-400">24 etiquetas (63,5 x 33,9mm)</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTemplate('ZEBRA_100X50')}
              className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between space-y-2 ${
                template === 'ZEBRA_100X50'
                  ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-lg shadow-indigo-950/40'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Printer className="w-5 h-5 text-amber-400" />
              <div>
                <p className="font-bold text-white text-xs">Zebra Térmica</p>
                <p className="text-[10px] text-slate-400">Plaqueta 100x50mm</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTemplate('BROTHER_62MM')}
              className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between space-y-2 ${
                template === 'BROTHER_62MM'
                  ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-lg shadow-indigo-950/40'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <QrCode className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="font-bold text-white text-xs">Brother Térmica</p>
                <p className="text-[10px] text-slate-400">Fita 62x29mm</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTemplate('ARGOX_80X40')}
              className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between space-y-2 ${
                template === 'ARGOX_80X40'
                  ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-lg shadow-indigo-950/40'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <FileText className="w-5 h-5 text-sky-400" />
              <div>
                <p className="font-bold text-white text-xs">Argox Industrial</p>
                <p className="text-[10px] text-slate-400">Etiqueta 80x40mm</p>
              </div>
            </button>

          </div>
        </div>

        {/* Institution Name Input */}
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1">
            Cabeçalho / Nome da Instituição na Etiqueta:
          </label>
          <input
            type="text"
            value={institutionName}
            onChange={(e) => setInstitutionName(e.target.value)}
            className="w-full bg-slate-950 text-slate-100 text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Asset Selection List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-300">
              Patrimônios Selecionados ({selectedIds.length} de {patrimonios.length}):
            </label>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              {selectedIds.length === patrimonios.length ? (
                <> <CheckSquare className="w-3.5 h-3.5" /> Desmarcar Todos </>
              ) : (
                <> <Square className="w-3.5 h-3.5" /> Selecionar Todos </>
              )}
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto bg-slate-950 border border-slate-800 rounded-2xl p-2 space-y-1 divide-y divide-slate-800/60">
            {patrimonios.map(item => {
              const isChecked = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className="flex items-center justify-between p-2 rounded-xl cursor-pointer hover:bg-slate-900 transition text-xs"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // Controlled via row click
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <p className="font-mono font-bold text-indigo-400 text-[11px]">{item.codigoPatrimonial}</p>
                      <p className="font-semibold text-white text-xs line-clamp-1">{item.nome}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {item.laboratorio || item.sala || 'Geral'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            <span className="font-bold text-slate-300">PDF com QR Code de Alta Resolução</span> (Vetorizado)
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={generating || selectedIds.length === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-lg ${
                selectedIds.length > 0 && !generating
                  ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/30 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>{generating ? 'Gerando PDF...' : `Baixar PDF (${selectedIds.length})`}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
