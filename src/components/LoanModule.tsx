import React, { useState } from 'react';
import {
  Handshake,
  Plus,
  CheckCircle2,
  PenTool,
  FileDown,
  ShieldCheck,
  Edit,
  Trash2,
  X,
  Save,
} from 'lucide-react';
import { Emprestimo, Patrimonio, UserProfile } from '../types';
import { SignatureCanvasModal } from './SignatureCanvasModal';
import { generateLoanAgreementPDF } from '../utils/loanPdfGenerator';

interface LoanModuleProps {
  emprestimos: Emprestimo[];
  patrimonios: Patrimonio[];
  onSaveEmprestimo: (emprestimo: Emprestimo) => void;
  onDeleteEmprestimo: (id: string) => void;
  currentUser: UserProfile;
}

type LoanStatus = Emprestimo['status'];

export const LoanModule: React.FC<LoanModuleProps> = ({
  emprestimos,
  patrimonios,
  onSaveEmprestimo,
  onDeleteEmprestimo,
  currentUser,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Emprestimo | null>(null);
  const [selectedPatrimonioId, setSelectedPatrimonioId] = useState('');
  const [servidorNome, setServidorNome] = useState('');
  const [cpfServidor, setCpfServidor] = useState('');
  const [cargoServidor, setCargoServidor] = useState('');
  const [setor, setSetor] = useState('');
  const [dataRetirada, setDataRetirada] = useState('');
  const [previsaoDevolucao, setPrevisaoDevolucao] = useState('');
  const [dataDevolucao, setDataDevolucao] = useState('');
  const [status, setStatus] = useState<LoanStatus | ''>('');
  const [observacoes, setObservacoes] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureForEmp, setSignatureForEmp] = useState<Emprestimo | null>(null);

  const resetForm = () => {
    setEditing(null);
    setSelectedPatrimonioId('');
    setServidorNome('');
    setCpfServidor('');
    setCargoServidor('');
    setSetor('');
    setDataRetirada('');
    setPrevisaoDevolucao('');
    setDataDevolucao('');
    setStatus('');
    setObservacoes('');
    setSignatureDataUrl(null);
  };

  const openNew = () => { resetForm(); setShowModal(true); };
  const openEdit = (emp: Emprestimo) => {
    setEditing(emp);
    setSelectedPatrimonioId(emp.patrimonioId);
    setServidorNome(emp.servidorNome || '');
    setCpfServidor(emp.cpfServidor || '');
    setCargoServidor(emp.cargoServidor || '');
    setSetor(emp.setor || '');
    setDataRetirada(emp.dataRetirada || '');
    setPrevisaoDevolucao(emp.previsaoDevolucao || '');
    setDataDevolucao(emp.dataDevolucao || '');
    setStatus(emp.status);
    setObservacoes(emp.observacoes || '');
    setSignatureDataUrl(emp.assinaturaDigitalUrl || null);
    setShowModal(true);
  };

  const getClientIp = async () => {
    try {
      const res = await fetch('/api/client-info', { headers: { Accept: 'application/json' } });
      if (!res.ok) return 'não coletado';
      const data = await res.json();
      return data.ip || 'não coletado';
    } catch { return 'não coletado'; }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patrimonios.find(p => p.id === selectedPatrimonioId);
    if (!pat) return alert('Selecione um patrimônio válido.');
    if (!servidorNome.trim() || !status) return alert('Preencha o responsável pelo empréstimo e o status.');

    const clientIp = signatureDataUrl ? await getClientIp() : editing?.assinaturaIp;
    const emp: Emprestimo = {
      id: editing?.id || `emp-${Date.now()}`,
      patrimonioId: pat.id,
      codigoPatrimonial: pat.codigoPatrimonial,
      patrimonioNome: pat.nome,
      servidorNome: servidorNome.trim(),
      cpfServidor: cpfServidor.trim(),
      cargoServidor: cargoServidor.trim(),
      setor: setor.trim(),
      dataRetirada,
      previsaoDevolucao,
      dataDevolucao: dataDevolucao || null,
      status,
      observacoes: observacoes.trim(),
      assinaturaDigitalUrl: signatureDataUrl || undefined,
      assinaturaIp: clientIp,
      assinaturaDataHora: signatureDataUrl
        ? (editing?.assinaturaDigitalUrl === signatureDataUrl && editing?.assinaturaDataHora
          ? editing.assinaturaDataHora
          : new Date().toLocaleString('pt-BR'))
        : undefined,
      termoPdfGerado: editing?.termoPdfGerado || false,
    };
    onSaveEmprestimo(emp);
    setShowModal(false);
    resetForm();
  };

  const handleDevolver = (emp: Emprestimo) => onSaveEmprestimo({
    ...emp,
    status: 'Devolvido',
    dataDevolucao: emp.dataDevolucao || new Date().toISOString().slice(0, 10),
  });

  const handleDownloadPDF = async (emp: Emprestimo) => {
    const pat = patrimonios.find(p => p.id === emp.patrimonioId || p.codigoPatrimonial === emp.codigoPatrimonial);
    const doc = await generateLoanAgreementPDF(emp, pat);
    doc.save(`termo-cautela-${emp.codigoPatrimonial}-${emp.id.slice(-6)}.pdf`);
  };

  const handleSignExisting = (emp: Emprestimo) => {
    setSignatureForEmp(emp);
    setShowSignatureModal(true);
  };

  const handleSaveExistingSignature = async (dataUrl: string) => {
    if (signatureForEmp) {
      const updated: Emprestimo = {
        ...signatureForEmp,
        assinaturaDigitalUrl: dataUrl,
        assinaturaIp: await getClientIp(),
        assinaturaDataHora: new Date().toLocaleString('pt-BR'),
      };
      onSaveEmprestimo(updated);
      setSignatureForEmp(null);
    } else {
      setSignatureDataUrl(dataUrl);
    }
  };

  const input = 'w-full bg-slate-950 text-slate-100 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500';
  const label = 'text-slate-300 font-semibold block mb-1';

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider"><Handshake className="w-4 h-4" /> Empréstimos</div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">Termos de Cautela e Retiradas</h2>
          <p className="text-xs text-slate-400 mt-1">Cadastre, edite, devolva e exclua registros de empréstimo.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl"><Plus className="w-4 h-4" />Novo Empréstimo</button>
      </div>

      {emprestimos.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-400 text-sm">Nenhum empréstimo cadastrado.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {emprestimos.map(emp => {
            const returned = emp.status === 'Devolvido';
            const signed = Boolean(emp.assinaturaDigitalUrl);
            return (
              <div key={emp.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="font-mono text-xs font-black text-indigo-400">{emp.codigoPatrimonial}</span>
                  <div className="flex gap-1">{signed && <span className="text-[10px] px-2 py-1 rounded border bg-sky-500/10 text-sky-300 border-sky-500/30 flex items-center gap-1"><ShieldCheck className="w-3 h-3" />Assinatura registrada</span>}<span className="text-[10px] px-2 py-1 rounded border border-slate-700 text-slate-300">{emp.status}</span></div>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{emp.patrimonioNome}</h3>
                  <div className="mt-3 space-y-1 text-xs text-slate-300">
                    <p><strong className="text-slate-500">Responsável:</strong> {emp.servidorNome || '—'}</p>
                    <p><strong className="text-slate-500">Setor:</strong> {emp.setor || '—'}</p>
                    <p><strong className="text-slate-500">Retirada:</strong> {emp.dataRetirada || '—'}</p>
                    <p><strong className="text-slate-500">Previsão:</strong> {emp.previsaoDevolucao || '—'}</p>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  {!signed && <button onClick={() => handleSignExisting(emp)} className="w-full bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-800 font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1"><PenTool className="w-4 h-4" />Coletar Assinatura</button>}
                  <button onClick={() => handleDownloadPDF(emp)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1"><FileDown className="w-4 h-4" />Gerar Termo PDF</button>
                  {!returned && <button onClick={() => handleDevolver(emp)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1"><CheckCircle2 className="w-4 h-4" />Registrar Devolução</button>}
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(emp)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-blue-300 font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1"><Edit className="w-4 h-4" />Editar</button>
                    {currentUser.role === 'ADMIN' && <button onClick={() => { if (confirm('Excluir definitivamente este empréstimo?')) onDeleteEmprestimo(emp.id); }} className="px-4 bg-slate-800 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl" title="Excluir"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between"><h2 className="text-lg font-black text-white">{editing ? 'Editar Empréstimo' : 'Cadastrar Empréstimo'}</h2><button onClick={() => { setShowModal(false); resetForm(); }} className="text-slate-400"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div><label className={label}>Patrimônio *</label><select required value={selectedPatrimonioId} onChange={e => setSelectedPatrimonioId(e.target.value)} className={input}><option value="">Selecione...</option>{patrimonios.filter(p => p.situacao !== 'Baixado').map(p => <option key={p.id} value={p.id}>{p.codigoPatrimonial} - {p.nome}</option>)}</select></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={label}>Nome do Responsável *</label><input required value={servidorNome} onChange={e => setServidorNome(e.target.value)} className={input} /></div>
                <div><label className={label}>CPF / Identificação</label><input value={cpfServidor} onChange={e => setCpfServidor(e.target.value)} className={input} /></div>
                <div><label className={label}>Cargo / Função</label><input value={cargoServidor} onChange={e => setCargoServidor(e.target.value)} className={input} /></div>
                <div><label className={label}>Setor / Destino</label><input value={setor} onChange={e => setSetor(e.target.value)} className={input} /></div>
                <div><label className={label}>Data de Retirada</label><input type="date" value={dataRetirada} onChange={e => setDataRetirada(e.target.value)} className={input} /></div>
                <div><label className={label}>Previsão de Devolução</label><input type="date" value={previsaoDevolucao} onChange={e => setPrevisaoDevolucao(e.target.value)} className={input} /></div>
                <div><label className={label}>Data de Devolução</label><input type="date" value={dataDevolucao} onChange={e => setDataDevolucao(e.target.value)} className={input} /></div>
                <div><label className={label}>Status *</label><select required value={status} onChange={e => setStatus(e.target.value as LoanStatus)} className={input}><option value="">Selecione...</option><option value="Ativo">Ativo</option><option value="Atrasado">Atrasado</option><option value="Devolvido">Devolvido</option></select></div>
              </div>
              <div><label className={label}>Observações</label><textarea rows={3} value={observacoes} onChange={e => setObservacoes(e.target.value)} className={input} /></div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                <div><p className="font-bold text-white">Assinatura eletrônica</p><p className="text-[10px] text-slate-400">Opcional. Pode ser coletada ou refeita.</p></div>
                <button type="button" onClick={() => setShowSignatureModal(true)} className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1"><PenTool className="w-4 h-4" />{signatureDataUrl ? 'Refazer' : 'Assinar'}</button>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800"><button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold">Cancelar</button><button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2"><Save className="w-4 h-4" />Salvar</button></div>
            </form>
          </div>
        </div>
      )}

      <SignatureCanvasModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        servidorNome={signatureForEmp ? signatureForEmp.servidorNome : servidorNome}
        onSaveSignature={handleSaveExistingSignature}
      />
    </div>
  );
};
