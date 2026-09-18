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
  SectorItem,
  SituacaoPatrimonio
} from '../types';
import {
  INITIAL_INVENTARIO_SESSAO
} from '../data/initialData';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { validatePasswordStrength } from '../utils/passwordSecurity';
import {
  apiLogin,
  apiChangePassword,
  apiListUsers,
  apiCreateUser,
  apiUpdateUser,
  apiDeleteUser,
  apiResetUserPassword,
  apiGetPatrimonios,
  apiSavePatrimonio,
  apiDeletePatrimonio,
  apiGetEmprestimos,
  apiSaveEmprestimo,
  apiDeleteEmprestimo,
  apiGetManutencoes,
  apiSaveManutencao,
  apiDeleteManutencao,
  apiGetSectors,
  apiSaveSector,
  apiDeleteSector,
  apiGetMovimentacoes,
  apiSaveMovimentacao,
  apiDeleteMovimentacao,
  apiDeleteMovimentacoesByPatrimonio,
  apiGetInventarios,
  apiSaveInventario,
  apiDeleteInventario,
  apiGetAuditLogs,
  apiSaveAuditLog,
  apiDeleteAuditLog,
  setAuthToken,
  getAuthToken as getCentralToken,
  clearAuthToken as clearCentralToken,
  buildProfileFromUser,
  userFacingApiError,
  type PublicUser,
} from './apiClient';

const STORAGE_KEYS = {
  PATRIMONIOS: 'sispat_patrimonios_v40',
  MANUTENCOES: 'sispat_manutencoes_v40',
  EMPRESTIMOS: 'sispat_emprestimos_v40',
};

// Chave legada de usuários: mantida apenas para purgar resquícios da fase em que
// os usuários eram espelhados no navegador. O Neon é a única fonte de verdade.
const LEGACY_USERS_KEY = 'sispat_users_v40';

// Chave legada de setores: mantida apenas para purgar resquícios da fase em que
// os setores eram espelhados localmente. O Neon é a única fonte de verdade;
// esta chave nunca é lida nem usada como fallback/espelho.
const LEGACY_SECTORS_KEY = 'sispat_sectors_v40';

const SESSION_KEYS = {
  AUTHENTICATED: 'sispat_authenticated_v40',
  USER: 'sispat_logged_user_v40',
  ROLE: 'sispat_current_role_v40',
};

export type CentralConnectionStatus = 'unknown' | 'online' | 'offline';

export class StorageService {
  private clientIp = 'IP não coletado (modo local)';

  // --- ETAPA 4/4: patrimônios, empréstimos, manutenções, movimentações,
  // inventários e trilha de auditoria são centralizados (PostgreSQL/Neon). As
  // listas vivem apenas em memória e são alimentadas pela API central. Nenhum
  // desses dados é gravado em localStorage/IndexedDB.
  private patrimoniosMemory: Patrimonio[] = [];
  private emprestimosMemory: Emprestimo[] = [];
  private manutencoesMemory: Manutencao[] = [];
  private movimentacoesMemory: Movimentacao[] = [];
  private auditLogsMemory: AuditLog[] = [];
  private inventariosMemory: InventarioSessao[] = [];
  private centralStatus: CentralConnectionStatus = 'unknown';
  private legacyCentralKeysCleaned = false;

  // Setores: fonte única central (PostgreSQL/Neon). A memória reflete a última
  // carga central; nenhum cadastro é lido/gravado em localStorage/IndexedDB.
  private sectorsMemory: SectorItem[] | null = null;

  // Usuários: fonte única central (PostgreSQL/Neon). Nenhum cadastro de usuário
  // é gravado em localStorage/IndexedDB; a memória reflete exclusivamente o Neon.
  private usersMemory: UserAccount[] | null = null;

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

  // --- PATRIMÔNIOS (fonte central única: PostgreSQL/Neon) ---
  getPatrimonios(): Patrimonio[] {
    return JSON.parse(JSON.stringify(this.patrimoniosMemory)) as Patrimonio[];
  }

  private setPatrimonios(items: Patrimonio[]) {
    this.patrimoniosMemory = items;
    this.notifyListeners();
  }

  // Status da conexão com o banco central (Neon).
  getCentralConnectionStatus(): CentralConnectionStatus {
    return this.centralStatus;
  }

  isCentralOnline(): boolean {
    return this.centralStatus === 'online';
  }

  // Remove as chaves legadas centralizadas (patrimônios, empréstimos,
  // manutenções, movimentações, auditoria e inventários) do armazenamento
  // local SOMENTE após uma carga central bem-sucedida. O espelho IndexedDB
  // (desktopPersistence) foi desativado na Etapa 8: nenhum dado é reescrito.
  private cleanupLegacyCentralKeys() {
    if (this.legacyCentralKeysCleaned) return;
    this.legacyCentralKeysCleaned = true;
    try {
      localStorage.removeItem(STORAGE_KEYS.PATRIMONIOS);
      localStorage.removeItem(STORAGE_KEYS.EMPRESTIMOS);
      localStorage.removeItem(STORAGE_KEYS.MANUTENCOES);
      localStorage.removeItem('sispat_movimentacoes_v40');
      localStorage.removeItem('sispat_audit_logs_v40');
      localStorage.removeItem('sispat_inventario_v40');
      localStorage.removeItem('sispat_inventario_history_v40');
      // Usuários legados (espelhamento local da Etapa 2): não são mais fonte de
      // dados — apenas purga local.
      localStorage.removeItem(LEGACY_USERS_KEY);
      // Setores legados (espelhamento local da fase anterior): não são mais
      // fonte de dados/fallback — apenas purga local.
      localStorage.removeItem(LEGACY_SECTORS_KEY);
    } catch {
      // Nunca quebrar o fluxo por causa da limpeza das chaves legadas.
    }
  }

