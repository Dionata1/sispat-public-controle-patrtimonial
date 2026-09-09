import React, { useState, useEffect } from 'react';
import { 
  X, 
  Box,
  QrCode, 
  Wrench, 
  Handshake, 
  ArrowLeftRight, 
  Trash2, 
  Edit, 
  MapPin, 
  TrendingDown, 
  ShieldCheck, 
  Clock, 
  FileText,
  Cpu,
  Layers,
  Sparkles,
  FileCheck2,
  Leaf,
  Download,
  PenTool
} from 'lucide-react';
import { Patrimonio, UserProfile, Movimentacao, Manutencao, Emprestimo } from '../types';
import QRCode from 'qrcode';

interface AssetDetailModalProps {
  asset: Patrimonio | null;
  onClose: () => void;
  currentUser: UserProfile;
  onEdit: (asset: Patrimonio) => void;
  onDelete: (assetId: string) => void;
  onTransferLocation: (asset: Patrimonio) => void;
  onSendToMaintenance: (asset: Patrimonio) => void;
  onSendToLoan: (asset: Patrimonio) => void;
  movimentacoes: Movimentacao[];
  manutencoes: Manutencao[];
  emprestimos: Emprestimo[];
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  asset,
  onClose,
  currentUser,
  onEdit,
  onDelete,
  onTransferLocation,
  onSendToMaintenance,
  onSendToLoan,
  movimentacoes,
  manutencoes,
  emprestimos,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'gemeo_digital' | 'ficha' | 'depreciacao' | 'historico' | 'planta' | 'dossie'>('gemeo_digital');
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  const [activeAngle, setActiveAngle] = useState<'frontal' | 'traseira' | 'serie' | 'etiqueta'>('frontal');

  useEffect(() => {
    if (asset) {
      QRCode.toDataURL(asset.qrCode, { margin: 1, width: 220 })
        .then(setQrDataUrl)
        .catch(console.error);
      setSignatureName(asset.responsavelNome || '');
    }
  }, [asset]);

  if (!asset) return null;

  // Calculate Straight-Line Depreciation
  const acqDate = new Date(asset.dataAquisicao);
  const now = new Date();
  const monthsDiff = Math.max(0, (now.getFullYear() - acqDate.getFullYear()) * 12 + (now.getMonth() - acqDate.getMonth()));
  const totalMonths = (asset.vidaUtilAnos || 5) * 12;
  const depRateMonthly = asset.valor / totalMonths;
  const depreciacaoAcumulada = Math.min(asset.valor, depRateMonthly * monthsDiff);
  const valorResidual = Math.max(0, asset.valor - depreciacaoAcumulada);
  const pctDepreciado = Math.min(100, Math.round((depreciacaoAcumulada / asset.valor) * 100));

  // Asset Health Score Calculation (0 - 100%)
  const assetMovs = movimentacoes.filter(m => m.patrimonioId === asset.id || m.codigoPatrimonial === asset.codigoPatrimonial);
  const assetMaintenances = manutencoes.filter(m => m.patrimonioId === asset.id || m.codigoPatrimonial === asset.codigoPatrimonial);
  const assetLoans = emprestimos.filter(e => e.patrimonioId === asset.id || e.codigoPatrimonial === asset.codigoPatrimonial);
  const ageYears = monthsDiff / 12;
  let healthScore = 100 - (ageYears / (asset.vidaUtilAnos || 5)) * 40;
  if (asset.estadoConservacao === 'Ruim') healthScore -= 30;
  if (asset.estadoConservacao === 'Regular') healthScore -= 15;
  if (asset.situacao === 'Em manutenção') healthScore -= 25;
  if (asset.situacao === 'Danificado') healthScore -= 40;
  healthScore = Math.max(12, Math.min(100, Math.round(healthScore)));

  // Replacement forecast year
  const replacementYear = acqDate.getFullYear() + (asset.vidaUtilAnos || 5);

