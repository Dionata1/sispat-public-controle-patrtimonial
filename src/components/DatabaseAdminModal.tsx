import React, { useEffect, useRef, useState } from 'react';
import { Database, Download, Upload, X, HardDrive, ShieldCheck, RefreshCw, FolderLock } from 'lucide-react';
import { downloadLocalBackup, getLocalDatabaseStatus, restoreLocalBackup } from '../services/desktopPersistence';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const DatabaseAdminModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = async () => setStatus(await getLocalDatabaseStatus());

  useEffect(() => {
    if (isOpen) void refresh();
  }, [isOpen]);

  if (!isOpen) return null;

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const backup = async () => {
    setBusy(true);
    try {
      await downloadLocalBackup();
      await refresh();
      alert('Backup do banco local gerado com sucesso.');
    } catch (e: any) {
      alert(e?.message || 'Não foi possível gerar o backup.');
    } finally {
      setBusy(false);
    }
  };

  const restore = async (file?: File) => {
    if (!file) return;
    const ok = confirm('Restaurar este backup substituirá os dados atuais do SISPAT neste computador. Deseja continuar?');
    if (!ok) return;
    setBusy(true);
    try {
      await restoreLocalBackup(file);
      alert('Backup restaurado. O SISPAT será recarregado agora.');
      window.location.reload();
    } catch (e: any) {
      alert(e?.message || 'Não foi possível restaurar o backup.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-950 to-blue-950/40">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"><Database className="w-6 h-6" /></div>
            <div>
              <h2 className="text-lg font-black text-white">Banco de Dados Local</h2>
              <p className="text-xs text-slate-400">SISPAT Public 4.0 Desktop</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div className={`rounded-2xl border p-4 ${status?.connected ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500/30'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ShieldCheck className={`w-5 h-5 ${status?.connected ? 'text-emerald-400' : 'text-rose-400'}`} />
                <div>
                  <p className="text-sm font-black text-white">{status?.connected ? 'Banco local conectado' : 'Banco local indisponível'}</p>
                  <p className="text-[11px] text-slate-400">{status?.type || 'IndexedDB / LevelDB local'}</p>
                </div>
              </div>
              <button onClick={() => void refresh()} className="p-2 rounded-xl bg-slate-900/70 text-slate-300 hover:text-white" title="Atualizar status"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800"><p className="text-[10px] uppercase font-bold text-slate-500">Registros internos</p><p className="text-xl font-black text-white mt-1">{status?.entries ?? 0}</p></div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800"><p className="text-[10px] uppercase font-bold text-slate-500">Uso aproximado</p><p className="text-xl font-black text-white mt-1">{formatBytes(status?.approxBytes || 0)}</p></div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800"><p className="text-[10px] uppercase font-bold text-slate-500">Modo</p><p className="text-sm font-black text-emerald-300 mt-2">OFFLINE / LOCAL</p></div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/20 flex gap-3">
            <FolderLock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-blue-200">Dados separados do programa</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">O banco fica no perfil local exclusivo do SISPAT em <span className="font-mono text-slate-300">{status?.profilePath || '%LOCALAPPDATA%\\SISPAT Public\\EdgeProfile'}</span>. Atualizar o executável não zera os dados.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button disabled={busy} onClick={() => void backup()} className="p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-left transition flex items-center gap-3">
              <Download className="w-5 h-5" /><div><p className="text-xs font-black">Fazer Backup</p><p className="text-[10px] text-emerald-100">Exporta todos os dados em arquivo .json</p></div>
            </button>
            <button disabled={busy} onClick={() => fileRef.current?.click()} className="p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-left transition flex items-center gap-3">
              <Upload className="w-5 h-5" /><div><p className="text-xs font-black">Restaurar Backup</p><p className="text-[10px] text-indigo-100">Substitui a base local por um backup</p></div>
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void restore(e.target.files?.[0])} />
          </div>

          <div className="text-[10px] text-slate-500 flex items-start gap-2"><HardDrive className="w-4 h-4 shrink-0" /><p>Esta edição é destinada a uso local em um computador. Para vários computadores compartilharem a mesma base simultaneamente, use posteriormente a edição servidor/online.</p></div>
        </div>
      </div>
    </div>
  );
};
