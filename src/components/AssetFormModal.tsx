import React, { useMemo, useState } from 'react';
import {
  X,
  Save,
  Box,
  QrCode,
  DollarSign,
  MapPin,
  User,
  ListPlus,
  Image as ImageIcon,
  Upload,
  FileText,
  CalendarDays,
  Building2,
} from 'lucide-react';
import {
  Patrimonio,
  CategoriaPatrimonio,
  EstadoConservacao,
  SituacaoPatrimonio,
  UserProfile,
} from '../types';

interface AssetFormModalProps {
  assetToEdit?: Patrimonio | null;
  initialCode?: string;
  onClose: () => void;
  onSave: (patrimonio: Patrimonio | Patrimonio[]) => void;
  currentUser: UserProfile;
}

const EXAMPLE_BULK_TEXT = `TOMBO\tDESCRIÇÃO\tCATEGORIA\tESTADO\tSITUAÇÃO\tLOCAL
12345\tNotebook Dell\tInformática\tBom\tDisponível\tLaboratório 01
12346\tMesa de escritório\tMóveis\tExcelente\tEm uso\tSala Administrativa`;

export function parseBulkAssetsText(rawText: string): { items: Patrimonio[]; errors: string[] } {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const items: Patrimonio[] = [];
  const errors: string[] = [];
  const validCategories: CategoriaPatrimonio[] = ['Eletrodomésticos', 'Informática', 'Móveis', 'Laboratório', 'Redes', 'Áudio & Vídeo', 'Ferramentas'];
  const validStates: EstadoConservacao[] = ['Excelente', 'Bom', 'Regular', 'Ruim', 'Inoperante'];
  const validSituations: SituacaoPatrimonio[] = ['Disponível', 'Em uso', 'Emprestado', 'Em manutenção', 'Danificado', 'Extraviado', 'Baixado', 'Reservado'];

  lines.forEach((line, index) => {
    if (index === 0 && /TOMBO|DESCRIÇÃO|DESCRICAO/i.test(line)) return;
    const parts = line.split(/\t|;/).map(p => p.trim());
    if (parts.length < 5 || !parts[0] || !parts[1] || !parts[2] || !parts[3] || !parts[4]) {
      errors.push(`Linha ${index + 1}: informe TOMBO, DESCRIÇÃO, CATEGORIA, ESTADO e SITUAÇÃO.`);
      return;
    }
    const [codigoPatrimonial, nome, categoriaRaw, estadoRaw, situacaoRaw, local = ''] = parts;
    if (!validCategories.includes(categoriaRaw as CategoriaPatrimonio)) {
      errors.push(`Linha ${index + 1}: categoria “${categoriaRaw}” inválida.`);
      return;
    }
    if (!validStates.includes(estadoRaw as EstadoConservacao)) {
      errors.push(`Linha ${index + 1}: estado “${estadoRaw}” inválido.`);
      return;
    }
    if (!validSituations.includes(situacaoRaw as SituacaoPatrimonio)) {
      errors.push(`Linha ${index + 1}: situação “${situacaoRaw}” inválida.`);
      return;
    }

    const now = new Date().toISOString();
    items.push({
      id: `pat-${Date.now()}-${index}`,
      codigoPatrimonial,
      codigoBarras: '',
      qrCode: '',
      nome,
      categoria: categoriaRaw as CategoriaPatrimonio,
      marca: '',
      modelo: '',
      numeroSerie: '',
      fornecedor: '',
      notaFiscal: '',
      dataAquisicao: '',
      valor: 0,
      valorResidual: 0,
      taxaDepreciacaoAnual: 0,
      garantiaVencimento: '',
      vidaUtilAnos: 0,
      estadoConservacao: estadoRaw as EstadoConservacao,
      situacao: situacaoRaw as SituacaoPatrimonio,
      bloco: local,
      laboratorio: '',
      sala: '',
      setor: '',
      centroCusto: '',
      responsavelNome: '',
      responsavelCpf: '',
      observacoes: '',
      fotoUrl: '',
      dataCadastro: now,
      ultimaAtualizacao: now,
    });
  });

  return { items, errors };
}

