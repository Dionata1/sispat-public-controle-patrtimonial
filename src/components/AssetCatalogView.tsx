import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Search, 
  Filter, 
  Plus, 
  QrCode, 
  FileSpreadsheet, 
  FileText, 
  ChevronRight, 
  DollarSign, 
  MapPin, 
  User, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  AlertTriangle,
  Download,
  Edit
} from 'lucide-react';
import { Patrimonio, CategoriaPatrimonio, SituacaoPatrimonio, UserProfile } from '../types';

interface AssetCatalogViewProps {
  patrimonios: Patrimonio[];
  onSelectAsset: (asset: Patrimonio) => void;
  onEditAsset: (asset: Patrimonio) => void;
  onOpenNewModal: () => void;
  onExportExcel: () => void;
  onGeneratePDF: (title: string, items: Patrimonio[]) => void;
  onGenerateEtiquetasPDF: (items: Patrimonio[]) => void;
  currentUser: UserProfile;
  externalSearchTerm?: string;
}

export const AssetCatalogView: React.FC<AssetCatalogViewProps> = ({
  patrimonios,
  onSelectAsset,
  onEditAsset,
  onOpenNewModal,
  onExportExcel,
  onGeneratePDF,
  onGenerateEtiquetasPDF,
  currentUser,
  externalSearchTerm = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('TODAS');
  const [selectedSituacao, setSelectedSituacao] = useState<string>('TODAS');
  const [selectedBloco, setSelectedBloco] = useState<string>('TODOS');
  const [onlyDefects, setOnlyDefects] = useState<boolean>(false);

  useEffect(() => {
    setSearchTerm(externalSearchTerm);
  }, [externalSearchTerm]);

  // Filter lists
  const categorias: CategoriaPatrimonio[] = ['Informática', 'Móveis', 'Laboratório', 'Redes', 'Áudio & Vídeo', 'Ferramentas', 'Eletrodomésticos'];
  const situacoes: SituacaoPatrimonio[] = ['Disponível', 'Em uso', 'Emprestado', 'Em manutenção', 'Danificado', 'Extraviado', 'Baixado', 'Reservado'];
  const blocos = Array.from(new Set(patrimonios.map(p => p.bloco)));

  // Helper to check if asset has defect/alert
  const isDefective = (p: Patrimonio) => {
    return (
      p.situacao === 'Danificado' ||
      p.situacao === 'Em manutenção' ||
      p.situacao === 'Extraviado' ||
      p.estadoConservacao === 'Ruim' ||
      p.estadoConservacao === 'Inoperante' ||
      /DEFEITO|QUEBRADO|AVARIA|DANIFICADO|INOPERANTE|NÃO DÁ PRA VER|NÃO DA PRA VER|PÉ QUEBRADO|FALTANDO|DEFEITO/i.test(p.nome) ||
      /DEFEITO|AVARIA|QUEBRADO|FALTANDO|AVISO/i.test(p.observacoes)
    );
  };

  // Filtered Assets
  const filtered = patrimonios.filter(p => {
    const matchesSearch = 
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigoPatrimonial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigoBarras.includes(searchTerm) ||
      p.numeroSerie.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.responsavelNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.laboratorio.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCat = selectedCategoria === 'TODAS' || p.categoria === selectedCategoria;
    const matchesSit = selectedSituacao === 'TODAS' || p.situacao === selectedSituacao;
    const matchesBloco = selectedBloco === 'TODOS' || p.bloco === selectedBloco;
    const matchesDefect = !onlyDefects || isDefective(p);

    return matchesSearch && matchesCat && matchesSit && matchesBloco && matchesDefect;
  });

  const totalValorFiltrado = filtered.reduce((acc, curr) => acc + curr.valor, 0);
  const canEdit = currentUser.role === 'ADMIN' || currentUser.role === 'GESTOR' || currentUser.role === 'TECNICO';

  return (
    <div className="space-y-6">
      
      {/* Top Header & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <Box className="w-4 h-4" /> Catálogo Geral de Ativos Públicos
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            Bens Patrimoniais Registrados
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Exibindo {filtered.length} de {patrimonios.length} bens tombados com valor acumulado de R$ {totalValorFiltrado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenNewModal}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-lg shadow-emerald-900/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cadastro</span>
          </button>

          <button
            onClick={() => onGenerateEtiquetasPDF(filtered)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition shadow-lg shadow-purple-900/20 active:scale-95"
            title="Gerar Folha de Etiquetas em PDF com QR Codes para Impressão"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimir Etiquetas QR</span>
          </button>

          <button
            onClick={() => onGeneratePDF('Relatório de Bens Patrimoniais', filtered)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl transition active:scale-95"
          >
            <FileText className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">PDF Oficial</span>
          </button>

          <button
            onClick={onExportExcel}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl transition active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Excel</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, tombo, série..."
              className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl pl-9 pr-3 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Categoria Filter */}
          <select
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
            className="bg-slate-950 text-slate-200 text-xs rounded-xl px-3 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="TODAS">Todas as Categorias</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Situação Filter */}
          <select
            value={selectedSituacao}
            onChange={(e) => setSelectedSituacao(e.target.value)}
            className="bg-slate-950 text-slate-200 text-xs rounded-xl px-3 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="TODAS">Todas as Situações</option>
            {situacoes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Bloco Filter */}
          <select
            value={selectedBloco}
            onChange={(e) => setSelectedBloco(e.target.value)}
            className="bg-slate-950 text-slate-200 text-xs rounded-xl px-3 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="TODOS">Todos os Blocos</option>
            {blocos.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          {/* Defect Filter Toggle */}
          <button
            type="button"
            onClick={() => setOnlyDefects(!onlyDefects)}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold text-xs transition border ${
              onlyDefects
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>⚠️ Apenas Defeitos / Alertas</span>
          </button>

        </div>
      </div>

      {/* Asset Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-4">
          <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto text-blue-400">
            <Box className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">Nenhum bem patrimonial cadastrado</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              O sistema está limpo e pronto para receber o cadastro dos seus bens públicos. Clique no botão abaixo para adicionar o primeiro patrimônio.
            </p>
          </div>
          <button
            onClick={onOpenNewModal}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow-lg shadow-emerald-900/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Primeiro Patrimônio</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4">
          {filtered.map(p => {
            const isOk = p.situacao === 'Disponível' || p.situacao === 'Em uso';
            const isMaint = p.situacao === 'Em manutenção';
            const isLoan = p.situacao === 'Emprestado';

            return (
              <div
                key={p.id}
                onClick={() => onSelectAsset(p)}
                className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition shadow-md group relative overflow-hidden"
              >
                <div>
                  {/* Badges & Header */}
                  <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-800/80">
                    <span className="font-mono text-xs font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg shadow-sm">
                      {p.codigoPatrimonial}
                    </span>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shadow border ${
                      isOk
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                        : isMaint
                        ? 'bg-amber-950/80 text-amber-400 border-amber-500/40'
                        : isLoan
                        ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40'
                        : 'bg-rose-950/80 text-rose-400 border-rose-500/40'
                    }`}>
                      {p.situacao}
                    </span>
                  </div>

                  {/* Title & Info */}
                  <h3 className="font-extrabold text-slate-100 text-sm line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
                    {p.nome}
                  </h3>

                  {isDefective(p) && (
                    <div className="mt-2 px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 rounded-lg text-amber-300 font-extrabold text-[10px] flex items-center gap-1.5 shadow-sm">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">⚠️ COM DEFEITO OU AVARIA</span>
                    </div>
                  )}

                  <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{p.bloco} • {p.sala}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{p.responsavelNome}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Financial & Details */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Valor Tombado</span>
                    <span className="font-bold text-slate-200">
                      R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditAsset(p);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                        title="Editar Patrimônio"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="text-blue-400 font-bold flex items-center gap-0.5 text-xs group-hover:translate-x-1 transition-transform">
                      Ficha <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
