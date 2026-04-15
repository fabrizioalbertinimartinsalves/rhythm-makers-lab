import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { RegistrationData } from "@/pages/Registration";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, PartyPopper, ArrowRight, ShieldCheck, Database } from "lucide-react";
import { toast } from "sonner";

type Step5Props = {
  data: RegistrationData;
};

export default function Step5_Success({ data }: Step5Props) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [currentAction, setCurrentAction] = useState("Criando sua conta de acesso...");
  const [errorHeader, setErrorHeader] = useState("Ops! Algo deu errado.");

  useEffect(() => {
    const processRegistration = async () => {
      try {
        // 1. Create Auth User
        setCurrentAction("Autenticando suas credenciais...");
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password!,
          options: {
            data: {
              nome: data.managerName,
            }
          }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Falha ao criar usuário");

        const uid = authData.user.id;
        
        // Wait a bit to ensure session is propagated in the client
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 2. Create Company (Studio)
        setCurrentAction("Configurando seu ambiente de trabalho...");
        const { data: studio, error: studioError } = await supabase
          .from("studios")
          .insert({
            nome: data.studioName,
            email_contato: data.email,
            telefone: data.whatsapp,
            ativa: true,
            status_assinatura: 'active',
            config: {
               primary_color: '#0d9488',
               branding_active: false
            }
          })
          .select()
          .single();

        if (studioError) {
          console.error("Studio Creation Error:", studioError);
          throw studioError;
        }
        const studioId = studio.id;

        // 3. Create Membership
        setCurrentAction("Vinculando perfil administrativo...");
        const { error: membershipError } = await supabase
          .from("memberships")
          .insert({
            user_id: uid,
            studio_id: studioId,
            roles: ['admin']
          });

        if (membershipError) {
          console.error("Membership Creation Error:", membershipError);
          throw membershipError;
        }

        // 4. Create Initial SaaS Subscription
        setCurrentAction("Gerando sua assinatura...");
        const nextBillingDate = new Date();
        if (data.billingCycle === 'monthly') nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        else if (data.billingCycle === 'quarterly') nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
        else if (data.billingCycle === 'annual') nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);

        const { error: subError } = await supabase
          .from("saas_subscriptions")
          .insert({
            studio_id: studioId,
            plan_id: data.planId,
            billing_cycle: data.billingCycle,
            status: 'active',
            next_billing_date: nextBillingDate.toISOString().split('T')[0],
            last_payment_status: 'paid',
          });

        if (subError) {
          console.error("Subscription Creation Error:", subError);
          throw subError;
        }

        setStatus('success');
        toast.success("Bem-vindo ao Kineos! Seu estúdio está pronto.");
      } catch (error: any) {
        console.error("Registration Full Error Object:", error);
        setStatus('error');
        if (error.code === '42501') {
            toast.error("Erro de permissão (RLS). Favor contatar o suporte ou tentar novamente em instantes.");
        } else if (error.message?.includes('already registered') || error.message?.includes('User already registered')) {
             setErrorHeader("E-mail já cadastrado");
             toast.error("Este e-mail já está em uso.");
        } else {
             toast.error("Erro ao processar cadastro: " + error.message);
        }
      }
    };

    processRegistration();
  }, []);

  if (status === 'loading') {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700">
         <div className="relative">
             <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-teal-600 animate-spin" />
             </div>
         </div>
         <div className="text-center space-y-4">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Finalizando sua Assinatura</h3>
            <div className="flex flex-col items-center gap-1.5">
                <p className="text-sm font-medium text-slate-500 animate-pulse">{currentAction}</p>
            </div>
         </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
        <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-red-500 rotate-180" />
            </div>
            <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900">{errorHeader}</h3>
                <p className="text-slate-500 text-sm max-w-[300px]">Não foi possível completar seu cadastro neste momento. Por favor, tente novamente.</p>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline" className="border-slate-200 text-slate-600">
                Tentar Novamente
            </Button>
        </div>
    );
  }

  return (
    <div className="py-12 flex flex-col items-center justify-center space-y-8 text-center animate-in zoom-in-95 duration-500">
      <div className="relative">
        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center shadow-inner">
            <PartyPopper className="h-10 w-10 text-green-600 animate-bounce" />
        </div>
        <div className="absolute -top-2 -right-2 bg-teal-600 rounded-full p-2 border-4 border-white shadow-lg">
            <CheckCircle className="h-5 w-5 text-white" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">SEJA BEM-VINDO!</h3>
        <p className="text-slate-500 font-medium">Sua conta foi criada com sucesso e seu estúdio está configurado.</p>
      </div>

      <div className="w-full bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
         <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seu Estúdio</span>
            <span className="font-bold text-slate-900">{data.studioName}</span>
         </div>
         <div className="flex items-center justify-center gap-8 py-4 border-t border-slate-200/50">
            <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Perfil</span>
                <span className="text-xs font-black text-teal-600 tracking-tighter uppercase px-2 py-0.5 bg-teal-50 rounded italic border border-teal-100">Administrador</span>
            </div>
            <div className="flex flex-col gap-0.5 text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Acesso</span>
                <span className="text-xs font-bold text-slate-600">{data.email}</span>
            </div>
         </div>
      </div>

      <Button 
        onClick={() => navigate("/login")} 
        className="bg-teal-600 hover:bg-teal-700 h-14 w-full text-lg font-black tracking-tight shadow-xl shadow-teal-600/20 active:scale-95 transition-all"
      >
        FAZER LOGIN <ArrowRight className="ml-3 h-5 w-5" />
      </Button>
    </div>
  );
}