  // Busca as listas autoritativas no banco central (patrimônios, empréstimos,
  // manutenções, movimentações e inventários). Em falha, o central é tratado
  // como indisponível e os dados em memória permanecem apenas como
  // visualização somente leitura (banner avisa que estão desatualizados).
  async refreshCentralDataFromApi(): Promise<{
    patrimonios: Patrimonio[];
    emprestimos: Emprestimo[];
    manutencoes: Manutencao[];
    movimentacoes: Movimentacao[];
    inventarios: InventarioSessao[];
  }> {
    if (!this.isLoggedIn()) {
      this.centralStatus = 'unknown';
      return { patrimonios: [], emprestimos: [], manutencoes: [], movimentacoes: [], inventarios: [] };
    }
    try {
      const [patResult, empResult, manResult, movResult, invResult] = await Promise.all([
        apiGetPatrimonios(),
        apiGetEmprestimos(),
        apiGetManutencoes(),
        apiGetMovimentacoes(),
        apiGetInventarios(),
      ]);
      this.patrimoniosMemory = patResult.patrimonios;
      this.emprestimosMemory = empResult.emprestimos;
      this.manutencoesMemory = manResult.manutencoes;
      this.movimentacoesMemory = movResult.movimentacoes;
      this.inventariosMemory = invResult.inventarios;
      this.centralStatus = 'online';
      this.cleanupLegacyCentralKeys();
      this.notifyListeners();
      return {
        patrimonios: this.getPatrimonios(),
        emprestimos: this.getEmprestimos(),
        manutencoes: this.getManutencoes(),
        movimentacoes: this.getMovimentacoes(),
        inventarios: this.getInventarioHistorico(),
      };
    } catch (error) {
      this.centralStatus = 'offline';
      // Em falha de refresh, mantém os dados já carregados em memória como
      // visualização somente leitura (banner avisa que estão desatualizados).
      throw error;
    }
  }

  // A trilha de auditoria é lida à parte do refresh principal, pois exige o
  // perfil com canViewAudit (ADMIN/GESTOR/AUDITOR). O frontend decide quando
  // chamar (evita 403 e respeita o RBAC no backend).
  async refreshAuditLogsFromApi(): Promise<AuditLog[]> {
    if (!this.isLoggedIn()) {
      this.auditLogsMemory = [];
      return [];
    }
    const result = await apiGetAuditLogs();
    this.auditLogsMemory = result.auditLogs;
    return this.getAuditLogs();
  }

  async refreshPatrimoniosFromApi(): Promise<Patrimonio[]> {
    const data = await this.refreshCentralDataFromApi();
    return data.patrimonios;
  }