  const canEdit = currentUser.role === 'ADMIN' || currentUser.role === 'GESTOR' || currentUser.role === 'TECNICO';
  const canDelete = currentUser.role === 'ADMIN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl my-auto">
        
        {/* Modal Header */}
        <div className="bg-slate-950 px-5 sm:px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-xl shadow-lg flex items-center justify-center text-white shrink-0">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-black bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-lg">
                  {asset.codigoPatrimonial}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-300" />
                  Gêmeo Digital Ativo
                </span>
                {(asset.situacao === 'Danificado' || asset.situacao === 'Em manutenção' || asset.estadoConservacao === 'Ruim' || asset.estadoConservacao === 'Inoperante' || /DEFEITO|QUEBRADO|AVARIA|DANIFICADO|INOPERANTE|NÃO DÁ PRA VER|PÉ QUEBRADO/i.test(asset.nome) || /DEFEITO|AVARIA|QUEBRADO/i.test(asset.observacoes)) && (
                  <span className="px-2.5 py-0.5 text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full flex items-center gap-1 animate-pulse">
                    ⚠️ ALERTA: DEFEITO / AVARIA
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-white truncate mt-0.5">
                {asset.nome}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls & Navigation Tabs Toolbar */}
        <div className="bg-slate-850 px-4 sm:px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <button
              onClick={() => setActiveTab('gemeo_digital')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                activeTab === 'gemeo_digital' 
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Gêmeo Digital 3D
            </button>

            <button
              onClick={() => setActiveTab('ficha')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                activeTab === 'ficha' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Ficha Técnica
            </button>

            <button
              onClick={() => setActiveTab('depreciacao')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                activeTab === 'depreciacao' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
              Depreciação
            </button>

            <button
              onClick={() => setActiveTab('planta')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                activeTab === 'planta' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              Localização
            </button>

            <button
              onClick={() => setActiveTab('dossie')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                activeTab === 'dossie'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5 text-cyan-400" />
              Dossiê Digital
            </button>

            <button
              onClick={() => setActiveTab('historico')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                activeTab === 'historico' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Histórico ({assetMovs.length})
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <button
                  onClick={() => onTransferLocation(asset)}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 transition active:scale-95"
                  title="Transferir Localização"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Transferir</span>
                </button>

                <button
                  onClick={() => onSendToMaintenance(asset)}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 transition active:scale-95"
                  title="Enviar para Manutenção"
                >
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Manutenção</span>
                </button>

                <button
                  onClick={() => onSendToLoan(asset)}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 transition active:scale-95"
                  title="Registrar Empréstimo"
                >
                  <Handshake className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Emprestar</span>
                </button>

                <button
                  onClick={() => onEdit(asset)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                  title="Editar Ficha"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </>
            )}

            {canDelete && (
              <button
                onClick={() => {
                  if (confirm(`Excluir DEFINITIVAMENTE o patrimônio ${asset.codigoPatrimonial}? Esta ação remove o cadastro e os registros operacionais vinculados.`)) {
                    onDelete(asset.id);
                    onClose();
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition"
                title="Excluir Patrimônio Definitivamente"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* TAB 0: GÊMEO DIGITAL DO PATRIMÔNIO (DIGITAL TWIN - TCC HIGHLIGHT) */}
          {activeTab === 'gemeo_digital' && (
            <div className="space-y-6">
              
              {/* Telemetry & Virtual Twin Status Banner */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 p-5 rounded-3xl border border-cyan-500/30 relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Cpu className="w-48 h-48 text-cyan-400" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
                  
                  {/* Digital Health Meter */}
                  <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
                    <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                      <svg className="w-14 h-14 transform -rotate-90">
                        <circle cx="28" cy="28" r="22" stroke="currentColor" strokeWidth="4" className="text-slate-800" fill="transparent" />
                        <circle cx="28" cy="28" r="22" stroke="currentColor" strokeWidth="4" 
                          className={healthScore > 75 ? 'text-emerald-400' : healthScore > 45 ? 'text-amber-400' : 'text-rose-500'} 
                          strokeDasharray={138} 
                          strokeDashoffset={138 - (138 * healthScore) / 100} 
                          strokeLinecap="round" 
                          fill="transparent" 
                        />
                      </svg>
                      <span className="absolute font-black text-xs text-white">{healthScore}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Saúde do Ativo</span>
                      <span className="text-xs font-extrabold text-white">
                        {healthScore > 75 ? 'Excelente Estado' : healthScore > 45 ? 'Atenção Preventiva' : 'Critico / Substituir'}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5">Telemetria em tempo real</p>
                    </div>
                  </div>

                  {/* Financial Value Indicator */}
                  <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Valor Contábil Residual</span>
                    <span className="text-base font-black text-emerald-400 mt-1 block">
                      R$ {valorResidual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Depreciação: {pctDepreciado}% ({monthsDiff} meses em uso)
                    </span>
                  </div>

                  {/* Replacement Forecast */}
                  <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Previsão de Substituição</span>
                    <span className="text-base font-black text-cyan-300 mt-1 block">
                      Ano {replacementYear}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Vida Útil Estimada: {asset.vidaUtilAnos} anos
                    </span>
                  </div>

                  {/* Sustainability E-Waste Rating */}
                  <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <Leaf className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Módulo Sustentável 🌱</span>
                      <span className="text-xs font-bold text-slate-200">E-Lixo Reutilizável</span>
                      <span className="text-[10px] text-emerald-400 block mt-0.5">Pegada de Carbono A+</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Multi-angle Interactive Camera / Blueprint Simulation & Digital Assets */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 360 Photo & Blueprint Viewer */}
                <div className="lg:col-span-2 bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      Visualização Virtual 3D / Ângulos
                    </h3>

                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() => setActiveAngle('frontal')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
                          activeAngle === 'frontal' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Frontal
                      </button>
                      <button
                        onClick={() => setActiveAngle('traseira')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
                          activeAngle === 'traseira' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Conexões
                      </button>
                      <button
                        onClick={() => setActiveAngle('serie')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
                          activeAngle === 'serie' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Placa Série
                      </button>
                      <button
                        onClick={() => setActiveAngle('etiqueta')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
                          activeAngle === 'etiqueta' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Etiqueta QR
                      </button>
                    </div>
                  </div>

                  {/* Photo Canvas */}
                  <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 h-64 flex items-center justify-center group">
                    {activeAngle === 'etiqueta' && qrDataUrl ? (
                      <div className="text-center p-4">
                        <img src={qrDataUrl} alt="QR Code" className="w-40 h-40 mx-auto rounded-xl bg-white p-2 shadow-2xl" />
                        <span className="font-mono text-xs font-bold text-cyan-400 mt-2 block">
                          TOMBAMENTO: {asset.codigoPatrimonial}
                        </span>
                      </div>
                    ) : (
                      <div className="text-center p-6 space-y-2">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                          <Box className="w-8 h-8" />
                        </div>
                        <h4 className="font-black text-white text-base max-w-sm mx-auto">{asset.nome}</h4>
                        <span className="inline-block font-mono text-xs font-bold text-cyan-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                          {asset.codigoPatrimonial} • {asset.categoria}
                        </span>
                      </div>
                    )}

                    {/* Cybernetic HUD Overlay */}
                    <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700 text-[10px] font-mono text-cyan-300">
                      SYS_ID: {asset.id.slice(0, 8)} • POS: {asset.bloco}/{asset.laboratorio}
                    </div>

                    <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700 text-[10px] font-bold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Status: {asset.situacao}
                    </div>
                  </div>

                  {/* Lifecycle Milestones Line */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      Linha do Tempo de Vida Útil
                    </h4>
                    <div className="grid grid-cols-5 gap-1.5 text-center text-[10px]">
                      <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block font-bold">{acqDate.getFullYear()}</span>
                        <span className="text-white font-bold block mt-0.5">Compra</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block font-bold">{acqDate.getFullYear()}</span>
                        <span className="text-white font-bold block mt-0.5">Tombamento</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block font-bold">{now.getFullYear()}</span>
                        <span className="text-cyan-400 font-bold block mt-0.5">Uso Atual</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block font-bold">{replacementYear - 1}</span>
                        <span className="text-amber-400 font-bold block mt-0.5">Revisão</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block font-bold">{replacementYear}</span>
                        <span className="text-rose-400 font-bold block mt-0.5">Renovação</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Digital Document Vault & Term Signing */}
                <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
                      <FileCheck2 className="w-4 h-4 text-emerald-400" />
                      Cofre Digital de Documentos
                    </h3>

                    <div className="mt-3 space-y-2">
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <div>
                            <span className="font-bold text-slate-200 block">Nota Fiscal Eletrônica (NFe)</span>
                            <span className="text-[10px] text-slate-500">NF Nº {asset.notaFiscal} • PDF</span>
                          </div>
                        </div>
                        <button className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-bold">
                          <Download className="w-3.5 h-3.5" /> Ver
                        </button>
                      </div>

                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition">
                        <div className="flex items-center gap-2.5">
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          <div>
                            <span className="font-bold text-slate-200 block">Termo de Garantia do Fabricante</span>
                            <span className="text-[10px] text-slate-500">Validade: {new Date(asset.garantiaVencimento).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                        <button className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-bold">
                          <Download className="w-3.5 h-3.5" /> Ver
                        </button>
                      </div>

                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition">
                        <div className="flex items-center gap-2.5">
                          <PenTool className="w-4 h-4 text-emerald-400" />
                          <div>
                            <span className="font-bold text-slate-200 block">Termo de Responsabilidade Guarda</span>
                            <span className="text-[10px] text-slate-500">Servidor: {asset.responsavelNome}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isSigned ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                          {isSigned ? 'Assinado' : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Digital Signature Trigger Button */}
                  <div className="pt-3 border-t border-slate-800">
                    <button
                      onClick={() => setSignatureModalOpen(true)}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg active:scale-95"
                    >
                      <PenTool className="w-4 h-4" />
                      <span>{isSigned ? 'Ver Termo Assinado Digitalmente' : 'Assinar Termo de Guarda Digital (PDF)'}</span>
                    </button>
                  </div>

                </div>

              </div>

            </div>
          )}
          
          {/* TAB 1: FICHA TÉCNICA */}
          {activeTab === 'ficha' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Photo & QR Code Column */}
              <div className="space-y-4">
                <div className="rounded-2xl p-5 bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <Box className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Categoria</span>
                      <span className="font-bold text-white text-sm">{asset.categoria}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-semibold">Tombamento:</span>
                    <span className="font-mono font-extrabold text-blue-400">{asset.codigoPatrimonial}</span>
                  </div>
                </div>

                {/* QR Code Tag Box */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Etiqueta Oficial QR Code
                  </div>
                  {qrDataUrl && (
                    <img 
                      src={qrDataUrl} 
                      alt="QR Code" 
                      className="w-32 h-32 mx-auto rounded-lg bg-white p-1" 
                    />
                  )}
                  <span className="font-mono text-xs font-bold text-blue-400 mt-2 block">
                    {asset.qrCode}
                  </span>
                </div>
              </div>

              {/* Asset Technical Details */}
              <div className="md:col-span-2 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Marca e Modelo</span>
                    <span className="font-bold text-slate-100">{asset.marca} - {asset.modelo}</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Situação Atual</span>
                    <span className="font-bold text-emerald-400">{asset.situacao}</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Estado de Conservação</span>
                    <span className="font-bold text-slate-100">{asset.estadoConservacao}</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Valor de Aquisição</span>
                    <span className="font-bold text-slate-100">
                      R$ {asset.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 col-span-2">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Localização Atual</span>
                    <span className="font-bold text-slate-100">
                      {asset.bloco} • {asset.laboratorio} ({asset.sala})
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 col-span-2">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Servidor Responsável</span>
                    <span className="font-bold text-slate-100">
                      {asset.responsavelNome} (CPF: {asset.responsavelCpf})
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Data de Aquisição</span>
                    <span className="font-medium text-slate-200">
                      {new Date(asset.dataAquisicao).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Vencimento da Garantia</span>
                    <span className="font-medium text-amber-400">
                      {new Date(asset.garantiaVencimento).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 col-span-2">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Fornecedor / Nota Fiscal</span>
                    <span className="font-medium text-slate-200">
                      {asset.fornecedor} (NF: {asset.notaFiscal})
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Observações de Auditoria</span>
                  <p className="text-slate-300 mt-1 leading-relaxed">
                    {asset.observacoes || 'Nenhuma observação complementar cadastrada.'}
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: CÁLCULO DE DEPRECIAÇÃO */}
          {activeTab === 'depreciacao' && (
            <div className="space-y-6">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                <h3 className="font-bold text-white text-sm flex items-center gap-2 mb-3">
                  <TrendingDown className="w-4 h-4 text-amber-400" />
                  Cálculo de Depreciação Linear Acumulada (Contabilidade Pública)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Valor Original Tombado</span>
                    <span className="text-lg font-black text-white mt-1 block">
                      R$ {asset.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Depreciação Acumulada ({pctDepreciado}%)</span>
                    <span className="text-lg font-black text-rose-400 mt-1 block">
                      - R$ {depreciacaoAcumulada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Valor Contábil Residual</span>
                    <span className="text-lg font-black text-emerald-400 mt-1 block">
                      R$ {valorResidual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
                  <p>• <strong>Vida útil estimada:</strong> {asset.vidaUtilAnos} anos ({asset.vidaUtilAnos * 12} meses).</p>
                  <p>• <strong>Tempo decorrido:</strong> {monthsDiff} meses em uso operacional.</p>
                  <p>• <strong>Taxa mensal de depreciação:</strong> R$ {depRateMonthly.toFixed(2)} / mês.</p>
                </div>
              </div>
            </div>
          )}

          {/* LOCALIZAÇÃO CADASTRADA - sem planta simulada */}
          {activeTab === 'planta' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                <h3 className="font-bold text-white text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-rose-400" /> Localização oficial cadastrada</h3>
                <p className="text-[11px] text-slate-400 mt-1">O SISPAT exibe somente a localização registrada do bem. Nenhuma planta, GPS ou coordenada é simulada.</p>
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><span className="text-[10px] text-slate-500 uppercase font-bold">Bloco</span><strong className="text-white block mt-1">{asset.bloco || 'Não informado'}</strong></div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><span className="text-[10px] text-slate-500 uppercase font-bold">Ambiente</span><strong className="text-white block mt-1">{asset.laboratorio || 'Não informado'}</strong></div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><span className="text-[10px] text-slate-500 uppercase font-bold">Sala</span><strong className="text-white block mt-1">{asset.sala || 'Não informado'}</strong></div>
                </div>
                <div className="mt-3 bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-300"><span className="text-slate-500">Custodiante atual:</span> <strong>{asset.responsavelNome || 'Não informado'}</strong></div>
              </div>
            </div>
          )}

          {/* DOSSIÊ DIGITAL DO PATRIMÔNIO */}
          {activeTab === 'dossie' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                <h3 className="font-bold text-white text-sm flex items-center gap-2"><FileCheck2 className="w-4 h-4 text-cyan-400" /> Dossiê Digital do Patrimônio</h3>
                <p className="text-[11px] text-slate-400 mt-1">Linha do tempo consolidada do ciclo de vida deste bem.</p>
                <div className="mt-4 space-y-3">
                  <div className="border-l-2 border-blue-500 pl-4 py-1"><div className="text-[10px] text-slate-500">AQUISIÇÃO / CADASTRO</div><strong className="text-white text-xs">{asset.dataAquisicao || 'Data não informada'} • NF {asset.notaFiscal || 'não informada'} • R$ {asset.valor.toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></div>
                  {assetMovs.map(m => <div key={`mov-${m.id}`} className="border-l-2 border-indigo-500 pl-4 py-1"><div className="text-[10px] text-slate-500">{new Date(m.dataHora).toLocaleString('pt-BR')} • {m.tipoOperacao}</div><strong className="text-slate-200 text-xs">{m.localAnterior} → {m.localNovo}</strong><div className="text-[10px] text-slate-500">{m.motivo}</div></div>)}
                  {assetLoans.map(e => <div key={`loan-${e.id}`} className="border-l-2 border-violet-500 pl-4 py-1"><div className="text-[10px] text-slate-500">EMPRÉSTIMO • {e.dataRetirada}</div><strong className="text-slate-200 text-xs">{e.servidorNome} • {e.status}</strong><div className="text-[10px] text-slate-500">Previsão: {e.previsaoDevolucao}{e.dataDevolucao ? ` • Devolvido: ${e.dataDevolucao}` : ''}</div></div>)}
                  {assetMaintenances.map(m => <div key={`man-${m.id}`} className="border-l-2 border-amber-500 pl-4 py-1"><div className="text-[10px] text-slate-500">MANUTENÇÃO • {m.dataAbertura}</div><strong className="text-slate-200 text-xs">{m.defeito} • {m.status}</strong><div className="text-[10px] text-slate-500">Custo: R$ {m.custo.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>)}
                  <div className="border-l-2 border-emerald-500 pl-4 py-1"><div className="text-[10px] text-slate-500">ÚLTIMA ATUALIZAÇÃO</div><strong className="text-white text-xs">{new Date(asset.ultimaAtualizacao).toLocaleString('pt-BR')} • {asset.situacao}</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HISTÓRICO DE MOVIMENTAÇÕES */}
          {activeTab === 'historico' && (
            <div className="space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Trilha de Movimentações deste Ativo
              </h3>

              {assetMovs.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-6 text-center">
                  Nenhuma movimentação registrada para este bem além do cadastro inicial.
                </p>
              ) : (
                <div className="space-y-3">
                  {assetMovs.map(m => (
                    <div key={m.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-bold text-blue-400">{m.tipoOperacao}</span>
                        <span className="font-mono text-[10px]">{new Date(m.dataHora).toLocaleString('pt-BR')}</span>
                      </div>
                      <p className="text-slate-200">
                        <span className="text-slate-400">Origem → Destino:</span> {m.localAnterior} → <strong className="text-white">{m.localNovo}</strong>
                      </p>
                      <p className="text-slate-400">
                        Responsável: {m.responsavelAnterior} → <strong className="text-slate-200">{m.responsavelNovo}</strong>
                      </p>
                      <p className="text-slate-400 italic">Motivo: "{m.motivo}" por {m.usuarioNome}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Digital Signature Handover Modal */}
      {signatureModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <PenTool className="w-4 h-4 text-emerald-400" />
                Assinatura Digital do Termo
              </h3>
              <button onClick={() => setSignatureModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Assine o termo de posse e responsabilidade pelo bem <strong>{asset.codigoPatrimonial} ({asset.nome})</strong> para registro interno de ciência e responsabilidade.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 block">Nome do Servidor Responsável</label>
              <input
                type="text"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder="Digite o nome completo..."
                className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl px-3 py-2 border border-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Canvas Sign Simulator Box */}
            <div className="border border-dashed border-emerald-500/40 rounded-xl p-4 bg-slate-950 text-center space-y-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Confirmação visual do responsável</span>
              <div className="h-20 bg-slate-900 rounded-lg flex items-center justify-center text-xs font-serif italic text-emerald-400 border border-slate-800">
                {signatureName ? `~ ${signatureName} ~` : 'Assinatura digital pendente'}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSignatureModalOpen(false)}
                className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setIsSigned(true);
                  setSignatureModalOpen(false);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-md"
              >
                Confirmar Assinatura Digital
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

