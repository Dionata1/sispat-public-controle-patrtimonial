import React from 'react';
import { 
  LayoutDashboard, 
  QrCode, 
  Box, 
  History, 
  ClipboardCheck, 
  Wrench, 
  Handshake, 
  ShieldAlert, 
  FileText, 
  ExternalLink,
  FileCheck2,
  Users
} from 'lucide-react';
import { ActiveTab, UserRole, PermissionConfig } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab?: (tab: ActiveTab) => void;
  setActiveTab?: (tab: ActiveTab) => void;
  pendingMaintenancesCount?: number;
  activeLoansCount?: number;
  pendingInventoryCount?: number;
  totalPatrimonios?: number;
  totalManutencoes?: number;
  totalEmprestimos?: number;
  userRole?: UserRole;
  permissions?: PermissionConfig;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  setActiveTab,
  pendingMaintenancesCount = 0,
  activeLoansCount = 0,
  pendingInventoryCount = 0,
  totalManutencoes = 0,
  totalEmprestimos = 0,
  userRole = 'ADMIN',
  permissions,
}) => {
  const handleTabClick = (tabId: string) => {
    let targetTab = tabId as ActiveTab;
    if (tabId === 'scanner') targetTab = 'leitor';
    if (tabId === 'movimentacoes') targetTab = 'auditoria';

    if (onSelectTab) onSelectTab(targetTab);
    if (setActiveTab) setActiveTab(targetTab);
  };

  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard Gerencial',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'leitor' as ActiveTab,
      label: 'Leitor QR / Barras',
      icon: QrCode,
      badge: 'Leitor USB',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    },
    {
      id: 'patrimonios' as ActiveTab,
      label: 'Catálogo de Bens',
      icon: Box,
      badge: null,
    },
    {
      id: 'inventario' as ActiveTab,
      label: 'Inventário Automatizado',
      icon: ClipboardCheck,
      badge: pendingInventoryCount > 0 ? `${pendingInventoryCount} pendente` : null,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    {
      id: 'conferencia' as ActiveTab,
      label: 'Conferência Patrimonial',
      icon: FileCheck2,
      badge: 'Relatório Fiscal',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'manutencao' as ActiveTab,
      label: 'Manutenção & OS',
      icon: Wrench,
      badge: (pendingMaintenancesCount || totalManutencoes) > 0 ? `${pendingMaintenancesCount || totalManutencoes}` : null,
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    },
    {
      id: 'emprestimos' as ActiveTab,
      label: 'Controle de Empréstimos',
      icon: Handshake,
      badge: (activeLoansCount || totalEmprestimos) > 0 ? `${activeLoansCount || totalEmprestimos}` : null,
      badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    },
    {
      id: 'auditoria' as ActiveTab,
      label: 'Trilha de Auditoria',
      icon: ShieldAlert,
      badge: 'Tempo Real',
      badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    },
    {
      id: 'relatorios' as ActiveTab,
      label: 'Relatórios & Etiquetas QR',
      icon: FileText,
      badge: 'PDF / Excel',
      badgeColor: 'bg-slate-700 text-slate-300 border-slate-600',
    },
    ...(userRole === 'ADMIN' || permissions?.canManageUsers ? [{
      id: 'usuarios' as ActiveTab,
      label: 'Gestão de Usuários (RBAC)',
      icon: Users,
      badge: 'Exclusivo Admin',
      badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
    }] : []),
  ].filter((item) => {
    if (!permissions) return true;
    if (item.id === 'inventario') return permissions.canPerformInventory;
    if (item.id === 'manutencao') return permissions.canManageMaintenance || userRole === 'AUDITOR';
    if (item.id === 'emprestimos') return permissions.canManageLoans || userRole === 'AUDITOR';
    if (item.id === 'auditoria') return permissions.canViewAudit;
    if (item.id === 'relatorios' || item.id === 'conferencia') return permissions.canExportReports || permissions.canViewAudit;
    if (item.id === 'usuarios') return permissions.canManageUsers;
    return true;
  });

  return (
    <>
      {/* Mobile/Tablet Horizontal Scrollable Nav Bar (below header on small screens) */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 px-2 py-2 overflow-x-auto scrollbar-none sticky top-16 z-30 shadow-md">
        <div className="flex items-center gap-1.5 min-w-max">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || 
              (item.id === 'leitor' && activeTab === 'scanner') ||
              (item.id === 'auditoria' && activeTab === 'movimentacoes');

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label.split(' ')[0]} {item.label.split(' ')[1] || ''}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop & Smart TV Vertical Sidebar */}
      <aside className="w-64 lg:w-72 xl:w-80 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 shrink-0 hidden md:flex">
        <div className="space-y-1">
          <div className="px-3 py-2 text-[10px] uppercase font-bold tracking-wider text-slate-500">
            Módulos Administrativos
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || 
                (item.id === 'leitor' && activeTab === 'scanner') ||
                (item.id === 'auditoria' && activeTab === 'movimentacoes');

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Info Box */}
        <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-3.5 space-y-2 text-[11px] text-slate-400 mt-4">
          <div className="flex items-center justify-between font-medium text-slate-300">
            <span>Transparência Pública</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Dados locais carregados" />
          </div>
          <p className="text-slate-400 leading-relaxed text-[10px] sm:text-[11px]">
            Ativos públicos mapeados com rastreabilidade e auditoria digital em tempo real.
          </p>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span>Versão 3.1 SISPAT</span>
            <a
              href="https://www.gov.br"
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline flex items-center gap-1"
            >
              Portal GOV <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </aside>
    </>
  );
};
