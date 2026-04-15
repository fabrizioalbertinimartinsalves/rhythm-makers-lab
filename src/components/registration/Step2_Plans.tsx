import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { RegistrationData } from "@/pages/Registration";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Step2Props = {
  data: RegistrationData;
  updateData: (data: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
};

export default function Step2_Plans({ data, updateData, onNext, onBack }: Step2Props) {
  const [cycle, setCycle] = useState<RegistrationData['billingCycle']>(data.billingCycle || 'monthly');
  const [selectedPlan, setSelectedPlan] = useState(data.planId || '');

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["registration-plans-sb"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_plans")
        .select("*")
        .eq("ativo", true)
        .order("valor_mensal", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const getPrice = (monthlyPrice: number) => {
    if (cycle === 'monthly') return monthlyPrice;
    if (cycle === 'quarterly') return monthlyPrice * 0.9;
    if (cycle === 'annual') return monthlyPrice * 0.8;
    return monthlyPrice;
  };

  const handleNext = () => {
    updateData({ planId: selectedPlan, billingCycle: cycle });
    onNext();
  };

  if (isLoading) return <div className="h-64 flex items-center justify-center">Carregando planos...</div>;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Escolha o Melhor Plano</h2>
        <p className="text-slate-500">Selecione o pacote que melhor se adapta ao tamanho do seu estúdio.</p>
      </div>

      <div className="flex justify-center">
        <Tabs value={cycle} onValueChange={(v: any) => setCycle(v)} className="w-full max-w-[400px]">
          <TabsList className="grid grid-cols-3 h-12">
            <TabsTrigger value="monthly" className="text-xs">Mensal</TabsTrigger>
            <TabsTrigger value="quarterly" className="text-xs relative">
              Trimestral
              <Badge className="absolute -top-3 -right-2 px-1 bg-green-500 text-[9px]">-10%</Badge>
            </TabsTrigger>
            <TabsTrigger value="annual" className="text-xs relative">
              Anual
              <Badge className="absolute -top-3 -right-2 px-1 bg-orange-500 text-[9px]">-20%</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const price = getPrice(plan.valor_mensal);

          return (
            <div 
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`p-6 rounded-2xl border-2 cursor-pointer transition-all flex flex-col relative ${
                isSelected ? "border-teal-600 bg-teal-50/50 shadow-md ring-4 ring-teal-600/10" : "border-slate-100 bg-white hover:border-slate-200"
              }`}
            >
              {isSelected && (
                <div className="absolute top-4 right-4 bg-teal-600 rounded-full p-1">
                    <Check className="h-3 w-3 text-white" strokeWidth={4} />
                </div>
              )}
              
              <h3 className="font-bold text-lg text-slate-900 mb-1">{plan.nome}</h3>
              <p className="text-xs text-slate-500 min-h-[40px] leading-relaxed mb-4">{plan.descricao}</p>
              
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                    <span className="text-sm font-medium text-slate-400">R$</span>
                    <span className="text-3xl font-black text-slate-900">{price.toFixed(0)}</span>
                    <span className="text-slate-400 text-sm">/mês</span>
                </div>
                {cycle !== 'monthly' && (
                  <p className="text-[10px] text-teal-600 font-bold mt-1">Total: R$ {(price * (cycle === 'quarterly' ? 3 : 12)).toFixed(2)} / período</p>
                )}
              </div>

              <div className="space-y-3 flex-1">
                 <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Zap className="h-3 w-3 text-teal-500" />
                    <span>{plan.limite_alunos} Alunos</span>
                 </div>
                 <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Zap className="h-3 w-3 text-teal-500" />
                    <span>{plan.limite_instrutores} Instrutores</span>
                 </div>
                 {plan.modulos?.slice(0, 3).map((m: any) => (
                    <div key={m} className="flex items-center gap-2 text-xs text-slate-600">
                        <Check className="h-3 w-3 text-green-500" />
                        <span className="capitalize">{m.replace("_", " ")}</span>
                    </div>
                 ))}
                 {plan.modulos?.length > 3 && (
                    <p className="text-[10px] text-slate-400 italic font-medium">+ {plan.modulos.length - 3} outros recursos</p>
                 )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-slate-100">
        <Button variant="ghost" onClick={onBack} className="text-slate-500 hover:text-slate-900">
          <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button 
            onClick={handleNext} 
            className="bg-teal-600 hover:bg-teal-700 h-11 px-10 font-bold"
            disabled={!selectedPlan}
        >
          Próximo Passo <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
