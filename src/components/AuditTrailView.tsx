import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  FileText, 
  FileSpreadsheet, 
  Clock, 
  User, 
  Lock, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AuditLog, UserProfile } from '../types';

interface AuditTrailViewProps {
  logs: AuditLog[];
  onExportExcel: () => void;
  currentUser: UserProfile;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({
  logs,
  onExportExcel,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntidade, setSelectedEntidade] = useState<string>('TODAS');

  const entidades = ['Patrimônio', 'Inventário', 'Manutenção', 'Empréstimo', 'Movimentação', 'Sistema'];

  const filtered = logs.filter(log => {
    const matchesSearch = 
      log.usuarioNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.acao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entidadeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.detalhe.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEntidade = selectedEntidade === 'TODAS' || log.entidade === selectedEntidade;

    return matchesSearch && matchesEntidade;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" /> Trilha Imutável de Auditoria Pública
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            Logs de Registro de Operações
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Rastreabilidade completa de todas as alterações, acessos, movimentações e baixas realizadas no sistema.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-2 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Audit Stream Ativo</span>
          </div>

          <button
            onClick={onExportExcel}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exportar Trilha</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por usuário, ação, tombo ou detalhe..."
            className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl pl-9 pr-3 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={selectedEntidade}
          onChange={(e) => setSelectedEntidade(e.target.value)}
          className="bg-slate-950 text-slate-200 text-xs rounded-xl px-3 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500 min-w-[200px]"
        >
          <option value="TODAS">Todas as Entidades</option>
          {entidades.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Perfil</th>
                <th className="py-3 px-4">Ação / Evento</th>
                <th className="py-3 px-4">Entidade / Tombo</th>
                <th className="py-3 px-4">Detalhes da Operação</th>
                <th className="py-3 px-4">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-slate-850/60 transition">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(log.dataHora).toLocaleString('pt-BR')}
                  </td>

                  <td className="py-3 px-4 font-bold text-slate-100 whitespace-nowrap">
                    {log.usuarioNome}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {log.usuarioPerfil}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-semibold text-emerald-400 whitespace-nowrap">
                    {log.acao}
                  </td>

                  <td className="py-3 px-4 font-mono font-bold text-amber-300 whitespace-nowrap">
                    {log.entidadeId}
                  </td>

                  <td className="py-3 px-4 text-slate-300 max-w-md">
                    {log.detalhe}
                  </td>

                  <td className="py-3 px-4 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                    {log.ip}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
