import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, QrCode, Copy, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface MercadoPagoPixModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  transactionId: string;
  amount: number;
  description: string;
  metadata?: Record<string, string>;
  onSuccess?: () => void;
}

export function MercadoPagoPixModal({
  open,
  onOpenChange,
  studioId,
  transactionId,
  amount,
  description,
  metadata,
  onSuccess,
}: MercadoPagoPixModalProps) {
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string } | null>(null);
  const [status, setStatus] = useState<'pending' | 'paid' | 'error'>('pending');
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch PIX Data from Edge Function
  const fetchPix = useCallback(async () => {
    if (!open || !transactionId || pixData) return;
    
    setLoading(true);
    setError(null);
    try {
      const payerEmail = metadata?.lead_email || "contato@kineos.com.br";
      const payerName = metadata?.lead_name || "Aluno Kineos";

      const { data, error: invokeError } = await supabase.functions.invoke('mercadopago-pix', {
        body: {
          transactionId,
          amount,
          description,
          studioId,
          payerEmail,
          payerName
        }
      });

      if (invokeError) throw invokeError;
      if (data.error) throw new Error(data.error);

      setPixData({
        qr_code: data.qr_code,
        qr_code_base64: data.qr_code_base64
      });
    } catch (err: any) {
      console.error("Erro ao gerar Pix:", err);
      setError(err.message || "Erro ao gerar QR Code do Pix.");
      toast.error("Falha ao gerar o Pix. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [open, transactionId, amount, description, studioId, pixData]);

  useEffect(() => {
    fetchPix();
  }, [fetchPix]);

  // 2. Poll for payment status in the database
  useEffect(() => {
    if (!open || status === 'paid' || !transactionId) return;

    const interval = setInterval(async () => {
      // 1. Procurar nas Transações Financeiras (Modo Matrícula/Plano)
      const { data: transData } = await supabase
        .from('financial_transactions')
        .select('status')
        .eq('id', transactionId)
        .maybeSingle();

      if (transData?.status === 'pago') {
        setStatus('paid');
        toast.success("Pagamento confirmado com sucesso!");
        clearInterval(interval);
        if (onSuccess) onSuccess();
        setTimeout(() => onOpenChange(false), 3000);
        return;
      }

      // 2. Procurar nos Agendamentos (Modo Aula Avulsa / Experimental)
      const { data: bookData } = await supabase
        .from('bookings')
        .select('pago')
        .eq('id', transactionId)
        .maybeSingle();

      if (bookData?.pago === true) {
        setStatus('paid');
        toast.success("Agendamento confirmado com sucesso!");
        clearInterval(interval);
        if (onSuccess) onSuccess();
        setTimeout(() => onOpenChange(false), 3000);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [open, status, transactionId, onOpenChange, onSuccess]);

  const copyToClipboard = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      toast.success("Código Pix copiado!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-none shadow-2xl rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2 text-xl font-black italic uppercase tracking-tighter">
            <QrCode className="h-5 w-5 text-primary" /> Pagamento via Pix
          </DialogTitle>
        </DialogHeader>

        <div className="p-8 flex flex-col items-center gap-6">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Gerando seu Pix...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="h-16 w-16 rounded-full bg-rose-50 flex items-center justify-center">
                 <AlertCircle className="h-8 w-8 text-rose-500" />
              </div>
              <div className="space-y-1">
                 <p className="font-bold text-rose-600">Ops! Ocorreu um erro</p>
                 <p className="text-sm text-slate-500">{error}</p>
              </div>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-2xl mt-2">
                Fechar
              </Button>
            </div>
          ) : status === 'paid' ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center animate-in zoom-in duration-300">
              <div className="h-20 w-20 rounded-full bg-emerald-50 flex items-center justify-center">
                 <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
              <div className="space-y-1">
                 <p className="text-xl font-black uppercase italic tracking-tighter text-emerald-600">Pagamento Confirmado!</p>
                 <p className="text-sm text-slate-500 font-medium font-medium leading-relaxed">Sua mensalidade foi atualizada no sistema.</p>
              </div>
            </div>
          ) : pixData ? (
            <>
              <div className="space-y-4 text-center w-full">
                <p className="text-sm text-slate-500 font-medium">Escaneie o QR Code abaixo com o app do seu banco:</p>
                <div className="bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-sm inline-block mx-auto">
                  <img 
                    src={`data:image/png;base64,${pixData.qr_code_base64}`} 
                    alt="Pix QR Code" 
                    className="w-48 h-48 sm:w-56 sm:h-56"
                  />
                </div>
              </div>

              <div className="w-full space-y-4">
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Ou use o Copia e Cola:</p>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-3 px-4 truncate text-xs font-mono text-slate-600">
                      {pixData.qr_code}
                    </div>
                    <Button size="icon" onClick={copyToClipboard} className="shrink-0 rounded-2xl h-11 w-11 shadow-lg active:scale-95 transition-transform">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 py-2 text-amber-600 animate-pulse">
                  <Clock className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Aguardando seu pagamento...</span>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
           <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Kineos safe payment gateway</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
