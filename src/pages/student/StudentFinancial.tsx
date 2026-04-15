import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import StudentLayout from "@/components/layouts/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, AlertTriangle, CheckCircle2, Clock, Loader2, CreditCard, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { usePaymentCheckout } from "@/hooks/usePaymentCheckout";
import { PaymentMethodModal } from "@/components/financial/PaymentMethodModal";

function isNaoVencida(vencimento: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(vencimento + "T00:00:00");
  return venc > hoje;
}

function isVencida(vencimento: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(vencimento + "T00:00:00");
  return venc < hoje;
}

function getDisplayStatus(m: any) {
  if (m.status === "pago" || m.status === "cancelado") return m.status;
  
  // Normalized field names between financial_records and invoices
  const vencimento = m.vencimento || m.due_date;

  if (m.status === "pendente" || m.status === "atrasado") {
    return isVencida(vencimento) ? "atrasado" : "pendente";
  }
  return m.status;
}

export default function StudentFinancial() {
  const { user, studioId } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { checkout, modalOpen, setModalOpen, checkoutOptions } = usePaymentCheckout();
  const [confirmEarlyPay, setConfirmEarlyPay] = useState<any>(null);

  // Handle Payment Gateway return (Mercado Pago / Checkout Pro)
  useEffect(() => {
    const paymentStatus = searchParams.get("payment_status");
    if (paymentStatus === "success" || paymentStatus === "approved") {
      import("sonner").then(({ toast }) => {
        toast.success("Pagamento realizado com sucesso! O status será atualizado em instantes.");
      });
      queryClient.invalidateQueries({ queryKey: ["my-finance-all-sb"] });
      setSearchParams({}, { replace: true });
    } else if (paymentStatus === "pending" || paymentStatus === "in_process") {
      import("sonner").then(({ toast }) => {
        toast.info("Pagamento em processamento. Assim que for compensado, o sistema atualizará seu status.");
      });
      setSearchParams({}, { replace: true });
    } else if (paymentStatus === "failure" || paymentStatus === "rejected") {
      import("sonner").then(({ toast }) => {
        toast.error("O pagamento não foi concluído. Por favor, tente novamente ou use outra forma de pagamento.");
      });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient]);

  const { data: student, isLoading: loadingStudent } = useQuery({
    queryKey: ["my-student-sb", user?.id, studioId],
    enabled: !!user?.id && !!studioId,
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

  const { data: mensalidades = [], isLoading: loadingMensalidades } = useQuery<any[]>({
    queryKey: ["my-finance-all-sb", student?.id],
    enabled: !!student?.id && !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_records")
        .select(`
          *,
          plans ( * )
        `)
        .eq("student_id", student.id)
        .order("vencimento", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery<any[]>({
    queryKey: ["my-invoices-all-sb", student?.id],
    enabled: !!student?.id && !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("student_id", student.id)
        .order("due_date", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingMensalidades || loadingInvoices;

  if (loadingStudent) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  // Unify and sort
  const combined = [
    ...mensalidades.map(m => ({ ...m, type: 'legacy' })),
    ...invoices.map(inv => ({ ...inv, vencimento: inv.due_date, valor: inv.final_value, type: 'invoice' }))
  ].sort((a, b) => new Date(b.vencimento).getTime() - new Date(a.vencimento).getTime());

  const enriched = combined.map((m: any) => ({ ...m, displayStatus: getDisplayStatus(m) }));
  const pagas = enriched.filter((m) => m.displayStatus === "pago");
  const pendentes = enriched.filter((m) => m.displayStatus === "pendente");
  const atrasadas = enriched.filter((m) => m.displayStatus === "atrasado");

  const doCheckout = (m: any) => {
    checkout({
      amount: Number(m.valor),
      description: `Mensalidade - Venc. ${new Date(m.vencimento + "T00:00:00").toLocaleDateString("pt-BR")}`,
      transactionId: m.id,
      metadata: m.type === 'invoice' ? { invoice_id: m.id } : { financial_record_id: m.id },
      returnPath: "/student/financial",
    });
  };

  const handlePay = (m: any) => {
    if (isNaoVencida(m.vencimento)) {
      setConfirmEarlyPay(m);
      return;
    }
    doCheckout(m);
  };

  return (
    <StudentLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> Financeiro
          </h1>
          <p className="text-sm text-muted-foreground">Suas mensalidades e pagamentos</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <CheckCircle2 className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-primary">{pagas.length}</p>
              <p className="text-[10px] text-muted-foreground">Pagas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Clock className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-lg font-bold">{pendentes.length}</p>
              <p className="text-[10px] text-muted-foreground">A vencer</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <AlertTriangle className="h-5 w-5 text-destructive mx-auto mb-1" />
              <p className="text-lg font-bold text-destructive">{atrasadas.length}</p>
              <p className="text-[10px] text-muted-foreground">Atrasadas</p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : enriched.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensalidade registrada</p>
        ) : (
          <div className="space-y-2">
            {enriched.map((m: any) => (
              <Card 
                key={m.id} 
                className={`
                  ${m.displayStatus === "atrasado" ? "border-red-500 bg-red-50 dark:bg-red-950/20 ring-1 ring-red-500 animate-pulse-subtle" : ""}
                `}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    {m.displayStatus === "atrasado" && (
                      <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                    )}
                    <div>
                      <p className={`text-sm font-bold ${m.displayStatus === "atrasado" ? "text-red-700 dark:text-red-400" : "font-medium"}`}>
                        Venc. {new Date(m.vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.plans?.nome || (m.type === 'invoice' ? "Nova Cobrança" : "Avulso")}{m.forma_pagamento ? ` · ${m.forma_pagamento}` : ""}
                      </p>
                      {m.data_pagamento && (
                        <p className="text-[10px] text-muted-foreground">Pago em {new Date(m.data_pagamento + "T00:00:00").toLocaleDateString("pt-BR")}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <p className={`text-sm font-bold ${m.displayStatus === "atrasado" ? "text-red-700 dark:text-red-400 text-lg" : ""}`}>
                      R$ {Number(m.valor).toFixed(2)}
                    </p>
                    {m.displayStatus === "pago" ? (
                      <Badge variant="default" className="text-[10px]">PAGO</Badge>
                    ) : m.displayStatus === "atrasado" ? (
                      <Badge variant="destructive" className="text-[10px] font-black animate-bounce px-2">VENCIDO</Badge>
                    ) : m.displayStatus === "cancelado" ? (
                      <Badge variant="secondary" className="text-[10px]">CANCELADO</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 text-primary">
                        <Clock className="h-2.5 w-2.5" />
                        A VENCER
                      </Badge>
                    )}
                      <Button
                        size="sm"
                        variant={m.displayStatus === "atrasado" ? "destructive" : "outline"}
                        onClick={() => handlePay(m)}
                        className={`gap-1 h-8 text-[10px] font-bold ${m.displayStatus === "atrasado" ? "bg-red-600 shadow-md" : ""}`}
                      >
                        <CreditCard className="h-3 w-3" />
                        {m.displayStatus === "atrasado" ? "PAGAR AGORA" : "Pagar Online"}
                      </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Early payment confirmation */}
      <AlertDialog open={!!confirmEarlyPay} onOpenChange={(open) => { if (!open) setConfirmEarlyPay(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mensalidade ainda não vencida</AlertDialogTitle>
            <AlertDialogDescription>
              Esta mensalidade vence em <strong>{confirmEarlyPay?.vencimento && new Date(confirmEarlyPay.vencimento + "T00:00:00").toLocaleDateString("pt-BR")}</strong> e ainda não está vencida. 
              Deseja pagar antecipadamente mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const m = confirmEarlyPay;
              setConfirmEarlyPay(null);
              doCheckout(m);
            }}>
              Sim, pagar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PaymentMethodModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        studioId={studioId || ""}
        checkoutOptions={checkoutOptions} 
      />
    </StudentLayout>
  );
}
