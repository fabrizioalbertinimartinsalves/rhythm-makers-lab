import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

interface MercadoPagoCheckoutProProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  amount: number;
  description: string;
  transactionId: string;
  metadata?: Record<string, any>;
  returnPath?: string;
  onSuccess?: () => void;
}

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export function MercadoPagoCheckoutPro({
  open,
  onOpenChange,
  studioId,
  amount,
  description,
  transactionId,
  metadata = {},
  returnPath,
  onSuccess
}: MercadoPagoCheckoutProProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);

  const fetchPublicKeyAndOpen = async (prefId: string, email?: string, name?: string) => {
    const { data: integ } = await supabase
      .from("integrations")
      .select("config")
      .eq("studio_id", studioId)
      .eq("provider", "mercadopago")
      .maybeSingle();

    const publicKey = integ?.config?.public_key;
    if (!publicKey) {
      setError("Chave pública do Mercado Pago não encontrada.");
      return;
    }

    const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
    mp.checkout({
      preference: { id: prefId },
      render: {
        type: 'modal'
      },
      autoOpen: true,
      payer: {
        email: email,
        name: name
      }
    });
  };

  const openModal = (id: string, publicKey?: string) => {
    try {
      const payerEmail = (metadata as any)?.lead_email;
      const payerName = (metadata as any)?.lead_name;

      if (publicKey) {
        const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
        mp.checkout({
          preference: { id },
          render: {
            type: 'modal'
          },
          autoOpen: true,
          payer: {
            email: payerEmail,
            name: payerName
          }
        });
      } else {
        fetchPublicKeyAndOpen(id, payerEmail, payerName);
      }
    } catch (e) {
      setError("Falha ao abrir modal de pagamento.");
    }
  };

  const initCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Invocação da Edge Function para gerar a Preferência
      const { data, error: funcErr } = await supabase.functions.invoke('mercadopago-checkout', {
        body: {
          studioId,
          amount,
          description,
          transactionId,
          metadata,
          returnPath,
          payerEmail: (metadata as any)?.lead_email,
          payerName: (metadata as any)?.lead_name,
        }
      });

      if (funcErr || !data || data.error) {
        throw new Error(data?.error || funcErr?.message || "Erro ao gerar checkout do Mercado Pago.");
      }

      setPreferenceId(data.id);
      const returnedPublicKey = data.publicKey;

      // 2. Carregar o SDK do Mercado Pago se não estiver carregado
      if (!window.MercadoPago) {
        const script = document.createElement('script');
        script.src = "https://sdk.mercadopago.com/js/v2";
        script.onload = () => openModal(data.id, returnedPublicKey);
        document.body.appendChild(script);
      } else {
        openModal(data.id, returnedPublicKey);
      }
    } catch (err: any) {
      console.error("MP Checkout Init Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && studioId && amount > 0) {
      initCheckout();
    }
  }, [open, studioId, amount, initCheckout]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-none shadow-2xl rounded-[2.5rem] p-0 overflow-hidden bg-white">
        <DialogHeader className="p-8 bg-slate-50 border-b border-slate-100">
           <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">
             Pagamento <span className="text-emerald-500 italic">Mercado Pago</span>
           </DialogTitle>
           <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
             Finalize sua transação de forma segura e rápida.
           </DialogDescription>
        </DialogHeader>

        <div className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center">
          {loading ? (
             <div className="space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preparando checkout seguro...</p>
             </div>
          ) : error ? (
            <div className="space-y-6">
               <div className="h-16 w-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto">
                  <AlertCircle className="h-8 w-8" />
               </div>
               <div className="space-y-2">
                  <h4 className="font-black text-rose-900 uppercase italic tracking-tighter text-xl leading-none">Ops! Erro no pagamento</h4>
                  <p className="text-sm text-slate-500 font-medium px-4">{error}</p>
               </div>
               <Button 
                 onClick={initCheckout}
                 className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest rounded-2xl h-12 px-8"
               >
                 Tentar Novamente
               </Button>
            </div>
          ) : (
            <div className="space-y-4">
               <ShieldCheck className="h-16 w-16 text-emerald-500 mx-auto opacity-20" />
               <p className="text-xs text-slate-500 font-medium">Aguardando interação com o Mercado Pago...</p>
               <Button 
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="text-[10px] font-black uppercase tracking-widest"
               >
                 Cancelar
               </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
