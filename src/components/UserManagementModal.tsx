import React, { useState } from 'react';
import { Users, Shield, UserCheck, X } from 'lucide-react';
import { UserProfile, UserRole, PermissionConfig } from '../types';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
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

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
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
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950 text-xs text-slate-400 flex items-start gap-2">
              <UserCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                A alternância de perfis locais foi desativada. O acesso é autenticado
                centralmente (Neon) e as contas/permisões são gerenciadas pelo
                Administrador Geral na tela <strong>Usuários</strong>.
              </span>
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
