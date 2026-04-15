import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Camera, Zap, ShieldCheck, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  onClose: () => void;
  isProcessing?: boolean;
}

export function QRScanner({ onScanSuccess, onScanError, onClose, isProcessing = false }: QRScannerProps) {
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const isSecure = typeof window !== 'undefined' && window.isSecureContext;

  const startScanner = async () => {
    if (!isSecure) {
      setErrorStatus("InsecureContext");
      setIsInitializing(false);
      return;
    }

    try {
      setIsInitializing(true);
      setErrorStatus(null);
      
      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          onScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Silent constant errors, only call prop if needed
          if (onScanError && errorMessage.includes("NotFound")) {
             // ignore frequent not found messages
          }
        }
      );
      
      setIsInitializing(false);
    } catch (err: any) {
      console.error("Camera error:", err);
      setErrorStatus(err.message || "UnknownError");
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    startScanner();

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(e => console.error("Stop error", e));
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-300">
      {/* Header Area */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-white italic">Validador de Ingressos</h2>
            <div className="flex items-center gap-2">
               <div className={`h-1.5 w-1.5 rounded-full ${isInitializing ? 'bg-amber-500 animate-pulse' : errorStatus ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
               <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                  {isInitializing ? "Iniciando..." : errorStatus ? "Erro na Câmera" : "Câmera Ativa"}
               </p>
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="h-10 w-10 rounded-full bg-white/5 text-white hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Scanner View Port */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <div className="w-full max-w-sm aspect-square relative transition-all duration-500">
          
          <div className="absolute inset-0 z-10 border-2 border-indigo-500/30 rounded-[3rem] pointer-events-none">
             <div className="absolute top-0 left-0 h-10 w-10 border-t-4 border-l-4 border-indigo-500 rounded-tl-[3rem]" />
             <div className="absolute top-0 right-0 h-10 w-10 border-t-4 border-r-4 border-indigo-500 rounded-tr-[3rem]" />
             <div className="absolute bottom-0 left-0 h-10 w-10 border-b-4 border-l-4 border-indigo-500 rounded-bl-[3rem]" />
             <div className="absolute bottom-0 right-0 h-10 w-10 border-b-4 border-r-4 border-indigo-500 rounded-br-[3rem]" />
             
             {!errorStatus && <div className="absolute top-0 left-4 right-4 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-scan-line shadow-[0_0_15px_rgba(99,102,241,0.5)]" />}
          </div>

          <div id="qr-reader" className="w-full h-full rounded-[3rem] overflow-hidden bg-black/40 border-none flex items-center justify-center">
            {isInitializing && (
               <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
            )}
            
            {errorStatus && (
               <div className="text-center p-8 space-y-4">
                  <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
                  {errorStatus === "InsecureContext" ? (
                     <p className="text-xs font-black text-white uppercase italic">A câmera requer uma conexão segura (HTTPS). Use kineosapp.com.br</p>
                  ) : (
                     <>
                        <p className="text-xs font-black text-white uppercase italic">Não foi possível acessar a câmera.</p>
                        <Button variant="outline" size="sm" onClick={startScanner} className="rounded-xl font-bold uppercase text-[9px] tracking-widest border-white/20 text-white">
                           <RefreshCw className="h-3 w-3 mr-2" /> Tentar Novamente
                        </Button>
                     </>
                  )}
               </div>
            )}
          </div>
          
          {isProcessing && (
            <div className="absolute inset-0 z-20 bg-slate-900/60 backdrop-blur-[2px] rounded-[3rem] flex flex-col items-center justify-center animate-in zoom-in duration-300">
               <Loader2 className="h-12 w-12 text-indigo-400 animate-spin mb-4" />
               <p className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Validando...</p>
            </div>
          )}
        </div>

        {!errorStatus && (
           <div className="mt-12 text-center max-w-xs transition-all duration-300">
              <Zap className="h-6 w-6 text-indigo-400 mx-auto mb-4 animate-bounce" />
              <p className="text-slate-300 text-sm font-medium leading-relaxed">
                 Posicione o QR Code dentro do quadro acima.
              </p>
           </div>
        )}
      </div>

      {/* Footer / Controls */}
      <div className="p-10 border-t border-white/5 flex flex-col gap-4">
         <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5">
            <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
            <p className="text-[10px] font-medium text-slate-300 italic">
               Certifique-se de estar em um ambiente bem iluminado.
            </p>
         </div>
      </div>

      <style>{`
        @keyframes scan-line {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-line {
          animation: scan-line 3s linear infinite;
        }
        #qr-reader video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>
    </div>
  );
}
