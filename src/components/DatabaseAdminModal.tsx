import React, { useEffect, useState } from 'react';
import { Database, Download, X, Server, FolderLock, FileText, RefreshCw, ShieldCheck } from 'lucide-react';
import { getLocalDatabaseStatus } from '../services/desktopPersistence';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const DatabaseAdminModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<any>(null);

  const refresh = async () => setStatus(await getLocalDatabaseStatus());

  useEffect(() => {
    if (isOpen) void refresh();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-950 to-blue-950/40">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"><Database className="w-6 h-6" /></div>
            <div>
              <h2 className="text-lg font-black text-white">Banco de Dados — Fonte Centralizada</h2>
              <p className="text-xs text-slate-400">SISPAT Public 4.0 (PostgreSQL / Neon)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div className={`rounded-2xl border p-4 ${status ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-950/40 border-slate-800'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-black text-white">Dados centralizados no Neon (PostgreSQL)</p>
                  <p className="text-[11px] text-slate-400">{status?.type || 'Banco local desativado — fonte única: Neon (PostgreSQL)'}</p>
                </div>
              </div>
              <button onClick={() => void refresh()} className="p-2 rounded-xl bg-slate-900/70 text-slate-300 hover:text-white" title="Atualizar status"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800"><p className="text-[10px] uppercase font-bold text-slate-500">Registros locais</p><p className="text-xl font-black text-white mt-1">{status?.entries ?? 0}</p></div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800"><p className="text-[10px] uppercase font-bold text-slate-500">Uso local</p><p className="text-xl font-black text-white mt-1">{status?.approxBytes ?? 0} B</p></div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800"><p className="text-[10px] uppercase font-bold text-slate-500">Modo</p><p className="text-sm font-black text-emerald-300 mt-2">CENTRALIZADO / NEON</p></div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/20 flex gap-3">
            <FolderLock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-blue-200">Cadastro único e persistente no banco central</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Usuários, setores, patrimônios, empréstimos, manutenções, movimentações, inventários e a trilha de auditoria residem exclusivamente no PostgreSQL (Neon). Nenhum dado de negócio é mantido em IndexedDB ou localStorage no navegador.</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex gap-3">
            <Download className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-200">Backup/restauração local desativados</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Como os dados são centralizados, não existe mais backup/restauração pelo navegador. Para exportações oficiais, utilize os relatórios PDF/Excel disponíveis no sistema.</p>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 flex items-start gap-2"><FileText className="w-4 h-4 shrink-0" /><p>Esta edição opera 100% conectada à API central (Neon). Sem conexão, os dados já carregados na sessão permanecem visíveis somente leitura e as operações de escrita são bloqueadas.</p></div>
        </div>
      </div>
    </div>
  );
};