const categories: CategoriaPatrimonio[] = ['Eletrodomésticos', 'Informática', 'Móveis', 'Laboratório', 'Redes', 'Áudio & Vídeo', 'Ferramentas'];
const estados: EstadoConservacao[] = ['Excelente', 'Bom', 'Regular', 'Ruim', 'Inoperante'];
const situacoes: SituacaoPatrimonio[] = ['Disponível', 'Em uso', 'Emprestado', 'Em manutenção', 'Danificado', 'Extraviado', 'Baixado', 'Reservado'];

export const AssetFormModal: React.FC<AssetFormModalProps> = ({
  assetToEdit,
  initialCode,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(assetToEdit);
  const [activeMode, setActiveMode] = useState<'SINGLE' | 'BULK'>('SINGLE');
  const [bulkText, setBulkText] = useState('');

  const [formData, setFormData] = useState<Partial<Patrimonio>>(() => {
    if (assetToEdit) return { ...assetToEdit };
    return {
      codigoPatrimonial: initialCode || '',
      codigoBarras: '',
      qrCode: '',
      nome: '',
      categoria: undefined,
      marca: '',
      modelo: '',
      numeroSerie: '',
      fornecedor: '',
      notaFiscal: '',
      dataAquisicao: '',
      valor: undefined,
      valorResidual: undefined,
      taxaDepreciacaoAnual: undefined,
      garantiaVencimento: '',
      vidaUtilAnos: undefined,
      estadoConservacao: undefined,
      situacao: undefined,
      bloco: '',
      laboratorio: '',
      sala: '',
      setor: '',
      centroCusto: '',
      responsavelNome: '',
      responsavelCpf: '',
      observacoes: '',
      fotoUrl: '',
    };
  });

  const parsedBulk = useMemo(() => parseBulkAssetsText(bulkText), [bulkText]);

  const setField = <K extends keyof Patrimonio>(key: K, value: Patrimonio[K] | undefined) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const numberOrZero = (value: number | undefined) => value === undefined || value === null || Number.isNaN(Number(value)) ? 0 : Number(value);

  const handleSaveSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.codigoPatrimonial?.trim() || !formData.nome?.trim()) {
      alert('Preencha o código patrimonial e a descrição do bem.');
      return;
    }
    if (!formData.categoria || !formData.estadoConservacao || !formData.situacao) {
      alert('Selecione categoria, estado de conservação e situação operacional.');
      return;
    }

    const now = new Date().toISOString();
    const savedItem: Patrimonio = {
      id: assetToEdit?.id || `pat-${Date.now()}`,
      codigoPatrimonial: formData.codigoPatrimonial.trim(),
      codigoBarras: (formData.codigoBarras || '').trim(),
      qrCode: (formData.qrCode || '').trim(),
      nome: formData.nome.trim(),
      categoria: formData.categoria,
      marca: (formData.marca || '').trim(),
      modelo: (formData.modelo || '').trim(),
      numeroSerie: (formData.numeroSerie || '').trim(),
      fornecedor: (formData.fornecedor || '').trim(),
      notaFiscal: (formData.notaFiscal || '').trim(),
      dataAquisicao: formData.dataAquisicao || '',
      valor: numberOrZero(formData.valor),
      valorResidual: numberOrZero(formData.valorResidual),
      taxaDepreciacaoAnual: numberOrZero(formData.taxaDepreciacaoAnual),
      garantiaVencimento: formData.garantiaVencimento || '',
      vidaUtilAnos: numberOrZero(formData.vidaUtilAnos),
      estadoConservacao: formData.estadoConservacao,
      situacao: formData.situacao,
      bloco: (formData.bloco || '').trim(),
      laboratorio: (formData.laboratorio || '').trim(),
      sala: (formData.sala || '').trim(),
      setor: (formData.setor || '').trim(),
      centroCusto: (formData.centroCusto || '').trim(),
      responsavelNome: (formData.responsavelNome || '').trim(),
      responsavelCpf: (formData.responsavelCpf || '').trim(),
      observacoes: (formData.observacoes || '').trim(),
      fotoUrl: (formData.fotoUrl || '').trim(),
      fotosAdicionais: assetToEdit?.fotosAdicionais || [],
      anexosDocs: assetToEdit?.anexosDocs || [],
      dataCadastro: assetToEdit?.dataCadastro || now,
      ultimaAtualizacao: now,
    };

    try {
      onSave(savedItem);
      alert(isEditing ? 'Patrimônio atualizado com sucesso.' : 'Patrimônio cadastrado com sucesso.');
    } catch (error: any) {
      alert(error?.message || 'Não foi possível salvar o patrimônio.');
    }
  };

  const handleSaveBulk = () => {
    if (!parsedBulk.items.length) {
      alert('Cole pelo menos um registro válido com TOMBO e DESCRIÇÃO.');
      return;
    }
    onSave(parsedBulk.items);
    alert(`${parsedBulk.items.length} patrimônio(s) incluído(s). Revise os campos complementares individualmente.`);
  };

  const handleImageUpload = () => {
    const url = prompt('Insira a URL da imagem do patrimônio:', formData.fotoUrl || '');
    if (url !== null) setField('fotoUrl', url);
  };

  const inputClass = 'w-full bg-slate-950 text-slate-100 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500';
  const labelClass = 'text-slate-300 font-semibold block mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-extrabold text-white">{isEditing ? 'Editar Patrimônio' : 'Cadastrar Patrimônio'}</h2>
            <p className="text-xs text-slate-400">Nenhum valor financeiro, fornecedor, data, local ou responsável é preenchido automaticamente.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"><X className="w-5 h-5" /></button>
        </div>

        {!isEditing && (
          <div className="px-6 pt-3 bg-slate-950/50 border-b border-slate-800 flex gap-2">
            <button type="button" onClick={() => setActiveMode('SINGLE')} className={`px-4 py-2.5 rounded-t-xl text-xs font-bold ${activeMode === 'SINGLE' ? 'bg-slate-900 text-emerald-400 border border-slate-800 border-b-transparent' : 'text-slate-400'}`}>
              <Box className="w-4 h-4 inline mr-2" />Cadastro Individual Completo
            </button>
            <button type="button" onClick={() => setActiveMode('BULK')} className={`px-4 py-2.5 rounded-t-xl text-xs font-bold ${activeMode === 'BULK' ? 'bg-slate-900 text-emerald-400 border border-slate-800 border-b-transparent' : 'text-slate-400'}`}>
              <ListPlus className="w-4 h-4 inline mr-2" />Entrada em Lote
            </button>
          </div>
        )}

        {activeMode === 'BULK' && !isEditing ? (
          <div className="p-6 overflow-y-auto space-y-4 text-xs">
            <div className="bg-blue-950/30 border border-blue-500/30 p-4 rounded-2xl text-blue-200">
              Cole dados separados por TAB ou ponto e vírgula: <strong>TOMBO; DESCRIÇÃO; CATEGORIA; ESTADO; SITUAÇÃO; LOCAL</strong>. O sistema não inventa categoria, estado ou situação; você informa esses valores no lote.
            </div>
            <textarea rows={12} value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder={EXAMPLE_BULK_TEXT} className={`${inputClass} font-mono`} />
            {parsedBulk.errors.length > 0 && <div className="text-rose-300">{parsedBulk.errors.join(' • ')}</div>}
            <div className="flex justify-between items-center border-t border-slate-800 pt-4">
              <span className="text-slate-400">{parsedBulk.items.length} registro(s) reconhecido(s)</span>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold">Cancelar</button>
                <button type="button" onClick={handleSaveBulk} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2"><Save className="w-4 h-4" />Cadastrar Lote</button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveSingle} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            <section className="space-y-3">
              <h3 className="font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2"><QrCode className="w-4 h-4" />1. Identificação</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><label className={labelClass}>Código Patrimonial / Tombo *</label><input required value={formData.codigoPatrimonial ?? ''} onChange={e => setField('codigoPatrimonial', e.target.value)} className={`${inputClass} font-mono`} /></div>
                <div><label className={labelClass}>Código de Barras</label><input value={formData.codigoBarras ?? ''} onChange={e => setField('codigoBarras', e.target.value)} className={`${inputClass} font-mono`} /></div>
                <div><label className={labelClass}>Conteúdo do QR Code</label><input value={formData.qrCode ?? ''} onChange={e => setField('qrCode', e.target.value)} className={`${inputClass} font-mono`} /></div>
              </div>
            </section>

            <section className="space-y-3 border-t border-slate-800 pt-5">
              <h3 className="font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2"><Box className="w-4 h-4" />2. Descrição do bem</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2"><label className={labelClass}>Descrição / Nome *</label><input required value={formData.nome ?? ''} onChange={e => setField('nome', e.target.value)} className={inputClass} /></div>
                <div><label className={labelClass}>Categoria *</label><select required value={formData.categoria ?? ''} onChange={e => setField('categoria', (e.target.value || undefined) as CategoriaPatrimonio | undefined)} className={inputClass}><option value="">Selecione...</option>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
                <div><label className={labelClass}>Marca</label><input value={formData.marca ?? ''} onChange={e => setField('marca', e.target.value)} className={inputClass} /></div>
                <div><label className={labelClass}>Modelo</label><input value={formData.modelo ?? ''} onChange={e => setField('modelo', e.target.value)} className={inputClass} /></div>
                <div><label className={labelClass}>Número de Série</label><input value={formData.numeroSerie ?? ''} onChange={e => setField('numeroSerie', e.target.value)} className={inputClass} /></div>
              </div>
            </section>

            <section className="space-y-3 border-t border-slate-800 pt-5">
              <h3 className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2"><DollarSign className="w-4 h-4" />3. Aquisição, valores e depreciação</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2"><label className={labelClass}>Fornecedor</label><input value={formData.fornecedor ?? ''} onChange={e => setField('fornecedor', e.target.value)} className={inputClass} /></div>
                <div><label className={labelClass}>Nota Fiscal</label><input value={formData.notaFiscal ?? ''} onChange={e => setField('notaFiscal', e.target.value)} className={inputClass} /></div>
                <div><label className={labelClass}>Data de Aquisição</label><input type="date" value={formData.dataAquisicao ?? ''} onChange={e => setField('dataAquisicao', e.target.value)} className={inputClass} /></div>
                <div><label className={labelClass}>Valor de Aquisição (R$)</label><input type="number" min="0" step="0.01" value={formData.valor ?? ''} onChange={e => setField('valor', e.target.value === '' ? undefined : Number(e.target.value))} className={inputClass} placeholder="0,00" /></div>
                <div><label className={labelClass}>Valor Residual (R$)</label><input type="number" min="0" step="0.01" value={formData.valorResidual ?? ''} onChange={e => setField('valorResidual', e.target.value === '' ? undefined : Number(e.target.value))} className={inputClass} placeholder="0,00" /></div>
                <div><label className={labelClass}>Depreciação Anual (%)</label><input type="number" min="0" step="0.01" value={formData.taxaDepreciacaoAnual ?? ''} onChange={e => setField('taxaDepreciacaoAnual', e.target.value === '' ? undefined : Number(e.target.value))} className={inputClass} /></div>
                <div><label className={labelClass}>Vida Útil (anos)</label><input type="number" min="0" step="1" value={formData.vidaUtilAnos ?? ''} onChange={e => setField('vidaUtilAnos', e.target.value === '' ? undefined : Number(e.target.value))} className={inputClass} /></div>
                <div><label className={labelClass}>Fim da Garantia</label><input type="date" value={formData.garantiaVencimento ?? ''} onChange={e => setField('garantiaVencimento', e.target.value)} className={inputClass} /></div>
              </div>
            </section>

            <section className="space-y-3 border-t border-slate-800 pt-5">
              <h3 className="font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2"><MapPin className="w-4 h-4" />4. Localização e classificação interna</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><label className={labelClass}>Bloco</label><input value={formData.bloco ?? ''} onChange={e => setField('bloco', e.target.value)} className={inputClass} /></div>
                <div><label className={labelClass}>Recinto / Laboratório</label><input value={formData.laboratorio ?? ''} onChange={e => setField('laboratorio', e.target.value)} className={inputClass} /></div>
                <div><label className={labelClass}>Sala</label><input value={formData.sala ?? ''} onChange={e => setField('sala', e.target.value)} className={inputClass} /></div>
                <div><label className={labelClass}>Setor</label><input value={formData.setor ?? ''} onChange={e => setField('setor', e.target.value)} className={inputClass} /></div>
                <div><label className={labelClass}>Centro de Custo</label><input value={formData.centroCusto ?? ''} onChange={e => setField('centroCusto', e.target.value)} className={inputClass} /></div>
              </div>
            </section>

            <section className="space-y-3 border-t border-slate-800 pt-5">
              <h3 className="font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2"><User className="w-4 h-4" />5. Responsável e situação</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className={labelClass}>Responsável</label><input value={formData.responsavelNome ?? ''} onChange={e => setField('responsavelNome', e.target.value)} className={inputClass} /></div>
                <div><label className={labelClass}>CPF / Identificação do Responsável</label><input value={formData.responsavelCpf ?? ''} onChange={e => setField('responsavelCpf', e.target.value)} className={inputClass} /></div>
                <div><label className={labelClass}>Estado de Conservação *</label><select required value={formData.estadoConservacao ?? ''} onChange={e => setField('estadoConservacao', (e.target.value || undefined) as EstadoConservacao | undefined)} className={inputClass}><option value="">Selecione...</option>{estados.map(v => <option key={v}>{v}</option>)}</select></div>
                <div><label className={labelClass}>Situação Operacional *</label><select required value={formData.situacao ?? ''} onChange={e => setField('situacao', (e.target.value || undefined) as SituacaoPatrimonio | undefined)} className={inputClass}><option value="">Selecione...</option>{situacoes.map(v => <option key={v}>{v}</option>)}</select></div>
              </div>
            </section>

            <section className="space-y-3 border-t border-slate-800 pt-5">
              <h3 className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2"><FileText className="w-4 h-4" />6. Observações e imagem</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2"><label className={labelClass}>Observações</label><textarea rows={4} value={formData.observacoes ?? ''} onChange={e => setField('observacoes', e.target.value)} className={inputClass} /></div>
                <div>
                  <label className={labelClass}>URL da Imagem</label>
                  <div className="flex gap-2"><input value={formData.fotoUrl ?? ''} onChange={e => setField('fotoUrl', e.target.value)} className={inputClass} /><button type="button" onClick={handleImageUpload} className="px-3 bg-blue-600 hover:bg-blue-500 rounded-xl"><Upload className="w-4 h-4" /></button></div>
                  {formData.fotoUrl && <div className="mt-2 h-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-800"><img src={formData.fotoUrl} alt="Patrimônio" className="w-full h-full object-cover" /></div>}
                </div>
              </div>
            </section>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <div className="text-[10px] text-slate-500 flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5" /><span>Campos não obrigatórios podem permanecer vazios e ser preenchidos depois.</span></div>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold">Cancelar</button>
                <button type="submit" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl"><Save className="w-4 h-4" />{isEditing ? 'Salvar Alterações' : 'Cadastrar Patrimônio'}</button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
