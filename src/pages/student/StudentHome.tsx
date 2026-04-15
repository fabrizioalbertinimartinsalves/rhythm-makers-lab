import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import StudentLayout from "@/components/layouts/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, CreditCard, Star, Loader2, FileText, PenLine, AlertTriangle, AlertCircle, Ban, Lock, XCircle, Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { usePaymentCheckout } from "@/hooks/usePaymentCheckout";
import { PaymentMethodModal } from "@/components/financial/PaymentMethodModal";

export default function StudentHome() {
  const { user, studioId } = useAuth();
  const navigate = useNavigate();

  const { data: student, isLoading: loadingStudent } = useQuery({
    queryKey: ["my-student-sb", user?.id, studioId],
    enabled: !!user?.id && !!studioId,
    queryFn: async () => {
      // 1. Try to find by user_id
      const { data: byUser, error: errUser } = await supabase
        .from("students")
        .select("*")
        .eq("studio_id", studioId)
        .eq("user_id", user?.id)
        .maybeSingle();

      if (byUser) return byUser;

      // 2. Try by email as fallback
      if (user?.email) {
        const { data: byEmail, error: errEmail } = await supabase
          .from("students")
          .select("*")
          .eq("studio_id", studioId)
          .eq("email", user.email)
          .maybeSingle();

        if (byEmail) {
          // Link current user to this student record
          await supabase
            .from("students")
            .update({ user_id: user.id })
            .eq("id", byEmail.id);
          return { ...byEmail, user_id: user.id };
        }
      }

      return null;
    },
  });

  const { data: enrollments = [] } = useQuery<any[]>({
    queryKey: ["my-enrollments-sb", student?.id],
    enabled: !!student?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          *,
          classes (
            *,
            modalities ( * )
          )
        `)
        .eq("student_id", student.id)
        .eq("ativa", true);
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: financialRecords = [] } = useQuery({
    queryKey: ["my-finance-sb", student?.id],
    enabled: !!student?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_records")
        .select("*")
        .eq("student_id", student.id)
        .order("vencimento", { ascending: true })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["my-invoices-sb", student?.id],
    enabled: !!student?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("student_id", student.id)
        .eq("status", "pendente")
        .order("due_date", { ascending: true })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: contracts = [] } = useQuery<any[]>({
    queryKey: ["my-contracts-sb", student?.id],
    enabled: !!student?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          plans ( * )
        `)
        .eq("student_id", student.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const activeContract = contracts.find((c: any) => c.status === "ativo");
  const sessionCount = 0; // Placeholder for missing session count logic

  const queryClient = useQueryClient();
  const { checkout, modalOpen, setModalOpen, checkoutOptions } = usePaymentCheckout();

  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [pauseDates, setPauseDates] = useState({ start: "", end: "" });

  const { data: cancelQuote, isLoading: loadingQuote } = useQuery({
    queryKey: ["cancel-quote", activeContract?.enrollment_id || activeContract?.id],
    enabled: isCancelOpen && !!activeContract,
    queryFn: async () => {
      // Find matching enrollment
      const enrolledId = enrollments.find(e => e.plan_id === activeContract.plan_id)?.id;
      if (!enrolledId) return null;

      const { data, error } = await supabase.rpc("get_cancellation_quote", {
        p_enrollment_id: enrolledId
      });
      if (error) throw error;
      return data;
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const enrolledId = enrollments.find(e => e.plan_id === activeContract.plan_id)?.id;
      const { data, error } = await supabase.rpc("process_plan_action", {
        p_enrollment_id: enrolledId,
        p_action: 'cancel',
        p_reason: cancelReason
      });
      if (error) throw error;
      return (data || []) as any[];
    },
    onSuccess: (data: any) => {
      if (data.invoice_id) {
        // Redirect to Mercado Pago for penalty
         checkout({
           amount: data.quote.total_buyout,
           description: "Multa de Cancelamento de Plano",
           transactionId: data.invoice_id,
           metadata: { invoice_id: data.invoice_id },
           returnPath: "/student/financial",
         });
      } else {
        toast.success("Plano cancelado com sucesso!");
        setIsCancelOpen(false);
        queryClient.invalidateQueries();
      }
    }
  });

  const pauseMutation = useMutation({
    mutationFn: async () => {
      const enrolledId = enrollments.find(e => e.plan_id === activeContract.plan_id)?.id;
      const { data, error } = await supabase.rpc("process_plan_action", {
        p_enrollment_id: enrolledId,
        p_action: 'pause',
        p_pause_start: pauseDates.start,
        p_pause_end: pauseDates.end
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Plano trancado com sucesso!");
      setIsPauseOpen(false);
      queryClient.invalidateQueries();
    }
  });

  if (loadingStudent) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  if (!student) {
    return (
      <StudentLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground">Seu perfil de aluno ainda não foi vinculado.</p>
          <p className="text-xs text-muted-foreground mt-1">Entre em contato com a recepção do estúdio.</p>
        </div>
      </StudentLayout>
    );
  }

  const firstName = student.nome?.split(" ")[0] || "Aluno";
  
  // Calculate overdue items from both tables
  const overdueRecords = financialRecords.filter((m: any) => m.status === "atrasado");
  const overdueInvoices = invoices.filter((inv: any) => {
    const due = new Date(inv.due_date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inv.status === "pendente" && due < today;
  });

  const atrasadas = overdueRecords.length + overdueInvoices.length;
  
  // Unified next payment
  const nextRecord = financialRecords.find((m: any) => m.status === "pendente") as any;
  const nextInvoice = invoices.find((inv: any) => inv.status === "pendente") as any;

  let proximaMensalidade = null;
  if (nextRecord && nextInvoice) {
    proximaMensalidade = new Date(nextRecord.vencimento) < new Date(nextInvoice.due_date) ? nextRecord : { ...nextInvoice, vencimento: nextInvoice.due_date, valor: nextInvoice.final_value };
  } else if (nextRecord) {
    proximaMensalidade = nextRecord;
  } else if (nextInvoice) {
    proximaMensalidade = { ...nextInvoice, vencimento: nextInvoice.due_date, valor: nextInvoice.final_value };
  }

  const pendingContracts = contracts.filter((c: any) => c.status === "pendente" && !c.assinado_em);

  const diasSemanaMap: Record<string, string> = {
    seg: "Segunda", ter: "Terça", qua: "Quarta", qui: "Quinta", sex: "Sexta", sab: "Sábado", dom: "Domingo",
  };

  const todayDia = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"][new Date().getDay()];

  const getDaysRemaining = (dataFim: string | null) => {
    if (!dataFim) return null;
    const end = new Date(dataFim + "T00:00:00");
    const diff = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <StudentLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome */}
        <div className="flex items-center gap-3">
          {student.foto_url ? (
            <img src={student.foto_url} alt={student.nome} className="h-12 w-12 rounded-full object-cover border-2 border-primary/20" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{student.nome?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</span>
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold">Olá, {firstName}! 🌿</h1>
            <p className="text-sm text-muted-foreground">
              {enrollments.length > 0
                ? `${enrollments.length} turma(s) ativa(s)`
                : "Nenhuma turma ativa"}
            </p>
          </div>
        </div>

        {/* Pending contracts alert */}
        {pendingContracts.length > 0 && (
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <PenLine className="h-5 w-5 text-warning shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Contrato pendente de assinatura</p>
                  <p className="text-xs text-muted-foreground">
                    Você tem {pendingContracts.length} contrato(s) aguardando aceite
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => navigate("/student/documents")}>
                Assinar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Overdue alert */}
        {atrasadas > 0 && (
          <Card className="border-red-500 bg-red-50 dark:bg-red-950/20 shadow-lg animate-pulse-subtle">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <Ban className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-red-700 dark:text-red-400">
                  DÉBITO EM ABERTO
                </p>
                <p className="text-xs text-red-600 dark:text-red-300 font-medium">
                  Você possui {atrasadas} pendência(s) financeira(s) em atraso.
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Regularize agora para manter seu acesso.
                </p>
              </div>
              <Button 
                variant="destructive" 
                size="sm" 
                className="shrink-0 font-bold bg-red-600 hover:bg-red-700 shadow-md"
                onClick={() => navigate("/student/financial")}
              >
                PAGAR AGORA
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <CalendarDays className="h-6 w-6 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">{enrollments.length}</p>
              <p className="text-[10px] text-muted-foreground">Turmas ativas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="h-6 w-6 text-warning mx-auto mb-1" />
              <p className="text-2xl font-bold">{sessionCount}</p>
              <p className="text-[10px] text-muted-foreground">Sessões realizadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Active contract vigência */}
        {activeContract && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Contrato Ativo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{activeContract.plans?.nome || "Contrato"}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeContract.data_inicio && new Date(activeContract.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")}
                    {activeContract.data_fim && ` a ${new Date(activeContract.data_fim + "T00:00:00").toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
                <div className="text-right">
                  {(() => {
                    const days = getDaysRemaining(activeContract.data_fim);
                    if (days === null) return <Badge variant="default">Indefinido</Badge>;
                    if (days <= 0) return <Badge variant="destructive">Expirado</Badge>;
                    return (
                      <div>
                        <p className={`text-sm font-bold ${days <= 30 ? "text-warning" : "text-primary"}`}>{days}d</p>
                        <p className="text-[10px] text-muted-foreground">restantes</p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-1 text-[11px]"
                  onClick={() => setIsPauseOpen(true)}
                >
                  <Lock className="h-3 w-3" /> Trancar Plano
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-1 text-[11px] text-destructive hover:text-destructive"
                  onClick={() => setIsCancelOpen(true)}
                >
                  <XCircle className="h-3 w-3" /> Cancelar Plano
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cancellation Dialog */}
        <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancelar Plano</DialogTitle>
              <DialogDescription>
                Você está solicitando o cancelamento do seu plano atual.
              </DialogDescription>
            </DialogHeader>

            {loadingQuote ? (
              <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : cancelQuote?.success ? (
              <div className="space-y-4 py-2">
                <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Meses restantes:</span>
                    <span className="font-bold">{cancelQuote.months_remaining} meses</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saldo devedor total:</span>
                    <span>R$ {cancelQuote.total_remaining_value?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span>Multa rescisória ({cancelQuote.penalty_percentage}%):</span>
                    <span className="font-bold">R$ {cancelQuote.penalty_amount?.toFixed(2)}</span>
                  </div>
                  {cancelQuote.overdue_amount > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Mensalidades em atraso:</span>
                      <span className="font-bold">R$ {cancelQuote.overdue_amount?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-border flex justify-between text-base font-bold">
                    <span>Total para quitação:</span>
                    <span>R$ {cancelQuote.total_buyout?.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Motivo do cancelamento (opcional)</Label>
                  <Textarea 
                    placeholder="Nos conte o motivo..." 
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                </div>

                <div className="bg-primary/5 p-3 rounded-lg flex gap-3 items-start border border-primary/20">
                  <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <strong>Atenção:</strong> O cancelamento torna-se efetivo após o pagamento da taxa de quitação. 
                    Você continuará com acesso às aulas até o final do ciclo de 30 dias referente ao seu último pagamento já realizado.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-destructive py-4">Erro ao calcular multa: {cancelQuote?.message}</p>
            )}

            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsCancelOpen(false)}>Voltar</Button>
              <Button 
                variant="destructive" 
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                Pagar e Confirmar Cancelamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pause Dialog */}
        <Dialog open={isPauseOpen} onOpenChange={setIsPauseOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Trancar Plano (Pausar)</DialogTitle>
              <DialogDescription>
                Pause seu plano sem custos por um período determinado. Seu acesso e faturamento serão suspensos durante este intervalo.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input 
                  type="date" 
                  value={pauseDates.start}
                  onChange={(e) => setPauseDates({...pauseDates, start: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Retorno</Label>
                <Input 
                  type="date" 
                  value={pauseDates.end}
                  onChange={(e) => setPauseDates({...pauseDates, end: e.target.value})}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsPauseOpen(false)}>Cancelar</Button>
              <Button 
                onClick={() => pauseMutation.mutate()}
                disabled={pauseMutation.isPending || !pauseDates.start || !pauseDates.end}
              >
                {pauseMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirmar Trancamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <PaymentMethodModal 
           open={modalOpen} 
           onOpenChange={setModalOpen} 
           studioId={studioId || ""}
           checkoutOptions={checkoutOptions} 
         />

        {/* My Classes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Minhas Turmas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {enrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma inscrição ativa</p>
            ) : (
              enrollments.map((insc: any) => {
                const isClassDay = (insc.classes?.dias_semana || []).includes(todayDia);
                return (
                  <div key={insc.id} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {insc.classes?.modalities?.emoji} {insc.classes?.nome}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(insc.classes?.dias_semana || []).map((d: string) => diasSemanaMap[d] || d).join(", ")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-primary">{(insc.classes?.horario || "").slice(0, 5)}</p>
                        <p className="text-[10px] text-muted-foreground">{insc.classes?.capacidade} vagas</p>
                      </div>
                    </div>
                    </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Situação Financeira
            </CardTitle>
          </CardHeader>
          <CardContent>
            {proximaMensalidade ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Próximo vencimento</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(proximaMensalidade.vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">R$ {Number(proximaMensalidade.valor).toFixed(2)}</p>
                  <Badge
                    variant={
                      proximaMensalidade.status === "pago" ? "default" :
                      proximaMensalidade.status === "atrasado" ? "destructive" : "secondary"
                    }
                  >
                    {proximaMensalidade.status}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">Nenhuma mensalidade pendente 🎉</p>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={() => navigate("/student/financial")}
            >
              Ver histórico completo →
            </Button>
          </CardContent>
        </Card>

      </div>
    </StudentLayout>
  );
}
