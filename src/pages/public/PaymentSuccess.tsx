import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Check, ArrowRight, Home, Layout, MessageCircle, ExternalLink, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// Componente de sucesso com design Premium
export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [branding, setBranding] = useState<any>(null);

  const paymentStatus = searchParams.get("payment_status");
  const transactionId = searchParams.get("transaction_id");
  const amount = searchParams.get("amount");
  const paymentMethod = searchParams.get("payment_method") || "Pix/Cartão";
  const studioId = searchParams.get("studio_id") || "saas";

  // Detectar modo: Aluno ou SaaS
  const isSaaS = studioId === "saas" || studioId === "platform" || studioId === "kineos";

  useEffect(() => {
    async function fetchBranding() {
      try {
        // Se for SaaS, buscamos o branding da plataforma (kineos)
        const queryId = isSaaS ? "platform" : studioId;
        
        const { data, error } = await supabase
          .from("studios")
          .select("nome, primary_color, success_message, community_link, logo_url, success_redirect_url")
          .or(`id.eq.${queryId},slug.eq.${queryId}`)
          .maybeSingle();

        if (data) setBranding(data);
      } catch (err) {
        console.error("Erro ao carregar branding:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBranding();
  }, [studioId, isSaaS]);

  // Efeito para confirmar pagamento automaticamente no banco (Redundância ao Webhook)
  useEffect(() => {
    const isApproved = paymentStatus === "success" || paymentStatus === "approved";
    
    if (isApproved && transactionId) {
       const confirmPayment = async () => {
          try {
             // 1. Atualizar agendamento
             await supabase
               .from("bookings")
               .update({ 
                 status: "confirmado", 
                 pago: true, 
                 updated_at: new Date().toISOString() 
               })
               .eq("id", transactionId);

             // 2. Atualizar transação financeira se existir
             await supabase
               .from("financial_transactions")
               .update({ status: "pago", updated_at: new Date().toISOString() })
               .eq("id", transactionId);

             console.warn("Database updated optimistically from success page.");
          } catch (err) {
             console.error("Erro na atualização redundante:", err);
          }
       };
       confirmPayment();
    }
  }, [paymentStatus, transactionId]);

  const handleRedirect = () => {
    if (branding?.success_redirect_url) {
      window.location.href = branding.success_redirect_url;
    } else {
      navigate(isSaaS ? "/superadmin" : "/");
    }
  };

  // Timer para redirecionamento automático
  useEffect(() => {
    if (loading) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const primaryColor = branding?.primary_color || "#0D9488";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50/50 selection:bg-primary/20">
      {/* BACKGROUND DECORATION */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20"
          style={{ backgroundColor: primaryColor }}
        />
        <div 
          className="absolute -bottom-[10%] -right-[10%] w-[30%] h-[30%] rounded-full blur-[120px] opacity-10"
          style={{ backgroundColor: primaryColor }}
        />
      </div>

      <div className="max-w-md w-full relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        {/* LOGO */}
        <div className="flex justify-center mb-8">
          {branding?.logo_url ? (
            <img src={branding.logo_url} alt="Logo" className="h-12 object-contain" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-xl">K</div>
              <span className="font-black text-2xl tracking-tighter text-slate-900">KINEOS</span>
            </div>
          )}
        </div>

        {/* MAIN CARD */}
        <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[32px] overflow-hidden bg-white/80 backdrop-blur-xl ring-1 ring-white/50">
          <div className="p-8 pb-0 text-center">
            {/* ANIMATED CHECK */}
            <div className="relative mx-auto w-24 h-24 mb-6">
              <div 
                className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ backgroundColor: primaryColor }}
              />
              <div 
                className="relative z-10 w-24 h-24 rounded-full flex items-center justify-center text-white shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                <Check className="h-12 w-12 stroke-[4px]" />
              </div>
            </div>

            <h1 className="text-3xl font-black text-slate-950 mb-2 leading-tight uppercase italic tracking-tighter">
              {isSaaS ? "Plano Ativado!" : "Tudo Pronto!"}
            </h1>
            <p className="text-slate-500 font-medium text-sm px-4">
              {branding?.success_message || (isSaaS 
                ? "Sua assinatura foi processada com sucesso. Bem-vindo à nova era da sua gestão!" 
                : "Recebemos seu pagamento. Sua vaga na aula está garantida!")}
            </p>
          </div>

          <div className="p-8 space-y-6">
            {/* TRANSACTION DETAILS */}
            <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100/50 space-y-3">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span>Detalhes do Pagamento</span>
                <Badge variant="outline" className="text-[9px] font-black tracking-tight bg-green-50 text-green-600 border-green-200">APROVADO</Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-1">Valor Total</p>
                  <p className="text-lg font-black text-slate-900">R$ {amount || "0,00"}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-1">Método</p>
                  <p className="text-xs font-bold text-slate-700">{paymentMethod}</p>
                </div>
              </div>
              
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[9px] font-medium text-slate-400 italic">ID: {transactionId?.slice(-12)}</span>
              </div>
            </div>

            {/* NEXT STEPS */}
            <div className="space-y-3">
               <h3 className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Próximos Passos</h3>
               
               {isSaaS ? (
                 <button 
                   onClick={() => navigate("/superadmin")}
                   className="w-full h-14 bg-slate-950 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-between px-6 group hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-950/20"
                 >
                   Ir para o Painel Master
                   <Layout className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                 </button>
               ) : (
                 <>
                   {branding?.community_link && (
                     <a 
                       href={branding.community_link}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="w-full h-14 bg-[#25D366] text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-between px-6 group hover:brightness-110 transition-all active:scale-95 shadow-xl shadow-green-600/20"
                     >
                       Entrar na Comunidade
                       <MessageCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
                     </a>
                   )}
                   <button 
                     onClick={() => navigate("/")}
                     className="w-full h-14 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-between px-6 group hover:bg-slate-50 transition-all active:scale-95"
                   >
                     Voltar ao Início
                     <Home className="h-5 w-5" />
                   </button>
                 </>
               )}
            </div>

            {/* AUTO-REDIRECT TIMER */}
            <div className="text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                Redirecionando em <span className="text-slate-900 w-4 font-black">{countdown}s</span>
              </p>
            </div>
          </div>
        </Card>

        {/* FOOTER */}
        <p className="text-center mt-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2 opacity-60">
          Powered by KINEOS Cockpit <div className="h-1 w-1 rounded-full bg-slate-300" /> Secure Checkout
        </p>
      </div>
    </div>
  );
}