  async savePatrimonio(patrimonio: Patrimonio, usuario: UserProfile): Promise<Patrimonio> {
    this.assertRole(usuario, ['ADMIN', 'GESTOR', 'OPERADOR', 'TECNICO'], 'salvar patrimônios');
    const items = this.getPatrimonios();
    if (!patrimonio.codigoPatrimonial?.trim()) throw new Error('Informe o código patrimonial/tombo.');
    const duplicateCode = items.find(p =>
      p.id !== patrimonio.id &&
      p.codigoPatrimonial.trim().toLowerCase() === patrimonio.codigoPatrimonial.trim().toLowerCase()
    );
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
    const isNew = existingIndex < 0;
    const oldItem = isNew ? undefined : items[existingIndex];
    const payload: Patrimonio = {
      ...patrimonio,
      id: patrimonio.id || `pat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      codigoPatrimonial: patrimonio.codigoPatrimonial.trim(),
      codigoBarras: patrimonio.codigoBarras || '',
      qrCode: patrimonio.qrCode || '',
      dataCadastro: patrimonio.dataCadastro || now,
      ultimaAtualizacao: now,
    };

    // Grava no banco central (Neon). Se falhar, a exceção impede qualquer
    // atualização em memória — o usuário vê a mensagem de erro.
    await apiSavePatrimonio(payload);

    // Atualiza memória apenas após sucesso da API.
    const next = this.getPatrimonios();
    const idx = next.findIndex(p => p.id === payload.id);
    if (idx >= 0) { next[idx] = payload; } else { next.unshift(payload); }
    this.setPatrimonios(next);

    // Movimentação e auditoria são gravadas no banco central (Neon). Se
    // qualquer uma falhar, a exceção impede que a operação seja declarada
    // concluída sem a devida confirmação do banco central.
    if (isNew) {
      await this.addMovimentacaoInternal({
        id: 'mov-' + Date.now(),
        patrimonioId: payload.id,
        codigoPatrimonial: payload.codigoPatrimonial,
        patrimonioNome: payload.nome,
        dataHora: now,
        usuarioNome: usuario.name,
        usuarioPerfil: usuario.role,
        localAnterior: 'Inclusão Inicial',
        localNovo: `${payload.bloco} / ${payload.laboratorio} / ${payload.sala}`,
        responsavelAnterior: 'Não informado',
        responsavelNovo: payload.responsavelNome,
        motivo: 'Inclusão de novo bem patrimonial no acervo público',
        tipoOperacao: 'Cadastro',
      });
      await this.addAuditLogInternal({
        id: 'log-' + Date.now(),
        dataHora: now,
        usuarioNome: usuario.name,
        usuarioPerfil: usuario.role,
        acao: 'Cadastro de Patrimônio',
        entidade: 'Patrimônio',
        entidadeId: payload.codigoPatrimonial,
        detalhe: `Cadastrado novo patrimônio "${payload.nome}" (${payload.codigoPatrimonial}) - Valor: R$ ${payload.valor.toFixed(2)}`,
        ip: this.getAuditIp(),
      });
    } else if (
      oldItem && (
        oldItem.bloco !== payload.bloco ||
        oldItem.laboratorio !== payload.laboratorio ||
        oldItem.sala !== payload.sala ||
        oldItem.responsavelNome !== payload.responsavelNome
      )
    ) {
      await this.addMovimentacaoInternal({
        id: 'mov-' + Date.now(),
        patrimonioId: payload.id,
        codigoPatrimonial: payload.codigoPatrimonial,
        patrimonioNome: payload.nome,
        dataHora: now,
        usuarioNome: usuario.name,
        usuarioPerfil: usuario.role,
        localAnterior: `${oldItem.bloco} / ${oldItem.laboratorio} / ${oldItem.sala}`,
        localNovo: `${payload.bloco} / ${payload.laboratorio} / ${payload.sala}`,
        responsavelAnterior: oldItem.responsavelNome,
        responsavelNovo: payload.responsavelNome,
        motivo: 'Atualização cadastral de localização/responsável',
        tipoOperacao: 'Transferência',
      });
      await this.addAuditLogInternal({
        id: 'log-' + Date.now(),
        dataHora: now,
        usuarioNome: usuario.name,
        usuarioPerfil: usuario.role,
        acao: 'Atualização de Patrimonio',
        entidade: 'Patrimônio',
        entidadeId: payload.codigoPatrimonial,
        detalhe: `Atualizado bem "${payload.nome}" (${payload.codigoPatrimonial}). Situacao: ${payload.situacao}`,
        ip: this.getAuditIp(),
      });
    }

    return Promise.resolve(payload);
  }

  async savePatrimoniosBulk(patrimonios: Patrimonio[], usuario: UserProfile): Promise<{ saved: Patrimonio[]; errors: string[] }> {
    this.assertRole(usuario, ['ADMIN', 'GESTOR', 'OPERADOR', 'TECNICO'], 'cadastrar patrimônios em lote');
    const saved: Patrimonio[] = [];
    const errors: string[] = [];
    const now = new Date().toISOString();
    const batchTombos = new Set<string>();
    const batchBarcodes = new Set<string>();
    const batchQrs = new Set<string>();

    for (let i = 0; i < patrimonios.length; i++) {
      const p = patrimonios[i];
      const tombo = p.codigoPatrimonial?.trim();
      const barcode = p.codigoBarras?.trim() || '';
      const qr = p.qrCode?.trim() || '';
      if (!tombo) { errors.push(`Item ${i + 1}: informe o código patrimonial/tombo.`); continue; }
      const tomboKey = tombo.toLowerCase();
      if (batchTombos.has(tomboKey)) { errors.push(`Tombo duplicado no lote: ${tombo}.`); continue; }
      if (barcode && batchBarcodes.has(barcode)) { errors.push(`Código de barras duplicado no lote: ${barcode}.`); continue; }
      const qrKey = qr.toLowerCase();
      if (qr && batchQrs.has(qrKey)) { errors.push(`QR Code duplicado no lote: ${qr}.`); continue; }

      batchTombos.add(tomboKey);
      if (barcode) batchBarcodes.add(barcode);
      if (qr) batchQrs.add(qrKey);

      try {
        // savePatrimonio já persiste no banco central, adiciona em memória,
        // registra movimentação "Cadastro" e log de auditoria do item.
        const result = await this.savePatrimonio({ ...p, id: p.id || undefined }, usuario);
        saved.push(result);
      } catch (err: any) {
        errors.push(`Item ${i + 1} (${tombo}): ${err instanceof Error ? err.message : 'falha ao salvar.'}`);
      }
    }

    if (saved.length > 0) {
      await this.addAuditLogInternal({
        id: 'log-' + Date.now(),
        dataHora: now,
        usuarioNome: usuario.name,
        usuarioPerfil: usuario.role,
        acao: 'Cadastro em Lote de Patrimônios',
        entidade: 'Patrimônio',
        entidadeId: `${saved.length} itens`,
        detalhe: `Cadastrados ${saved.length} novos bens via entrada em lote. ${errors.length > 0 ? `${errors.length} item(ns) falharam.` : ''}`,
        ip: this.getAuditIp(),
      });
    }

    return { saved, errors };
  }

  // --- USER ACCOUNTS MANAGEMENT (ADMIN EXCLUSIVE) ---
  // Neon é a ÚNICA fonte de verdade dos usuários. A memória reflete a última
  // carga central; nenhum cadastro é lido/gravado em localStorage/IndexedDB.

  // Converte um usuário público (sem passwordHash) retornado pela API em uma
  // conta para exibição no frontend.
  private toUserAccount(publicUser: PublicUser): UserAccount {
    return {
      id: publicUser.id,
      login: publicUser.login,
      nomeCompleto: publicUser.nomeCompleto,
      cpf: publicUser.cpf,
      matricula: publicUser.matricula,
      email: publicUser.email,
      telefone: publicUser.telefone || '',
      cargo: publicUser.cargo,
      setor: publicUser.setor,
      role: publicUser.role as UserRole,
      situacao: publicUser.situacao,
      passwordHash: '',
      forcePasswordChange: publicUser.forcePasswordChange,
      dataCriacao: publicUser.dataCriacao,
      ultimoAcesso: publicUser.ultimoAcesso,
      tentativasInvalidas: publicUser.tentativasInvalidas,
    };
  }

  getUsers(): UserAccount[] {
    const users = this.usersMemory ?? [];
    return JSON.parse(JSON.stringify(users)) as UserAccount[];
  }

  private setUsers(users: UserAccount[]) {
    this.usersMemory = users;
    this.notifyListeners();
  }

  // Busca os usuários autoritativos no Neon via GET /api/auth/users (apiListUsers).
  // Em falha, a exceção propaga e a memória anterior é mantida.
  async refreshUsersFromApi(): Promise<UserAccount[]> {
    const result = await apiListUsers();
    this.usersMemory = result.users.map(u => this.toUserAccount(u));
    this.notifyListeners();
    return this.getUsers();
  }

  // --- SECTORS MANAGEMENT (fonte única central: PostgreSQL/Neon) ---
  // Nenhum cadastro de setor é lido/gravado em localStorage/IndexedDB; a
  // memória reflete exclusivamente o Neon durante a sessão.
  getSectors(): SectorItem[] {
    return this.sectorsMemory ? JSON.parse(JSON.stringify(this.sectorsMemory)) : [];
  }

  // Remove a chave legada de setores (espelho local da fase anterior). Nunca é
  // lida nem alimentada; executa somente como purga best-effort local.
  private cleanupLegacySectorsKey() {
    try {
      localStorage.removeItem(LEGACY_SECTORS_KEY);
    } catch {
      // Limpeza de chave legada é best-effort.
    }
  }

  // Busca a lista autoritativa de setores no Neon via GET /api/db/sectors
  // (apiGetSectors). Em falha, a exceção propaga e o cache em memória da
  // sessão permanece apenas para exibição somente leitura — sem fallback local.
  async refreshSectorsFromApi(): Promise<SectorItem[]> {
    if (!this.isLoggedIn()) return this.getSectors();
    try {
      const result = await apiGetSectors();
      const list = Array.isArray(result.sectors) ? result.sectors : [];
      this.sectorsMemory = list;
      this.cleanupLegacySectorsKey();
      return this.getSectors();
    } catch (error) {
      // Preserva o cache em memória da sessão; nenhum dado é gravado localmente.
      throw error;
    }
  }

  async saveSector(sector: SectorItem, performer: UserProfile): Promise<SectorItem> {
    this.assertRole(performer, ['ADMIN'], 'alterar setores');
    if (!sector.nome?.trim()) throw new Error('Informe o nome do setor.');
    if (!sector.sigla?.trim()) throw new Error('Informe a sigla do setor.');
    if (!sector.responsavel?.trim()) throw new Error('Informe o responsável pelo setor.');

    const payload: SectorItem = {
      ...sector,
      id: sector.id || 'sec-' + Date.now(),
      nome: sector.nome.trim(),
      sigla: sector.sigla.trim().toUpperCase(),
      responsavel: sector.responsavel.trim(),
    };

    const sectors = this.getSectors();
    const index = sectors.findIndex(s => s.id === payload.id);

    // Central-first: grava exclusivamente no Neon via apiSaveSector(). Em
    // falha, a exceção impede qualquer atualização em memória — sem espelho.
    await apiSaveSector(payload);

    // Atualiza a memória apenas após a confirmação do Neon.
    const next = this.getSectors();
    const idx = next.findIndex(s => s.id === payload.id);
    if (idx >= 0) { next[idx] = payload; } else { next.push(payload); }
    this.sectorsMemory = next;

    await this.addAuditLogInternal({
      id: 'log-' + Date.now(),
      dataHora: new Date().toISOString(),
      usuarioNome: performer.name,
      usuarioPerfil: performer.role,
      acao: index >= 0 ? 'Alteração de Setor' : 'Criação de Setor',
      entidade: 'Sistema',
      entidadeId: payload.sigla,
      detalhe: `Setor "${payload.nome}" (${payload.sigla}) ${index >= 0 ? 'atualizado' : 'cadastrado'} no banco central. Responsável: ${payload.responsavel}`,
      ip: this.getAuditIp(),
    });

    this.notifyListeners();
    return payload;
  }

  async deleteSector(sectorId: string, performer: UserProfile): Promise<void> {
    this.assertRole(performer, ['ADMIN'], 'excluir setores');
    if (!sectorId) throw new Error('Identificador do setor é obrigatório.');

    // Central-first: exclui exclusivamente no Neon via apiDeleteSector(). Em
    // falha, a exceção impede qualquer atualização em memória — sem espelho.
    await apiDeleteSector(sectorId);

    const next = this.getSectors().filter(s => s.id !== sectorId);
    this.sectorsMemory = next;
    await this.addAuditLogInternal({
      id: 'log-' + Date.now(),
      dataHora: new Date().toISOString(),
      usuarioNome: performer.name,
      usuarioPerfil: performer.role,
      acao: 'Exclusão de Setor',
      entidade: 'Sistema',
      entidadeId: sectorId,
      detalhe: `Setor ID ${sectorId} excluído do cadastro institucional (banco central).`,
      ip: this.getAuditIp(),
    });
    this.notifyListeners();
  }

  // Admin User Creation
  async createUser(userData: Partial<UserAccount>, performer: UserProfile): Promise<{ user: UserAccount; tempPassword: string }> {
    if (performer.role !== 'ADMIN') {
      throw new Error('Apenas Administradores Gerais podem cadastrar novos usuários no SISPAT.');
    }

    // Central-only: cadastra no Neon via POST /api/auth/users. Em falha, a
    // exceção propaga e NADA é gravado localmente (sem espelho/fallback).
    const central = await apiCreateUser(userData as Partial<UserAccount>);
    const account = this.toUserAccount(central.user);

    // A memória apenas reflete o que o Neon confirmou.
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === account.id);
    if (idx >= 0) users[idx] = account; else users.push(account);
    this.setUsers(users);

    await this.addAuditLogInternal({
      id: 'log-' + Date.now(),
      dataHora: new Date().toISOString(),
      usuarioNome: performer.name,
      usuarioPerfil: performer.role,
      acao: 'Criação de Usuário (Central)',
      entidade: 'Usuário',
      entidadeId: account.login,
      detalhe: `Usuário "${account.nomeCompleto}" (${account.login}) cadastrado no banco central com perfil ${account.role}. Senha temporária gerada.`,
      ip: this.getAuditIp(),
    });

    return { user: account, tempPassword: central.tempPassword };
  }

  // Admin User Update
  async updateUser(userData: UserAccount, performer: UserProfile): Promise<UserAccount> {
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

    // Central-first: persiste no Neon via PUT /api/auth/users. Se falhar, a
    // exceção impede qualquer atualização em memória — sem espelho local.
    const central = await apiUpdateUser(userData.id, {
      nomeCompleto: userData.nomeCompleto,
      cpf: userData.cpf,
      matricula: userData.matricula,
      email: userData.email,
      telefone: userData.telefone,
      cargo: userData.cargo,
      setor: userData.setor,
      role: userData.role,
      situacao: userData.situacao,
    });

    const updated = this.toUserAccount(central.user);
    const next = this.getUsers();
    const idx = next.findIndex(u => u.id === updated.id);
    if (idx >= 0) next[idx] = updated;
    this.setUsers(next);

    await this.addAuditLogInternal({
      id: 'log-' + Date.now(),
      dataHora: new Date().toISOString(),
      usuarioNome: performer.name,
      usuarioPerfil: performer.role,
      acao: 'Alteração de Dados do Usuário',
      entidade: 'Usuário',
      entidadeId: updated.login,
      detalhe: `Atualizado cadastro do usuário "${updated.nomeCompleto}" (${updated.login}). Perfil: ${updated.role}, Situação: ${updated.situacao}`,
      ip: this.getAuditIp(),
    });

    return updated;
  }

  // Admin Toggle User Status (Lock/Unlock / Active/Inactive)
  async toggleUserStatus(userId: string, newStatus: 'Ativo' | 'Inativo' | 'Bloqueado', performer: UserProfile): Promise<UserAccount> {
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

    // Central-first: grava o novo status no Neon. Em falha, nada muda em memória.
    const central = await apiUpdateUser(user.id, { situacao: newStatus });
    const updated = this.toUserAccount(central.user);
    const next = this.getUsers();
    const idx = next.findIndex(u => u.id === updated.id);
    if (idx >= 0) next[idx] = updated;
    this.setUsers(next);

    await this.addAuditLogInternal({
      id: 'log-' + Date.now(),
      dataHora: new Date().toISOString(),
      usuarioNome: performer.name,
      usuarioPerfil: performer.role,
      acao: `Alteração de Status: ${oldStatus} -> ${newStatus}`,
      entidade: 'Usuário',
      entidadeId: updated.login,
      detalhe: `Status do usuário "${updated.nomeCompleto}" (${updated.login}) alterado para ${newStatus} no banco central.`,
      ip: this.getAuditIp(),
    });

    return updated;
  }

  // Admin Password Reset
  async resetUserPassword(userId: string, performer: UserProfile): Promise<{ tempPassword: string }> {
    if (performer.role !== 'ADMIN') {
      throw new Error('Apenas o Administrador Geral pode redefinir senhas de usuários.');
    }

    // Central-only: redefinição de senha executada no Neon (PUT
    // /api/auth/users/:id/reset-password). Em falha, a exceção propaga.
    const central = await apiResetUserPassword(userId);

    await this.addAuditLogInternal({
      id: 'log-' + Date.now(),
      dataHora: new Date().toISOString(),
      usuarioNome: performer.name,
      usuarioPerfil: performer.role,
      acao: 'Redefinição de Senha do Usuário (Central)',
      entidade: 'Usuário',
      entidadeId: userId,
      detalhe: `Senha do usuário "${userId}" redefinida no banco central. Nova troca exigida no próximo acesso.`,
      ip: this.getAuditIp(),
    });

    return { tempPassword: central.tempPassword };
  }

  // Change Password by Logged-in User (or Forced First-Time Change)
  async changePassword(userId: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) return { success: false, message: strengthError };

    // Central-only: o servidor valida força e igualdade à senha atual e grava o
    // novo hash no Neon (POST /api/auth/change-password). Não há fallback local.
    try {
      await apiChangePassword(newPassword);
      await this.addAuditLogInternal({
        id: 'log-' + Date.now(), dataHora: new Date().toISOString(), usuarioNome: this.getCurrentUser()?.name || userId,
        usuarioPerfil: this.getCurrentUser()?.role || 'VISITANTE', acao: 'Troca de Senha Realizada (Central)', entidade: 'Usuário', entidadeId: userId,
        detalhe: `Troca de senha confirmada na API central para "${userId}".`, ip: this.getAuditIp(),
      });
    } catch (err) {
      return { success: false, message: userFacingApiError(err) };
    }

    // Reflete a troca na SESSÃO local (dado de sessão, não cadastro de negócio).
    const currentLogged = this.getCurrentUser();
    if (currentLogged && (currentLogged.id === userId || currentLogged.email === userId || currentLogged.login === userId)) {
      currentLogged.forcePasswordChange = false;
      localStorage.setItem(SESSION_KEYS.USER, JSON.stringify(currentLogged));
    }

    return { success: true };
  }

  // Delete User Account
  async deleteUser(userId: string, performer: UserProfile): Promise<{ success: boolean; message?: string }> {
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

    // Central-first: exclui no Neon via DELETE /api/auth/users/:id. Em falha,
    // a exceção impede a remoção da memória.
    await apiDeleteUser(userId);

    this.setUsers(this.getUsers().filter(u => u.id !== userId));

    await this.addAuditLogInternal({
      id: 'log-' + Date.now(),
      dataHora: new Date().toISOString(),
      usuarioNome: performer.name,
      usuarioPerfil: performer.role,
      acao: 'Exclusão de Usuário',
      entidade: 'Usuário',
      entidadeId: target.login,
      detalhe: `Conta de usuário "${target.nomeCompleto}" (${target.login}) removida do banco central pelo Administrador.`,
      ip: this.getAuditIp(),
    });

    return { success: true };
  }

  // --- NÚCLEO DE AUTENTICAÇÃO CENTRAL (JWT) ---
  // A API central (Neon) é a única fonte de verdade da autenticação. O token
  // JWT e o perfil autenticado são dados de sessão (sessionStorage/localStorage
  // de sessão) — não são cadastro de negócio.

  getAuthToken(): string | null {
    return getCentralToken();
  }

  clearAuthToken(): void {
    clearCentralToken();
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
    // Central-only: o login valida APENAS contra os usuários no Neon
    // (POST /api/auth/login). Não existe fallback para usuários do
    // localStorage/IndexedDB — se a API falhar, o login falha.
    try {
      const central = await apiLogin(loginOrEmailOrCpf, passwordInput);
      setAuthToken(central.token);
      const profile = buildProfileFromUser(central.user);

      // Sessão (não cadastro): token e perfil autenticado ficam na sessão.
      localStorage.setItem(SESSION_KEYS.AUTHENTICATED, 'true');
      localStorage.setItem(SESSION_KEYS.USER, JSON.stringify(profile));
      localStorage.setItem(SESSION_KEYS.ROLE, profile.role);

      await this.auditBestEffort({
        id: 'log-' + Date.now(),
        dataHora: new Date().toISOString(),
        usuarioNome: profile.name,
        usuarioPerfil: profile.role,
        acao: 'Login no Sistema (Central)',
        entidade: 'Sistema',
        entidadeId: profile.login || profile.email,
        detalhe: `Autenticação central bem-sucedida para "${profile.name}" (${profile.role}).`,
        ip: this.getAuditIp(),
      });

      this.notifyListeners();
      return {
        success: true,
        user: profile,
        forcePasswordChange: central.forcePasswordChange,
      };
    } catch (centralError) {
      // Qualquer falha (offline, rede, 401, 403, 400, 503) é retornada ao usuário.
      return { success: false, message: userFacingApiError(centralError) };
    }
  }

  async logout() {
    const user = this.getCurrentUser();
    if (user) {
      // Best-effort: o logout não pode ficar pendurado se o banco central
      // estiver inalcançável; nada é gravado localmente.
      await this.auditBestEffort({
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
    clearCentralToken();
    // Encerra a sessão: dados centrais saem da memória também.
    this.patrimoniosMemory = [];
    this.emprestimosMemory = [];
    this.manutencoesMemory = [];
    this.movimentacoesMemory = [];
    this.auditLogsMemory = [];
    this.inventariosMemory = [];
    this.sectorsMemory = null;
    this.usersMemory = null;
    this.centralStatus = 'unknown';
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
  ): Promise<Patrimonio> {
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

  async deletePatrimonio(id: string, usuario: UserProfile): Promise<boolean> {
    this.assertRole(usuario, ['ADMIN'], 'excluir patrimônio definitivamente');
    const items = this.getPatrimonios();
    const item = items.find(p => p.id === id);
    if (!item) return false;

    // Exclui também os empréstimos, manutenções e movimentações centrais
    // vinculados ao bem, mantendo a consistência entre as estações
    // (A → Neon → B). Nada é gravado em localStorage.
    const loansCentral = this.emprestimosMemory.filter(e => e.patrimonioId === id);
    for (const loan of loansCentral) {
      await apiDeleteEmprestimo(loan.id);
    }
    const maintCentral = this.manutencoesMemory.filter(m => m.patrimonioId === id);
    for (const m of maintCentral) {
      await apiDeleteManutencao(m.id);
    }
    await apiDeleteMovimentacoesByPatrimonio(id);

    await apiDeletePatrimonio(id);

    this.setPatrimonios(items.filter(p => p.id !== id));
    this.emprestimosMemory = this.emprestimosMemory.filter(e => e.patrimonioId !== id);
    this.manutencoesMemory = this.manutencoesMemory.filter(m => m.patrimonioId !== id);
    this.movimentacoesMemory = this.movimentacoesMemory.filter(m => m.patrimonioId !== id);

    // Remove o bem das sessões de inventário em memória (espelho do Neon).
    this.inventariosMemory = this.inventariosMemory.map(s => ({
      ...s,
      encontradosIds: (s.encontradosIds || []).filter(x => x !== id),
      pendentesIds: (s.pendentesIds || []).filter(x => x !== id),
      divergencias: (s.divergencias || []).filter(d => d.patrimonioId !== id),
    }));

    await this.addAuditLogInternal({
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

  // --- MOVIMENTAÇÕES (fonte central única: PostgreSQL/Neon) ---
  getMovimentacoes(): Movimentacao[] {
    return JSON.parse(JSON.stringify(this.movimentacoesMemory)) as Movimentacao[];
  }

  // Persiste a movimentação no banco central. A memória só reflete o evento
  // após a confirmação do Neon.
  private async addMovimentacaoInternal(mov: Movimentacao): Promise<void> {
    await apiSaveMovimentacao(mov);
    this.movimentacoesMemory = [mov, ...this.movimentacoesMemory.filter(m => m.id !== mov.id)];
  }

  // --- MANUTENÇÕES (fonte central única: PostgreSQL/Neon) ---
  getManutencoes(): Manutencao[] {
    return JSON.parse(JSON.stringify(this.manutencoesMemory)) as Manutencao[];
  }

  // Propaga a situação central de um patrimônio (EMPRÉSTIMO/MANUTENÇÃO), sem
  // passar pela checagem de perfil de savePatrimonio: a autorização já foi
  // validada na operação que originou a mudança.
  private async persistPatrimonioSituacao(
    patrimonioId: string,
    codigoPatrimonial: string,
    situacao: SituacaoPatrimonio,
  ): Promise<void> {
    const items = this.getPatrimonios();
    const idx = items.findIndex(p => p.id === patrimonioId || p.codigoPatrimonial === codigoPatrimonial);
    if (idx < 0) return;
    const pat = { ...items[idx], situacao, ultimaAtualizacao: new Date().toISOString() };
    // Persiste no banco central primeiro; a memória só reflete após sucesso.
    await apiSavePatrimonio(pat);
    items[idx] = pat;
    this.setPatrimonios(items);
  }

  async saveManutencao(manutencao: Manutencao, usuario: UserProfile): Promise<Manutencao> {
    this.assertRole(usuario, ['ADMIN', 'GESTOR', 'OPERADOR', 'TECNICO'], 'gerenciar manutenções');
    const list = this.manutencoesMemory;
    const index = list.findIndex(m => m.id === manutencao.id);
    const now = new Date().toISOString();

    // Persiste primeiro no banco central; só atualiza a memória após sucesso.
    await apiSaveManutencao(manutencao);

    if (index >= 0) {
      list[index] = manutencao;
    } else {
      list.unshift(manutencao);
    }
    this.manutencoesMemory = list;

    // Update Patrimonio status (persistido no Neon).
    if (manutencao.status === 'Aberta' || manutencao.status === 'Em_Andamento' || manutencao.status === 'Aguardando_Peças') {
      await this.persistPatrimonioSituacao(manutencao.patrimonioId, manutencao.codigoPatrimonial, 'Em manutenção');
    } else if (manutencao.status === 'Concluída') {
      await this.persistPatrimonioSituacao(manutencao.patrimonioId, manutencao.codigoPatrimonial, 'Disponível');
    }

    await this.addAuditLogInternal({
      id: 'log-' + Date.now(),
      dataHora: now,
      usuarioNome: usuario.name,
      usuarioPerfil: usuario.role,
      acao: index >= 0 ? 'Atualização de Manutenção (Central)' : 'Abertura de Manutenção (Central)',
      entidade: 'Manutenção',
      entidadeId: manutencao.codigoPatrimonial,
      detalhe: `OS de manutenção ${manutencao.status} para ${manutencao.patrimonioNome}. Defeito: ${manutencao.defeito}`,
      ip: this.getAuditIp(),
    });

    this.notifyListeners();
    return manutencao;
  }

  async deleteManutencao(id: string, usuario: UserProfile): Promise<boolean> {
    this.assertRole(usuario, ['ADMIN'], 'excluir manutenção');
    const target = this.manutencoesMemory.find(m => m.id === id);
    if (!target) return false;

    await apiDeleteManutencao(id);
    this.manutencoesMemory = this.manutencoesMemory.filter(m => m.id !== id);

    const pat = this.getPatrimonios().find(p => p.id === target.patrimonioId);
    if (pat && !this.manutencoesMemory.some(m => m.patrimonioId === pat.id && m.status !== 'Concluída' && m.status !== 'Cancelada')) {
      await this.persistPatrimonioSituacao(pat.id, pat.codigoPatrimonial, 'Disponível');
    }

    await this.addAuditLogInternal({
      id: 'log-' + Date.now(), dataHora: new Date().toISOString(), usuarioNome: usuario.name, usuarioPerfil: usuario.role,
      acao: 'Exclusão de Manutenção (Central)', entidade: 'Manutenção', entidadeId: target.codigoPatrimonial,
      detalhe: `Ordem de serviço ${target.id} excluída definitivamente.`, ip: this.getAuditIp(),
    });
    this.notifyListeners();
    return true;
  }

  // --- EMPRÉSTIMOS (fonte central única: PostgreSQL/Neon) ---
  getEmprestimos(): Emprestimo[] {
    // Derivação somente leitura: "Ativo" vencido passa a ser exibido como
    // "Atrasado" (baseada na data), sem gravar nada em memória/central.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const derived = this.emprestimosMemory.map(e => {
      if (e.status === 'Ativo' && e.previsaoDevolucao) {
        const due = new Date(`${e.previsaoDevolucao}T00:00:00`);
        if (!Number.isNaN(due.getTime()) && due < today) {
          return { ...e, status: 'Atrasado' as const };
        }
      }
      return e;
    });
    return JSON.parse(JSON.stringify(derived)) as Emprestimo[];
  }

  async saveEmprestimo(emprestimo: Emprestimo, usuario: UserProfile): Promise<Emprestimo> {
    this.assertRole(usuario, ['ADMIN', 'GESTOR', 'OPERADOR', 'SERVIDOR', 'PROFESSOR'], 'gerenciar empréstimos');
    const list = this.emprestimosMemory;
    const index = list.findIndex(e => e.id === emprestimo.id);
    const now = new Date().toISOString();

    // Persiste primeiro no banco central; só atualiza a memória após sucesso.
    await apiSaveEmprestimo(emprestimo);

    if (index >= 0) {
      list[index] = emprestimo;
    } else {
      list.unshift(emprestimo);
    }
    this.emprestimosMemory = list;

    // Update Patrimonio status (persistido no Neon).
    if (emprestimo.status === 'Ativo' || emprestimo.status === 'Atrasado') {
      await this.persistPatrimonioSituacao(emprestimo.patrimonioId, emprestimo.codigoPatrimonial, 'Emprestado');
    } else if (emprestimo.status === 'Devolvido') {
      await this.persistPatrimonioSituacao(emprestimo.patrimonioId, emprestimo.codigoPatrimonial, 'Disponível');
    }

    await this.addAuditLogInternal({
      id: 'log-' + Date.now(),
      dataHora: now,
      usuarioNome: usuario.name,
      usuarioPerfil: usuario.role,
      acao: index >= 0 ? 'Atualização de Empréstimo (Central)' : 'Novo Empréstimo (Central)',
      entidade: 'Empréstimo',
      entidadeId: emprestimo.codigoPatrimonial,
      detalhe: `Empréstimo ${emprestimo.status} para ${emprestimo.servidorNome} (${emprestimo.setor})`,
      ip: this.getAuditIp(),
    });

    this.notifyListeners();
    return emprestimo;
  }

  async deleteEmprestimo(id: string, usuario: UserProfile): Promise<boolean> {
    this.assertRole(usuario, ['ADMIN'], 'excluir empréstimo');
    const target = this.emprestimosMemory.find(e => e.id === id);
    if (!target) return false;

    await apiDeleteEmprestimo(id);
    this.emprestimosMemory = this.emprestimosMemory.filter(e => e.id !== id);

    const pat = this.getPatrimonios().find(p => p.id === target.patrimonioId);
    if (pat && !this.emprestimosMemory.some(e => e.patrimonioId === pat.id && (e.status === 'Ativo' || e.status === 'Atrasado'))) {
      await this.persistPatrimonioSituacao(pat.id, pat.codigoPatrimonial, 'Disponível');
    }

    await this.addAuditLogInternal({
      id: 'log-' + Date.now(), dataHora: new Date().toISOString(), usuarioNome: usuario.name, usuarioPerfil: usuario.role,
      acao: 'Exclusão de Empréstimo (Central)', entidade: 'Empréstimo', entidadeId: target.codigoPatrimonial,
      detalhe: `Empréstimo ${target.id} excluído definitivamente.`, ip: this.getAuditIp(),
    });
    this.notifyListeners();
    return true;
  }

  // --- AUDIT LOGS (fonte central única: PostgreSQL/Neon) ---
  getAuditLogs(): AuditLog[] {
    return JSON.parse(JSON.stringify(this.auditLogsMemory)) as AuditLog[];
  }

  // Grava o log no banco central. Somente retorna após a confirmação do Neon;
  // em falha, a exceção impede que a operação seja declarada concluída.
  private async addAuditLogInternal(log: AuditLog): Promise<void> {
    await apiSaveAuditLog(log);
    this.auditLogsMemory = [log, ...this.auditLogsMemory.filter(l => l.id !== log.id)];
  }

  // Variação tolerante usada SOMENTE nos fluxos que já operam em fallback
  // offline (login local, troca de senha local, gestão de usuários local e
  // logout): com o banco central inalcançável o evento simplesmente não pode
  // ser registrado, e não deve derrubar a operação. Nada é gravado localmente.
  private async auditBestEffort(log: AuditLog): Promise<void> {
    try {
      await this.addAuditLogInternal(log);
    } catch {
      // Banco central indisponível neste fluxo offline — registro não persistido.
    }
  }

  // --- INVENTÁRIO (fonte central única: PostgreSQL/Neon) ---
  // Sessões e histórico vivem no banco central; a memória reflete o Neon.
  private emptyInventarioSessao(): InventarioSessao {
    return { ...INITIAL_INVENTARIO_SESSAO, encontradosIds: [], pendentesIds: [], divergencias: [] };
  }

  // Sessão "atual": a que está em andamento/pausada (ou a mais recente na
  // memória). Retorna uma cópia vazia quando não há sessões carregadas.
  getInventarioSessao(): InventarioSessao {
    if (this.inventariosMemory.length === 0) return this.emptyInventarioSessao();
    const ativa = this.inventariosMemory.find(s => s.status === 'Em_Andamento' || s.status === 'Pausado');
    const sessao = ativa || this.inventariosMemory[0];
    return JSON.parse(JSON.stringify(sessao)) as InventarioSessao;
  }

  getInventarioHistorico(): InventarioSessao[] {
    return JSON.parse(JSON.stringify(this.inventariosMemory)) as InventarioSessao[];
  }

  async saveInventarioSessao(sessao: InventarioSessao, usuario?: UserProfile) {
    const usr = usuario || this.getCurrentUser();
    this.assertRole(usr, ['ADMIN', 'GESTOR', 'AUDITOR', 'OPERADOR', 'TECNICO'], 'executar inventário');

    // Persiste primeiro no banco central; a memória só reflete após sucesso.
    await apiSaveInventario(sessao);

    const index = this.inventariosMemory.findIndex(h => h.id === sessao.id);
    if (index >= 0) {
      this.inventariosMemory[index] = sessao;
    } else {
      this.inventariosMemory.unshift(sessao);
    }

    await this.addAuditLogInternal({
      id: 'log-' + Date.now(), dataHora: new Date().toISOString(), usuarioNome: usr.name, usuarioPerfil: usr.role,
      acao: 'Sessão de Inventário', entidade: 'Inventário', entidadeId: sessao.id,
      detalhe: `Sessão "${sessao.titulo}" atualizada. Progresso: ${sessao.totalEncontrados}/${sessao.totalEsperado}. Status: ${sessao.status}.`,
      ip: this.getAuditIp(),
    });
    this.notifyListeners();
  }

  async deleteInventarioSessao(id: string, usuario: UserProfile): Promise<boolean> {
    this.assertRole(usuario, ['ADMIN'], 'excluir sessão de inventário');
    const target = this.inventariosMemory.find(h => h.id === id);
    if (!target) return false;

    // Exclui primeiro no banco central; a memória só reflete após sucesso.
    await apiDeleteInventario(id);
    this.inventariosMemory = this.inventariosMemory.filter(h => h.id !== id);

    await this.addAuditLogInternal({
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
  async clearAllData(usuario: UserProfile): Promise<{ centralDeleted: number; centralError?: string }> {
    this.assertRole(usuario, ['ADMIN'], 'zerar o sistema');

    // Usuários: fonte única central. Recarrega do Neon para preservar apenas o
    // administrador ativo e excluir as demais contas. Nada é semeado no
    // navegador — o admin inicial é criado pela migration do banco (Neon).
    if (this.usersMemory === null) {
      try {
        await this.refreshUsersFromApi();
      } catch {
        // Sem Neon, os usuários não são tocados no zeramento.
      }
    }
    const centralUsers = this.getUsers();
    // Preserva o Administrador Geral central (conta autenticada ou a conta
    // "admin"). Se ele não estiver na lista central, os usuários não são
    // tocados no zeramento — nenhuma conta local é sintetizada.
    const currentAdmin = centralUsers.find(u =>
      u.role === 'ADMIN' && (u.id === usuario.id || u.login === 'admin')
    );
    const adminToKeep: UserAccount | null = currentAdmin
      ? { ...currentAdmin, login: 'admin', nomeCompleto: currentAdmin.nomeCompleto || 'Administrador', situacao: 'Ativo' }
      : null;

    // Etapa 3/4: patrimônios, empréstimos e manutenções residem no banco
    // central (Neon). Zerar exige excluí-los lá.
    let centralDeleted = 0;
    let centralError: string | undefined;

    const items = this.getPatrimonios();
    if (items.length > 0) {
      for (const p of items) {
        try {
          await apiDeletePatrimonio(p.id);
          centralDeleted += 1;
        } catch (err) {
          centralError = userFacingApiError(err);
          break;
        }
      }
      if (!centralError) this.setPatrimonios([]);
    } else {
      this.setPatrimonios([]);
    }

    if (!centralError) {
      for (const e of this.emprestimosMemory) {
        try {
          await apiDeleteEmprestimo(e.id);
          centralDeleted += 1;
        } catch (err) {
          centralError = userFacingApiError(err);
          break;
        }
      }
      if (!centralError) this.emprestimosMemory = [];
    }

    if (!centralError) {
      for (const m of this.manutencoesMemory) {
        try {
          await apiDeleteManutencao(m.id);
          centralDeleted += 1;
        } catch (err) {
          centralError = userFacingApiError(err);
          break;
        }
      }
      if (!centralError) this.manutencoesMemory = [];
    }

    if (!centralError) {
      for (const s of this.getSectors()) {
        try {
          await apiDeleteSector(s.id);
          centralDeleted += 1;
        } catch (err) {
          centralError = userFacingApiError(err);
          break;
        }
      }
      if (!centralError) this.sectorsMemory = [];
    }

    // Movimentações, inventários e trilha de auditoria também residem no banco
    // central — zerar exige excluí-los lá. Nada é gravado em localStorage para
    // esses dados.
    if (!centralError) {
      for (const m of this.movimentacoesMemory) {
        try {
          await apiDeleteMovimentacao(m.id);
          centralDeleted += 1;
        } catch (err) {
          centralError = userFacingApiError(err);
          break;
        }
      }
      if (!centralError) this.movimentacoesMemory = [];
    }

    if (!centralError) {
      for (const inv of this.inventariosMemory) {
        try {
          await apiDeleteInventario(inv.id);
          centralDeleted += 1;
        } catch (err) {
          centralError = userFacingApiError(err);
          break;
        }
      }
      if (!centralError) this.inventariosMemory = [];
    }

    if (!centralError) {
      for (const log of this.auditLogsMemory) {
        try {
          await apiDeleteAuditLog(log.id);
          centralDeleted += 1;
        } catch (err) {
          centralError = userFacingApiError(err);
          break;
        }
      }
      if (!centralError) this.auditLogsMemory = [];
    }

    try {
      localStorage.removeItem(STORAGE_KEYS.MANUTENCOES);
      localStorage.removeItem(STORAGE_KEYS.EMPRESTIMOS);
      localStorage.removeItem(LEGACY_SECTORS_KEY);
    } catch {
      // Limpeza de chaves legadas é best-effort.
    }

    // Usuários: exclui no Neon todas as contas, preservando o administrador
    // central. Se o administrador não estiver na lista central, os usuários
    // não são tocados. Nada é gravado em localStorage/IndexedDB.
    if (!centralError && adminToKeep) {
      for (const u of this.getUsers()) {
        if (u.id === adminToKeep.id) continue;
        try {
          await apiDeleteUser(u.id);
          centralDeleted += 1;
        } catch (err) {
          centralError = userFacingApiError(err);
          break;
        }
      }
      if (!centralError) {
        this.usersMemory = [adminToKeep];
        try {
          localStorage.removeItem(LEGACY_USERS_KEY);
        } catch {
          // Limpeza da chave legada é best-effort.
        }
      }
    }

    if (adminToKeep) {
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
    }
    this.notifyListeners();

    return { centralDeleted, centralError };
  }

  async resetToInitialData(usuario: UserProfile) {
    return this.clearAllData(usuario);
  }
}

export const storageService = new StorageService();
