import React, { useState } from 'react';
import { X, ArrowLeftRight, MapPin, User, CheckCircle2 } from 'lucide-react';
import { Patrimonio, UserProfile } from '../types';

interface TransferModalProps {
  asset: Patrimonio | null;
  onClose: () => void;
  onTransfer: (
    asset: Patrimonio, 
    novoBloco: string, 
    novoLab: string, 
    novaSala: string, 
    novoRespNome: string, 
    novoRespCpf: string, 
    motivo: string
  ) => void;
  currentUser: UserProfile;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  asset,
  onClose,
  onTransfer,
  currentUser,
}) => {
  if (!asset) return null;

  const [novoBloco, setNovoBloco] = useState(asset.bloco);
  const [novoLab, setNovoLab] = useState(asset.laboratorio);
  const [novaSala, setNovaSala] = useState(asset.sala);
  const [novoRespNome, setNovoRespNome] = useState(asset.responsavelNome);
  const [novoRespCpf, setNovoRespCpf] = useState(asset.responsavelCpf);
  const [motivo, setMotivo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onTransfer(asset, novoBloco, novoLab, novaSala, novoRespNome, novoRespCpf, motivo);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Transferência de Localização e Custódia</h2>
              <p className="text-xs text-slate-400 font-mono">Tombo: {asset.codigoPatrimonial}</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Equipamento:</span>
            <p className="font-extrabold text-white text-sm">{asset.nome}</p>
            <p className="text-slate-400">
              Localização Atual: <strong className="text-slate-200">{asset.bloco} • {asset.laboratorio} ({asset.sala})</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Novo Bloco *</label>
              <input
                type="text"
                required
                value={novoBloco}
                onChange={(e) => setNovoBloco(e.target.value)}
                className="w-full bg-slate-950 text-slate-100 px-3 py-2 rounded-xl border border-slate-800"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Novo Laboratório *</label>
              <input
                type="text"
                required
                value={novoLab}
                onChange={(e) => setNovoLab(e.target.value)}
                className="w-full bg-slate-950 text-slate-100 px-3 py-2 rounded-xl border border-slate-800"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Nova Sala *</label>
              <input
                type="text"
                required
                value={novaSala}
                onChange={(e) => setNovaSala(e.target.value)}
                className="w-full bg-slate-950 text-slate-100 px-3 py-2 rounded-xl border border-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Novo Fiel Depositário (Nome)</label>
              <input
                type="text"
                value={novoRespNome}
                onChange={(e) => setNovoRespNome(e.target.value)}
                className="w-full bg-slate-950 text-slate-100 px-3 py-2 rounded-xl border border-slate-800"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">CPF Novo Responsável</label>
              <input
                type="text"
                value={novoRespCpf}
                onChange={(e) => setNovoRespCpf(e.target.value)}
                className="w-full bg-slate-950 text-slate-100 px-3 py-2 rounded-xl border border-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Motivo Justificado da Transferência *</label>
            <textarea
              required
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full bg-slate-950 text-slate-100 px-3 py-2 rounded-xl border border-slate-800"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
            >
              Confirmar Transferência
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
