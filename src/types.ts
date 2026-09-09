export type EstadoConservacao = 'Excelente' | 'Bom' | 'Regular' | 'Ruim' | 'Inoperante';

export type SituacaoPatrimonio = 
  | 'Disponível'
  | 'Em uso'
  | 'Emprestado'
  | 'Em manutenção'
  | 'Danificado'
  | 'Extraviado'
  | 'Baixado'
  | 'Reservado';

export type CategoriaPatrimonio = 
  | 'Informática'
  | 'Móveis'
  | 'Laboratório'
  | 'Redes'
  | 'Áudio & Vídeo'
  | 'Ferramentas'
  | 'Eletrodomésticos';

export interface AnexoDocumento {
  id: string;
  nome: string;
  url: string;
  tipo: 'NF' | 'Garantia' | 'Laudo' | 'Manual' | 'PDF';
  tamanhoKb?: number;
  dataUpload: string;
}

export interface Patrimonio {
  id: string;
  codigoPatrimonial: string;
  codigoBarras: string;
  qrCode: string;
  nome: string;
  categoria: CategoriaPatrimonio;
  marca: string;
  modelo: string;
  numeroSerie: string;
  fornecedor: string;
  notaFiscal: string;
  dataAquisicao: string; // YYYY-MM-DD
  valor: number; // BRL
  valorResidual?: number; // BRL
  taxaDepreciacaoAnual?: number; // % ao ano
  garantiaVencimento: string; // YYYY-MM-DD
  vidaUtilAnos: number;
  estadoConservacao: EstadoConservacao;
  situacao: SituacaoPatrimonio;
  bloco: string;
  laboratorio: string;
  sala: string;
  setor?: string;
  centroCusto?: string;
  responsavelNome: string;
  responsavelCpf: string;
  observacoes: string;
  fotoUrl: string;
  fotosAdicionais?: string[];
  anexosDocs?: AnexoDocumento[];
  dataCadastro: string;
  ultimaAtualizacao: string;
}

export interface Movimentacao {
  id: string;
  patrimonioId: string;
  codigoPatrimonial: string;
  patrimonioNome: string;
  dataHora: string;
  usuarioNome: string;
  usuarioPerfil: string;
  localAnterior: string;
  localNovo: string;
  responsavelAnterior: string;
  responsavelNovo: string;
  motivo: string;
  tipoOperacao: 'Transferência' | 'Cadastro' | 'Manutenção' | 'Empréstimo' | 'Baixa' | 'Inventário';
}

export interface Manutencao {
  id: string;
  patrimonioId: string;
  codigoPatrimonial: string;
  patrimonioNome: string;
  defeito: string;
  prioridade: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  tecnicoEmpresa: string;
  custo: number;
  dataAbertura: string;
  previsaoConclusao: string;
  dataConclusao: string | null;
  status: 'Aberta' | 'Em_Andamento' | 'Aguardando_Peças' | 'Concluída' | 'Cancelada';
  laudoTecnico: string;
  garantiaServicoMeses: number;
}

export interface Emprestimo {
  id: string;
  patrimonioId: string;
  codigoPatrimonial: string;
  patrimonioNome: string;
  servidorNome: string;
  cpfServidor?: string;
  cargoServidor?: string;
  setor: string;
  dataRetirada: string;
  previsaoDevolucao: string;
  dataDevolucao: string | null;
  status: 'Ativo' | 'Devolvido' | 'Atrasado';
  observacoes: string;
  assinaturaDigitalUrl?: string; // Data URL Base64 da assinatura desenhada
  assinaturaIp?: string;
  assinaturaDataHora?: string;
  termoPdfGerado?: boolean;
}

export interface DivergenciaInventario {
  patrimonioId: string;
  codigoPatrimonial: string;
  nomeItem: string;
  salaEsperada: string;
  salaEncontrada: string;
  tipoDivergencia: 'Ausente' | 'Local_Incorreto' | 'Sem_Plaqueta' | 'Novo_Nao_Cadastrado';
  dataIdentificacao: string;
}

export interface InventarioSessao {
  id: string;
  titulo: string;
  bloco: string;
  laboratorio: string;
  sala: string;
  dataInicio: string;
  dataFim: string | null;
  responsavelSessao: string;
  totalEsperado: number;
  totalEncontrados: number;
  encontradosIds: string[];
  pendentesIds: string[];
  divergencias?: DivergenciaInventario[];
  status: 'Em_Andamento' | 'Concluído' | 'Pausado';
  coordenadasGps?: { lat: number; lng: number };
}

export interface AuditLog {
  id: string;
  dataHora: string;
  usuarioNome: string;
  usuarioPerfil: string;
  acao: string;
  entidade: 'Patrimônio' | 'Inventário' | 'Manutenção' | 'Empréstimo' | 'Movimentação' | 'Sistema' | 'Usuário';
  entidadeId: string;
  detalhe: string;
  ip: string;
  browser?: string;
  alteracoes?: { campo: string; anterior: string; novo: string }[];
}

export type UserRole = 
  | 'ADMIN' 
  | 'GESTOR' 
  | 'AUDITOR' 
  | 'OPERADOR'
  | 'CONSULTOR'
  | 'SERVIDOR' 
  | 'PROFESSOR' 
  | 'TECNICO' 
  | 'VISITANTE';

export type RoleUser = UserRole;

export interface PermissionConfig {
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
}

export interface UserProfile {
  id?: string;
  role: UserRole;
  name: string;
  email: string;
  cpf: string;
  matricula: string;
  setor?: string;
  cargo?: string;
  telefone?: string;
  ativo?: boolean;
  situacao?: 'Ativo' | 'Inativo' | 'Bloqueado';
  login?: string;
  forcePasswordChange?: boolean;
  twoFactorEnabled?: boolean;
}

export interface UserAccount {
  id: string;
  login: string;
  nomeCompleto: string;
  cpf: string;
  matricula: string;
  email: string;
  telefone?: string;
  cargo: string;
  setor: string;
  role: UserRole;
  situacao: 'Ativo' | 'Inativo' | 'Bloqueado';
  passwordHash: string;
  forcePasswordChange: boolean;
  dataCriacao: string;
  ultimoAcesso?: string;
  tentativasInvalidas?: number;
}

export interface SectorItem {
  id: string;
  nome: string;
  sigla: string;
  responsavel: string;
  emailContact?: string;
  totalPatrimonios?: number;
}

export type LabelTemplateModel = 'A4_SHEET_24' | 'ZEBRA_100X50' | 'BROTHER_62MM' | 'ARGOX_80X40';

export type ActiveTab = 
  | 'dashboard'
  | 'scanner'
  | 'leitor'
  | 'patrimonios'
  | 'movimentacoes'
  | 'inventario'
  | 'manutencao'
  | 'emprestimos'
  | 'auditoria'
  | 'relatorios'
  | 'conferencia'
  | 'usuarios';

