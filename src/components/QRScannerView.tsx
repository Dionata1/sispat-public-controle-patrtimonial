import React, { useEffect, useState, useRef } from 'react';
import { 
  QrCode, 
  Package,
  Camera, 
  Keyboard, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Volume2, 
  VolumeX,
  ArrowRight,
  RefreshCw,
  Video,
  Zap,
  Settings2
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Patrimonio } from '../types';

interface QRScannerViewProps {
  patrimonios: Patrimonio[];
  onSelectAsset: (asset: Patrimonio) => void;
  onOpenNewWithCode: (code: string) => void;
}

export const QRScannerView: React.FC<QRScannerViewProps> = ({
  patrimonios,
  onSelectAsset,
  onOpenNewWithCode,
}) => {
  const [scannedCode, setScannedCode] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [scanResult, setScanResult] = useState<{ found: boolean; patrimonio?: Patrimonio; code: string } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isContinuous, setIsContinuous] = useState(true);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Sound feedback simulator
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // Audio context might be restricted before user interaction
    }
  };

  // Enumerate WebRTC cameras on mount
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((cameras) => {
        if (cameras && cameras.length > 0) {
          setAvailableCameras(cameras);
          setSelectedCameraId(cameras[0].id);
        }
      })
      .catch((err) => {
        console.log("Nenhuma câmera listada previamente:", err);
      });
  }, []);

  // Process any scanned string
  const handleCodeFound = (codeStr: string) => {
    const cleanCode = codeStr.trim();
    if (!cleanCode) return;

    playBeep();
    setScannedCode(cleanCode);

    // Search in database by codigoPatrimonial, codigoBarras, or qrCode
    const match = patrimonios.find(
      p => p.codigoPatrimonial.toLowerCase() === cleanCode.toLowerCase() ||
           p.codigoBarras === cleanCode ||
           p.qrCode.toLowerCase() === cleanCode.toLowerCase() ||
           cleanCode.toLowerCase().includes(p.codigoPatrimonial.toLowerCase())
    );

    if (match) {
      setScanResult({ found: true, patrimonio: match, code: cleanCode });
    } else {
      setScanResult({ found: false, code: cleanCode });
    }
  };

  // Keyboard Barcode USB Gun listener
  useEffect(() => {
    let buffer = '';
    let timeout: any = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing inside an explicit input field
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          handleCodeFound(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          buffer = '';
        }, 150); // USB guns send keys rapidly (<50ms per key)
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [patrimonios]);

  // Start camera reader using the camera explicitly selected by the user.
  const toggleCameraScanner = async () => {
    if (scannerActive) {
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch {}
        try { await scannerRef.current.clear(); } catch {}
        scannerRef.current = null;
      }
      setScannerActive(false);
      return;
    }

    setScannerActive(true);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode('html5qr-code-full-region');
        scannerRef.current = scanner;
        const cameraConfig = selectedCameraId || { facingMode: 'environment' };
        await scanner.start(
          cameraConfig as any,
          { fps: 15, qrbox: { width: 260, height: 260 }, aspectRatio: 1.0 },
          async (decodedText) => {
            handleCodeFound(decodedText);
            if (!isContinuous && scannerRef.current) {
              try { await scannerRef.current.stop(); } catch {}
              setScannerActive(false);
            }
          },
          () => {}
        );
      } catch (err) {
        console.error('Erro ao iniciar a câmera selecionada:', err);
        setScannerActive(false);
        setScanResult({ found: false, code: 'Falha ao abrir a câmera. Verifique a permissão do navegador.' });
      }
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => { try { scannerRef.current?.clear(); } catch {} });
      }
    };
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Title Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <QrCode className="w-4 h-4" /> Módulo de Identificação Automática
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            Leitor de QR Code & Código de Barras USB
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Aproxime o leitor óptico, ative a câmera do dispositivo ou digite o código patrimonial para consulta instantânea.
          </p>
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-3 rounded-xl border transition ${
            soundEnabled 
              ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600/30' 
              : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
          }`}
          title={soundEnabled ? "Bip sonoro ativado" : "Bip sonoro desativado"}
        >
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Scanner Control Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Camera Scanner Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" /> Câmera / Leitor QR Óptico
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Ativo
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {/* Camera settings toolbar */}
              <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800/80 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Video className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <select
                    value={selectedCameraId}
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    className="bg-transparent text-[11px] font-medium text-slate-200 focus:outline-none truncate cursor-pointer"
                  >
                    {availableCameras.length > 0 ? (
                      availableCameras.map((cam) => (
                        <option key={cam.id} value={cam.id} className="bg-slate-900 text-slate-200">
                          {cam.label || `Câmera ${cam.id.slice(0, 6)}...`}
                        </option>
                      ))
                    ) : (
                      <option value="" className="bg-slate-900 text-slate-200">Câmera padrão WebRTC</option>
                    )}
                  </select>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsContinuous(!isContinuous)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                      isContinuous 
                        ? 'bg-blue-600/30 text-blue-300 border-blue-500/40' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                    title="Varredura Contínua (Continuous Scan)"
                  >
                    Contínuo: {isContinuous ? 'SIM' : 'NÃO'}
                  </button>
                </div>
              </div>

              {scannerActive ? (
                <div className="bg-slate-950 border border-emerald-500/40 rounded-xl overflow-hidden p-2">
                  <div id="html5qr-code-full-region" className="w-full text-white text-xs" />
                </div>
              ) : (
                <div className="bg-slate-950/80 border border-dashed border-slate-800 rounded-xl p-6 text-center flex flex-col items-center justify-center min-h-[200px]">
                  <div className="w-14 h-14 rounded-full bg-slate-800/80 flex items-center justify-center mb-3 text-slate-400">
                    <Camera className="w-7 h-7" />
                  </div>
                  <p className="text-xs font-bold text-slate-100">Leitor HTML5 / Instascan Ativo</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                    Decodificação em tempo real via WebRTC no navegador. Compatível com smartphones, notebooks, computadores e Smart TVs.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <button
              onClick={toggleCameraScanner}
              className={`w-full py-3.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg active:scale-95 ${
                scannerActive 
                  ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>{scannerActive ? 'Encerrar Câmera' : 'Ativar Câmera (Escanear QR Code)'}</span>
            </button>
          </div>
        </div>

        {/* USB Hardware Barcode Gun & Manual Query Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-emerald-400" /> Leitor USB & Busca Manual
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                Pistola USB Pronta
              </span>
            </div>

            <div className="mt-4 space-y-4">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Leitor de código de barras USB ativo em segundo plano
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Dispare a pistola leitora de código de barras USB em qualquer momento. O código será processado e consultado automaticamente sem precisar clicar em nenhum campo.
                </p>
              </div>

              {/* Direct Input Field */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Ou digite o código manualmente:
                </label>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (manualCode) {
                      handleCodeFound(manualCode);
                      setManualCode('');
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Ex: PAT-2025-00101 ou 7896541230012"
                    className="flex-1 bg-slate-950 text-slate-100 text-xs rounded-xl px-3 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
                  >
                    <Search className="w-4 h-4" />
                    <span>Buscar</span>
                  </button>
                </form>
              </div>

              {/* Quick Sample Code Buttons for Demo */}
              <div className="pt-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-2">
                  Testar com códigos cadastrados:
                </span>
                <div className="flex flex-wrap gap-2">
                  {(patrimonios || []).slice(0, 3).map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleCodeFound(p.codigoPatrimonial)}
                      className="text-[11px] font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition"
                    >
                      {p.codigoPatrimonial}
                    </button>
                  ))}
                  <button
                    onClick={() => handleCodeFound('PAT-NOVO-9999')}
                    className="text-[11px] font-mono font-bold bg-purple-950/40 hover:bg-purple-900/40 text-purple-300 px-2.5 py-1 rounded-lg border border-purple-800/40 transition"
                  >
                    + PAT-INEXISTENTE
                  </button>
                </div>
              </div>

            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 text-center">
            Suporta formatos EAN-13, Code 128, Code 39 e QR Code bidimensional.
          </div>
        </div>

      </div>

      {/* Result Display Box */}
      {scanResult && (
        <div className={`p-6 rounded-2xl border transition-all duration-300 shadow-2xl ${
          scanResult.found 
            ? 'bg-emerald-950/30 border-emerald-500/40' 
            : 'bg-amber-950/30 border-amber-500/40'
        }`}>
          {scanResult.found && scanResult.patrimonio ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <Package className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Patrimônio Localizado no Acervo
                    </span>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {scanResult.patrimonio.codigoPatrimonial}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-white mt-1">
                    {scanResult.patrimonio.nome}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    <span className="font-semibold text-slate-400">Localização:</span> {scanResult.patrimonio.bloco} - {scanResult.patrimonio.laboratorio} ({scanResult.patrimonio.sala})
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5">
                    <span className="font-semibold text-slate-400">Responsável:</span> {scanResult.patrimonio.responsavelNome}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onSelectAsset(scanResult.patrimonio!)}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 active:scale-95 shrink-0"
              >
                <span>Abrir Ficha Completa</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-1" />
                <div>
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Código Não Cadastrado no Banco de Dados
                  </div>
                  <h3 className="text-base font-extrabold text-white mt-0.5 font-mono">
                    Código Lido: "{scanResult.code}"
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    O patrimônio identificado não consta no catálogo. Deseja iniciar o cadastro automático com este código pré-preenchido?
                  </p>
                </div>
              </div>

              <button
                onClick={() => onOpenNewWithCode(scanResult.code)}
                className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Iniciar Cadastro Automático</span>
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
