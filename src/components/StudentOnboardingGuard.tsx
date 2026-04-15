import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, FileText, User, PenLine, AlertTriangle, CreditCard, ShieldAlert } from "lucide-react";
import SignatureCanvas from "./SignatureCanvas";
import { toast } from "sonner";
import { usePaymentCheckout } from "@/hooks/usePaymentCheckout";
import { PaymentMethodModal } from "./financial/PaymentMethodModal";
import { sendSystemEmail } from "@/lib/notifications";
import { usePostSaleAutomation } from "@/hooks/usePostSaleAutomation";

export default function StudentOnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, studioId, roles, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"profile" | "contract" | "blocked" | "done">("profile");
  const { checkout, modalOpen, setModalOpen, checkoutOptions } = usePaymentCheckout();
  const { assembleContract } = usePostSaleAutomation();
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [profileData, setProfileData] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    endereco: ""
  });

  // Admin check (computed before hooks but early-return happens AFTER all hooks)
  const isAdmin = roles?.includes("admin") || isSuperAdmin;

  // ALL hooks must run unconditionally — use `enabled` flag to skip queries for admins
  const { data: student, isLoading: loadingStudent } = useQuery({
    queryKey: ["my-student-onboarding", user?.id, studioId],
    enabled: !!user?.id && !!studioId && !isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("studio_id", studioId)
        .eq("user_id", user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: pendingContracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ["my-pending-contracts", student?.id],
    enabled: !!student?.id && !isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*, plans(*)")
        .eq("student_id", student!.id)
        .eq("status", "pendente");
      if (error) throw error;
      return data || [];
    },
  });

  const currentContract = pendingContracts[0];

  const { data: overdueInvoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["my-overdue-invoices", student?.id],
    enabled: !!student?.id && !isAdmin,
    queryFn: async () => {
      const today = new Date();
      const gracePeriod = new Date();
      gracePeriod.setDate(today.getDate() - 5); // 5 days grace period
      
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("student_id", student!.id)
        .neq("status", "pago")
        .lt("due_date", gracePeriod.toISOString().split('T')[0]);
      
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (student) {
      setProfileData({
        nome: student.nome || "",
        cpf: student.cpf || "",
        telefone: student.telefone || "",
        endereco: student.endereco || ""
      });
      if (student.cpf && student.telefone) {
        setStep("contract");
      }
    }
  }, [student]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      if (!student?.id) throw new Error("ID do aluno não encontrado");
      const { error } = await supabase.from("students").update(data).eq("id", student.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-student-onboarding"] });
      setStep("contract");
    },
    onError: (e: any) => toast.error("Erro ao atualizar perfil: " + e.message)
  });

  const signContractMutation = useMutation({
    mutationFn: async ({ contractId, signature }: { contractId: string; signature: string }) => {
      let ip = "0.0.0.0";
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const json = await res.json();
        ip = json.ip;
      } catch {}

      const { error } = await supabase
        .from("contracts")
        .update({
          assinado_em: new Date().toISOString(),
          status: "ativo",
          assinatura_url: signature,
          ip_assinatura: ip,
          metadata_assinatura: { userAgent: navigator.userAgent, timestamp: new Date().toISOString() }
        })
        .eq("id", contractId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["my-pending-contracts"] });
      toast.success("Contrato assinado!");

      // Enviar e-mail automático com o contrato assinado
      if (user?.email && currentContract) {
        const emailBody = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #3F936C;">Contrato Assinado com Sucesso! 🌿</h2>
            <p>Olá <strong>${student?.nome}</strong>,</p>
            <p>Você acabou de assinar digitalmente o seu contrato para o plano <strong>${currentContract.plans?.nome}</strong>.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; font-size: 12px; color: #555; line-height: 1.6; white-space: pre-wrap;">
              ${currentContract.corpo_texto}
            </div>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 10px; color: #999;">
              Assinado em: ${new Date().toLocaleString('pt-BR')}<br>
              IP de registro: ${variables.signature ? 'Registrado via Assinatura Digital' : 'N/A'}
            </p>
          </div>
        `;

        sendSystemEmail(studioId || "", {
          to: user.email,
          subject: `Contrato Assinado - ${currentContract.plans?.nome}`,
          html: emailBody
        }).catch(err => console.error("Erro ao enviar e-mail de contrato:", err));
      }
    },
    onError: (e: any) => toast.error("Erro ao assinar: " + e.message)
  });

  // ─── Early returns AFTER all hooks ──────────────────────────
  if (isAdmin) return <>{children}</>;

  if (loadingStudent || loadingContracts || loadingInvoices) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isProfileComplete = student && student.cpf && student.telefone;
  const hasPendingContracts = pendingContracts.length > 0;
  const hasOverdueInvoices = overdueInvoices.length > 0;

  if (isProfileComplete && !hasPendingContracts && !hasOverdueInvoices) return <>{children}</>;

  if (hasOverdueInvoices) {
    const totalOverdue = overdueInvoices.reduce((acc, inv) => acc + Number(inv.final_value), 0);
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-none rounded-3xl overflow-hidden ring-4 ring-red-100">
          <div className="bg-red-600 p-8 text-white text-center">
            <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <ShieldAlert className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Acesso Suspenso</h2>
            <p className="text-red-100 text-xs font-medium mt-1">Identificamos pendências financeiras em sua conta</p>
          </div>

          <CardContent className="p-8 space-y-6">
            <div className="space-y-4 text-center">
              <p className="text-sm text-slate-500 font-medium">
                Seu acesso foi temporariamente bloqueado devido a faturas com mais de 5 dias de atraso.
              </p>
              
              <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Total em Atraso</p>
                <p className="text-3xl font-black text-red-600">R$ {totalOverdue.toFixed(2)}</p>
                <div className="mt-4 space-y-2">
                  {overdueInvoices.map(inv => (
                    <div key={inv.id} className="flex justify-between items-center text-[10px] font-bold text-red-800/60 uppercase">
                      <span>Vencimento: {new Date(inv.due_date + "T12:00:00").toLocaleDateString('pt-BR')}</span>
                      <span>R$ {Number(inv.final_value).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <Button 
                  className="w-full h-14 rounded-2xl text-lg font-black uppercase italic tracking-tighter bg-red-600 hover:bg-red-700 shadow-xl shadow-red-200 gap-2"
                  onClick={() => {
                    checkout({
                      amount: totalOverdue,
                      description: `Regularização de Pendências - ${student?.nome}`,
                      transactionId: student?.id || "",
                      metadata: { student_id: student?.id, studioId: studioId, bulk_payment: true },
                      returnPath: "/student"
                    });
                  }}
                >
                  <CreditCard className="h-5 w-5" /> Pagar Agora e Liberar
                </Button>
                <p className="text-[10px] text-slate-400 font-medium italic">
                  O acesso será liberado automaticamente após a confirmação do pagamento.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <PaymentMethodModal 
          open={modalOpen} 
          onOpenChange={setModalOpen} 
          studioId={studioId || ""}
          checkoutOptions={checkoutOptions} 
        />
      </div>
    );
  }


  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl border-none rounded-3xl overflow-hidden">
        <div className="bg-primary p-6 text-white text-center">
          <h2 className="text-2xl font-bold">Bem-vindo ao StudioFlow 🌿</h2>
          <p className="text-primary-foreground/80 text-sm mt-1">Vamos concluir seu acesso em poucos passos</p>
        </div>

        <CardContent className="p-8">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className={`flex items-center gap-2 ${step === "profile" ? "text-primary" : "text-slate-400"}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${step === "profile" ? "border-primary bg-primary text-white" : "border-slate-200"}`}>
                <User className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">Seus Dados</span>
            </div>
            <div className="h-px w-12 bg-slate-200" />
            <div className={`flex items-center gap-2 ${step === "contract" ? "text-primary" : "text-slate-400"}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${step === "contract" ? "border-primary bg-primary text-white" : "border-slate-200"}`}>
                <FileText className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">Contrato</span>
            </div>
          </div>

          {step === "profile" ? (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold">Complete seu Perfil</h3>
                <p className="text-sm text-slate-500">Precisamos de algumas informações básicas para sua ficha.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input value={profileData.nome} onChange={e => setProfileData({...profileData, nome: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>CPF *</Label>
                  <Input placeholder="000.000.000-00" value={profileData.cpf} onChange={e => setProfileData({...profileData, cpf: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone *</Label>
                  <Input placeholder="(00) 00000-0000" value={profileData.telefone} onChange={e => setProfileData({...profileData, telefone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input placeholder="Rua, Número, Bairro, Cidade - UF" value={profileData.endereco} onChange={e => setProfileData({...profileData, endereco: e.target.value})} />
                </div>
              </div>
              <Button
                className="w-full h-12 rounded-xl text-md font-bold"
                disabled={!profileData.cpf || !profileData.telefone || updateProfileMutation.isPending}
                onClick={() => updateProfileMutation.mutate(profileData)}
              >
                {updateProfileMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Salvar e Continuar"}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold">Assinatura do Contrato</h3>
                <p className="text-sm text-slate-500">Revise os termos e assine digitalmente para ativar sua matrícula.</p>
              </div>
              {currentContract && (
                <div className="rounded-2xl border border-slate-200 p-6 space-y-4 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-primary">{currentContract.plans?.nome}</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-slate-200 bg-white">
                      R$ {Number(currentContract.plans?.valor).toFixed(2)}
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-xl bg-white p-4 border border-slate-100 shadow-inner">
                    <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {currentContract.corpo_texto || "Carregando termos do contrato..."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Sua Assinatura Digital</Label>
                    <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-4">
                      <SignatureCanvas onSignature={setSignatureData} height={120} />
                    </div>
                  </div>
                  <div className="rounded-xl bg-primary/5 p-4 border border-primary/10">
                    <p className="text-[10px] text-primary/80 flex items-start gap-2 italic">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      Ao assinar, você confirma que leu e concorda com todos os termos. Seu IP e data/hora serão registrados.
                    </p>
                  </div>
                </div>
              )}
              <Button
                className="w-full h-12 rounded-xl text-md font-bold gap-2"
                disabled={!signatureData || signContractMutation.isPending}
                onClick={() => signContractMutation.mutate({ contractId: currentContract.id, signature: signatureData! })}
              >
                {signContractMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><PenLine className="h-5 w-5" /> Assinar e Concluir Onboarding</>}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
