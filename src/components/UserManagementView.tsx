import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Search, 
  Filter, 
  KeyRound, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Copy, 
  Check, 
  ShieldAlert, 
  UserCheck, 
  UserX,
  Info
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { userFacingApiError } from '../services/apiClient';
import { UserAccount, UserRole, UserProfile, SectorItem } from '../types';
import { ROLE_PERMISSIONS_MAP } from './UserManagementModal';

interface UserManagementViewProps {
  currentUser: UserProfile;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [sectors, setSectors] = useState<SectorItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'rbac' | 'sectors'>('users');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [tempPasswordResult, setTempPasswordResult] = useState<{ user: UserAccount; tempPass: string } | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form State for Creation / Edit
  const [formData, setFormData] = useState({
    login: '',
    nomeCompleto: '',
    cpf: '',
    email: '',
    telefone: '',
    cargo: '',
    setor: '',
    role: 'OPERADOR' as UserRole,
    matricula: '',
    situacao: 'Ativo' as 'Ativo' | 'Inativo' | 'Bloqueado',
  });

  // Load data
  const loadData = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    // Setores: exibe o cache em memória da sessão (datalist) e depois busca a
    // fonte única no Neon (apiGetSectors). Nenhum espelho/fallback local é usado.
    const loadedSectors = storageService.getSectors();
    setSectors(loadedSectors);

    if (!storageService.isLoggedIn()) {
      setUsers([]);
      return;
    }

    // Usuários: carga exclusivamente do banco central (Neon) via
    // GET /api/auth/users (apiListUsers). A lista local/IndexedDB não é usada.
    try {
      const centralUsers = await storageService.refreshUsersFromApi();
      setUsers(centralUsers);
    } catch (err) {
      // Em falha central, exibe o erro ao usuário e mantém a última lista em
      // memória somente leitura (nunca um espelho local).
      setErrorMessage(userFacingApiError(err));
      setUsers(storageService.getUsers());
    }

