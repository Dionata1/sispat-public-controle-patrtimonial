import React, { useState } from 'react';
import { Users, Shield, UserCheck, Lock, CheckCircle2, KeyRound, Plus, X, Laptop, Eye } from 'lucide-react';
import { UserProfile, UserRole, PermissionConfig } from '../types';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSwitchUserRole: (profile: UserProfile) => void;
}

export const ROLE_PERMISSIONS_MAP: Record<UserRole, PermissionConfig> = {
  ADMIN: {
    canCreateAsset: true,
    canEditAsset: true,
    canDeleteAsset: true,
    canPerformInventory: true,
    canManageLoans: true,
    canManageMaintenance: true,
    canViewAudit: true,
    canConfigureSystem: true,
    canExportReports: true,
    canManageUsers: true,
  },
  GESTOR: {
    canCreateAsset: true,
    canEditAsset: true,
    canDeleteAsset: false,
    canPerformInventory: true,
    canManageLoans: true,
    canManageMaintenance: true,
    canViewAudit: true,
    canConfigureSystem: false,
    canExportReports: true,
    canManageUsers: false,
  },
  AUDITOR: {
    canCreateAsset: false,
    canEditAsset: false,
    canDeleteAsset: false,
    canPerformInventory: true,
    canManageLoans: false,
    canManageMaintenance: false,
    canViewAudit: true,
    canConfigureSystem: false,
    canExportReports: true,
    canManageUsers: false,
  },
  OPERADOR: {
    canCreateAsset: true,
    canEditAsset: true,
    canDeleteAsset: false,
    canPerformInventory: true,
    canManageLoans: true,
    canManageMaintenance: true,
    canViewAudit: false,
    canConfigureSystem: false,
    canExportReports: true,
    canManageUsers: false,
  },
  CONSULTOR: {
    canCreateAsset: false,
    canEditAsset: false,
    canDeleteAsset: false,
    canPerformInventory: false,
    canManageLoans: false,
    canManageMaintenance: false,
    canViewAudit: false,
    canConfigureSystem: false,
    canExportReports: true,
    canManageUsers: false,
  },
  SERVIDOR: {
    canCreateAsset: false,
    canEditAsset: false,
    canDeleteAsset: false,
    canPerformInventory: false,
    canManageLoans: true,
    canManageMaintenance: false,
    canViewAudit: false,
    canConfigureSystem: false,
    canExportReports: false,
    canManageUsers: false,
  },
  PROFESSOR: {
    canCreateAsset: false,
    canEditAsset: false,
    canDeleteAsset: false,
    canPerformInventory: false,
    canManageLoans: true,
    canManageMaintenance: false,
    canViewAudit: false,
    canConfigureSystem: false,
    canExportReports: false,
    canManageUsers: false,
  },
  TECNICO: {
    canCreateAsset: true,
    canEditAsset: true,
    canDeleteAsset: false,
    canPerformInventory: true,
    canManageLoans: false,
    canManageMaintenance: true,
    canViewAudit: false,
    canConfigureSystem: false,
    canExportReports: true,
    canManageUsers: false,
  },
  VISITANTE: {
    canCreateAsset: false,
    canEditAsset: false,
    canDeleteAsset: false,
    canPerformInventory: false,
    canManageLoans: false,
    canManageMaintenance: false,
    canViewAudit: false,
    canConfigureSystem: false,
    canExportReports: false,
    canManageUsers: false,
  },
};

