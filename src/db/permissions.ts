import type { UserRole } from '../types';

// Mapa de permissões RBAC espelhado integralmente no backend.
// A autorização NUNCA confia no frontend: cada endpoint valida o role do
// usuário carregado do banco (não do token, evitando escalonamento).

export const ROLE_PERMISSIONS: Record<UserRole, {
  canCreateAsset: boolean;
  canEditAsset: boolean;
  canDeleteAsset: boolean;
  canPerformInventory: boolean;
  canManageLoans: boolean;
  canManageMaintenance: boolean;
  canViewAudit: boolean;
  canConfigureSystem: boolean;
  canExportReports: boolean;
  canManageUsers: boolean;
}> = {
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

export function permissionsForRole(role: UserRole) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.VISITANTE;
}

export function can(role: UserRole, permission: keyof typeof ROLE_PERMISSIONS[UserRole]): boolean {
  return permissionsForRole(role)[permission];
}