    try {
      const centralSectors = await storageService.refreshSectorsFromApi();
      setSectors(centralSectors);
    } catch {
      // Em falha central, mantém o cache da memória de sessão (somente leitura);
      // nenhum dado de setor é gravado/montado localmente.
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Filtered Users list
  const filteredUsers = users.filter(u => {
    const matchSearch = 
      u.nomeCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.login.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.cpf.includes(searchTerm) ||
      u.matricula.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.setor.toLowerCase().includes(searchTerm.toLowerCase());

    const matchRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
    const matchStatus = selectedStatusFilter === 'ALL' || u.situacao === selectedStatusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  const resetForm = () => {
    setFormData({
      login: '',
      nomeCompleto: '',
      cpf: '',
      email: '',
      telefone: '',
      cargo: '',
      setor: '',
      role: 'OPERADOR',
      matricula: '',
      situacao: 'Ativo',
    });
    setEditingUser(null);
    setErrorMessage('');
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (user: UserAccount) => {
    setEditingUser(user);
    setFormData({
      login: user.login,
      nomeCompleto: user.nomeCompleto,
      cpf: user.cpf,
      email: user.email,
      telefone: user.telefone || '',
      cargo: user.cargo,
      setor: user.setor,
      role: user.role,
      matricula: user.matricula,
      situacao: user.situacao,
    });
    setIsCreateModalOpen(true);
    setErrorMessage('');
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (editingUser) {
        // Update user (persistido no Neon)
        const updated = await storageService.updateUser({
          ...editingUser,
          ...formData,
        }, currentUser);

        setSuccessMessage(`Cadastro do usuário "${updated.nomeCompleto}" atualizado com sucesso no banco central!`);
        setIsCreateModalOpen(false);
        await loadData();
      } else {
        // Create user (persistido no Neon)
        const result = await storageService.createUser(formData, currentUser);
        setTempPasswordResult({
          user: result.user,
          tempPass: result.tempPassword
        });
        setIsCreateModalOpen(false);
        await loadData();
      }
    } catch (err: any) {
      setErrorMessage(userFacingApiError(err));
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Ativo' ? 'Inativo' : 'Ativo';
    try {
      await storageService.toggleUserStatus(userId, nextStatus as any, currentUser);
      setSuccessMessage(`Status alterado para "${nextStatus}" no banco central.`);
      await loadData();
    } catch (err: any) {
      alert(userFacingApiError(err));
    }
  };

  const handleResetPassword = async (user: UserAccount) => {
    if (!confirm(`Deseja realmente redefinir a senha do usuário ${user.nomeCompleto}? Uma nova senha temporária será gerada.`)) {
      return;
    }

    try {
      const res = await storageService.resetUserPassword(user.id, currentUser);
      setTempPasswordResult({
        user: user,
        tempPass: res.tempPassword
      });
      await loadData();
    } catch (err: any) {
      alert(userFacingApiError(err));
    }
  };

  const handleDeleteUser = async (user: UserAccount) => {
    if (!confirm(`ATENÇÃO: Deseja realmente EXCLUIR permanentemente o usuário "${user.nomeCompleto}" (${user.login})? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await storageService.deleteUser(user.id, currentUser);
      setSuccessMessage(`Usuário "${user.nomeCompleto}" excluído do banco central.`);
      await loadData();
    } catch (err: any) {
      alert(userFacingApiError(err));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-red-950/40 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-mono uppercase font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-red-400" />
              Módulo Exclusivo Administrador Geral
            </span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1 tracking-tight flex items-center gap-2">
            Gestão Institucional de Usuários & Controle RBAC
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Conforme diretrizes de segurança, <strong>não há auto-cadastro público</strong>. Todo acesso ao SISPAT é cadastrado, editado e auditado centralmente pelo Administrador Geral.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-lg transition active:scale-95 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Novo Usuário</span>
        </button>
      </div>

      {/* Sub Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'users'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Usuários Cadastrados ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('rbac')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'rbac'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Matriz de Permissões RBAC</span>
        </button>
      </div>

      {/* Alerts or Notifications */}
      {successMessage && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 p-3.5 rounded-2xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Temp Password Dialog Modal */}
      {tempPasswordResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-2xl inline-flex">
              <KeyRound className="w-6 h-6" />
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-white">Credenciais Geradas com Sucesso!</h3>
              <p className="text-xs text-slate-400 mt-1">
                Envie o login e a senha temporária abaixo para o servidor <strong>{tempPasswordResult.user.nomeCompleto}</strong>.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Usuário / Login:</span>
                <span className="text-white font-bold">{tempPasswordResult.user.login}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">E-mail:</span>
                <span className="text-slate-300">{tempPasswordResult.user.email}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-amber-400 font-bold">Senha Temporária:</span>
                <span className="text-emerald-400 font-extrabold text-sm">{tempPasswordResult.tempPass}</span>
              </div>
            </div>

            <div className="bg-blue-950/40 p-3 rounded-xl border border-blue-500/30 text-[11px] text-blue-200/90 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>O usuário será obrigado a criar uma nova senha pessoal forte no primeiro acesso.</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(`SISPAT LOGIN\nUsuário: ${tempPasswordResult.user.login}\nSenha Temporária: ${tempPasswordResult.tempPass}`)}
                className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                {copiedText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedText ? 'Copiado!' : 'Copiar Credenciais'}</span>
              </button>

              <button
                onClick={() => setTempPasswordResult(null)}
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl my-auto space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl">
                  {editingUser ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    {editingUser ? 'Editar Cadastro de Usuário' : 'Novo Cadastro de Usuário (Exclusivo Admin)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingUser ? `Atualize as permissões de ${editingUser.nomeCompleto}` : 'Preencha os dados institucionais do novo servidor.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="bg-rose-950/60 border border-rose-500/40 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Login */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-300">Login do Usuário *</label>
                  <input
                    type="text"
                    required
                    value={formData.login}
                    onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                    placeholder="ex: joao.silva"
                    className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                {/* Nome Completo */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-300">Nome Completo do Servidor *</label>
                  <input
                    type="text"
                    required
                    value={formData.nomeCompleto}
                    onChange={(e) => setFormData({ ...formData, nomeCompleto: e.target.value })}
                    placeholder="ex: Dr. Carlos Eduardo Silva"
                    className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* CPF */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">CPF *</label>
                  <input
                    type="text"
                    required
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                {/* E-mail Institucional */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">E-mail Institucional *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="usuario@sispat.gov.br"
                    className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                {/* Telefone */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Telefone de Contato</label>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(11) 99999-0000"
                    className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                {/* Matrícula */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Matrícula Funcional</label>
                  <input
                    type="text"
                    value={formData.matricula}
                    onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                    placeholder="MAT-2026-123"
                    className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                {/* Cargo */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Cargo / Função *</label>
                  <input
                    type="text"
                    required
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    placeholder="ex: Coordenador de Patrimônio"
                    className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Setor */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Setor de Lotacão *</label>
                  <input
                    type="text"
                    required
                    list="sispat-setores"
                    value={formData.setor}
                    onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                    placeholder="Digite ou selecione um setor"
                    className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500"
                  />
                  <datalist id="sispat-setores">
                    {sectors.map(s => <option key={s.id} value={s.nome} />)}
                  </datalist>
                </div>

                {/* Perfil de Acesso (RBAC) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Perfil de Acesso RBAC *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="ADMIN">ADMIN - Administrador Geral (Acesso Total)</option>
                    <option value="GESTOR">GESTOR - Gestor de Setor e Aprovações</option>
                    <option value="AUDITOR">AUDITOR - Auditoria Externa e Fiscalização</option>
                    <option value="OPERADOR">OPERADOR - Operações e Manutenção</option>
                    <option value="CONSULTOR">CONSULTOR - Somente Leitura e Relatórios</option>
                  </select>
                </div>

                {/* Situação */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Situação da Conta *</label>
                  <select
                    value={formData.situacao}
                    onChange={(e) => setFormData({ ...formData, situacao: e.target.value as any })}
                    className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="Ativo">Ativo (Pode Acessar)</option>
                    <option value="Inativo">Inativo (Desativado pelo Admin)</option>
                    <option value="Bloqueado">Bloqueado (Segurança)</option>
                  </select>
                </div>

              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg"
                >
                  {editingUser ? 'Salvar Alterações' : 'Criar Conta e Gerar Senha'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Main Tab 1: Users List */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por nome, CPF, e-mail, login ou setor..."
                className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl pl-9 pr-4 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Filter Role */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="bg-slate-950 text-slate-200 text-xs rounded-xl px-3 py-2.5 border border-slate-800 focus:outline-none"
              >
                <option value="ALL">Todos os Perfis (RBAC)</option>
                <option value="ADMIN">Administrador Geral</option>
                <option value="GESTOR">Gestor de Setor</option>
                <option value="AUDITOR">Auditor Fiscal</option>
                <option value="OPERADOR">Operador de Suporte</option>
                <option value="CONSULTOR">Consultor Leitura</option>
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-slate-950 text-slate-200 text-xs rounded-xl px-3 py-2.5 border border-slate-800 focus:outline-none"
              >
                <option value="ALL">Todos os Status</option>
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
                <option value="Bloqueado">Bloqueado</option>
              </select>
            </div>

          </div>

          {/* Users Table */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Servidor / Usuário</th>
                    <th className="py-3.5 px-4">Identificador / CPF</th>
                    <th className="py-3.5 px-4">Setor & Cargo</th>
                    <th className="py-3.5 px-4">Perfil RBAC</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Ações Administrador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        Nenhum usuário encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-slate-800/40 transition">
                        
                        {/* Servidor */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 font-bold flex items-center justify-center shrink-0">
                              {user.nomeCompleto.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-white text-xs">{user.nomeCompleto}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{user.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Login / CPF */}
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <div>
                            <span className="text-cyan-300 font-bold">@{user.login}</span>
                            <p className="text-[10px] text-slate-400">CPF: {user.cpf}</p>
                          </div>
                        </td>

                        {/* Setor */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-200">{user.setor}</p>
                          <p className="text-[10px] text-slate-400">{user.cargo}</p>
                        </td>

                        {/* Role RBAC */}
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border ${
                            user.role === 'ADMIN' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                            user.role === 'GESTOR' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
                            user.role === 'AUDITOR' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                            user.role === 'OPERADOR' ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' :
                            'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {user.role}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            user.situacao === 'Ativo' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            user.situacao === 'Inativo' ? 'bg-slate-700/50 text-slate-400 border border-slate-600' :
                            'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {user.situacao === 'Ativo' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3" />}
                            {user.situacao}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* Toggle Status */}
                            <button
                              onClick={() => handleToggleStatus(user.id, user.situacao)}
                              className={`p-1.5 rounded-lg border transition ${
                                user.situacao === 'Ativo'
                                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20'
                                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                              }`}
                              title={user.situacao === 'Ativo' ? 'Desativar Conta' : 'Ativar Conta'}
                            >
                              {user.situacao === 'Ativo' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </button>

                            {/* Reset Pass */}
                            <button
                              onClick={() => handleResetPassword(user)}
                              className="p-1.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20 transition"
                              title="Redefinir Senha do Usuário"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleOpenEditModal(user)}
                              className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 transition"
                              title="Editar Dados do Usuário"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 transition"
                              title="Excluir Usuário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                          </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Main Tab 2: RBAC Permissions Matrix */}
      {activeSubTab === 'rbac' && (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-5 shadow-xl">
          <div>
            <h3 className="text-lg font-bold text-white">Matriz de Permissões RBAC (Role-Based Access Control)</h3>
            <p className="text-xs text-slate-400 mt-1">
              Configuração central de privilégios por nível de acesso funcional no SISPAT.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="py-3 px-4">Ação / Funcionalidade</th>
                  <th className="py-3 px-4 text-center text-red-400">ADMIN</th>
                  <th className="py-3 px-4 text-center text-indigo-400">GESTOR</th>
                  <th className="py-3 px-4 text-center text-amber-400">AUDITOR</th>
                  <th className="py-3 px-4 text-center text-sky-400">OPERADOR</th>
                  <th className="py-3 px-4 text-center text-emerald-400">CONSULTOR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {[
                  { key: 'canManageUsers', label: 'Cadastrar / Gerenciar Usuários (RBAC)' },
                  { key: 'canCreateAsset', label: 'Cadastrar Novos Bens Patrimoniais' },
                  { key: 'canEditAsset', label: 'Editar Dados de Patrimônios' },
                  { key: 'canDeleteAsset', label: 'Baixar / Excluir Patrimônios' },
                  { key: 'canPerformInventory', label: 'Executar Inventário Físico' },
                  { key: 'canManageLoans', label: 'Gerenciar Empréstimos e Termos' },
                  { key: 'canManageMaintenance', label: 'Abrir / Concluir Ordens de Serviço' },
                  { key: 'canViewAudit', label: 'Visualizar Trilha de Auditoria Sincronizada' },
                  { key: 'canExportReports', label: 'Exportar Relatórios Oficiais PDF/Excel' },
                ].map(item => (
                  <tr key={item.key} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-semibold text-slate-200">{item.label}</td>
                    
                    {['ADMIN', 'GESTOR', 'AUDITOR', 'OPERADOR', 'CONSULTOR'].map(role => {
                      const hasPerm = (ROLE_PERMISSIONS_MAP as any)[role]?.[item.key];
                      return (
                        <td key={role} className="py-3 px-4 text-center">
                          {hasPerm ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                              <CheckCircle2 className="w-4 h-4" /> Sim
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-600 font-medium text-[11px]">
                              <XCircle className="w-4 h-4" /> Não
                            </span>
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

    </div>
  );
};
