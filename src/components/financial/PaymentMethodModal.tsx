import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, QrCode, ArrowRight, Loader2, Zap, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MercadoPagoPixModal } from "./MercadoPagoPixModal";
import { MercadoPagoCheckoutPro } from "./MercadoPagoCheckoutPro";

interface PaymentMethodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  checkoutOptions: {
    amount: number;
    description: string;
    transaction_id: string;
    metadata?: Record<string, string>;
    return_path?: string;
  } | null;
  onSuccess?: () => void;
}

export const SYSTEM_STUDIO_ID = "00000000-0000-0000-0000-000000000000";

export function PaymentMethodModal({
  open,
  onOpenChange,
  studioId,
  checkoutOptions,
  onSuccess,
}: PaymentMethodModalProps) {
  const [loading, setLoading] = useState(false);
  const [integrations, setIntegrations] = useState({
    mercadopago: false,
  });
  const [activeModal, setActiveModal] = useState<'selection' | 'checkout_pro' | 'pix'>('selection');

  useEffect(() => {
    if (open) {
      const fetchIntegrations = async () => {
        setLoading(true);
        try {
          const effectiveId = studioId || SYSTEM_STUDIO_ID;

          const { data, error } = await supabase
            .from("integrations")
            .select("provider, ativa")
            .eq("studio_id", effectiveId)
            .eq("ativa", true);

          if (!error && data) {
            setIntegrations({
              mercadopago: data.some(i => i.provider === 'mercadopago'),
            });
          }
        } catch (error) {
          console.error("Erro ao carregar integrações:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchIntegrations();
      setActiveModal('selection');
    }
  }, [open, studioId]);

  if (!checkoutOptions) return null;
  // Fallback seguro para calcular o valor em reais (amount ou amount_cents)
  const displayAmount = checkoutOptions.amount ?? ((checkoutOptions as any).amount_cents ? (checkoutOptions as any).amount_cents / 100 : 0);

  const handleCheckoutPro = () => setActiveModal('checkout_pro');
  const handlePix = () => setActiveModal('pix');

  return (
    <>
      <Dialog open={open && activeModal === 'selection'} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="p-8 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-2">
               <ShieldCheck className="h-4 w-4 text-emerald-500" />
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ambiente 100% Seguro</p>
            </div>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">
              Como deseja pagar?
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500">
              Escolha seu método via <span className="text-primary font-bold">Mercado Pago</span> para concluir o pagamento de {displayAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verificando pagamentos...</p>
              </div>
            ) : (
              <>
                {/* Opção Pix */}
                <button
                  onClick={handlePix}
                  disabled={!integrations.mercadopago}
                  className={`w-full group relative flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${
                    integrations.mercadopago 
                    ? "border-emerald-100 hover:border-emerald-500/50 hover:bg-emerald-50/50 active:scale-[0.98]" 
                    : "opacity-50 cursor-not-allowed border-dashed"
                  }`}
                >
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${integrations.mercadopago ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                    <QrCode className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                       <p className="font-bold text-slate-800">Pix Automático</p>
                       <span className="bg-emerald-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full animate-pulse">Confirmado na hora</span>
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-tight">QR Code ou Copia e Cola</p>
                  </div>
                  {integrations.mercadopago && <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />}
                </button>

                {/* Opção Cartão / Outros */}
                <button
                  onClick={handleCheckoutPro}
                  disabled={!integrations.mercadopago}
                  className={`w-full group relative flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${
                    integrations.mercadopago 
                    ? "border-slate-100 hover:border-primary/50 hover:bg-slate-50 active:scale-[0.98]" 
                    : "opacity-50 cursor-not-allowed border-dashed"
                  }`}
                >
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${integrations.mercadopago ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"}`}>
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">Cartão ou Boleto</p>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-tight">Até 12x via Mercado Pago</p>
                  </div>
                  {integrations.mercadopago && <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />}
                </button>

                {!integrations.mercadopago && !loading && (
                   <div className="bg-rose-50 p-4 rounded-xl flex gap-3 items-center">
                      <Zap className="h-5 w-5 text-rose-500" />
                      <p className="text-xs text-rose-600 font-medium leading-tight">Nenhum meio de pagamento configurado para este estúdio. Ative o Mercado Pago em 'Integrações'.</p>
                   </div>
                )}
              </>
            )}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
             <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Kineos safe payment gateway</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Pro Mercado Pago */}
      <MercadoPagoCheckoutPro
        open={open && activeModal === 'checkout_pro'}
        onOpenChange={(v) => { if(!v) setActiveModal('selection'); }}
        studioId={studioId || SYSTEM_STUDIO_ID}
        amount={checkoutOptions.amount}
        description={checkoutOptions.description}
        transactionId={checkoutOptions.transaction_id}
        metadata={checkoutOptions.metadata}
        returnPath={checkoutOptions.return_path}
        onSuccess={onSuccess}
      />

      {/* Modal do Pix (Mercado Pago Direto) */}
      <MercadoPagoPixModal
        open={open && activeModal === 'pix'}
        onOpenChange={(v) => { if(!v) setActiveModal('selection'); }}
        studioId={studioId || SYSTEM_STUDIO_ID}
        transactionId={checkoutOptions.transaction_id}
        amount={checkoutOptions.amount}
        description={checkoutOptions.description}
        metadata={checkoutOptions.metadata}
        onSuccess={onSuccess}
      />
    </>
  );
}
