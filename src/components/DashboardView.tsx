import React from 'react';
import { 
  Box, 
  Package,
  DollarSign, 
  Wrench, 
  Handshake, 
  AlertTriangle, 
  ClipboardCheck, 
  TrendingUp, 
  Plus, 
  QrCode, 
  FileSpreadsheet, 
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Patrimonio, Movimentacao, Manutencao, Emprestimo, InventarioSessao, ActiveTab } from '../types';

interface DashboardViewProps {
  patrimonios?: Patrimonio[];
  movimentacoes?: Movimentacao[];
  manutencoes?: Manutencao[];
  emprestimos?: Emprestimo[];
  inventarioSessao?: InventarioSessao;
  onSelectTab?: (tab: ActiveTab) => void;
  onNavigate?: (tab: ActiveTab) => void;
  onOpenNewAssetModal?: () => void;
  onOpenScanner?: () => void;
  onExportExcel?: () => void;
  onGeneratePDF?: (title: string, items: Patrimonio[]) => void;
  onSelectAsset?: (asset: Patrimonio) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  patrimonios = [],
  movimentacoes = [],
  manutencoes = [],
  emprestimos = [],
  inventarioSessao,
  onSelectTab,
  onNavigate,
  onOpenNewAssetModal,
  onOpenScanner,
  onExportExcel,
  onSelectAsset,
}) => {
  const handleTabChange = (tab: ActiveTab) => {
    if (onSelectTab) onSelectTab(tab);
    if (onNavigate) onNavigate(tab);
  };

  // Real-time calculations
  const safePatrimonios = patrimonios || [];
  const safeMovimentacoes = movimentacoes || [];
  const totalBens = safePatrimonios.length;
  const valorTotal = safePatrimonios.reduce((acc, curr) => acc + (curr.valor || 0), 0);
  const emManutencaoCount = safePatrimonios.filter(p => p.situacao === 'Em manutenção').length;
  const emprestadosCount = safePatrimonios.filter(p => p.situacao === 'Emprestado').length;
  const inoperantesOuBaixados = safePatrimonios.filter(p => p.situacao === 'Baixado' || p.situacao === 'Danificado' || p.situacao === 'Extraviado').length;
  const disponiveisCount = safePatrimonios.filter(p => p.situacao === 'Disponível' || p.situacao === 'Em uso').length;

  const pctInventario = (inventarioSessao?.totalEsperado || 0) > 0
    ? Math.round(((inventarioSessao?.totalEncontrados || 0) / (inventarioSessao?.totalEsperado || 1)) * 100)
    : 100;

  // Categories distribution
  const categoriasMap: Record<string, number> = {};
  safePatrimonios.forEach(p => {
    categoriasMap[p.categoria] = (categoriasMap[p.categoria] || 0) + 1;
  });

  // Calculate warranties expiring in next 180 days
  const now = new Date();
  const garantiasProximas = patrimonios.filter(p => {
    if (!p.garantiaVencimento) return false;
    const vDate = new Date(p.garantiaVencimento);
    const diffDays = Math.ceil((vDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return diffDays > 0 && diffDays <= 180;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-600/10 to-transparent pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Painel do Gestor Público
              </span>
              <span className="text-xs text-slate-400">
                Última sincronização: {new Date().toLocaleTimeString('pt-BR')}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tracking-tight">
              Controle e Rastreabilidade Patrimonial
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Monitoramento transparente dos bens permanentes da instituição técnica com QR Code, auditoria em tempo real e consolidação de relatórios.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenScanner}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-lg shadow-blue-900/20 active:scale-95"
            >
              <QrCode className="w-4 h-4" />
              <span>Ler QR Code / Barras</span>
            </button>

            <button
              onClick={onOpenNewAssetModal}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-lg shadow-emerald-900/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Novo Bem</span>
            </button>

            <button
              onClick={onExportExcel}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Baixar Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Indicator Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Total Assets */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Total de Patrimônios</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Box className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">{totalBens}</div>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium mt-1">
              <CheckCircle2 className="w-3 h-3" /> {disponiveisCount} ativos operacionais
            </span>
          </div>
        </div>

        {/* Total Financial Value */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Valor Total Tombado</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-white">
              R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 font-medium mt-1 block">
              Investimento público auditado
            </span>
          </div>
        </div>

        {/* In Maintenance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Em Manutenção</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">{emManutencaoCount}</div>
            <span className="text-[11px] text-amber-400 flex items-center gap-1 font-medium mt-1">
              <Clock className="w-3 h-3" /> Ordens OS abertas
            </span>
          </div>
        </div>

        {/* On Loan */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Empréstimos Ativos</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Handshake className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">{emprestadosCount}</div>
            <span className="text-[11px] text-indigo-300 font-medium mt-1 block">
              Com termo assinado
            </span>
          </div>
        </div>

        {/* Inoperable / Discarded */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Inoperantes / Baixados</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">{inoperantesOuBaixados}</div>
            <span className="text-[11px] text-rose-400 font-medium mt-1 block">
              Aguardando descarte ou leilão
            </span>
          </div>
        </div>

        {/* Inventory Progress */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Inventário 2026</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">{pctInventario}%</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${pctInventario}%` }} 
              />
            </div>
          </div>
        </div>

      </div>

      {/* Main Charts & Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Distribution by Category */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-400" /> Distribuição por Categoria
              </h3>
              <button 
                onClick={() => handleTabChange('patrimonios')}
                className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                Ver tudo <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {Object.entries(categoriasMap).map(([cat, count]) => {
                const pct = Math.round((count / totalBens) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span className="font-medium">{cat}</span>
                      <span className="text-slate-400">{count} bens ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full rounded-full transition-all" 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 mt-6 text-xs text-slate-400">
            *Atualizado automaticamente a cada novo cadastro.
          </div>
        </div>

        {/* Recent Traceability & Movements */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Trilha Recente de Movimentações (Rastreabilidade)
              </h3>
              <button 
                onClick={() => handleTabChange('auditoria')}
                className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                Histórico completo <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {safeMovimentacoes.slice(0, 4).map((mov) => (
                <div 
                  key={mov.id} 
                  className="p-3 bg-slate-850 border border-slate-800 rounded-xl flex items-center justify-between gap-4 text-xs hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-blue-400 shrink-0">
                      {(mov.codigoPatrimonial || '000').slice(-3)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-100 flex items-center gap-2">
                        {mov.patrimonioNome}
                        <span className="text-[10px] font-mono text-slate-400">({mov.codigoPatrimonial})</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        <span className="text-amber-400 font-medium">{mov.tipoOperacao}:</span> {mov.localAnterior} → <span className="text-slate-200">{mov.localNovo}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {mov.dataHora ? new Date(mov.dataHora).toLocaleDateString('pt-BR') : ''}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Por {(mov.usuarioNome || 'Sistema').split(' ')[0]}
                    </span>
                  </div>
                </div>
              ))}
              {safeMovimentacoes.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500">Nenhuma movimentação registrada recentemente.</div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 mt-6 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" /> Registro de trilha imutável em conformidade com as normas públicas.
            </span>
            <button 
              onClick={() => handleTabChange('auditoria')}
              className="text-blue-400 font-semibold hover:underline"
            >
              Auditoria em Tempo Real →
            </button>
          </div>
        </div>

      </div>

      {/* Lower Section: Warranties Alert & Asset Catalog Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Expiring Warranties Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" /> Garantias Próximas do Vencimento
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {garantiasProximas.length} alertas
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {garantiasProximas.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                Nenhum bem com garantia expirando nos próximos 180 dias.
              </p>
            ) : (
              garantiasProximas.map(p => (
                <div 
                  key={p.id}
                  onClick={() => onSelectAsset && onSelectAsset(p)}
                  className="p-3 bg-amber-950/20 border border-amber-800/30 rounded-xl flex items-center justify-between gap-3 text-xs cursor-pointer hover:border-amber-500/50 transition"
                >
                  <div>
                    <span className="font-bold text-slate-200 block">{p.nome}</span>
                    <span className="text-[10px] text-amber-400/90 font-mono">
                      Vence em: {new Date(p.garantiaVencimento).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-500/20 text-amber-300">
                    {p.codigoPatrimonial}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Asset Quick View Grid */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Box className="w-4 h-4 text-blue-400" /> Principais Ativos do Instituto
            </h3>
            <button 
              onClick={() => handleTabChange('patrimonios')}
              className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-medium"
            >
              Ver todos os {totalBens} patrimônios →
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {safePatrimonios.slice(0, 4).map(p => (
              <div 
                key={p.id}
                onClick={() => onSelectAsset && onSelectAsset(p)}
                className="p-3 bg-slate-850 border border-slate-800 rounded-xl flex gap-3 cursor-pointer hover:border-blue-500/50 transition"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Package className="w-5 h-5" />
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold text-blue-400">{p.codigoPatrimonial}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      p.situacao === 'Disponível' || p.situacao === 'Em uso'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : p.situacao === 'Em manutenção'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {p.situacao}
                    </span>
                  </div>
                  <h4 className="font-semibold text-xs text-slate-100 truncate mt-0.5">{p.nome}</h4>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {p.bloco} - {p.sala}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
