import { useState, useMemo } from "react";
import { RegistrationData } from "@/pages/Registration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { usePaymentCheckout } from "@/hooks/usePaymentCheckout";
import { PaymentMethodModal } from "@/components/financial/PaymentMethodModal";

type Step4Props = {
  data: RegistrationData;
  updateData: (data: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
};

export default function Step4_Payment({ data, updateData, onNext, onBack }: Step4Props) {
  const { checkout, modalOpen, setModalOpen, checkoutOptions } = usePaymentCheckout();
  const [agreed, setAgreed] = useState(data.agreedToTerms || false);

  const { data: plan } = useQuery({
    queryKey: ["selected-plan-sb", data.planId],
    queryFn: async () => {
      const { data: p, error } = await supabase
        .from("saas_plans")
        .select("*")
        .eq("id", data.planId)
        .maybeSingle();
      
      if (error) throw error;
      return p;
    },
    enabled: !!data.planId
  });

  const priceLabel = useMemo(() => {
    if (!plan) return "";
    const p = plan.valor_mensal;
    if (data.billingCycle === 'monthly') return `R$ ${p.toFixed(2)}/mês`;
    if (data.billingCycle === 'quarterly') return `R$ ${(p * 0.9).toFixed(2)}/mês (Total R$ ${(p * 0.9 * 3).toFixed(2)})`;
    if (data.billingCycle === 'annual') return `R$ ${(p * 0.8).toFixed(2)}/mês (Total R$ ${(p * 0.8 * 12).toFixed(2)})`;
    return "";
  }, [plan, data.billingCycle]);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Pagamento e Contrato</h2>
        <p className="text-slate-500">Quase lá! Revise seu pedido e aceite os termos para começar.</p>
      </div>

      <div className="space-y-6 flex flex-col max-w-xl mx-auto">
        <Label className="text-xs font-bold uppercase text-slate-400 tracking-widest">Resumo e Contrato</Label>
        
        <div className="p-4 bg-slate-900 rounded-xl text-white space-y-2 shadow-lg">
          <div className="flex justify-between items-center text-xs opacity-60 uppercase font-black tracking-widest">
            <span>Assinatura Selecionada</span>
            <span>{data.billingCycle === 'annual' ? 'Anual' : data.billingCycle === 'quarterly' ? 'Trimestral' : 'Mensal'}</span>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-lg font-bold">{plan?.nome || "Plano"}</span>
            <span className="text-xl font-black text-teal-400">{priceLabel}</span>
          </div>
        </div>

        <div className="flex flex-col space-y-3 min-h-[180px]">
          <Label className="text-[10px] font-bold text-slate-400 uppercase">Termos de Uso e Contrato</Label>
          <ScrollArea className="h-40 w-full rounded-xl border border-slate-200 bg-white p-4 text-[11px] text-slate-500 leading-relaxed shadow-inner">
            <h3 className="font-bold text-slate-900 mb-2">CONTRATO DE PRESTAÇÃO DE SERVIÇOS SAAS - KINEOS</h3>
            <p className="mb-3">Este contrato descreve os termos e condições para o uso do sistema Kineos para gestão de estúdios e clínicas.</p>
            <p className="mb-3">1. OBJETO: O Kineos fornece uma plataforma digital para gestão de alunos, instrutores, turmas e faturamento.</p>
            <p className="mb-3">2. PAGAMENTO: A assinatura será renovada automaticamente conforme o ciclo escolhido (Mensal, Trimestral ou Anual).</p>
            <p className="mb-3">3. PRIVACIDADE: Seus dados e de seus alunos são tratados com o máximo rigor técnico, seguindo as diretrizes da LGPD.</p>
            <p className="mb-3">4. CANCELAMENTO: Pode ser solicitado a qualquer momento pelo SuperAdmin ou via painel de gestão, respeitando o período já pago.</p>
            <p className="font-bold text-teal-600 mt-4 italic">Kineos - Tecnologia a serviço da saúde e bem-estar.</p>
          </ScrollArea>
          
          <div className="flex items-center space-x-2 pt-2 p-1">
            <Checkbox id="terms" checked={agreed} onCheckedChange={(v: any) => setAgreed(v)} className="border-teal-600 data-[state=checked]:bg-teal-600 h-5 w-5" />
            <label htmlFor="terms" className="text-xs font-medium text-slate-700 leading-none cursor-pointer">
              Li e desejo aceitar os <span className="text-teal-600 font-bold underline">Termos do Contrato</span> e Políticas de Privacidade.
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-slate-100">
        <Button variant="ghost" onClick={onBack} className="text-slate-500 hover:text-slate-900">
          <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button 
          onClick={() => {
            const totalAmount = plan?.valor_mensal || 0;
            let finalPrice = totalAmount;
            if (data.billingCycle === 'quarterly') finalPrice = totalAmount * 0.9 * 3;
            if (data.billingCycle === 'annual') finalPrice = totalAmount * 0.8 * 12;

            checkout({
              amount: finalPrice,
              description: `Assinatura SaaS Kineos - Plano ${plan?.nome}`,
              transactionId: crypto.randomUUID(),
              metadata: { 
                tipo: "registro_saas", 
                email: data.email, 
                plan_id: data.planId,
                billing_cycle: data.billingCycle,
                studio_name: data.studioName
              },
              payerName: data.fullName,
              payerEmail: data.email,
              returnPath: "registro/sucesso"
            });
          }} 
          className={`h-11 px-10 font-bold shadow-lg transition-all ${
            agreed ? "bg-teal-600 hover:bg-teal-700" : "bg-slate-200 text-slate-500 pointer-events-none"
          }`}
          disabled={!agreed}
        >
          Pagar e Finalizar <ShieldCheck className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <PaymentMethodModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        studioId="" 
        checkoutOptions={checkoutOptions}
        onSuccess={() => onNext()} 
      />
    </div>
  );
}
