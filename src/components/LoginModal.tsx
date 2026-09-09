import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  Lock, 
  Key, 
  Eye, 
  EyeOff, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Copy,
  Check,
  UserX,
  LockKeyhole
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { UserProfile, UserRole } from '../types';

interface LoginModalProps {
  onLoginSuccess: (user: UserProfile, forcePasswordChange?: boolean) => void;
  isOpen: boolean;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  onLoginSuccess,
  isOpen,
  onClose
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');
  const [loginInput, setLoginInput] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real-time Password Strength Checkers
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const strengthCount = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthPercentage = (strengthCount / 5) * 100;

  const handleFillPreset = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage('');
    const logins: Partial<Record<UserRole, string>> = {
      ADMIN: 'admin',
    };
    setLoginInput(logins[role] || '');
    setPassword('');
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(label);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    try {
      const result = await storageService.login(loginInput, password);
      if (!result.success || !result.user) {
        setErrorMessage(result.message || 'Falha na autenticação. Verifique os dados fornecidos.');
        return;
      }
      onLoginSuccess(result.user, result.forcePasswordChange);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Falha ao validar a credencial neste navegador.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl my-auto relative">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950/60 p-6 border-b border-slate-800 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <ShieldCheck className="w-40 h-40 text-blue-500" />
          </div>

          <div className="inline-flex p-3 bg-blue-600/20 border border-blue-500/30 rounded-2xl text-blue-400 mb-3 shadow-lg">
            <Building2 className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-extrabold text-white tracking-tight">
            SISPAT PUBLIC
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Portal Oficial de Acesso Seguro e Autenticação Patrimonial (RBAC)
          </p>

          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 text-[10px] uppercase font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Auto-Cadastro Desativado
            </span>
            <span className="px-2.5 py-0.5 text-[10px] uppercase font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full">
              Sessão Auditada
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          
          {/* Official Security Notice */}
          <div className="bg-amber-950/30 border border-amber-500/30 p-3 rounded-2xl text-xs text-amber-200/90 flex items-start gap-2.5">
            <UserX className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Atenção:</strong> O cadastro de usuários é realizado <strong>exclusivamente pelo Administrador Geral</strong>. Não há opção de auto-cadastro ("Criar Conta").
            </p>
          </div>

          {/* Role Presets Bar */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center">
              Acesso Administrativo
            </label>
            <div className="grid grid-cols-1 gap-1 p-1 bg-slate-950 rounded-2xl border border-slate-800">
              {[
                { id: 'ADMIN' as UserRole, label: 'Admin', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
              ].map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleFillPreset(r.id)}
                  className={`py-2 px-1 text-center rounded-xl text-[11px] font-extrabold transition ${
                    selectedRole === r.id
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* User / Email / CPF Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                Usuário, E-mail Institucional ou CPF
              </label>
              <input
                type="text"
                required
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder="digite seu login (ex: admin, e-mail ou CPF)..."
                className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-mono"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  Senha de Acesso
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 font-semibold"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="digite a senha de acesso..."
                  className="w-full bg-slate-950 text-slate-100 text-xs rounded-xl px-3.5 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-mono pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Key className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            </div>

            {/* Error Message Box */}
            {errorMessage && (
              <div className="bg-rose-950/60 border border-rose-500/40 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white transition shadow-xl flex items-center justify-center gap-2 active:scale-98 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
            >
              {isLoading ? (
                <span>Autenticando credenciais...</span>
              ) : (
                <>
                  <LockKeyhole className="w-4 h-4 text-cyan-300" />
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          {/* Security guidance */}
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            <strong className="text-slate-200">Segurança:</strong> as senhas não são exibidas nem armazenadas em texto puro. Contas iniciais exigem troca de senha no primeiro acesso e novas contas recebem senha temporária gerada pelo administrador.
          </div>

        </div>

      </div>
    </div>
  );
};