export const DEFAULT_USERS_LIST: UserProfile[] = [
  {
    role: 'ADMIN',
    name: 'Administrador',
    email: 'admin@sispat.local',
    cpf: '',
    matricula: 'ADMIN',
    setor: 'Administração',
    cargo: 'Administrador Geral do Sistema',
    ativo: true,
    twoFactorEnabled: false,
  },
];

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSwitchUserRole,
}) => {
  const [activeUserTab, setActiveUserTab] = useState<'profiles' | 'rbac'>('profiles');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Users className="w-4 h-4" /> Gestão de Usuários & Níveis de Acesso (RBAC)
            </div>
            <h3 className="text-xl font-black text-white mt-1">Perfis de Acesso & Controle de Segurança</h3>
            <p className="text-xs text-slate-400 mt-1">
              Alterne entre perfis de usuário para simular e testar as permissões institucionais do SISPAT.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch buttons */}
        <div className="flex gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveUserTab('profiles')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeUserTab === 'profiles'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" /> Selecionar / Alternar Usuário Ativo
          </button>
          <button
            onClick={() => setActiveUserTab('rbac')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeUserTab === 'rbac'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" /> Matriz de Permissões (RBAC)
          </button>
        </div>

        {/* Profiles Tab */}
        {activeUserTab === 'profiles' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {DEFAULT_USERS_LIST.map(user => {
                const isCurrent = currentUser.role === user.role && currentUser.email === user.email;

                return (
                  <div
                    key={user.email}
                    className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                      isCurrent
                        ? 'bg-indigo-950/60 border-indigo-500 shadow-lg shadow-indigo-950/40'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          user.role === 'ADMIN' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          user.role === 'GESTOR' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                          user.role === 'AUDITOR' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          user.role === 'TECNICO' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
                          user.role === 'PROFESSOR' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          user.role === 'SERVIDOR' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                          'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                        }`}>
                          {user.role}
                        </span>

                        {isCurrent && (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Sessão Ativa
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-white text-sm mt-2">{user.name}</h4>
                      <p className="text-xs text-slate-400">{user.email}</p>

                      <div className="mt-2 text-[11px] text-slate-400 space-y-0.5 border-t border-slate-900 pt-2">
                        <p><strong className="text-slate-300">Setor:</strong> {user.setor}</p>
                        <p><strong className="text-slate-300">Matrícula:</strong> {user.matricula}</p>
                      </div>
                    </div>

                    {!isCurrent && (
                      <button
                        onClick={() => {
                          onSwitchUserRole(user);
                          onClose();
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Alternar para este Perfil
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RBAC Matrix Tab */}
        {activeUserTab === 'rbac' && (
          <div className="space-y-3">
            <div className="overflow-x-auto max-h-96 border border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Permissão / Funcionalidade</th>
                    <th className="p-3 text-center">ADMIN</th>
                    <th className="p-3 text-center">GESTOR</th>
                    <th className="p-3 text-center">AUDITOR</th>
                    <th className="p-3 text-center">TÉCNICO</th>
                    <th className="p-3 text-center">SERVIDOR</th>
                    <th className="p-3 text-center">VISITANTE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                  {[
                    { label: 'Cadastrar / Adicionar Patrimônio', key: 'canCreateAsset' },
                    { label: 'Editar Dados do Patrimônio', key: 'canEditAsset' },
                    { label: 'Excluir / Baixar Patrimônio', key: 'canDeleteAsset' },
                    { label: 'Realizar Inventário & Leitura QR', key: 'canPerformInventory' },
                    { label: 'Emitir Empréstimos & Termos', key: 'canManageLoans' },
                    { label: 'Gerenciar Manutenções Técnicas', key: 'canManageMaintenance' },
                    { label: 'Visualizar Trilha de Auditoria', key: 'canViewAudit' },
                    { label: 'Exportar Relatórios PDF/Excel', key: 'canExportReports' },
                    { label: 'Configurações Globais do Sistema', key: 'canConfigureSystem' },
                  ].map((perm, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="p-3 font-medium text-white">{perm.label}</td>
                      {(['ADMIN', 'GESTOR', 'AUDITOR', 'TECNICO', 'SERVIDOR', 'VISITANTE'] as UserRole[]).map(r => {
                        const allowed = ROLE_PERMISSIONS_MAP[r][perm.key as keyof PermissionConfig];
                        return (
                          <td key={r} className="p-3 text-center font-bold">
                            {allowed ? (
                              <span className="text-emerald-400">✓ SIM</span>
                            ) : (
                              <span className="text-slate-600">✕ NÃO</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
