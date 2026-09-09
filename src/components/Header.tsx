import React from 'react';
import { 
  Building2, 
  QrCode, 
  Search, 
  ShieldCheck, 
  UserCheck, 
  Bell, 
  Trash2,
  FileSpreadsheet,
  Smartphone,
  Monitor,
  LogOut,
  KeyRound,
  User,
  Database
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';

interface HeaderProps {
  currentUser: UserProfile;
  onUserRoleChange: (role: UserRole) => void;
  onOpenScanner: () => void;
  onGlobalSearch?: (term: string) => void;
  globalSearchTerm?: string;
  alertsCount?: number;
  onExportExcel: () => void;
  onResetData: () => void;
  onLogout: () => void;
  onOpenLogin: () => void;
  onOpenDatabaseAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onUserRoleChange,
  onOpenScanner,
  onGlobalSearch,
  globalSearchTerm = '',
  alertsCount = 0,
  onExportExcel,
  onResetData,
  onLogout,
  onOpenLogin,
  onOpenDatabaseAdmin,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          
          {/* Logo & Institution Branding */}
          <div className="flex items-center space-x-3 min-w-max">
            <div className="p-2 bg-blue-600 rounded-xl shadow-inner flex items-center justify-center">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">SISPAT</span>
                <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                  Público Auditável
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden md:block">
                Gestão Patrimonial e Rastreabilidade do Setor Público
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md hidden sm:block relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={globalSearchTerm}
              onChange={(e) => onGlobalSearch && onGlobalSearch(e.target.value)}
              placeholder="Buscar por tombo, QR, série ou nome..."
              className="w-full bg-slate-800/80 text-slate-100 text-xs rounded-xl pl-9 pr-4 py-2 border border-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>

          {/* Action Buttons & User Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Quick QR Scanner Button */}
            <button
              onClick={onOpenScanner}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition shadow-sm active:scale-95"
              title="Abrir Leitor de QR Code / Código de Barras"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">Scanner QR</span>
            </button>

            {/* Excel Export Quick Button */}
            <button
              onClick={onExportExcel}
              className="p-2 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition relative"
              title="Exportar Planilha Sincronizada Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>

            {/* Alerts Notification Badge */}
            <div className="relative">
              <button 
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="Alertas e Notificações de Auditoria"
              >
                <Bell className="w-4 h-4" />
                {alertsCount > 0 && (
                  <span className="absolute top-1 right-1 bg-amber-500 text-slate-950 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                    {alertsCount}
                  </span>
                )}
              </button>
            </div>

            {/* Role Switcher Selector & Auth Controls */}
            <div className="border-l border-slate-700 pl-2 sm:pl-3 flex items-center gap-2">
              <div className="hidden xl:block text-right">
                <p className="text-xs font-semibold text-slate-200 truncate max-w-[160px]">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">{currentUser.email}</p>
              </div>

              {/* Account Role Badge */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold ${
                  currentUser.role === 'ADMIN'
                    ? 'bg-red-600/20 text-red-400 border-red-500/30'
                    : currentUser.role === 'GESTOR'
                    ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30'
                    : currentUser.role === 'AUDITOR'
                    ? 'bg-amber-600/20 text-amber-400 border-amber-500/30'
                    : currentUser.role === 'OPERADOR'
                    ? 'bg-sky-600/20 text-sky-400 border-sky-500/30'
                    : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                }`}
                title={`Perfil ativo: ${currentUser.role}`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{currentUser.role}</span>
              </div>

              {/* Login / Logout Button */}
              <button
                onClick={onOpenLogin}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="Alternar Usuário / Entrar com outra conta"
              >
                <KeyRound className="w-4 h-4" />
              </button>

              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                title="Sair da Conta (Logout)"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Banco local - somente Admin */}
              {currentUser.role === 'ADMIN' && onOpenDatabaseAdmin && (
                <button
                  onClick={onOpenDatabaseAdmin}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-emerald-300 hover:text-white hover:bg-emerald-600 rounded-lg transition border border-emerald-500/30"
                  title="Banco local, backup e restauração"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span className="hidden 2xl:inline text-[10px] font-bold">Banco</span>
                </button>
              )}

              {/* Zerar Sistema - somente Admin */}
              {currentUser.role === 'ADMIN' && (
                <button
                  onClick={onResetData}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-rose-300 hover:text-white hover:bg-rose-600 rounded-lg transition border border-rose-500/30"
                  title="Zerar todo o sistema e manter apenas o acesso admin"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden 2xl:inline text-[10px] font-bold">Zerar</span>
                </button>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
