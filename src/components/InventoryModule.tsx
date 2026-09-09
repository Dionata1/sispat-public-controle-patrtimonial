import React, { useMemo, useState } from 'react';
import {
  ClipboardCheck, QrCode, CheckCircle2, AlertTriangle, Play, FileText,
  History, MapPin, Square, PauseCircle, Flag, Trash2
} from 'lucide-react';
import { Patrimonio, InventarioSessao, UserProfile, DivergenciaInventario } from '../types';
import { storageService } from '../services/storageService';

interface InventoryModuleProps {
  patrimonios: Patrimonio[];
  inventarioSessao: InventarioSessao;
  onSaveInventario: (sessao: InventarioSessao) => void;
  currentUser: UserProfile;
  onGeneratePDF: (title: string, items: Patrimonio[]) => void;
  onDeleteInventario: (id: string) => void;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  patrimonios, inventarioSessao, onSaveInventario, currentUser, onGeneratePDF, onDeleteInventario,
}) => {
  const blocos = useMemo(() => Array.from(new Set(patrimonios.map(p => p.bloco).filter(Boolean))).sort(), [patrimonios]);
  const [selectedBloco, setSelectedBloco] = useState<string>(blocos[0] || 'ALL');

  const laboratorios = useMemo(() => Array.from(new Set(
    patrimonios
      .filter(p => selectedBloco === 'ALL' || p.bloco === selectedBloco)
      .map(p => p.laboratorio)
      .filter(Boolean)
  )).sort(), [patrimonios, selectedBloco]);

  const [selectedLab, setSelectedLab] = useState<string>('ALL');
  const [selectedSala, setSelectedSala] = useState<string>('ALL');
  const [scanCodeInput, setScanCodeInput] = useState('');
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const salas = useMemo(() => Array.from(new Set(
    patrimonios
      .filter(p => (selectedBloco === 'ALL' || p.bloco === selectedBloco) && (selectedLab === 'ALL' || p.laboratorio === selectedLab))
      .map(p => p.sala)
      .filter(Boolean)
  )).sort(), [patrimonios, selectedBloco, selectedLab]);

  const expectedAssets = useMemo(() => patrimonios.filter(p =>
    p.situacao !== 'Baixado' &&
    (selectedBloco === 'ALL' || p.bloco === selectedBloco) &&
    (selectedLab === 'ALL' || p.laboratorio === selectedLab) &&
    (selectedSala === 'ALL' || p.sala === selectedSala)
  ), [patrimonios, selectedBloco, selectedLab, selectedSala]);

  const sessionMatchesLocation = inventarioSessao && (
    inventarioSessao.bloco === selectedBloco &&
    inventarioSessao.laboratorio === selectedLab &&
    inventarioSessao.sala === selectedSala
  );

  const encontradosIds = sessionMatchesLocation ? (inventarioSessao.encontradosIds || []) : [];
  const encontradosAssets = expectedAssets.filter(p => encontradosIds.includes(p.id));
  const pendentesAssets = expectedAssets.filter(p => !encontradosIds.includes(p.id));
  const totalEsperado = expectedAssets.length;
  const pct = totalEsperado ? Math.round((encontradosAssets.length / totalEsperado) * 100) : 0;
  const history = storageService.getInventarioHistorico().slice(0, 6);

  const saveCurrentSession = (patch: Partial<InventarioSessao>) => {
    const base: InventarioSessao = sessionMatchesLocation ? inventarioSessao : {
      id: `inv-${Date.now()}`,
      titulo: `Inventário - ${selectedBloco === 'ALL' ? 'Todos os blocos' : selectedBloco}`,
      bloco: selectedBloco,
      laboratorio: selectedLab,
      sala: selectedSala,
      dataInicio: new Date().toISOString(),
      dataFim: null,
      responsavelSessao: currentUser.name,
      totalEsperado,
      totalEncontrados: 0,
      encontradosIds: [],
      pendentesIds: expectedAssets.map(p => p.id),
      divergencias: [],
      status: 'Em_Andamento',
    };
    onSaveInventario({ ...base, ...patch });
  };

  const handleStartNewSession = () => {
    const sessao: InventarioSessao = {
      id: `inv-${Date.now()}`,
      titulo: `Inventário - ${selectedBloco === 'ALL' ? 'Todos os blocos' : selectedBloco}${selectedLab !== 'ALL' ? ` / ${selectedLab}` : ''}${selectedSala !== 'ALL' ? ` / ${selectedSala}` : ''}`,
      bloco: selectedBloco,
      laboratorio: selectedLab,
      sala: selectedSala,
      dataInicio: new Date().toISOString(),
      dataFim: null,
      responsavelSessao: currentUser.name,
      totalEsperado,
      totalEncontrados: 0,
      encontradosIds: [],
      pendentesIds: expectedAssets.map(p => p.id),
      divergencias: [],
      status: 'Em_Andamento',
    };
    onSaveInventario(sessao);
    setScanMessage({ type: 'success', text: `Sessão iniciada com ${totalEsperado} bens esperados.` });
  };

  const handleScanItem = (raw: string) => {
    const clean = raw.trim();
    if (!clean) return;

    const anywhereMatch = patrimonios.find(p =>
      p.codigoPatrimonial.toLowerCase() === clean.toLowerCase() ||
      p.codigoBarras === clean ||
      p.qrCode.toLowerCase() === clean.toLowerCase()
    );

    if (!anywhereMatch) {
      setScanMessage({ type: 'error', text: `Código “${clean}” não encontrado no cadastro.` });
      setScanCodeInput('');
      return;
    }

    const expected = expectedAssets.some(p => p.id === anywhereMatch.id);
    const baseFound = sessionMatchesLocation ? (inventarioSessao.encontradosIds || []) : [];
    const baseDiv = sessionMatchesLocation ? (inventarioSessao.divergencias || []) : [];

    if (!expected) {
      const divergence: DivergenciaInventario = {
        patrimonioId: anywhereMatch.id,
        codigoPatrimonial: anywhereMatch.codigoPatrimonial,
        nomeItem: anywhereMatch.nome,
        salaEsperada: `${selectedBloco} / ${selectedLab} / ${selectedSala}`,
        salaEncontrada: `${anywhereMatch.bloco} / ${anywhereMatch.laboratorio} / ${anywhereMatch.sala}`,
        tipoDivergencia: 'Local_Incorreto',
        dataIdentificacao: new Date().toISOString(),
      };
      const divergencias = baseDiv.some(d => d.patrimonioId === divergence.patrimonioId && d.tipoDivergencia === 'Local_Incorreto')
        ? baseDiv : [divergence, ...baseDiv];
      saveCurrentSession({ divergencias });
      setScanMessage({ type: 'error', text: `Divergência: ${anywhereMatch.codigoPatrimonial} está cadastrado em ${anywhereMatch.bloco} / ${anywhereMatch.laboratorio} / ${anywhereMatch.sala}.` });
      setScanCodeInput('');
      return;
    }

    if (baseFound.includes(anywhereMatch.id)) {
      setScanMessage({ type: 'info', text: `${anywhereMatch.codigoPatrimonial} já foi conferido nesta sessão.` });
    } else {
      const found = [...baseFound, anywhereMatch.id];
      saveCurrentSession({
        totalEsperado,
        totalEncontrados: found.length,
        encontradosIds: found,
        pendentesIds: expectedAssets.filter(p => !found.includes(p.id)).map(p => p.id),
        status: 'Em_Andamento',
      });
      setScanMessage({ type: 'success', text: `Conferido: ${anywhereMatch.nome} (${anywhereMatch.codigoPatrimonial}).` });
    }
    setScanCodeInput('');
  };

  const handleFinish = () => {
    if (!sessionMatchesLocation) return;
    const divergencias: DivergenciaInventario[] = [
      ...(inventarioSessao.divergencias || []).filter(d => d.tipoDivergencia !== 'Ausente'),
      ...pendentesAssets.map(p => ({
        patrimonioId: p.id,
        codigoPatrimonial: p.codigoPatrimonial,
        nomeItem: p.nome,
        salaEsperada: `${p.bloco} / ${p.laboratorio} / ${p.sala}`,
        salaEncontrada: 'Não localizado durante a sessão',
        tipoDivergencia: 'Ausente' as const,
        dataIdentificacao: new Date().toISOString(),
      })),
    ];
    saveCurrentSession({
      dataFim: new Date().toISOString(),
      status: 'Concluído',
      totalEncontrados: encontradosAssets.length,
      pendentesIds: pendentesAssets.map(p => p.id),
      divergencias,
    });
    setScanMessage({ type: 'success', text: `Inventário concluído. ${encontradosAssets.length} encontrados e ${pendentesAssets.length} pendentes.` });
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider"><ClipboardCheck className="w-4 h-4" /> Inventário físico dinâmico</div>
          <h2 className="text-2xl font-black text-white mt-1">Conferência por localização real cadastrada</h2>
          <p className="text-xs text-slate-400 mt-1">Blocos, ambientes e salas são lidos da base atual; nenhuma localização fictícia é usada.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleStartNewSession} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl"><Play className="w-4 h-4" /> Nova sessão</button>
          <button disabled={!sessionMatchesLocation} onClick={() => saveCurrentSession({ status: 'Pausado' })} className="flex items-center gap-2 bg-slate-800 disabled:opacity-40 text-slate-200 border border-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl"><PauseCircle className="w-4 h-4" /> Pausar</button>
          <button disabled={!sessionMatchesLocation} onClick={handleFinish} className="flex items-center gap-2 bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs px-4 py-2.5 rounded-xl"><Flag className="w-4 h-4" /> Concluir</button>
          <button onClick={() => onGeneratePDF(`Inventário - ${selectedBloco}`, expectedAssets)} className="flex items-center gap-2 bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl"><FileText className="w-4 h-4" /> PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-blue-400 text-xs uppercase tracking-wider flex items-center gap-2"><MapPin className="w-4 h-4" /> Local do inventário</h3>
          <label className="text-xs text-slate-300 block">Bloco
            <select value={selectedBloco} onChange={e => { setSelectedBloco(e.target.value); setSelectedLab('ALL'); setSelectedSala('ALL'); }} className="mt-1 w-full bg-slate-950 px-3 py-2.5 rounded-xl border border-slate-800">
              <option value="ALL">Todos os blocos</option>{blocos.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-300 block">Ambiente / laboratório
            <select value={selectedLab} onChange={e => { setSelectedLab(e.target.value); setSelectedSala('ALL'); }} className="mt-1 w-full bg-slate-950 px-3 py-2.5 rounded-xl border border-slate-800">
              <option value="ALL">Todos os ambientes</option>{laboratorios.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-300 block">Sala
            <select value={selectedSala} onChange={e => setSelectedSala(e.target.value)} className="mt-1 w-full bg-slate-950 px-3 py-2.5 rounded-xl border border-slate-800">
              <option value="ALL">Todas as salas</option>{salas.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-400">Bens esperados: <strong className="text-white">{totalEsperado}</strong></div>
        </div>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between text-xs font-bold"><span className="text-slate-300">Progresso</span><span className="text-emerald-400">{encontradosAssets.length}/{totalEsperado} ({pct}%)</span></div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
          <form onSubmit={e => { e.preventDefault(); handleScanItem(scanCodeInput); }} className="flex gap-2">
            <input value={scanCodeInput} onChange={e => setScanCodeInput(e.target.value)} autoFocus placeholder="Leia QR/EAN-13 ou digite o tombo..." className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono" />
            <button className="bg-emerald-600 px-4 rounded-xl text-xs font-bold flex items-center gap-2"><QrCode className="w-4 h-4" /> Conferir</button>
          </form>
          {scanMessage && <div className={`p-3 rounded-xl text-xs font-semibold border ${scanMessage.type === 'success' ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : scanMessage.type === 'error' ? 'bg-rose-950/50 border-rose-800 text-rose-300' : 'bg-blue-950/50 border-blue-800 text-blue-300'}`}>{scanMessage.text}</div>}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950 p-3 rounded-xl text-center"><div className="text-xl font-black text-white">{totalEsperado}</div><div className="text-[10px] text-slate-500">ESPERADOS</div></div>
            <div className="bg-emerald-950/30 p-3 rounded-xl text-center"><div className="text-xl font-black text-emerald-400">{encontradosAssets.length}</div><div className="text-[10px] text-slate-500">ENCONTRADOS</div></div>
            <div className="bg-rose-950/30 p-3 rounded-xl text-center"><div className="text-xl font-black text-rose-400">{pendentesAssets.length}</div><div className="text-[10px] text-slate-500">PENDENTES</div></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-bold text-emerald-400 text-sm flex items-center gap-2 mb-3"><CheckCircle2 className="w-4 h-4" /> Encontrados</h3>
          <div className="space-y-2 max-h-72 overflow-auto">{encontradosAssets.length ? encontradosAssets.map(p => <div key={p.id} className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-xs"><strong className="text-white">{p.nome}</strong><div className="font-mono text-emerald-400 text-[10px]">{p.codigoPatrimonial} • {p.sala}</div></div>) : <div className="text-xs text-slate-500 py-6 text-center">Nenhum bem conferido nesta localização.</div>}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-bold text-rose-400 text-sm flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4" /> Pendentes</h3>
          <div className="space-y-2 max-h-72 overflow-auto">{pendentesAssets.length ? pendentesAssets.map(p => <div key={p.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex justify-between gap-3"><div><strong className="text-white">{p.nome}</strong><div className="font-mono text-slate-500 text-[10px]">{p.codigoPatrimonial} • {p.sala}</div></div><button onClick={() => handleScanItem(p.codigoPatrimonial)} className="text-[10px] bg-slate-800 px-2 rounded-lg">Marcar</button></div>) : <div className="text-xs text-emerald-400 py-6 text-center">Nenhuma pendência para esta localização.</div>}</div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2 mb-3"><History className="w-4 h-4 text-blue-400" /> Histórico recente de inventários</h3>
        {history.length === 0 ? <p className="text-xs text-slate-500">O histórico será criado a partir das novas sessões.</p> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{history.map(h => <div key={h.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs"><div className="flex justify-between gap-2"><strong className="text-white truncate">{h.titulo}</strong><div className="flex items-center gap-2"><span className="text-[10px] text-blue-400">{h.status}</span>{currentUser.role === 'ADMIN' && <button onClick={() => { if (confirm(`Excluir definitivamente a sessão de inventário “${h.titulo}”?`)) onDeleteInventario(h.id); }} className="text-rose-400 hover:text-rose-300" title="Excluir sessão"><Trash2 className="w-3.5 h-3.5" /></button>}</div></div><div className="text-slate-500 mt-1">{h.dataInicio ? new Date(h.dataInicio).toLocaleString('pt-BR') : 'Data não informada'}</div><div className="text-slate-300 mt-2">{h.totalEncontrados}/{h.totalEsperado} encontrados • {(h.divergencias || []).length} divergências</div></div>)}</div>}
      </div>
    </div>
  );
};
