import React, { useState, useEffect, useCallback } from 'react';
import { storageService } from './services/storageService';
import { userFacingApiError } from './services/apiClient';
import { Patrimonio, Manutencao, Emprestimo, AuditLog, InventarioSessao, UserProfile, RoleUser } from './types';

// Instância única do serviço: os dados centrais (Neon) vivem na memória deste
// mesmo singleton compartilhado por todos os componentes.
const storage = storageService;

// UI Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { QRScannerView } from './components/QRScannerView';
import { AssetCatalogView } from './components/AssetCatalogView';
import { AssetDetailModal } from './components/AssetDetailModal';
import { AssetFormModal } from './components/AssetFormModal';
import { AuditTrailView } from './components/AuditTrailView';
import { InventoryModule } from './components/InventoryModule';
import { MaintenanceModule } from './components/MaintenanceModule';
import { LoanModule } from './components/LoanModule';
import { ReportsModule } from './components/ReportsModule';
import { ConferenciaPatrimonialView } from './components/ConferenciaPatrimonialView';
import { TransferModal } from './components/TransferModal';
import { LoginModal } from './components/LoginModal';
import { UserManagementView } from './components/UserManagementView';
import { DatabaseAdminModal } from './components/DatabaseAdminModal';
import { ROLE_PERMISSIONS_MAP } from './components/UserManagementModal';
import { ActiveTab } from './types';
import { AlertTriangle } from 'lucide-react';

