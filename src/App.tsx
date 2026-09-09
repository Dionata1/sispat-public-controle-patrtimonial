import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storageService';
import { Patrimonio, Manutencao, Emprestimo, AuditLog, InventarioSessao, UserProfile, RoleUser } from './types';

const storage = new StorageService();

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
import { Lock, KeyRound, AlertTriangle } from 'lucide-react';

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

  // Force Password Change state
  const [isForcePasswordModalOpen, setIsForcePasswordModalOpen] = useState<boolean>(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');

  // Modal & Drawer States
  const [selectedAssetForDetail, setSelectedAssetForDetail] = useState<Patrimonio | null>(null);
  const [selectedAssetForEdit, setSelectedAssetForEdit] = useState<Patrimonio | null>(null);
  const [selectedAssetForTransfer, setSelectedAssetForTransfer] = useState<Patrimonio | null>(null);
  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState(false);
  const [isDatabaseAdminOpen, setIsDatabaseAdminOpen] = useState(false);
  const [newAssetInitialCode, setNewAssetInitialCode] = useState('');

  const currentPermissions = ROLE_PERMISSIONS_MAP[currentUser.role] || ROLE_PERMISSIONS_MAP.OPERADOR;

  // Initialize data on load
  const loadData = () => {
    setPatrimonios(storage.getPatrimonios());
    setManutencoes(storage.getManutencoes());
    setEmprestimos(storage.getEmprestimos());
    setAuditLogs(storage.getAuditLogs());
    setInventarioSessao(storage.getInventarioSessao());
  };

  useEffect(() => {
    loadData();
    fetch('/api/client-info')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.ip) storage.setClientIp(data.ip); })
      .catch(() => {});
  }, []);

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
  const handleSaveAsset = (asset: Patrimonio | Patrimonio[]) => {
    if (!ensurePermission(Array.isArray(asset) ? currentPermissions.canCreateAsset : (selectedAssetForEdit ? currentPermissions.canEditAsset : currentPermissions.canCreateAsset), 'salvar patrimônios')) return;
    if (Array.isArray(asset)) {
      storage.savePatrimoniosBulk(asset, currentUser);
    } else {
      storage.savePatrimonio(asset, currentUser);
    }
    loadData();
    setIsNewAssetModalOpen(false);
    setSelectedAssetForEdit(null);
  };

  // Handle Asset Delete - exclusão definitiva
  const handleDeleteAsset = (assetId: string) => {
    if (!ensurePermission(currentPermissions.canDeleteAsset, 'excluir patrimônio')) return;
    storage.deletePatrimonio(assetId, currentUser);
    loadData();
    setSelectedAssetForDetail(null);
  };

  // Handle Transfer Location
  const handleTransferLocation = (
    asset: Patrimonio,
    novoBloco: string,
    novoLab: string,
    novaSala: string,
    novoRespNome: string,
    novoRespCpf: string,
    motivo: string
  ) => {
    if (!ensurePermission(currentPermissions.canEditAsset, 'transferir patrimônio')) return;
    storage.transferAsset(asset, novoBloco, novoLab, novaSala, novoRespNome, novoRespCpf, motivo, currentUser);
    loadData();
    setSelectedAssetForTransfer(null);
    setSelectedAssetForDetail(null);
  };

  // Handle Save Maintenance OS
  const handleSaveManutencao = (os: Manutencao) => {
    if (!ensurePermission(currentPermissions.canManageMaintenance, 'gerenciar manutenções')) return;
    storage.saveManutencao(os, currentUser);
    loadData();
  };

  const handleDeleteManutencao = (id: string) => {
    if (!ensurePermission(currentUser.role === 'ADMIN', 'excluir manutenção')) return;
    storage.deleteManutencao(id, currentUser);
    loadData();
  };

  // Handle Save Loan
  const handleSaveEmprestimo = (emp: Emprestimo) => {
    if (!ensurePermission(currentPermissions.canManageLoans, 'gerenciar empréstimos')) return;
    storage.saveEmprestimo(emp, currentUser);
    loadData();
  };

  const handleDeleteEmprestimo = (id: string) => {
    if (!ensurePermission(currentUser.role === 'ADMIN', 'excluir empréstimo')) return;
    storage.deleteEmprestimo(id, currentUser);
    loadData();
  };

  // Handle Save Inventory Session
  const handleSaveInventario = (sessao: InventarioSessao) => {
    if (!ensurePermission(currentPermissions.canPerformInventory, 'executar inventário')) return;
    storage.saveInventarioSessao(sessao);
    setInventarioSessao(sessao);
  };

  const handleDeleteInventario = (id: string) => {
    if (!ensurePermission(currentUser.role === 'ADMIN', 'excluir sessão de inventário')) return;
    storage.deleteInventarioSessao(id, currentUser);
    loadData();
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
  const handleLogout = () => {
    storage.logout();
    setCurrentUser(storage.getCurrentUser());
    setActiveTab('dashboard');
    setIsLoginModalOpen(true);
  };

  const handleLoginSuccess = (user: UserProfile, forceChange?: boolean) => {
    setCurrentUser(user);
    setIsLoginModalOpen(false);
    loadData();

    if (forceChange || user.forcePasswordChange) {
      setIsForcePasswordModalOpen(true);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError('');

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordChangeError('As senhas informadas não coincidem.');
      return;
    }

    if (newPasswordInput.length < 10) {
      setPasswordChangeError('A nova senha deve possuir no mínimo 10 caracteres.');
      return;
    }

    const res = await storage.changePassword(currentUser.id || currentUser.email, newPasswordInput);
    if (!res.success) {
      setPasswordChangeError(res.message || 'Erro ao alterar a senha.');
      return;
    }

    setIsForcePasswordModalOpen(false);
    setCurrentUser(prev => ({ ...prev, forcePasswordChange: false }));
    alert('Senha alterada com sucesso! Você já pode utilizar o SISPAT com sua nova senha.');
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
        alertsCount={emprestimos.filter(e => e.status === 'Atrasado').length + manutencoes.filter(m => m.status !== 'Concluída' && m.prioridade === 'Urgente').length}
        onResetData={() => {
          if (currentUser.role !== 'ADMIN') { alert('Apenas o administrador pode zerar o sistema.'); return; }
          const first = confirm('ZERAR TODO O SISPAT? Serão excluídos patrimônios, movimentações, manutenções, empréstimos, inventários, setores, usuários adicionais e logs. Apenas o acesso admin será mantido.');
          if (!first) return;
          const typed = prompt('Para confirmar a exclusão total, digite exatamente: ZERAR');
          if (typed !== 'ZERAR') { alert('Operação cancelada. Nenhum dado foi apagado.'); return; }
          storage.clearAllData(currentUser);
          setCurrentUser(storage.getCurrentUser());
          setActiveTab('dashboard');
          loadData();
          alert('Sistema zerado com sucesso. O acesso admin foi mantido.');
        }}
        onLogout={handleLogout}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenDatabaseAdmin={() => setIsDatabaseAdminOpen(true)}
      />

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

      {/* Force Password Change Modal */}
      {isForcePasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="p-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl inline-flex">
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Redefinição de Senha Obrigatória</h3>
              <p className="text-xs text-slate-400 mt-1">
                Por motivos de segurança governamental, você está acessando com uma senha temporária e deve cadastrar uma nova senha pessoal forte antes de continuar.
              </p>
            </div>

            {passwordChangeError && (
              <div className="bg-rose-950/60 border border-rose-500/40 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{passwordChangeError}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Nova Senha Pessoal *</label>
                <input
                  type="password"
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="mínimo 10 caracteres, maiúscula, número e símbolo..."
                  className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Confirmar Nova Senha *</label>
                <input
                  type="password"
                  required
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="repita a nova senha..."
                  className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
              >
                Salvar Nova Senha e Continuar
              </button>
            </form>
          </div>
        </div>
      )}

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

