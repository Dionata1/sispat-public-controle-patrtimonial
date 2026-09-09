import React, { useState } from 'react';
import { Wrench, Plus, Check, Edit, Trash2, X, Save } from 'lucide-react';
import { Manutencao, Patrimonio, UserProfile } from '../types';

interface MaintenanceModuleProps {
  manutencoes: Manutencao[];
  patrimonios: Patrimonio[];
  onSaveManutencao: (manutencao: Manutencao) => void;
  onDeleteManutencao: (id: string) => void;
  currentUser: UserProfile;
}

type Prioridade = Manutencao['prioridade'];
type Status = Manutencao['status'];

export const MaintenanceModule: React.FC<MaintenanceModuleProps> = ({
  manutencoes,
  patrimonios,
  onSaveManutencao,
  onDeleteManutencao,
  currentUser,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Manutencao | null>(null);
  const [selectedPatrimonioId, setSelectedPatrimonioId] = useState('');
  const [defeito, setDefeito] = useState('');
  const [prioridade, setPrioridade] = useState<Prioridade | ''>('');
  const [tecnicoEmpresa, setTecnicoEmpresa] = useState('');
  const [custo, setCusto] = useState('');
  const [dataAbertura, setDataAbertura] = useState('');
  const [previsao, setPrevisao] = useState('');
  const [dataConclusao, setDataConclusao] = useState('');
  const [status, setStatus] = useState<Status | ''>('');
  const [laudo, setLaudo] = useState('');
  const [garantiaMeses, setGarantiaMeses] = useState('');

  const resetForm = () => {
    setEditing(null);
    setSelectedPatrimonioId('');
    setDefeito('');
    setPrioridade('');
    setTecnicoEmpresa('');
    setCusto('');
    setDataAbertura('');
    setPrevisao('');
    setDataConclusao('');
    setStatus('');
    setLaudo('');
    setGarantiaMeses('');
  };

  const openNew = () => { resetForm(); setShowModal(true); };

  const openEdit = (os: Manutencao) => {
    setEditing(os);
    setSelectedPatrimonioId(os.patrimonioId);
    setDefeito(os.defeito || '');
    setPrioridade(os.prioridade);
    setTecnicoEmpresa(os.tecnicoEmpresa || '');
    setCusto(String(os.custo ?? ''));
    setDataAbertura(os.dataAbertura || '');
    setPrevisao(os.previsaoConclusao || '');
    setDataConclusao(os.dataConclusao || '');
    setStatus(os.status);
    setLaudo(os.laudoTecnico || '');
    setGarantiaMeses(String(os.garantiaServicoMeses ?? ''));
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patrimonios.find(p => p.id === selectedPatrimonioId);
    if (!pat) return alert('Selecione um patrimônio válido.');
    if (!defeito.trim() || !prioridade || !status) return alert('Preencha defeito, prioridade e status.');

    const os: Manutencao = {
      id: editing?.id || `man-${Date.now()}`,
      patrimonioId: pat.id,
      codigoPatrimonial: pat.codigoPatrimonial,
      patrimonioNome: pat.nome,
      defeito: defeito.trim(),
      prioridade,
      tecnicoEmpresa: tecnicoEmpresa.trim(),
      custo: custo === '' ? 0 : Number(custo),
      dataAbertura,
      previsaoConclusao: previsao,
      dataConclusao: dataConclusao || null,
      status,
      laudoTecnico: laudo.trim(),
      garantiaServicoMeses: garantiaMeses === '' ? 0 : Number(garantiaMeses),
    };
    onSaveManutencao(os);
    setShowModal(false);
    resetForm();
  };

  const conclude = (os: Manutencao) => onSaveManutencao({
    ...os,
    status: 'Concluída',
    dataConclusao: os.dataConclusao || new Date().toISOString().slice(0, 10),
  });

  const input = 'w-full bg-slate-950 text-slate-100 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500';
  const label = 'text-slate-300 font-semibold block mb-1';

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider"><Wrench className="w-4 h-4" /> Manutenções</div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">Ordens de Serviço</h2>
          <p className="text-xs text-slate-400 mt-1">Cadastre, edite, conclua ou exclua as ordens de serviço.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl"><Plus className="w-4 h-4" />Nova OS</button>
      </div>

      {manutencoes.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-400 text-sm">Nenhuma manutenção cadastrada.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {manutencoes.map(os => (
            <div key={os.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="font-mono text-xs font-black text-amber-400">{os.codigoPatrimonial}</span>
                <span className="text-[10px] px-2 py-1 rounded border border-slate-700 text-slate-300">{os.status.replace('_', ' ')}</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">{os.patrimonioNome}</h3>
                <div className="mt-3 space-y-1 text-xs text-slate-300">
                  <p><strong className="text-slate-500">Defeito:</strong> {os.defeito || '—'}</p>
                  <p><strong className="text-slate-500">Técnico:</strong> {os.tecnicoEmpresa || '—'}</p>
                  <p><strong className="text-slate-500">Custo:</strong> R$ {(os.custo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p><strong className="text-slate-500">Previsão:</strong> {os.previsaoConclusao || '—'}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                {os.status !== 'Concluída' && <button onClick={() => conclude(os)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1"><Check className="w-4 h-4" />Concluir</button>}
                <button onClick={() => openEdit(os)} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300" title="Editar"><Edit className="w-4 h-4" /></button>
                {currentUser.role === 'ADMIN' && <button onClick={() => { if (confirm('Excluir definitivamente esta ordem de serviço?')) onDeleteManutencao(os.id); }} className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-rose-300 hover:text-white" title="Excluir"><Trash2 className="w-4 h-4" /></button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center"><h2 className="text-lg font-black text-white">{editing ? 'Editar Ordem de Serviço' : 'Cadastrar Ordem de Serviço'}</h2><button onClick={() => { setShowModal(false); resetForm(); }} className="text-slate-400"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div><label className={label}>Patrimônio *</label><select required value={selectedPatrimonioId} onChange={e => setSelectedPatrimonioId(e.target.value)} className={input}><option value="">Selecione...</option>{patrimonios.map(p => <option key={p.id} value={p.id}>{p.codigoPatrimonial} - {p.nome}</option>)}</select></div>
              <div><label className={label}>Defeito / Serviço *</label><textarea required rows={3} value={defeito} onChange={e => setDefeito(e.target.value)} className={input} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={label}>Prioridade *</label><select required value={prioridade} onChange={e => setPrioridade(e.target.value as Prioridade)} className={input}><option value="">Selecione...</option>{['Baixa','Média','Alta','Urgente'].map(v => <option key={v}>{v}</option>)}</select></div>
                <div><label className={label}>Status *</label><select required value={status} onChange={e => setStatus(e.target.value as Status)} className={input}><option value="">Selecione...</option><option value="Aberta">Aberta</option><option value="Em_Andamento">Em andamento</option><option value="Aguardando_Peças">Aguardando peças</option><option value="Concluída">Concluída</option><option value="Cancelada">Cancelada</option></select></div>
                <div><label className={label}>Empresa / Técnico</label><input value={tecnicoEmpresa} onChange={e => setTecnicoEmpresa(e.target.value)} className={input} /></div>
                <div><label className={label}>Custo (R$)</label><input type="number" min="0" step="0.01" value={custo} onChange={e => setCusto(e.target.value)} className={input} /></div>
                <div><label className={label}>Data de Abertura</label><input type="date" value={dataAbertura} onChange={e => setDataAbertura(e.target.value)} className={input} /></div>
                <div><label className={label}>Previsão de Conclusão</label><input type="date" value={previsao} onChange={e => setPrevisao(e.target.value)} className={input} /></div>
                <div><label className={label}>Data de Conclusão</label><input type="date" value={dataConclusao} onChange={e => setDataConclusao(e.target.value)} className={input} /></div>
                <div><label className={label}>Garantia do Serviço (meses)</label><input type="number" min="0" step="1" value={garantiaMeses} onChange={e => setGarantiaMeses(e.target.value)} className={input} /></div>
              </div>
              <div><label className={label}>Laudo / Observações</label><textarea rows={3} value={laudo} onChange={e => setLaudo(e.target.value)} className={input} /></div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800"><button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold">Cancelar</button><button type="submit" className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black"><Save className="w-4 h-4 inline mr-2" />Salvar</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
