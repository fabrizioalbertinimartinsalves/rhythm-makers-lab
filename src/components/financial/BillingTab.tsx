import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageSquare, 
  Table as TableIcon, 
  AlertCircle,
  Plus,
  Trash2,
  ChevronRight,
  Calendar as CalendarIcon,
  DollarSign,
  Zap,
  Check,
  RotateCcw,
  CreditCard,
  Mail,
  RefreshCw
} from "lucide-react";

import { usePaymentCheckout } from "@/hooks/usePaymentCheckout";
import { PaymentMethodModal } from "@/components/financial/PaymentMethodModal";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { sendSystemEmail } from "@/lib/notifications";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function BillingTab() {
  const { studioId } = useAuth() as any;
  const queryClient = useQueryClient();
  const { checkout, modalOpen, setModalOpen, checkoutOptions } = usePaymentCheckout();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ nome: "", corpo: "" });

  const today = new Date().toISOString().split("T")[0];

  // --- Queries ---
  const { data: overdue = [], isLoading: loadingOverdue } = useQuery({
    queryKey: ["invoices-overdue", studioId],
    enabled: !!studioId,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, last_automated_reminder_at, students(nome, telefone, email), enrollments(class_id, plan_id, classes(nome), plans(nome))")
        .eq("studio_id", studioId)
        .eq("status", "pendente")
        .lte("due_date", today)
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: recentPayments = [], isLoading: loadingRecent } = useQuery({
    queryKey: ["invoices-recent", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, students(nome, telefone), enrollments(class_id, plan_id, classes(nome), plans(nome))")
        .eq("studio_id", studioId)
        .eq("status", "pago")
        .order("updated_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["message-templates", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .eq("studio_id", studioId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // --- Mutations ---
  const togglePayment = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: 'pago' | 'pendente' }) => {
      const { error } = await supabase
        .from("invoices")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.status === 'pago' ? "Pagamento confirmado!" : "Pagamento revertido!");
      queryClient.invalidateQueries({ queryKey: ["invoices-overdue"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-recent"] });
      
      // Double Check: Invalidate Dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard-vendas-mes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-vencidos"] });
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const generateInvoices = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("generate_monthly_invoices", {
        p_studio_id: studioId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (result: any) => {
      const generated = result?.generated ?? 0;
      const skipped = result?.skipped_duplicates ?? 0;
      toast.success(
        generated > 0
          ? `✅ ${generated} mensalidade(s) gerada(s)! ${skipped > 0 ? `(${skipped} já existiam)` : ""}`
          : `Nenhuma mensalidade nova para gerar. (${skipped} já existiam)`
      );
      queryClient.invalidateQueries({ queryKey: ["invoices-overdue"] });
      
      // Double Check: Invalidate Dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard-vencidos"] });
    },
    onError: (err: any) => toast.error("Erro ao gerar mensalidades: " + err.message),
  });

  const createTemplate = useMutation({
    mutationFn: async (template: { nome: string; corpo: string }) => {
      const { error } = await supabase.from("message_templates").insert([
        { ...template, studio_id: studioId, tipo: "whatsapp" }
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Modelo criado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      setIsTemplateModalOpen(false);
      setNewTemplate({ nome: "", corpo: "" });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("message_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Modelo removido");
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mensalidade excluída");
      queryClient.invalidateQueries({ queryKey: ["invoices-overdue"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-recent"] });
      
      // Double Check: Invalidate Dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard-vencidos"] });
    },
    onError: (err: any) => toast.error("Erro ao excluir: " + err.message)
  });

  // --- Helpers ---
  const generateMessage = (templateBody: string, invoice: any) => {
    if (!invoice) return templateBody;
    let msg = templateBody;
    const nome = invoice.students?.nome || "Aluno";
    const valor = invoice.final_value != null
      ? Number(invoice.final_value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "R$ 0,00";
    const vencimento = invoice.due_date ? format(parseISO(invoice.due_date), "dd/MM/yyyy") : "--/--/----";
    const dataHoje = format(new Date(), "dd/MM/yyyy");

    msg = msg.replace(/\{\{nome\}\}/gi, nome);
    msg = msg.replace(/\{\{valor\}\}/gi, valor);
    msg = msg.replace(/\{\{vencimento\}\}/gi, vencimento);
    msg = msg.replace(/\{\{data_hoje\}\}/gi, dataHoje);

    return msg;
  };

  const sendWhatsApp = async (templateBody: string, invoice: any) => {
    const msg = generateMessage(templateBody, invoice);
    const phone = invoice.students?.telefone?.replace(/\D/g, "");
    if (!phone) {
      toast.error("Aluno sem telefone cadastrado.");
      return;
    }
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    setIsSendModalOpen(false);
  };

  const sendEmail = async (templateBody: string, invoice: any) => {
    if (!invoice.students?.email || !studioId) {
      toast.error("Aluno sem e-mail cadastrado ou Estúdio não identificado.");
      return;
    }

    const msg = generateMessage(templateBody, invoice);
    
    const promise = sendSystemEmail(studioId, {
      to: invoice.students.email,
      subject: `Lembrete de Pagamento - ${invoice.students.nome}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6;">
          <h2 style="color: #0f172a;">Lembrete de Pagamento 💳</h2>
          <p>Olá, <strong>${invoice.students.nome}</strong>!</p>
          <div style="background: #f8fafc; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 0 12px 12px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${msg.replace(/\*/g, "")}</p>
          </div>
          <p>Você pode realizar o pagamento através do nosso portal ou utilizando o link abaixo:</p>
          <div style="margin: 30px 0;">
            <a href="${window.location.origin}/login" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Acessar Portal do Aluno
            </a>
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;" />
          <p style="font-size: 11px; color: #94a3b8;">Estúdio Rhythm Makers · Gestão por Kineos Cockpit</p>
        </div>
      `
    });

    toast.promise(promise, {
      loading: 'Enviando e-mail...',
      success: 'E-mail de cobrança enviado com sucesso!',
      error: (err: any) => `Erro ao enviar e-mail: ${err.message}`
    });
    
    setIsSendModalOpen(false);
  };

  if (loadingOverdue && loadingTemplates) {
    return <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-60" /></div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Left: Overdue List */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
              Inadimplência <span className="text-rose-500">& Pendências</span>
            </h3>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
              {overdue.length} mensalidade(s) vencida(s)
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => generateInvoices.mutate()}
              disabled={generateInvoices.isPending}
              className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[9px] tracking-widest px-4 py-2 rounded-xl h-9 gap-2 shadow-lg"
            >
              {generateInvoices.isPending
                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                : <Zap className="h-3.5 w-3.5" />
              }
              Gerar Mensalidades
            </Button>
          </div>
        </div>

        {overdue.length === 0 ? (
          <Card className="border-dashed border-2 bg-slate-50/50 flex flex-col items-center justify-center py-12 px-6 rounded-3xl">
            <div className="p-4 rounded-full bg-white shadow-xl mb-4 text-emerald-500">
              <TableIcon className="h-8 w-8" />
            </div>
            <p className="text-slate-500 font-bold uppercase text-[11px] tracking-widest">Nenhuma mensalidade em atraso!</p>
            <p className="text-slate-400 text-[10px] mt-1 italic">Clique em "Gerar Mensalidades" se houver contratos ativos.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {overdue.map((inv: any) => (
              <Card key={inv.id} className="border-none shadow-md bg-white hover:shadow-xl transition-all duration-300 ring-1 ring-slate-100 rounded-3xl group">
                <CardContent className="p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 w-full">
                    <div className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-900 truncate uppercase tracking-tight italic">
                          {inv.students?.nome ?? <span className="text-rose-500 font-bold">Aluno Removido</span>}
                        </h4>
                        <Badge variant="outline" className="bg-rose-50 text-rose-600 border-none text-[8px] font-black uppercase px-2 py-0.5">
                          {Math.floor((new Date().getTime() - new Date(inv.due_date).getTime()) / (1000 * 3600 * 24))} dias em atraso
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                        <span className="flex items-center gap-1.5">
                          <CalendarIcon className="h-3 w-3" /> {format(parseISO(inv.due_date), "dd/MM/yyyy")}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <DollarSign className="h-3 w-3 shrink-0" />
                          {Number(inv.final_value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                      </div>
                      {inv.enrollments?.classes?.nome && (
                        <p className="text-[9px] font-bold text-primary/60 uppercase tracking-widest">
                          {inv.enrollments.classes.nome} · {inv.enrollments.plans?.nome}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <Button 
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (window.confirm("Deseja realmente excluir esta mensalidade?")) {
                          deleteInvoiceMutation.mutate(inv.id);
                        }
                      }}
                      className="h-10 w-10 rounded-xl border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all shadow-sm"
                      title="Excluir Mensalidade"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="outline"
                      size="icon"
                      onClick={() => togglePayment.mutate({ id: inv.id, status: 'pago' })}
                      className="h-10 w-10 rounded-xl border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all shadow-sm"
                      title="Marcar como Pago (Manual)"
                    >
                      <Check className="h-5 w-5" />
                    </Button>
                     <Button 
                       variant="outline"
                       size="icon"
                       onClick={() => checkout({
                         amount: inv.final_value,
                         description: `Mensalidade - ${inv.students?.nome}`,
                         transactionId: inv.id,
                         metadata: { studioId, student_id: inv.student_id, invoice_id: inv.id }
                       })}
                       className="h-10 w-10 rounded-xl border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all shadow-sm"
                       title="Pagar Mensalidade (Cartão ou Pix)"
                     >
                       <CreditCard className="h-5 w-5" />
                     </Button>
                    <Button 
                      onClick={() => { setSelectedInvoice(inv); setIsSendModalOpen(true); }}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl h-10 gap-2 shadow-lg shadow-emerald-500/10"
                    >
                      <MessageSquare className="h-4 w-4" /> Notificar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* --- Recent Payments Section --- */}
        <div className="pt-8 space-y-4">
           <div className="flex items-center gap-2 px-2">
              <Check className="h-4 w-4 text-emerald-500" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Recebimentos Recentes</h3>
           </div>
           
           {recentPayments.length === 0 ? (
             <div className="p-8 text-center border-2 border-dashed border-slate-50 rounded-3xl">
                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest italic">Nenhum pagamento recente registrado.</p>
             </div>
           ) : (
             <div className="space-y-2">
                {recentPayments.map((inv: any) => (
                  <Card key={inv.id} className="border-none shadow-sm bg-white/50 hover:bg-white transition-all duration-300 ring-1 ring-slate-100 group rounded-2xl">
                    <CardContent className="p-4 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                             <Check className="h-4 w-4" />
                          </div>
                          <div className="space-y-0.5">
                             <p className="text-[10px] font-black uppercase text-slate-900 tracking-tight italic">{inv.students?.nome}</p>
                             <div className="flex items-center gap-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                <span>{Number(inv.final_value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                                <span className="h-1 w-1 rounded-full bg-slate-200" />
                                <span>Vencimento: {format(parseISO(inv.due_date), "dd/MM")}</span>
                             </div>
                          </div>
                       </div>
                       <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 hover:bg-rose-50 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                          onClick={() => togglePayment.mutate({ id: inv.id, status: 'pendente' })}
                          title="Reverter Pagamento"
                       >
                          <RotateCcw className="h-4 w-4" />
                       </Button>
                    </CardContent>
                  </Card>
                ))}
             </div>
           )}
        </div>
      </div>

      {/* Right: Templates */}
      <div className="space-y-6">
        <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[2rem] overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-black uppercase tracking-[0.25em] text-emerald-400 italic">Modelos de Cobrança</CardTitle>
              <Button 
                variant="ghost" size="icon"
                className="text-emerald-400 hover:text-emerald-500 hover:bg-white/10 rounded-xl"
                onClick={() => setIsTemplateModalOpen(true)}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {templates.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-white/10 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Sem modelos salvos</p>
                <Button size="sm" variant="outline" className="bg-transparent border-white/20 hover:bg-white/10 text-white font-black uppercase text-[9px] tracking-widest" onClick={() => setIsTemplateModalOpen(true)}>
                  Criar Primeiro
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((tpl: any) => (
                  <div key={tpl.id} className="group p-4 bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 rounded-2xl">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase italic">{tpl.nome}</span>
                       <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => deleteTemplate.mutate(tpl.id)} className="text-rose-400 hover:text-rose-500">
                            <Trash2 className="h-3 w-3" />
                          </button>
                       </div>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 italic leading-relaxed">"{tpl.corpo}"</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
               <h5 className="text-[9px] font-black uppercase text-emerald-400 mb-2 flex items-center gap-2">
                 <TableIcon className="h-3 w-3" /> Tags Dinâmicas
               </h5>
               <div className="flex flex-wrap gap-2">
                  {["{{nome}}", "{{valor}}", "{{vencimento}}", "{{data_hoje}}"].map(tag => (
                    <code key={tag} className="px-2 py-1 bg-white/5 border border-white/5 text-[9px] font-mono text-emerald-500/80 rounded-lg">{tag}</code>
                  ))}
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal: Create Template */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[500px] border-none rounded-[2rem] shadow-2xl bg-white p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-slate-950">
              Novo Modelo <span className="text-primary">WhatsApp</span>
            </DialogTitle>
            <DialogDescription className="text-slate-400 uppercase text-[9px] font-black tracking-widest pt-1">
              Defina uma mensagem padrão para suas cobranças
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.1em]">Nome do Modelo</Label>
              <Input 
                placeholder="Ex: Cobrança Amigável - 3 dias" 
                value={newTemplate.nome}
                onChange={e => setNewTemplate({...newTemplate, nome: e.target.value})}
                className="rounded-xl border-slate-100 bg-slate-50 shadow-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.1em]">Mensagem</Label>
              <Textarea 
                placeholder="Olá {{nome}}, sua mensalidade de {{valor}} venceu em {{vencimento}}..."
                rows={6}
                value={newTemplate.corpo}
                onChange={e => setNewTemplate({...newTemplate, corpo: e.target.value})}
                className="rounded-2xl border-slate-100 bg-slate-50 shadow-none resize-none pt-4"
              />
            </div>
          </div>
          <DialogFooter className="pt-6 sm:justify-start gap-3">
             <Button 
                onClick={() => createTemplate.mutate(newTemplate)}
                disabled={!newTemplate.nome || !newTemplate.corpo || createTemplate.isPending}
                className="h-12 w-full sm:w-auto px-8 bg-slate-950 hover:bg-black font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-xl shadow-slate-950/20"
             >
                Salvar Modelo
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Select Template to Send */}
      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[450px] border-none rounded-[2rem] shadow-2xl bg-white p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-slate-950">
              Escolha o <span className="text-emerald-500">Modelo</span>
            </DialogTitle>
            <DialogDescription className="text-slate-400 uppercase text-[9px] font-black tracking-widest pt-1">
              Enviar para {selectedInvoice?.students?.nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-6">
            {templates.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                 <p className="text-[10px] font-black uppercase text-slate-300">Crie um modelo primeiro!</p>
              </div>
            ) : (
              templates.map((tpl: any) => (
                <div key={tpl.id} className="w-full p-4 border border-slate-100 rounded-2xl space-y-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-900">{tpl.nome}</p>
                    <p className="text-[10px] text-slate-400 italic line-clamp-1">{generateMessage(tpl.corpo, selectedInvoice)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 h-9 rounded-xl text-[9px] font-bold uppercase tracking-wider gap-2"
                      onClick={() => sendWhatsApp(tpl.corpo, selectedInvoice)}
                    >
                      <MessageSquare className="h-3 w-3" /> WhatsApp
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 border-slate-200 hover:bg-slate-50 h-9 rounded-xl text-[9px] font-bold uppercase tracking-wider gap-2 text-slate-600"
                      onClick={() => sendEmail(tpl.corpo, selectedInvoice)}
                    >
                      <Mail className="h-3 w-3" /> E-mail
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PaymentMethodModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        studioId={studioId}
        checkoutOptions={checkoutOptions} 
      />
    </div>
  );
}