export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  // App Core State
  const [patrimonios, setPatrimonios] = useState<Patrimonio[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [inventarioSessao, setInventarioSessao] = useState<InventarioSessao>(storage.getInventarioSessao());
  const [currentUser, setCurrentUser] = useState<UserProfile>(storage.getCurrentUser());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(!storage.isLoggedIn());

  // Modal & Drawer States
  const [selectedAssetForDetail, setSelectedAssetForDetail] = useState<Patrimonio | null>(null);
  const [selectedAssetForEdit, setSelectedAssetForEdit] = useState<Patrimonio | null>(null);
  const [selectedAssetForTransfer, setSelectedAssetForTransfer] = useState<Patrimonio | null>(null);
  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState(false);
  const [isDatabaseAdminOpen, setIsDatabaseAdminOpen] = useState(false);
  const [newAssetInitialCode, setNewAssetInitialCode] = useState('');

  const currentPermissions = ROLE_PERMISSIONS_MAP[currentUser.role] || ROLE_PERMISSIONS_MAP.OPERADOR;

  const [centralOnline, setCentralOnline] = useState<boolean | null>(storage.isLoggedIn() ? storage.isCentralOnline() : null);

  // Dados centralizados (PostgreSQL/Neon): patrimônios, empréstimos,
  // manutenções, movimentações, inventários e auditoria. A memória do serviço
  // é alimentada pela API central; nenhum dado de negócio fica em localStorage.
  const loadLocalData = () => {
    setAuditLogs(storage.getAuditLogs());
    setInventarioSessao(storage.getInventarioSessao());
  };

  // Patrimônios, empréstimos, manutenções, movimentações e inventários vêm
  // exclusivamente do banco central (PostgreSQL/Neon).
  const loadCentralData = useCallback(async () => {
    if (!storage.isLoggedIn()) {
      setPatrimonios([]);
      setEmprestimos([]);
      setManutencoes([]);
      setAuditLogs([]);
      setInventarioSessao(storage.getInventarioSessao());
      setCentralOnline(null);
      return;
    }
    try {
      const data = await storage.refreshCentralDataFromApi();
      setPatrimonios(data.patrimonios);
      setEmprestimos(data.emprestimos);
      setManutencoes(data.manutencoes);
      setInventarioSessao(storage.getInventarioSessao());
      setCentralOnline(storage.isCentralOnline());
      // A trilha de auditoria é carregada à parte: exige canViewAudit no backend
      // (ADMIN/GESTOR/AUDITOR). Sem permissão, a leitura é simplesmente omitida.
      const canViewAudit = ROLE_PERMISSIONS_MAP[storage.getCurrentUser().role]?.canViewAudit ?? false;
      if (canViewAudit) {
        try {
          await storage.refreshAuditLogsFromApi();
          setAuditLogs(storage.getAuditLogs());
        } catch {
          // Perfil sem permissão ou indisponibilidade momentânea: mantém a última
          // lista em memória (somente leitura).
        }
      } else {
        setAuditLogs([]);
      }
    } catch {
      setCentralOnline(storage.getCentralConnectionStatus() === 'online');
    }
  }, []);

  useEffect(() => {
    loadLocalData();
    if (storage.isLoggedIn()) void loadCentralData();
    fetch('/api/client-info')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.ip) storage.setClientIp(data.ip); })
      .catch(() => {});

    const onVisibilityOrFocus = () => {
      if (storage.isLoggedIn() && document.visibilityState === 'visible') void loadCentralData();
    };
    const onFocus = () => {
      if (storage.isLoggedIn()) void loadCentralData();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    const interval = setInterval(() => {
      if (storage.isLoggedIn() && document.visibilityState === 'visible') void loadCentralData();
    }, 30000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
    };
  }, [loadCentralData]);

  const ensurePermission = (allowed: boolean, action: string) => {
    if (!allowed) {
      alert(`Acesso negado: seu perfil não possui permissão para ${action}.`);
      return false;
    }
    return true;
  };

  // Handle Role Change
  const handleChangeRole = (role: RoleUser) => {
    const updated = storage.setUserRole(role);
    setCurrentUser(updated);
  };

  // Handle Asset Save (New, Bulk or Edit)
  const handleSaveAsset = async (asset: Patrimonio | Patrimonio[]) => {
    if (!ensurePermission(Array.isArray(asset) ? currentPermissions.canCreateAsset : (selectedAssetForEdit ? currentPermissions.canEditAsset : currentPermissions.canCreateAsset), 'salvar patrimônios')) return;
    if (storage.isCentralOnline() === false) {
      alert('Banco central indisponível. Operação não concluída — tente novamente em instantes.');
      return;
    }
    try {
      if (Array.isArray(asset)) {
        const { saved, errors } = await storage.savePatrimoniosBulk(asset, currentUser);
        alert(
          errors.length === 0
            ? `Lote salvo com sucesso: ${saved.length} patrimônio(s) no banco central.`
            : `Salvos ${saved.length} de ${saved.length + errors.length}.\nFalhas:\n${errors.slice(0, 8).join('\n')}${errors.length > 8 ? '\n... e mais' : ''}`
        );
      } else {
        await storage.savePatrimonio(asset, currentUser);
      }
      await loadCentralData();
      setIsNewAssetModalOpen(false);
      setSelectedAssetForEdit(null);
    } catch (err) {
      alert(userFacingApiError(err));
    }
  };

  // Handle Asset Delete - exclusão definitiva
  const handleDeleteAsset = async (assetId: string) => {
    if (!ensurePermission(currentPermissions.canDeleteAsset, 'excluir patrimônio')) return;
    if (storage.isCentralOnline() === false) {
      alert('Banco central indisponível. Operação não concluída — tente novamente em instantes.');
      return;
    }
    try {
      await storage.deletePatrimonio(assetId, currentUser);
      await loadCentralData();
      setSelectedAssetForDetail(null);
    } catch (err) {
      alert(userFacingApiError(err));
    }
  };

  // Handle Transfer Location
  const handleTransferLocation = async (
    asset: Patrimonio,
    novoBloco: string,
    novoLab: string,
    novaSala: string,
    novoRespNome: string,
    novoRespCpf: string,
    motivo: string
  ) => {
    if (!ensurePermission(currentPermissions.canEditAsset, 'transferir patrimônio')) return;
    if (storage.isCentralOnline() === false) {
      alert('Banco central indisponível. Operação não concluída — tente novamente em instantes.');
      return;
    }
    try {
      await storage.transferAsset(asset, novoBloco, novoLab, novaSala, novoRespNome, novoRespCpf, motivo, currentUser);
      await loadCentralData();
      setSelectedAssetForTransfer(null);
      setSelectedAssetForDetail(null);
    } catch (err) {
      alert(userFacingApiError(err));
    }
  };

  // Handle Save Maintenance OS
  const handleSaveManutencao = async (os: Manutencao) => {
    if (!ensurePermission(currentPermissions.canManageMaintenance, 'gerenciar manutenções')) return;
    if (storage.isCentralOnline() === false) {
      alert('Banco central indisponível. Operação não concluída — tente novamente em instantes.');
      return;
    }
    try {
      await storage.saveManutencao(os, currentUser);
      await loadCentralData();
    } catch (err) {
      alert(userFacingApiError(err));
    }
  };

  const handleDeleteManutencao = async (id: string) => {
    if (!ensurePermission(currentUser.role === 'ADMIN', 'excluir manutenção')) return;
    if (storage.isCentralOnline() === false) {
      alert('Banco central indisponível. Operação não concluída — tente novamente em instantes.');
      return;
    }
    try {
      await storage.deleteManutencao(id, currentUser);
      await loadCentralData();
    } catch (err) {
      alert(userFacingApiError(err));
    }
  };

  // Handle Save Loan
  const handleSaveEmprestimo = async (emp: Emprestimo) => {
    if (!ensurePermission(currentPermissions.canManageLoans, 'gerenciar empréstimos')) return;
    if (storage.isCentralOnline() === false) {
      alert('Banco central indisponível. Operação não concluída — tente novamente em instantes.');
      return;
    }
    try {
      await storage.saveEmprestimo(emp, currentUser);
      await loadCentralData();
    } catch (err) {
      alert(userFacingApiError(err));
    }
  };

  const handleDeleteEmprestimo = async (id: string) => {
    if (!ensurePermission(currentUser.role === 'ADMIN', 'excluir empréstimo')) return;
    if (storage.isCentralOnline() === false) {
      alert('Banco central indisponível. Operação não concluída — tente novamente em instantes.');
      return;
    }
    try {
      await storage.deleteEmprestimo(id, currentUser);
      await loadCentralData();
    } catch (err) {
      alert(userFacingApiError(err));
    }
  };

  // Handle Save Inventory Session (persistido no banco central — Neon)
  const handleSaveInventario = async (sessao: InventarioSessao) => {
    if (!ensurePermission(currentPermissions.canPerformInventory, 'executar inventário')) return;
    if (storage.isCentralOnline() === false) {
      alert('Banco central indisponível. Operação não concluída — tente novamente em instantes.');
      return;
    }
    try {
      await storage.saveInventarioSessao(sessao, currentUser);
      setInventarioSessao(storage.getInventarioSessao());
    } catch (err) {
      alert(userFacingApiError(err));
    }
  };

  const handleDeleteInventario = async (id: string) => {
    if (!ensurePermission(currentUser.role === 'ADMIN', 'excluir sessão de inventário')) return;
    if (storage.isCentralOnline() === false) {
      alert('Banco central indisponível. Operação não concluída — tente novamente em instantes.');
      return;
    }
    try {
      await storage.deleteInventarioSessao(id, currentUser);
      setInventarioSessao(storage.getInventarioSessao());
    } catch (err) {
      alert(userFacingApiError(err));
    }
  };

  // Reports Exports
  const handleExportExcel = () => {
    if (!ensurePermission(currentPermissions.canExportReports, 'exportar relatórios')) return;
    storage.exportPatrimoniosExcel();
  };

  const handleGeneratePDF = (title: string, items: Patrimonio[]) => {
    if (!ensurePermission(currentPermissions.canExportReports, 'gerar relatórios em PDF')) return;
    storage.generatePDFReport(title, items);
  };

  const handleGenerateEtiquetasPDF = (items: Patrimonio[]) => {
    if (!ensurePermission(currentPermissions.canExportReports, 'gerar etiquetas')) return;
    storage.generateEtiquetasPDF(items);
  };

  // Auth Handlers
  const handleLogout = async () => {
    await storage.logout();
    setCurrentUser(storage.getCurrentUser());
    setPatrimonios([]);
    setEmprestimos([]);
    setManutencoes([]);
    setAuditLogs([]);
    setInventarioSessao(storage.getInventarioSessao());
    setCentralOnline(null);
    setActiveTab('dashboard');
    setIsLoginModalOpen(true);
  };

  const handleLoginSuccess = async (user: UserProfile) => {
    setCurrentUser(user);
    setIsLoginModalOpen(false);
    loadLocalData();
    await loadCentralData();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      
      {/* Top Header Navbar */}
      <Header
        currentUser={currentUser}
        onUserRoleChange={handleChangeRole}
        onOpenScanner={() => setActiveTab('leitor')}
        globalSearchTerm={globalSearchTerm}
        onGlobalSearch={(term) => { setGlobalSearchTerm(term); if (term.trim().length >= 2) setActiveTab('patrimonios'); }}
        onExportExcel={handleExportExcel}
        centralOnline={centralOnline}
        onRefreshPatrimonios={() => void loadCentralData()}
        alertsCount={emprestimos.filter(e => e.status === 'Atrasado').length + manutencoes.filter(m => m.status !== 'Concluída' && m.prioridade === 'Urgente').length}
        onResetData={async () => {
          if (currentUser.role !== 'ADMIN') { alert('Apenas o administrador pode zerar o sistema.'); return; }
          const first = confirm('ZERAR TODO O SISPAT? Serão excluídos patrimônios (banco central), movimentações, manutenções, empréstimos, inventários, setores, usuários adicionais e logs. Apenas o acesso admin será mantido.');
          if (!first) return;
          const typed = prompt('Para confirmar a exclusão total, digite exatamente: ZERAR');
          if (typed !== 'ZERAR') { alert('Operação cancelada. Nenhum dado foi apagado.'); return; }
          try {
            const result = await storage.clearAllData(currentUser);
            if (result.centralError) {
              alert(`Sistema zerado localmente, mas a exclusão central de patrimônios falhou: ${result.centralError}`);
            }
            setCurrentUser(storage.getCurrentUser());
            setPatrimonios([]);
            setCentralOnline(storage.isCentralOnline());
            setActiveTab('dashboard');
            loadLocalData();
            if (!result.centralError) alert('Sistema zerado com sucesso. O acesso admin foi mantido.');
          } catch (err) {
            alert(userFacingApiError(err));
          }
        }}
        onLogout={handleLogout}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenDatabaseAdmin={() => setIsDatabaseAdminOpen(true)}
      />

      {/* Banco central (Neon) indisponível */}
      {!centralOnline && storage.isLoggedIn() && (
        <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 pt-2">
          <div className="flex items-center gap-2 bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs rounded-xl px-4 py-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Banco central (Neon) indisponível — patrimônios, empréstimos e manutenções exibidos podem estar desatualizados. Os cadastros, edições, transferências, empréstimos, manutenções e exclusões estão bloqueados até reconectar.
            </span>
            <button
              onClick={() => void loadCentralData()}
              className="ml-auto shrink-0 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold rounded-lg transition"
            >
              Tentar reconectar
            </button>
          </div>
        </div>
      )}

      {/* Main Container Layout (Scales fluidly up to Ultra-Wide / Smart TVs) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full max-w-[1920px] mx-auto">
        
        {/* Navigation Sidebar / Mobile Bar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          setActiveTab={setActiveTab}
          totalPatrimonios={patrimonios.length}
          totalManutencoes={manutencoes.filter(m => m.status !== 'Concluída').length}
          totalEmprestimos={emprestimos.filter(e => e.status === 'Ativo').length}
          userRole={currentUser.role}
          permissions={currentPermissions}
        />

        {/* Main View Area */}
        <main className="flex-1 p-3 sm:p-5 md:p-6 lg:p-8 2xl:p-10 overflow-y-auto">
          
          {activeTab === 'dashboard' && (
            <DashboardView
              patrimonios={patrimonios}
              movimentacoes={storage.getMovimentacoes()}
              manutencoes={manutencoes}
              emprestimos={emprestimos}
              inventarioSessao={inventarioSessao}
              onSelectTab={(tab) => setActiveTab(tab)}
              onNavigate={(tab) => setActiveTab(tab)}
              onSelectAsset={(asset) => setSelectedAssetForDetail(asset)}
              onOpenNewAssetModal={() => {
                setNewAssetInitialCode('');
                setIsNewAssetModalOpen(true);
              }}
              onOpenScanner={() => setActiveTab('leitor')}
              onExportExcel={handleExportExcel}
              onGeneratePDF={handleGeneratePDF}
            />
          )}

          {activeTab === 'leitor' && (
            <QRScannerView
              patrimonios={patrimonios}
              onSelectAsset={(asset) => setSelectedAssetForDetail(asset)}
              onOpenNewWithCode={(code) => {
                setNewAssetInitialCode(code);
                setIsNewAssetModalOpen(true);
              }}
            />
          )}

          {activeTab === 'patrimonios' && (
            <AssetCatalogView
              patrimonios={patrimonios}
              onSelectAsset={(asset) => setSelectedAssetForDetail(asset)}
              onEditAsset={(asset) => setSelectedAssetForEdit(asset)}
              onOpenNewModal={() => {
                setNewAssetInitialCode('');
                setIsNewAssetModalOpen(true);
              }}
              onExportExcel={handleExportExcel}
              onGeneratePDF={handleGeneratePDF}
              onGenerateEtiquetasPDF={handleGenerateEtiquetasPDF}
              currentUser={currentUser}
              externalSearchTerm={globalSearchTerm}
            />
          )}

          {activeTab === 'inventario' && (
            <InventoryModule
              patrimonios={patrimonios}
              inventarioSessao={inventarioSessao}
              onSaveInventario={handleSaveInventario}
              currentUser={currentUser}
              onGeneratePDF={handleGeneratePDF}
              onDeleteInventario={handleDeleteInventario}
            />
          )}

          {activeTab === 'manutencao' && (
            <MaintenanceModule
              manutencoes={manutencoes}
              patrimonios={patrimonios}
              onSaveManutencao={handleSaveManutencao}
              onDeleteManutencao={handleDeleteManutencao}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'emprestimos' && (
            <LoanModule
              emprestimos={emprestimos}
              patrimonios={patrimonios}
              onSaveEmprestimo={handleSaveEmprestimo}
              onDeleteEmprestimo={handleDeleteEmprestimo}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'relatorios' && (
            <ReportsModule
              patrimonios={patrimonios}
              currentUser={currentUser}
              onExportExcel={handleExportExcel}
              onGeneratePDF={handleGeneratePDF}
              onGenerateEtiquetasPDF={handleGenerateEtiquetasPDF}
              onNavigateToConferencia={() => setActiveTab('conferencia')}
            />
          )}

          {activeTab === 'conferencia' && (
            <ConferenciaPatrimonialView
              patrimonios={patrimonios}
              currentUser={currentUser}
              onSaveAsset={handleSaveAsset}
            />
          )}

          {activeTab === 'auditoria' && (
            <AuditTrailView
              logs={auditLogs}
              onExportExcel={handleExportExcel}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'usuarios' && (currentUser.role === 'ADMIN' || currentPermissions.canManageUsers) && (
            <UserManagementView
              currentUser={currentUser}
            />
          )}

        </main>
      </div>

      {/* MODALS & DRAWERS */}

      {/* Asset Detail Modal */}
      {selectedAssetForDetail && (
        <AssetDetailModal
          asset={selectedAssetForDetail}
          onClose={() => setSelectedAssetForDetail(null)}
          currentUser={currentUser}
          onEdit={(asset) => {
            setSelectedAssetForDetail(null);
            setSelectedAssetForEdit(asset);
          }}
          onDelete={handleDeleteAsset}
          onTransferLocation={(asset) => {
            setSelectedAssetForDetail(null);
            setSelectedAssetForTransfer(asset);
          }}
          onSendToMaintenance={() => setActiveTab('manutencao')}
          onSendToLoan={() => setActiveTab('emprestimos')}
          movimentacoes={storage.getMovimentacoes()}
          manutencoes={manutencoes}
          emprestimos={emprestimos}
        />
      )}

      {/* Asset Form Modal (New Asset or Edit Asset) */}
      {(isNewAssetModalOpen || selectedAssetForEdit) && (
        <AssetFormModal
          assetToEdit={selectedAssetForEdit}
          initialCode={newAssetInitialCode}
          onClose={() => {
            setIsNewAssetModalOpen(false);
            setSelectedAssetForEdit(null);
          }}
          onSave={handleSaveAsset}
          currentUser={currentUser}
        />
      )}

      {/* Location & Custody Transfer Modal */}
      {selectedAssetForTransfer && (
        <TransferModal
          asset={selectedAssetForTransfer}
          onClose={() => setSelectedAssetForTransfer(null)}
          onTransfer={handleTransferLocation}
          currentUser={currentUser}
        />
      )}


      <DatabaseAdminModal
        isOpen={isDatabaseAdminOpen}
        onClose={() => setIsDatabaseAdminOpen(false)}
      />

      {/* Login & Authentication Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onLoginSuccess={handleLoginSuccess}
        onClose={() => setIsLoginModalOpen(false)}
      />

    </div>
  );
}

