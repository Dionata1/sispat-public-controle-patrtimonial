import { 
  Patrimonio, 
  Movimentacao, 
  Manutencao, 
  Emprestimo, 
  AuditLog, 
  InventarioSessao,
  UserProfile,
  UserRole,
  UserAccount,
  SectorItem
} from '../types';
import { 
  INITIAL_PATRIMONIOS, 
  INITIAL_MOVIMENTACOES, 
  INITIAL_MANUTENCOES, 
  INITIAL_EMPRESTIMOS, 
  INITIAL_AUDIT_LOGS,
  INITIAL_INVENTARIO_SESSAO 
} from '../data/initialData';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { hashPassword, verifyPassword, validatePasswordStrength, generateTemporaryPassword } from '../utils/passwordSecurity';

const STORAGE_KEYS = {
  PATRIMONIOS: 'sispat_patrimonios_v40',
  MOVIMENTACOES: 'sispat_movimentacoes_v40',
  MANUTENCOES: 'sispat_manutencoes_v40',
  EMPRESTIMOS: 'sispat_emprestimos_v40',
  AUDIT_LOGS: 'sispat_audit_logs_v40',
  INVENTARIO: 'sispat_inventario_v40',
  INVENTARIO_HISTORY: 'sispat_inventario_history_v40',
  USERS: 'sispat_users_v40',
  SECTORS: 'sispat_sectors_v40',
};

const SESSION_KEYS = {
  AUTHENTICATED: 'sispat_authenticated_v40',
  USER: 'sispat_logged_user_v40',
  ROLE: 'sispat_current_role_v40',
};

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr-admin',
    login: 'admin',
    nomeCompleto: 'Administrador',
    cpf: '',
    matricula: 'ADMIN',
    email: 'admin@sispat.local',
    telefone: '',
    cargo: 'Administrador Geral do Sistema',
    setor: 'Administração',
    role: 'ADMIN',
    situacao: 'Ativo',
    // Senha temporária: Admin#2026!SisPat (troca obrigatória no primeiro acesso)
    passwordHash: 'pbkdf2$150000$cq8XxwqGbhlSnTqMnvTuWQ==$/fed4RzGo3i6KVfgjzvrCPfSG2y9qUz6aNMrDzLSV8g=',
    forcePasswordChange: true,
    dataCriacao: '2026-09-04T00:00:00.000Z',
    ultimoAcesso: undefined,
  },
];

export const INITIAL_SECTORS: SectorItem[] = [];

export const DEFAULT_ACCOUNTS = INITIAL_USERS.map(u => ({
  email: u.email,
  role: u.role,
  name: u.nomeCompleto,
  cpf: u.cpf,
  matricula: u.matricula,
}));

export class StorageService {
  private clientIp = 'IP não coletado (modo local)';

  setClientIp(ip?: string) {
    if (ip) this.clientIp = ip;
  }

  private getAuditIp() { return this.clientIp; }

  private assertRole(usuario: UserProfile, roles: UserRole[], action: string) {
    if (!usuario || !roles.includes(usuario.role)) {
      throw new Error(`Acesso negado: perfil ${usuario?.role || 'não autenticado'} não pode ${action}.`);
    }
  }

  private notifyListeners() {
    window.dispatchEvent(new CustomEvent('sispat_data_changed'));
  }

