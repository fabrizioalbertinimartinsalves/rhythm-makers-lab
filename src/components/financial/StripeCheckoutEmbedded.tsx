import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from "@stripe/react-stripe-js";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StripeCheckoutEmbeddedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  amountCents: number;
  description: string;
  metadata?: Record<string, any>;
  returnPath?: string;
  onSuccess?: () => void;
}

export function StripeCheckoutEmbedded({
  open,
  onOpenChange,
  studioId,
  amountCents,
  description,
  metadata = {},
  returnPath = "marcar/sucesso",
  onSuccess
}: StripeCheckoutEmbeddedProps) {
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get Public Key from Integrations
      const { data: integ, error: intErr } = await supabase
        .from("integrations")
        .select("config")
        .eq("studio_id", studioId)
        .eq("provider", "stripe")
        .eq("ativa", true)
        .maybeSingle();

      const pubKey = integ?.config?.public_key || integ?.config?.publishable_key;

      if (intErr || !pubKey) {
        throw new Error("Chave pública do Stripe não configurada para este estúdio.");
      }

      setStripePromise(loadStripe(pubKey));

      // 2. Create Session via Edge Function
      const { data, error: funcErr } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          studioId,
          amount_cents: amountCents,
          description,
          metadata,
          return_path: returnPath
        }
      });

      if (funcErr || !data || data.error) {
        throw new Error(data?.error || funcErr?.message || "Erro ao iniciar sessão de pagamento.");
      }

      setClientSecret(data.clientSecret);
    } catch (err: any) {
      console.error("Stripe Init Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && studioId) {
      initCheckout();
    } else {
      setClientSecret(null);
      setError(null);
    }
  }, [open, studioId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-none shadow-2xl rounded-[2.5rem] p-0 overflow-hidden bg-white">
        <DialogHeader className="p-8 bg-slate-50 border-b border-slate-100">
           <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">
             Pagamento <span className="text-primary italic">Seguro</span>
           </DialogTitle>
           <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">
             Conclua seu agendamento via Cartão de Crédito
           </DialogDescription>
        </DialogHeader>

        <div className="min-h-[400px] bg-white p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[400px] gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Iniciando Checkout Stripe...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-[400px] gap-6 text-center px-12">
               <div className="h-16 w-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
                  <AlertCircle className="h-8 w-8" />
               </div>
               <div className="space-y-2">
                  <h4 className="font-black text-rose-900 uppercase italic tracking-tighter text-xl">Ops! Algo deu errado</h4>
                  <p className="text-sm text-slate-500 font-medium">{error}</p>
               </div>
               <Button 
                 onClick={initCheckout}
                 className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest rounded-2xl h-12 px-8"
               >
                 Tentar Novamente
               </Button>
            </div>
          ) : clientSecret && stripePromise ? (
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
               <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
