import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Eraser, Check, X, RefreshCw } from 'lucide-react';

interface SignatureCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSignature: (signatureDataUrl: string) => void;
  title?: string;
  subtitle?: string;
  servidorNome?: string;
}

export const SignatureCanvasModal: React.FC<SignatureCanvasModalProps> = ({
  isOpen,
  onClose,
  onSaveSignature,
  title = 'Assinatura Digital de Termo de Cautela',
  subtitle = 'Desenhe sua assinatura no campo abaixo para validar o termo de responsabilidade.',
  servidorNome,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [penColor, setPenColor] = useState('#0284c7'); // sky-600
  const [penWidth, setPenWidth] = useState(2.5);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isOpen, penColor, penWidth]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasStrokes(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokes) {
      alert('Por favor, desenhe sua assinatura antes de confirmar.');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    onSaveSignature(dataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider">
              <PenTool className="w-4 h-4" /> Assinatura Eletrônica Registrada
            </div>
            <h3 className="text-lg font-black text-white mt-1">{title}</h3>
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {servidorNome && (
          <div className="bg-sky-950/40 border border-sky-800/50 rounded-2xl p-3 text-xs text-sky-200">
            <span className="font-bold text-sky-300">Signatário:</span> {servidorNome} (CPF & IP registrados no log de auditoria)
          </div>
        )}

        {/* Canvas Area */}
        <div className="relative bg-slate-950 rounded-2xl border-2 border-dashed border-slate-700 p-2 overflow-hidden flex justify-center">
          <canvas
            ref={canvasRef}
            width={440}
            height={180}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full touch-none cursor-crosshair bg-slate-950 rounded-xl"
          />

          {!hasStrokes && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-600 text-xs">
              <PenTool className="w-8 h-8 opacity-30 mb-1" />
              <span>Desenhe aqui com o dedo ou mouse</span>
            </div>
          )}

          {/* Bottom baseline marker */}
          <div className="absolute bottom-6 left-8 right-8 border-b border-slate-800 pointer-events-none" />
        </div>

        {/* Tools bar */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPenColor('#0284c7')}
              className={`w-6 h-6 rounded-full bg-sky-600 border-2 ${
                penColor === '#0284c7' ? 'border-white scale-110' : 'border-transparent'
              }`}
              title="Tinta Azul"
            />
            <button
              type="button"
              onClick={() => setPenColor('#0f172a')}
              className={`w-6 h-6 rounded-full bg-slate-900 border-2 ${
                penColor === '#0f172a' ? 'border-white scale-110' : 'border-transparent'
              }`}
              title="Tinta Escura"
            />
            <button
              type="button"
              onClick={() => setPenColor('#475569')}
              className={`w-6 h-6 rounded-full bg-slate-600 border-2 ${
                penColor === '#475569' ? 'border-white scale-110' : 'border-transparent'
              }`}
              title="Tinta Cinza"
            />
          </div>

          <button
            type="button"
            onClick={clearCanvas}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
          >
            <Eraser className="w-3.5 h-3.5" /> Limpar Tela
          </button>
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasStrokes}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white transition shadow-lg ${
              hasStrokes
                ? 'bg-sky-600 hover:bg-sky-500 shadow-sky-900/30 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" /> Validar & Assinar Digitalmente
          </button>
        </div>

      </div>
    </div>
  );
};