  // --- PATRIMÔNIOS ---
  getPatrimonios(): Patrimonio[] {
    const data = localStorage.getItem(STORAGE_KEYS.PATRIMONIOS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.PATRIMONIOS, JSON.stringify([]));
      return [];
    }
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      localStorage.setItem(STORAGE_KEYS.PATRIMONIOS, JSON.stringify([]));
      return [];
    }
  }

  private setPatrimonios(items: Patrimonio[]) {
    localStorage.setItem(STORAGE_KEYS.PATRIMONIOS, JSON.stringify(items));
    this.notifyListeners();
  }

  savePatrimonio(patrimonio: Patrimonio, usuario: UserProfile): Patrimonio {
    this.assertRole(usuario, ['ADMIN', 'GESTOR', 'OPERADOR', 'TECNICO'], 'salvar patrimônios');
    const items = this.getPatrimonios();
    const duplicateCode = items.find(p =>
      p.id !== patrimonio.id &&
      p.codigoPatrimonial.trim().toLowerCase() === (patrimonio.codigoPatrimonial || '').trim().toLowerCase()
    );
    if (!patrimonio.codigoPatrimonial?.trim()) throw new Error('Informe o código patrimonial/tombo.');
    if (duplicateCode) throw new Error(`Já existe um patrimônio com o tombo ${patrimonio.codigoPatrimonial}.`);
    if (patrimonio.codigoBarras?.trim()) {
      const duplicateBarcode = items.find(p => p.id !== patrimonio.id && p.codigoBarras?.trim() === patrimonio.codigoBarras.trim());
      if (duplicateBarcode) throw new Error(`O código de barras ${patrimonio.codigoBarras} já está vinculado ao patrimônio ${duplicateBarcode.codigoPatrimonial}.`);
    }
    if (patrimonio.qrCode?.trim()) {
      const duplicateQr = items.find(p => p.id !== patrimonio.id && p.qrCode?.trim().toLowerCase() === patrimonio.qrCode.trim().toLowerCase());
      if (duplicateQr) throw new Error(`O QR Code ${patrimonio.qrCode} já está vinculado ao patrimônio ${duplicateQr.codigoPatrimonial}.`);
    }
    const existingIndex = items.findIndex(p => p.id === patrimonio.id);
    
    const now = new Date().toISOString();
    let isNew = false;
    
    if (existingIndex >= 0) {
      const oldItem = items[existingIndex];
      const updatedItem: Patrimonio = {
        ...patrimonio,
        ultimaAtualizacao: now,
      };
      items[existingIndex] = updatedItem;

      // Track movement if location changed
      if (
        oldItem.bloco !== updatedItem.bloco ||
        oldItem.laboratorio !== updatedItem.laboratorio ||
        oldItem.sala !== updatedItem.sala ||
        oldItem.responsavelNome !== updatedItem.responsavelNome
      ) {
        this.addMovimentacaoInternal({
          id: 'mov-' + Date.now(),
          patrimonioId: updatedItem.id,
          codigoPatrimonial: updatedItem.codigoPatrimonial,
          patrimonioNome: updatedItem.nome,
          dataHora: now,
          usuarioNome: usuario.name,
          usuarioPerfil: usuario.role,
          localAnterior: `${oldItem.bloco} / ${oldItem.laboratorio} / ${oldItem.sala}`,
          localNovo: `${updatedItem.bloco} / ${updatedItem.laboratorio} / ${updatedItem.sala}`,
          responsavelAnterior: oldItem.responsavelNome,
          responsavelNovo: updatedItem.responsavelNome,
          motivo: 'Atualização cadastral de localização/responsável',
          tipoOperacao: 'Transferência',
        });
      }

      this.addAuditLogInternal({
        id: 'log-' + Date.now(),
        dataHora: now,
        usuarioNome: usuario.name,
        usuarioPerfil: usuario.role,
        acao: 'Atualização de Patrimonio',
        entidade: 'Patrimônio',
        entidadeId: updatedItem.codigoPatrimonial,
        detalhe: `Atualizado bem "${updatedItem.nome}" (${updatedItem.codigoPatrimonial}). Situacao: ${updatedItem.situacao}`,
        ip: this.getAuditIp(),
      });

      this.setPatrimonios(items);
      return updatedItem;
    } else {
      isNew = true;
      const newItem: Patrimonio = {
        ...patrimonio,
        id: patrimonio.id || 'pat-' + Date.now(),
        codigoPatrimonial: patrimonio.codigoPatrimonial.trim(),
        codigoBarras: patrimonio.codigoBarras || '',
        qrCode: patrimonio.qrCode || '',
        dataCadastro: now,
        ultimaAtualizacao: now,
      };
      items.unshift(newItem);

      this.addMovimentacaoInternal({
        id: 'mov-' + Date.now(),
        patrimonioId: newItem.id,
        codigoPatrimonial: newItem.codigoPatrimonial,
        patrimonioNome: newItem.nome,
        dataHora: now,
        usuarioNome: usuario.name,
        usuarioPerfil: usuario.role,
        localAnterior: 'Inclusão Inicial',
        localNovo: `${newItem.bloco} / ${newItem.laboratorio} / ${newItem.sala}`,
        responsavelAnterior: 'Não informado',
        responsavelNovo: newItem.responsavelNome,
        motivo: 'Inclusão de novo bem patrimonial no acervo público',
        tipoOperacao: 'Cadastro',
      });

      this.addAuditLogInternal({
        id: 'log-' + Date.now(),
        dataHora: now,
        usuarioNome: usuario.name,
        usuarioPerfil: usuario.role,
        acao: 'Cadastro de Patrimônio',
        entidade: 'Patrimônio',
        entidadeId: newItem.codigoPatrimonial,
        detalhe: `Cadastrado novo patrimônio "${newItem.nome}" (${newItem.codigoPatrimonial}) - Valor: R$ ${newItem.valor.toFixed(2)}`,
        ip: this.getAuditIp(),
      });

      this.setPatrimonios(items);
      return newItem;
    }
  }

  savePatrimoniosBulk(patrimonios: Patrimonio[], usuario: UserProfile): Patrimonio[] {
    this.assertRole(usuario, ['ADMIN', 'GESTOR', 'OPERADOR', 'TECNICO'], 'cadastrar patrimônios em lote');
    const items = this.getPatrimonios();
    const now = new Date().toISOString();
    const insertedItems: Patrimonio[] = [];
    const existingTombos = new Set(items.map(p => p.codigoPatrimonial.trim().toLowerCase()));
    const existingBarcodes = new Set(items.map(p => p.codigoBarras?.trim()).filter(Boolean));
    const existingQrs = new Set(items.map(p => p.qrCode?.trim().toLowerCase()).filter(Boolean));
    const batchTombos = new Set<string>();
    const batchBarcodes = new Set<string>();
    const batchQrs = new Set<string>();

    for (let i = 0; i < patrimonios.length; i++) {
      const p = patrimonios[i];
      const tombo = p.codigoPatrimonial?.trim();
      const barcode = p.codigoBarras?.trim() || '';
      const qr = p.qrCode?.trim() || '';
      if (!tombo) throw new Error(`Item ${i + 1}: informe o código patrimonial/tombo.`);
      const tomboKey = tombo.toLowerCase();
      if (existingTombos.has(tomboKey) || batchTombos.has(tomboKey)) throw new Error(`Tombo duplicado no lote ou na base: ${tombo}.`);
      if (barcode && (existingBarcodes.has(barcode) || batchBarcodes.has(barcode))) throw new Error(`Código de barras duplicado no lote ou na base: ${barcode}.`);
      const qrKey = qr.toLowerCase();
      if (qr && (existingQrs.has(qrKey) || batchQrs.has(qrKey))) throw new Error(`QR Code duplicado no lote ou na base: ${qr}.`);

      batchTombos.add(tomboKey);
      if (barcode) batchBarcodes.add(barcode);
      if (qr) batchQrs.add(qrKey);

      const newItem: Patrimonio = {
        ...p,
        id: p.id || `pat-${Date.now()}-${i}`,
        codigoPatrimonial: tombo,
        codigoBarras: barcode,
        qrCode: qr,
        dataCadastro: p.dataCadastro || now,
        ultimaAtualizacao: now,
      };

      items.unshift(newItem);
      insertedItems.push(newItem);

      this.addMovimentacaoInternal({
        id: `mov-${Date.now()}-${i}`,
        patrimonioId: newItem.id,
        codigoPatrimonial: newItem.codigoPatrimonial,
        patrimonioNome: newItem.nome,
        dataHora: now,
        usuarioNome: usuario.name,
        usuarioPerfil: usuario.role,
        localAnterior: 'Inclusão inicial em lote',
        localNovo: `${newItem.bloco} / ${newItem.laboratorio} / ${newItem.sala}`,
        responsavelAnterior: 'Não informado',
        responsavelNovo: newItem.responsavelNome,
        motivo: 'Inclusão em lote de bem patrimonial',
        tipoOperacao: 'Cadastro',
      });
    }

    this.addAuditLogInternal({
      id: 'log-' + Date.now(),
      dataHora: now,
      usuarioNome: usuario.name,
      usuarioPerfil: usuario.role,
      acao: 'Cadastro em Lote de Patrimônios',
      entidade: 'Patrimônio',
      entidadeId: `${insertedItems.length} itens`,
      detalhe: `Cadastrados ${insertedItems.length} novos bens via entrada em lote.`,
      ip: this.getAuditIp(),
    });

    this.setPatrimonios(items);
    return insertedItems;
  }

  // --- USER ACCOUNTS MANAGEMENT (ADMIN EXCLUSIVE) ---
  getUsers(): UserAccount[] {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    try {
      const parsed: UserAccount[] = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
        return INITIAL_USERS;
      }
      return parsed;
    } catch {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
  }

  private saveUsers(users: UserAccount[]) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.notifyListeners();
  }

  // --- SECTORS MANAGEMENT ---
  getSectors(): SectorItem[] {
    const data = localStorage.getItem(STORAGE_KEYS.SECTORS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.SECTORS, JSON.stringify([]));
      return [];
    }
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      localStorage.setItem(STORAGE_KEYS.SECTORS, JSON.stringify([]));
      return [];
    }
  }

  saveSector(sector: SectorItem, performer: UserProfile): SectorItem {
    this.assertRole(performer, ['ADMIN'], 'alterar setores');
    const sectors = this.getSectors();
    const index = sectors.findIndex(s => s.id === sector.id);
    if (index >= 0) {
      sectors[index] = sector;
    } else {
      sectors.push({
        ...sector,
        id: sector.id || 'sec-' + Date.now(),
      });
    }
    localStorage.setItem(STORAGE_KEYS.SECTORS, JSON.stringify(sectors));
    
    this.addAuditLogInternal({
      id: 'log-' + Date.now(),
      dataHora: new Date().toISOString(),
      usuarioNome: performer.name,
      usuarioPerfil: performer.role,
      acao: index >= 0 ? 'Alteração de Setor' : 'Criação de Setor',
      entidade: 'Sistema',
      entidadeId: sector.sigla,
      detalhe: `Setor "${sector.nome}" (${sector.sigla}) ${index >= 0 ? 'atualizado' : 'cadastrado'}. Responsável: ${sector.responsavel}`,
      ip: this.getAuditIp(),
    });

    this.notifyListeners();
    return sector;
  }

  deleteSector(sectorId: string, performer: UserProfile) {
    this.assertRole(performer, ['ADMIN'], 'excluir setores');
    const sectors = this.getSectors().filter(s => s.id !== sectorId);
    localStorage.setItem(STORAGE_KEYS.SECTORS, JSON.stringify(sectors));
    this.addAuditLogInternal({
      id: 'log-' + Date.now(),
      dataHora: new Date().toISOString(),
      usuarioNome: performer.name,
      usuarioPerfil: performer.role,
      acao: 'Exclusão de Setor',
      entidade: 'Sistema',
      entidadeId: sectorId,
      detalhe: `Setor ID ${sectorId} excluído do cadastro institucional.`,
      ip: this.getAuditIp(),
    });
    this.notifyListeners();
  }

  // Admin User Creation
  async createUser(userData: Partial<UserAccount>, performer: UserProfile): Promise<{ user: UserAccount; tempPassword: string }> {
    if (performer.role !== 'ADMIN') {
      throw new Error('Apenas Administradores Gerais podem cadastrar novos usuários no SISPAT.');
    }

    const users = this.getUsers();

    // Check duplicate CPF or Email or Login
    const cleanEmail = (userData.email || '').trim().toLowerCase();
    const cleanCpf = (userData.cpf || '').trim();

    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      throw new Error(`O e-mail institucional "${cleanEmail}" já está cadastrado.`);
    }

    if (users.some(u => u.cpf.replace(/\D/g, '') === cleanCpf.replace(/\D/g, ''))) {
      throw new Error(`O CPF "${cleanCpf}" já possui um cadastro ativo.`);
    }

    // Auto-generate Login (e.g. joao.silva)
    let baseLogin = (userData.login || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (!baseLogin) baseLogin = (userData.email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9.]/g, '');
    if (!baseLogin) {
      baseLogin = (userData.nomeCompleto || 'usuario').toLowerCase().split(' ').slice(0, 2).join('.');
    }
    
    let generatedLogin = baseLogin;
    let counter = 1;
    while (users.some(u => u.login.toLowerCase() === generatedLogin.toLowerCase())) {
      generatedLogin = `${baseLogin}${counter}`;
      counter++;
    }

    // Senha temporária gerada com Web Crypto API.
    const tempPassword = generateTemporaryPassword();

    const newUser: UserAccount = {
      id: 'usr-' + Date.now(),
      login: generatedLogin,
      nomeCompleto: userData.nomeCompleto || '',
      cpf: cleanCpf,
      matricula: userData.matricula || '',
      email: cleanEmail,
      telefone: userData.telefone || '',
      cargo: userData.cargo || '',
      setor: userData.setor || '',
      role: userData.role || 'OPERADOR',
      situacao: userData.situacao || 'Ativo',
      passwordHash: await hashPassword(tempPassword),
      forcePasswordChange: true, // Obrigatório trocar no 1º login
      dataCriacao: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);

    this.addAuditLogInternal({
      id: 'log-' + Date.now(),
      dataHora: new Date().toISOString(),
      usuarioNome: performer.name,
      usuarioPerfil: performer.role,
      acao: 'Criação de Usuário',
      entidade: 'Usuário',
      entidadeId: newUser.login,
      detalhe: `Usuário "${newUser.nomeCompleto}" (${newUser.login}) cadastrado com perfil ${newUser.role} no setor "${newUser.setor}". Senha temporária gerada.`,
      ip: this.getAuditIp(),
    });

    return { user: newUser, tempPassword };
  }

  // Admin User Update
  updateUser(userData: UserAccount, performer: UserProfile): UserAccount {
    if (performer.role !== 'ADMIN') {
      throw new Error('Apenas o Administrador Geral pode editar dados e permissões de usuários.');
    }

    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userData.id);

    if (index < 0) {
      throw new Error('Usuário não encontrado.');
    }

    const oldUser = users[index];
    
    // Safety check: Cannot demote or disable the last active Admin
    if (oldUser.role === 'ADMIN' && (userData.role !== 'ADMIN' || userData.situacao !== 'Ativo')) {
      const activeAdmins = users.filter(u => u.role === 'ADMIN' && u.situacao === 'Ativo');
      if (activeAdmins.length <= 1) {
        throw new Error('Operação negada: O sistema não pode ficar sem nenhum Administrador Geral ativo.');
      }
    }

    users[index] = {
      ...users[index],
      nomeCompleto: userData.nomeCompleto,
      cpf: userData.cpf,
      matricula: userData.matricula,
      email: userData.email,
      telefone: userData.telefone,
      cargo: userData.cargo,
      setor: userData.setor,
      role: userData.role,
      situacao: userData.situacao,
    };

    this.saveUsers(users);

    this.addAuditLogInternal({
      id: 'log-' + Date.now(),
      dataHora: new Date().toISOString(),
      usuarioNome: performer.name,
      usuarioPerfil: performer.role,
      acao: 'Alteração de Dados do Usuário',
      entidade: 'Usuário',
      entidadeId: userData.login,
      detalhe: `Atualizado cadastro do usuário "${userData.nomeCompleto}" (${userData.login}). Perfil: ${userData.role}, Situação: ${userData.situacao}`,
      ip: this.getAuditIp(),
    });

    return users[index];
  }

  // Admin Toggle User Status (Lock/Unlock / Active/Inactive)
  toggleUserStatus(userId: string, newStatus: 'Ativo' | 'Inativo' | 'Bloqueado', performer: UserProfile): UserAccount {
    if (performer.role !== 'ADMIN') {
      throw new Error('Apenas o Administrador Geral pode alterar o status do usuário.');
    }

    const users = this.getUsers();
    const user = users.find(u => u.id === userId);

    if (!user) throw new Error('Usuário não encontrado.');

    if (user.role === 'ADMIN' && newStatus !== 'Ativo') {
      const activeAdmins = users.filter(u => u.role === 'ADMIN' && u.situacao === 'Ativo');
      if (activeAdmins.length <= 1) {
        throw new Error('Operação negada: O único Administrador Geral do sistema não pode ser bloqueado/desativado.');
      }
    }

    const oldStatus = user.situacao;
    user.situacao = newStatus;
    this.saveUsers(users);

    this.addAuditLogInternal({
      id: 'log-' + Date.now(),
      dataHora: new Date().toISOString(),
      usuarioNome: performer.name,
      usuarioPerfil: performer.role,
      acao: `Alteração de Status: ${oldStatus} -> ${newStatus}`,
      entidade: 'Usuário',
      entidadeId: user.login,
      detalhe: `Status do usuário "${user.nomeCompleto}" (${user.login}) alterado para ${newStatus}.`,
      ip: this.getAuditIp(),
    });

    return user;
  }

  // Admin Password Reset
  async resetUserPassword(userId: string, performer: UserProfile): Promise<{ tempPassword: string }> {
    if (performer.role !== 'ADMIN') {
      throw new Error('Apenas o Administrador Geral pode redefinir senhas de usuários.');
    }

    const users = this.getUsers();
    const user = users.find(u => u.id === userId);

    if (!user) throw new Error('Usuário não encontrado.');

    const tempPassword = generateTemporaryPassword();

    user.passwordHash = await hashPassword(tempPassword);
    user.forcePasswordChange = true;
    user.tentativasInvalidas = 0;
    this.saveUsers(users);

    this.addAuditLogInternal({
      id: 'log-' + Date.now(),
      dataHora: new Date().toISOString(),
      usuarioNome: performer.name,
      usuarioPerfil: performer.role,
      acao: 'Redefinição de Senha do Usuário',
      entidade: 'Usuário',
      entidadeId: user.login,
      detalhe: `Senha do usuário "${user.nomeCompleto}" (${user.login}) redefinida pelo Administrador Geral. Nova troca de senha exigida no próximo acesso.`,
      ip: this.getAuditIp(),
    });

    return { tempPassword };
  }

  // Change Password by Logged-in User (or Forced First-Time Change)
  async changePassword(userId: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId || u.login === userId || u.email === userId);
    if (!user) return { success: false, message: 'Usuário não encontrado no sistema.' };

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) return { success: false, message: strengthError };

    const same = await verifyPassword(newPassword, user.passwordHash);
    if (same.valid) return { success: false, message: 'A nova senha não pode ser igual à senha atual.' };

    user.passwordHash = await hashPassword(newPassword);
    user.forcePasswordChange = false;
    user.tentativasInvalidas = 0;
    this.saveUsers(users);

    this.addAuditLogInternal({
      id: 'log-' + Date.now(), dataHora: new Date().toISOString(), usuarioNome: user.nomeCompleto,
      usuarioPerfil: user.role, acao: 'Troca de Senha Realizada', entidade: 'Usuário', entidadeId: user.login,
      detalhe: `Usuário "${user.nomeCompleto}" (${user.login}) alterou sua senha com derivação PBKDF2/SHA-256.`, ip: this.getAuditIp(),
    });

    const currentLogged = this.getCurrentUser();
    if (currentLogged && (currentLogged.email === user.email || currentLogged.login === user.login)) {
      currentLogged.forcePasswordChange = false;
      localStorage.setItem(SESSION_KEYS.USER, JSON.stringify(currentLogged));
    }
    return { success: true };
  }

  // Delete User Account
  deleteUser(userId: string, performer: UserProfile): { success: boolean; message?: string } {
    if (performer.role !== 'ADMIN') {
      throw new Error('Apenas o Administrador Geral pode excluir usuários.');
    }

    const users = this.getUsers();
    const target = users.find(u => u.id === userId);

    if (!target) throw new Error('Usuário não encontrado.');

    if (target.role === 'ADMIN') {
      const activeAdmins = users.filter(u => u.role === 'ADMIN' && u.id !== userId && u.situacao === 'Ativo');
      if (activeAdmins.length === 0) {
        throw new Error('Não é possível excluir o único Administrador Geral do sistema.');
      }
    }

    const filtered = users.filter(u => u.id !== userId);
    this.saveUsers(filtered);

    this.addAuditLogInternal({
      id: 'log-' + Date.now(),
      dataHora: new Date().toISOString(),
      usuarioNome: performer.name,
      usuarioPerfil: performer.role,
      acao: 'Exclusão de Usuário',
      entidade: 'Usuário',
      entidadeId: target.login,
      detalhe: `Conta de usuário "${target.nomeCompleto}" (${target.login}) removida do sistema pelo Administrador.`,
      ip: this.getAuditIp(),
    });

    return { success: true };
  }

  // --- USER PROFILE & AUTHENTICATION ---
  getCurrentUser(): UserProfile {
    const session = localStorage.getItem(SESSION_KEYS.USER);
    if (session) {
      try {
        return JSON.parse(session);
      } catch {
        // Fallback
      }
    }
    return {
      id: 'visitor-session',
      role: 'VISITANTE',
      name: 'Usuário não autenticado',
      email: '', cpf: '', matricula: '', setor: '', cargo: '', login: '',
      forcePasswordChange: false,
    };
  }

  isLoggedIn(): boolean {
    return localStorage.getItem(SESSION_KEYS.AUTHENTICATED) === 'true';
  }

  async login(
    loginOrEmailOrCpf: string,
    passwordInput: string
  ): Promise<{ success: boolean; user?: UserProfile; userAccount?: UserAccount; message?: string; forcePasswordChange?: boolean }> {
    const cleanInput = loginOrEmailOrCpf.trim().toLowerCase();
    const cleanCpfDigits = cleanInput.replace(/\D/g, '');

    const users = this.getUsers();
    
    // Find matching account by login, email, or CPF
    const account = users.find(
      u => u.login.toLowerCase() === cleanInput ||
           u.email.toLowerCase() === cleanInput ||
           (cleanCpfDigits.length > 5 && u.cpf.replace(/\D/g, '') === cleanCpfDigits)
    );

    if (!account) {
      this.addAuditLogInternal({
        id: 'log-' + Date.now(),
        dataHora: new Date().toISOString(),
        usuarioNome: cleanInput,
        usuarioPerfil: 'VISITANTE',
        acao: 'Tentativa de Acesso Inválida',
        entidade: 'Sistema',
        entidadeId: cleanInput,
        detalhe: `Tentativa de login frustrada para usuário não existente "${cleanInput}".`,
        ip: this.getAuditIp(),
      });
      return { success: false, message: 'Usuário não encontrado. Entre em contato com o Administrador Geral do SISPAT para cadastramento de conta.' };
    }

    if (account.situacao === 'Inativo') {
      return { success: false, message: 'Conta inativa. Entre em contato com o Administrador Geral para ativá-la.' };
    }

    if (account.situacao === 'Bloqueado') {
      return { success: false, message: 'Conta bloqueada por motivos de segurança. Contate o Administrador Geral para desbloqueio.' };
    }

    const passwordCheck = await verifyPassword(passwordInput, account.passwordHash);
    if (!passwordCheck.valid) {
      account.tentativasInvalidas = (account.tentativasInvalidas || 0) + 1;
      
      if (account.tentativasInvalidas >= 5) {
        account.situacao = 'Bloqueado';
        this.saveUsers(users);
        this.addAuditLogInternal({
          id: 'log-' + Date.now(),
          dataHora: new Date().toISOString(),
          usuarioNome: account.nomeCompleto,
          usuarioPerfil: account.role,
          acao: 'Bloqueio por Tentativas Incorretas',
          entidade: 'Usuário',
          entidadeId: account.login,
          detalhe: `Conta de "${account.nomeCompleto}" bloqueada automaticamente após 5 tentativas consecutivas com senha inválida.`,
          ip: this.getAuditIp(),
        });
        return { success: false, message: 'Conta bloqueada por exceder 5 tentativas com senha inválida. Solicite desbloqueio ao Administrador Geral.' };
      }

      this.saveUsers(users);

      this.addAuditLogInternal({
        id: 'log-' + Date.now(),
        dataHora: new Date().toISOString(),
        usuarioNome: account.nomeCompleto,
        usuarioPerfil: account.role,
        acao: 'Tentativa de Acesso Inválida',
        entidade: 'Usuário',
        entidadeId: account.login,
        detalhe: `Senha incorreta informada para "${account.login}". Tentativas: ${account.tentativasInvalidas}/5.`,
        ip: this.getAuditIp(),
      });

      return { success: false, message: `Senha incorreta. (${account.tentativasInvalidas}/5 tentativas).` };
    }

    // Migração transparente de contas legadas que ainda estavam em texto simples.
    if (passwordCheck.needsMigration) {
      account.passwordHash = await hashPassword(passwordInput);
      account.forcePasswordChange = true;
    }

    // Reset failed attempts on success
    account.tentativasInvalidas = 0;
    account.ultimoAcesso = new Date().toISOString();
    this.saveUsers(users);

    const userProfile: UserProfile = {
      id: account.id,
      role: account.role,
      name: account.nomeCompleto,
      email: account.email,
      cpf: account.cpf,
      matricula: account.matricula,
      setor: account.setor,
      cargo: account.cargo,
      telefone: account.telefone,
      login: account.login,
      situacao: account.situacao,
      forcePasswordChange: account.forcePasswordChange,
    };

    localStorage.setItem(SESSION_KEYS.AUTHENTICATED, 'true');
    localStorage.setItem(SESSION_KEYS.USER, JSON.stringify(userProfile));
    localStorage.setItem(SESSION_KEYS.ROLE, account.role);

    this.addAuditLogInternal({
      id: 'log-' + Date.now(),
      dataHora: new Date().toISOString(),
      usuarioNome: userProfile.name,
      usuarioPerfil: userProfile.role,
      acao: 'Login no Sistema',
      entidade: 'Sistema',
      entidadeId: userProfile.login || userProfile.email,
      detalhe: `Autenticação bem-sucedida para o usuário "${userProfile.name}" (${userProfile.role}).`,
      ip: this.getAuditIp(),
    });

    this.notifyListeners();
    return { 
      success: true, 
      user: userProfile, 
      userAccount: account,
      forcePasswordChange: account.forcePasswordChange 
    };
  }

  logout() {
    const user = this.getCurrentUser();
    if (user) {
      this.addAuditLogInternal({
        id: 'log-' + Date.now(),
        dataHora: new Date().toISOString(),
        usuarioNome: user.name,
        usuarioPerfil: user.role,
        acao: 'Logout do Sistema',
        entidade: 'Sistema',
        entidadeId: user.login || user.email,
        detalhe: `Sessão encerrada pelo usuário "${user.name}".`,
        ip: this.getAuditIp(),
      });
    }

    localStorage.removeItem(SESSION_KEYS.AUTHENTICATED);
    localStorage.removeItem(SESSION_KEYS.USER);
    this.notifyListeners();
  }

  setUserRole(role: UserRole): UserProfile {
    const current = this.getCurrentUser();
    if (current.role !== role) {
      throw new Error('Alternância de perfil sem nova autenticação foi desativada por segurança.');
    }
    return current;
  }

  // --- TRANSFER ASSET ---
  transferAsset(
    asset: Patrimonio,
    novoBloco: string,
    novoLab: string,
    novaSala: string,
    novoRespNome: string,
    novoRespCpf: string,
    motivo: string,
    usuario: UserProfile
  ): Patrimonio {
    this.assertRole(usuario, ['ADMIN', 'GESTOR', 'OPERADOR', 'TECNICO'], 'transferir patrimônio');
    const updated: Patrimonio = {
      ...asset,
      bloco: novoBloco,
      laboratorio: novoLab,
      sala: novaSala,
      responsavelNome: novoRespNome,
      responsavelCpf: novoRespCpf,
      ultimaAtualizacao: new Date().toISOString(),
    };

    return this.savePatrimonio(updated, usuario);
  }

  deletePatrimonio(id: string, usuario: UserProfile): boolean {
    this.assertRole(usuario, ['ADMIN'], 'excluir patrimônio definitivamente');
    const items = this.getPatrimonios();
    const item = items.find(p => p.id === id);
    if (!item) return false;

    this.setPatrimonios(items.filter(p => p.id !== id));
    localStorage.setItem(STORAGE_KEYS.MOVIMENTACOES, JSON.stringify(this.getMovimentacoes().filter(m => m.patrimonioId !== id)));
    localStorage.setItem(STORAGE_KEYS.MANUTENCOES, JSON.stringify(this.getManutencoes().filter(m => m.patrimonioId !== id)));
    localStorage.setItem(STORAGE_KEYS.EMPRESTIMOS, JSON.stringify(this.getEmprestimos().filter(e => e.patrimonioId !== id)));

    const sessao = this.getInventarioSessao();
    if (sessao.id !== 'inv-vazio') {
      const cleaned = {
        ...sessao,
        encontradosIds: sessao.encontradosIds.filter(x => x !== id),
        pendentesIds: sessao.pendentesIds.filter(x => x !== id),
        divergencias: (sessao.divergencias || []).filter(d => d.patrimonioId !== id),
      };
      localStorage.setItem(STORAGE_KEYS.INVENTARIO, JSON.stringify(cleaned));
    }

    this.addAuditLogInternal({
      id: 'log-' + Date.now(),
      dataHora: new Date().toISOString(),
      usuarioNome: usuario.name,
      usuarioPerfil: usuario.role,
      acao: 'Exclusão Definitiva de Patrimônio',
      entidade: 'Patrimônio',
      entidadeId: item.codigoPatrimonial,
      detalhe: `Patrimônio "${item.nome}" (${item.codigoPatrimonial}) excluído definitivamente pelo administrador.`,
      ip: this.getAuditIp(),
    });
    this.notifyListeners();
    return true;
  }

  // --- MOVIMENTAÇÕES ---
  getMovimentacoes(): Movimentacao[] {
    const data = localStorage.getItem(STORAGE_KEYS.MOVIMENTACOES);
    if (!data) return [];
    try { const parsed = JSON.parse(data); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }

  private addMovimentacaoInternal(mov: Movimentacao) {
    const list = this.getMovimentacoes();
    list.unshift(mov);
    localStorage.setItem(STORAGE_KEYS.MOVIMENTACOES, JSON.stringify(list));
  }

  // --- MANUTENÇÕES ---
  getManutencoes(): Manutencao[] {
    const data = localStorage.getItem(STORAGE_KEYS.MANUTENCOES);
    if (!data) return [];
    try { const parsed = JSON.parse(data); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }

  saveManutencao(manutencao: Manutencao, usuario: UserProfile): Manutencao {
    this.assertRole(usuario, ['ADMIN', 'GESTOR', 'OPERADOR', 'TECNICO'], 'gerenciar manutenções');
    const list = this.getManutencoes();
    const index = list.findIndex(m => m.id === manutencao.id);
    const now = new Date().toISOString();

    if (index >= 0) {
      list[index] = manutencao;
    } else {
      list.unshift(manutencao);
    }

    localStorage.setItem(STORAGE_KEYS.MANUTENCOES, JSON.stringify(list));

    // Update Patrimonio status
    const patrimonios = this.getPatrimonios();
    const pat = patrimonios.find(p => p.id === manutencao.patrimonioId || p.codigoPatrimonial === manutencao.codigoPatrimonial);
    if (pat) {
      if (manutencao.status === 'Aberta' || manutencao.status === 'Em_Andamento' || manutencao.status === 'Aguardando_Peças') {
        pat.situacao = 'Em manutenção';
      } else if (manutencao.status === 'Concluída') {
        pat.situacao = 'Disponível';
      }
      this.setPatrimonios(patrimonios);
    }

    this.addAuditLogInternal({
      id: 'log-' + Date.now(),
      dataHora: now,
      usuarioNome: usuario.name,
      usuarioPerfil: usuario.role,
      acao: index >= 0 ? 'Atualização de Manutenção' : 'Abertura de Manutenção',
      entidade: 'Manutenção',
      entidadeId: manutencao.codigoPatrimonial,
      detalhe: `OS de manutenção ${manutencao.status} para ${manutencao.patrimonioNome}. Defeito: ${manutencao.defeito}`,
      ip: this.getAuditIp(),
    });

    this.notifyListeners();
    return manutencao;
  }

  deleteManutencao(id: string, usuario: UserProfile): boolean {
    this.assertRole(usuario, ['ADMIN'], 'excluir manutenção');
    const list = this.getManutencoes();
    const target = list.find(m => m.id === id);
    if (!target) return false;
    localStorage.setItem(STORAGE_KEYS.MANUTENCOES, JSON.stringify(list.filter(m => m.id !== id)));
    const patrimonios = this.getPatrimonios();
    const pat = patrimonios.find(p => p.id === target.patrimonioId);
    if (pat && !this.getManutencoes().some(m => m.patrimonioId === pat.id && m.status !== 'Concluída' && m.status !== 'Cancelada')) {
      pat.situacao = 'Disponível';
      this.setPatrimonios(patrimonios);
    }
    this.addAuditLogInternal({
      id: 'log-' + Date.now(), dataHora: new Date().toISOString(), usuarioNome: usuario.name, usuarioPerfil: usuario.role,
      acao: 'Exclusão de Manutenção', entidade: 'Manutenção', entidadeId: target.codigoPatrimonial,
      detalhe: `Ordem de serviço ${target.id} excluída definitivamente.`, ip: this.getAuditIp(),
    });
    this.notifyListeners();
    return true;
  }

  // --- EMPRÉSTIMOS ---
  getEmprestimos(): Emprestimo[] {
    const data = localStorage.getItem(STORAGE_KEYS.EMPRESTIMOS);
    let list: Emprestimo[] = [];
    if (data) {
      try { const parsed = JSON.parse(data); list = Array.isArray(parsed) ? parsed : []; } catch { list = []; }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let changed = false;
    list = list.map(e => {
      if (e.status === 'Ativo' && e.previsaoDevolucao) {
        const due = new Date(`${e.previsaoDevolucao}T00:00:00`);
        if (!Number.isNaN(due.getTime()) && due < today) {
          changed = true;
          return { ...e, status: 'Atrasado' as const };
        }
      }
      return e;
    });
    if (changed) localStorage.setItem(STORAGE_KEYS.EMPRESTIMOS, JSON.stringify(list));
    return list;
  }

  saveEmprestimo(emprestimo: Emprestimo, usuario: UserProfile): Emprestimo {
    this.assertRole(usuario, ['ADMIN', 'GESTOR', 'OPERADOR', 'SERVIDOR', 'PROFESSOR'], 'gerenciar empréstimos');
    const list = this.getEmprestimos();
    const index = list.findIndex(e => e.id === emprestimo.id);
    const now = new Date().toISOString();

    if (index >= 0) {
      list[index] = emprestimo;
    } else {
      list.unshift(emprestimo);
    }

    localStorage.setItem(STORAGE_KEYS.EMPRESTIMOS, JSON.stringify(list));

    // Update Patrimonio status
    const patrimonios = this.getPatrimonios();
    const pat = patrimonios.find(p => p.id === emprestimo.patrimonioId || p.codigoPatrimonial === emprestimo.codigoPatrimonial);
    if (pat) {
      if (emprestimo.status === 'Ativo' || emprestimo.status === 'Atrasado') {
        pat.situacao = 'Emprestado';
      } else if (emprestimo.status === 'Devolvido') {
        pat.situacao = 'Disponível';
      }
      this.setPatrimonios(patrimonios);
    }

    this.addAuditLogInternal({
      id: 'log-' + Date.now(),
      dataHora: now,
      usuarioNome: usuario.name,
      usuarioPerfil: usuario.role,
      acao: index >= 0 ? 'Atualização de Empréstimo' : 'Novo Empréstimo',
      entidade: 'Empréstimo',
      entidadeId: emprestimo.codigoPatrimonial,
      detalhe: `Empréstimo ${emprestimo.status} para ${emprestimo.servidorNome} (${emprestimo.setor})`,
      ip: this.getAuditIp(),
    });

    this.notifyListeners();
    return emprestimo;
  }

  deleteEmprestimo(id: string, usuario: UserProfile): boolean {
    this.assertRole(usuario, ['ADMIN'], 'excluir empréstimo');
    const list = this.getEmprestimos();
    const target = list.find(e => e.id === id);
    if (!target) return false;
    localStorage.setItem(STORAGE_KEYS.EMPRESTIMOS, JSON.stringify(list.filter(e => e.id !== id)));
    const patrimonios = this.getPatrimonios();
    const pat = patrimonios.find(p => p.id === target.patrimonioId);
    if (pat && !this.getEmprestimos().some(e => e.patrimonioId === pat.id && (e.status === 'Ativo' || e.status === 'Atrasado'))) {
      pat.situacao = 'Disponível';
      this.setPatrimonios(patrimonios);
    }
    this.addAuditLogInternal({
      id: 'log-' + Date.now(), dataHora: new Date().toISOString(), usuarioNome: usuario.name, usuarioPerfil: usuario.role,
      acao: 'Exclusão de Empréstimo', entidade: 'Empréstimo', entidadeId: target.codigoPatrimonial,
      detalhe: `Empréstimo ${target.id} excluído definitivamente.`, ip: this.getAuditIp(),
    });
    this.notifyListeners();
    return true;
  }

  // --- AUDIT LOGS ---
  getAuditLogs(): AuditLog[] {
    const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (!data) return [];
    try { const parsed = JSON.parse(data); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }

  private addAuditLogInternal(log: AuditLog) {
    const logs = this.getAuditLogs();
    logs.unshift(log);
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
  }

  // --- INVENTÁRIO ---
  getInventarioSessao(): InventarioSessao {
    const data = localStorage.getItem(STORAGE_KEYS.INVENTARIO);
    if (!data) return { ...INITIAL_INVENTARIO_SESSAO, encontradosIds: [], pendentesIds: [], divergencias: [] };
    try { return JSON.parse(data); } catch { return { ...INITIAL_INVENTARIO_SESSAO, encontradosIds: [], pendentesIds: [], divergencias: [] }; }
  }

  getInventarioHistorico(): InventarioSessao[] {
    const data = localStorage.getItem(STORAGE_KEYS.INVENTARIO_HISTORY);
    if (!data) return [];
    try { const parsed = JSON.parse(data); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }

  saveInventarioSessao(sessao: InventarioSessao, usuario?: UserProfile) {
    const usr = usuario || this.getCurrentUser();
    this.assertRole(usr, ['ADMIN', 'GESTOR', 'AUDITOR', 'OPERADOR', 'TECNICO'], 'executar inventário');
    localStorage.setItem(STORAGE_KEYS.INVENTARIO, JSON.stringify(sessao));

    const history = this.getInventarioHistorico();
    const index = history.findIndex(h => h.id === sessao.id);
    if (index >= 0) history[index] = sessao; else history.unshift(sessao);
    localStorage.setItem(STORAGE_KEYS.INVENTARIO_HISTORY, JSON.stringify(history.slice(0, 200)));

    this.addAuditLogInternal({
      id: 'log-' + Date.now(), dataHora: new Date().toISOString(), usuarioNome: usr.name, usuarioPerfil: usr.role,
      acao: 'Sessão de Inventário', entidade: 'Inventário', entidadeId: sessao.id,
      detalhe: `Sessão "${sessao.titulo}" atualizada. Progresso: ${sessao.totalEncontrados}/${sessao.totalEsperado}. Status: ${sessao.status}.`,
      ip: this.getAuditIp(),
    });
    this.notifyListeners();
  }

  deleteInventarioSessao(id: string, usuario: UserProfile) {
    this.assertRole(usuario, ['ADMIN'], 'excluir sessão de inventário');
    const history = this.getInventarioHistorico();
    const target = history.find(h => h.id === id);
    if (!target) return false;

    localStorage.setItem(STORAGE_KEYS.INVENTARIO_HISTORY, JSON.stringify(history.filter(h => h.id !== id)));
    const current = this.getInventarioSessao();
    if (current.id === id) {
      localStorage.removeItem(STORAGE_KEYS.INVENTARIO);
    }

    this.addAuditLogInternal({
      id: 'log-' + Date.now(), dataHora: new Date().toISOString(), usuarioNome: usuario.name, usuarioPerfil: usuario.role,
      acao: 'Exclusão de Inventário', entidade: 'Inventário', entidadeId: id,
      detalhe: `Sessão de inventário "${target.titulo || id}" excluída definitivamente.`, ip: this.getAuditIp(),
    });
    this.notifyListeners();
    return true;
  }

  // --- EXCEL & SYNCHRONIZATION ---
  exportPatrimoniosExcel() {
    this.exportToExcel();
  }

  exportToExcel() {
    const patrimonios = this.getPatrimonios();
    const movimentacoes = this.getMovimentacoes();
    const manutencoes = this.getManutencoes();
    const auditLogs = this.getAuditLogs();

    const workbook = XLSX.utils.book_new();

    // Sheet 1: Patrimônios
    const patData = patrimonios.map(p => ({
      'Código Patrimonial': p.codigoPatrimonial,
      'Código de Barras': p.codigoBarras,
      'QR Code': p.qrCode,
      'Nome do Equipamento': p.nome,
      'Categoria': p.categoria,
      'Marca': p.marca,
      'Modelo': p.modelo,
      'Nº de Série': p.numeroSerie,
      'Fornecedor': p.fornecedor,
      'Nota Fiscal': p.notaFiscal,
      'Data de Aquisição': p.dataAquisicao,
      'Valor de Aquisição (R$)': p.valor,
      'Validade da Garantia': p.garantiaVencimento,
      'Estado de Conservação': p.estadoConservacao,
      'Situação Operacional': p.situacao,
      'Bloco': p.bloco,
      'Laboratório': p.laboratorio,
      'Sala': p.sala,
      'Responsável': p.responsavelNome,
      'CPF Responsável': p.responsavelCpf,
      'Observações': p.observacoes,
      'Data Cadastro': p.dataCadastro,
      'Última Atualização': p.ultimaAtualizacao,
    }));
    const sheet1 = XLSX.utils.json_to_sheet(patData);
    XLSX.utils.book_append_sheet(workbook, sheet1, 'Patrimônio Público');

    // Sheet 2: Movimentações
    const movData = movimentacoes.map(m => ({
      'Data / Hora': new Date(m.dataHora).toLocaleString('pt-BR'),
      'Código Patrimonial': m.codigoPatrimonial,
      'Nome do Bem': m.patrimonioNome,
      'Tipo Operação': m.tipoOperacao,
      'Local Anterior': m.localAnterior,
      'Local Novo': m.localNovo,
      'Responsável Anterior': m.responsavelAnterior,
      'Responsável Novo': m.responsavelNovo,
      'Usuário Registrador': m.usuarioNome,
      'Motivo': m.motivo,
    }));
    const sheet2 = XLSX.utils.json_to_sheet(movData);
    XLSX.utils.book_append_sheet(workbook, sheet2, 'Histórico Movimentações');

    // Sheet 3: Manutenções
    const manData = manutencoes.map(m => ({
      'Cód. Patrimônio': m.codigoPatrimonial,
      'Equipamento': m.patrimonioNome,
      'Defeito / Ocorrência': m.defeito,
      'Prioridade': m.prioridade,
      'Empresa / Técnico': m.tecnicoEmpresa,
      'Custo (R$)': m.custo,
      'Data Abertura': m.dataAbertura,
      'Previsão Conclusão': m.previsaoConclusao,
      'Status': m.status,
      'Laudo Técnico': m.laudoTecnico,
    }));
    const sheet3 = XLSX.utils.json_to_sheet(manData);
    XLSX.utils.book_append_sheet(workbook, sheet3, 'Manutenções OS');

    // Sheet 4: Trilha de Auditoria
    const logData = auditLogs.map(l => ({
      'Data / Hora': new Date(l.dataHora).toLocaleString('pt-BR'),
      'Usuário': l.usuarioNome,
      'Perfil': l.usuarioPerfil,
      'Ação Executada': l.acao,
      'Entidade': l.entidade,
      'ID Entidade': l.entidadeId,
      'Detalhes da Operação': l.detalhe,
      'Endereço IP': l.ip,
    }));
    const sheet4 = XLSX.utils.json_to_sheet(logData);
    XLSX.utils.book_append_sheet(workbook, sheet4, 'Trilha de Auditoria');

    XLSX.writeFile(workbook, `SISPAT_Relatorio_Patrimonial_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // --- PDF REPORT GENERATION ---
  generatePDFReport(title: string, items: Patrimonio[], usuario?: UserProfile) {
    const usr = usuario || this.getCurrentUser();
    const doc = new jsPDF('landscape', 'mm', 'a4');

    // Header Institutional
    doc.setFillColor(15, 23, 42); // Dark slate
    doc.rect(0, 0, 297, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SISPAT PUBLIC - RELATÓRIO OFICIAL DE AUDITORIA PATRIMONIAL', 14, 12);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Emissão: ${new Date().toLocaleString('pt-BR')} | Emitido por: ${usr.name} (${usr.role})`, 14, 18);

    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), 14, 32);

    // Summary Box
    const totalValor = items.reduce((acc, curr) => acc + curr.valor, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total de Ativos Mapeados: ${items.length} | Valor Total Tombado: R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, 38);

    const tableData = items.map((p, idx) => [
      (idx + 1).toString(),
      p.codigoPatrimonial,
      p.nome,
      p.categoria,
      p.bloco + ' - ' + p.sala,
      p.responsavelNome,
      p.estadoConservacao,
      p.situacao,
      `R$ ${p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    ]);

    autoTable(doc, {
      startY: 42,
      head: [['#', 'Cód. Patrimônio', 'Descrição do Equipamento', 'Categoria', 'Localização', 'Responsável', 'Estado', 'Situação', 'Valor (R$)']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    // Footer signature line
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Página ${i} de ${pageCount} - Documento Público Auditável SISPAT`, 14, 202);
    }

    doc.save(`SISPAT_Relatorio_${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  // --- GENERATE PRINTABLE QR CODE LABELS SHEET ---
  async generateEtiquetasPDF(items: Patrimonio[]) {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('SISPAT PUBLIC - FOLHA DE ETIQUETAS PATRIMONIAIS QR CODE', 14, 15);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} | Total de Etiquetas: ${items.length}`, 14, 20);

    let x = 14;
    let y = 28;
    const labelWidth = 88;
    const labelHeight = 42;
    const marginX = 8;
    const marginY = 8;
    let cols = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Draw outer tag box
      doc.setDrawColor(180, 180, 180);
      doc.rect(x, y, labelWidth, labelHeight);

      // Top banner
      doc.setFillColor(15, 23, 42);
      doc.rect(x, y, labelWidth, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text('PATRIMÔNIO PÚBLICO - INSTITUTO TÉCNICO', x + 3, y + 5);

      // Generate QR Code Data URL
      try {
        const qrDataUrl = await QRCode.toDataURL(item.qrCode, { margin: 1, width: 120 });
        doc.addImage(qrDataUrl, 'PNG', x + 3, y + 9, 26, 26);
      } catch (e) {
        console.error("Erro ao gerar QR Code:", e);
      }

      // Text details
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(item.codigoPatrimonial, x + 31, y + 13);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      const truncatedName = item.nome.length > 32 ? item.nome.substring(0, 30) + '...' : item.nome;
      doc.text(truncatedName, x + 31, y + 18);

      doc.setFontSize(6.5);
      doc.text(`Cód. Barras: ${item.codigoBarras}`, x + 31, y + 23);
      doc.text(`Local: ${item.bloco} - ${item.sala}`, x + 31, y + 27);
      doc.text(`Resp: ${item.responsavelNome.split(' ')[0]} ${item.responsavelNome.split(' ')[1] || ''}`, x + 31, y + 31);

      // Footer line inside tag
      doc.setFontSize(5.5);
      doc.setTextColor(120);
      doc.text('SISTEMA RASTREADO SISPAT - PROIBIDA A REMOÇÃO', x + 3, y + 39);

      cols++;
      if (cols >= 2) {
        cols = 0;
        x = 14;
        y += labelHeight + marginY;
      } else {
        x += labelWidth + marginX;
      }

      if (y + labelHeight > 280 && i < items.length - 1) {
        doc.addPage();
        x = 14;
        y = 20;
        cols = 0;
      }
    }

    doc.save(`Etiquetas_Patrimoniais_SISPAT_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  // --- ZERAR TODO O SISTEMA ---
  clearAllData(usuario: UserProfile) {
    this.assertRole(usuario, ['ADMIN'], 'zerar o sistema');

    const currentAdmin = this.getUsers().find(u =>
      u.role === 'ADMIN' && (u.id === usuario.id || u.login === 'admin')
    );
    const adminToKeep: UserAccount = currentAdmin
      ? { ...currentAdmin, login: 'admin', nomeCompleto: currentAdmin.nomeCompleto || 'Administrador', situacao: 'Ativo' }
      : { ...INITIAL_USERS[0] };

    localStorage.setItem(STORAGE_KEYS.PATRIMONIOS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.MOVIMENTACOES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.MANUTENCOES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EMPRESTIMOS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INVENTARIO, JSON.stringify({ ...INITIAL_INVENTARIO_SESSAO, encontradosIds: [], pendentesIds: [], divergencias: [] }));
    localStorage.setItem(STORAGE_KEYS.INVENTARIO_HISTORY, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SECTORS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([adminToKeep]));

    const profile: UserProfile = {
      id: adminToKeep.id,
      role: 'ADMIN',
      name: adminToKeep.nomeCompleto,
      email: adminToKeep.email,
      cpf: adminToKeep.cpf,
      matricula: adminToKeep.matricula,
      setor: adminToKeep.setor,
      cargo: adminToKeep.cargo,
      telefone: adminToKeep.telefone,
      login: 'admin',
      situacao: 'Ativo',
      forcePasswordChange: adminToKeep.forcePasswordChange,
    };
    localStorage.setItem(SESSION_KEYS.AUTHENTICATED, 'true');
    localStorage.setItem(SESSION_KEYS.USER, JSON.stringify(profile));
    localStorage.setItem(SESSION_KEYS.ROLE, 'ADMIN');
    this.notifyListeners();
  }

  resetToInitialData(usuario: UserProfile) {
    this.clearAllData(usuario);
  }
}

export const storageService = new StorageService();
