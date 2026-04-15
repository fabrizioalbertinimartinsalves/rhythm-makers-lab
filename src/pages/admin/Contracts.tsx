import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Plus, Search, ClipboardList, Eye, Download, AlertTriangle, 
  RefreshCw, Copy, Trash2, LayoutTemplate, Calendar, CheckCircle2, 
  MessageCircle, Mail, MoreHorizontal, X 
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { usePostSaleAutomation } from "@/hooks/usePostSaleAutomation";
import { toast } from "sonner";
import { sendSystemEmail } from "@/lib/notifications";
import ParqForm from "@/components/ParqForm";
import jsPDF from "jspdf";

type StatusContrato = "ativo" | "pendente" | "cancelado" | "expirado";

const STATUS_CONFIG: Record<StatusContrato, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  ativo: { label: "Ativo", variant: "default", color: "text-primary" },
  pendente: { label: "Pendente", variant: "secondary", color: "text-muted-foreground" },
  cancelado: { label: "Cancelado", variant: "destructive", color: "text-destructive" },
  expirado: { label: "Expirado", variant: "outline", color: "text-muted-foreground" },
};

const TEMPLATE_VARIABLES = [
  { key: "{nome}", desc: "Nome do aluno" },
  { key: "{cpf}", desc: "CPF do aluno" },
  { key: "{plano}", desc: "Nome do plano" },
  { key: "{valor}", desc: "Valor do plano" },
  { key: "{data_inicio}", desc: "Data de início" },
  { key: "{data_fim}", desc: "Data de término" },
  { key: "{data_hoje}", desc: "Data atual" },
];

function fillTemplate(template: string, data: Record<string, string>) {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.split(key).join(value || "—");
  }
  return result;
}

function generatePDF(contrato: any) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("CONTRATO", pageWidth / 2, 25, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Aluno: ${contrato.aluno_nome || "—"}`, margin, 40);
  doc.text(`Plano: ${contrato.plano_nome || "Sem plano"}`, margin, 47);
  doc.text(`Vigência: ${contrato.data_inicio || "—"} a ${contrato.data_fim || "Indeterminado"}`, margin, 54);
  doc.text(`Status: ${STATUS_CONFIG[contrato.status as StatusContrato]?.label || contrato.status}`, margin, 61);

  // Body
  if (contrato.corpo_texto) {
    doc.setDrawColor(200);
    doc.line(margin, 68, pageWidth - margin, 68);

    doc.setFontSize(10);
    const lines = doc.splitTextToSize(contrato.corpo_texto, maxWidth);
    let y = 76;
    for (const line of lines) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 5;
    }
  }

  // Signature
  if (contrato.assinatura_url) {
    const sigY = Math.min(doc.internal.pageSize.getHeight() - 50, 240);
    doc.line(margin, sigY, margin + 80, sigY);
    doc.setFontSize(8);
    doc.text("Assinatura do aluno", margin, sigY + 5);
    if (contrato.assinado_em) {
      doc.text(`Assinado em: ${new Date(contrato.assinado_em).toLocaleDateString("pt-BR")}`, margin, sigY + 10);
    }
    try {
      doc.addImage(contrato.assinatura_url, "PNG", margin, sigY - 30, 60, 25);
    } catch {
      // signature image might fail
    }
  }

  doc.save(`contrato-${contrato.aluno_nome || "documento"}-${contrato.data_inicio}.pdf`);
}

export default function Contracts() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [parqDialogOpen, setParqDialogOpen] = useState(false);
  const [parqAlunoId, setParqAlunoId] = useState("");
  const [signatureDialogId, setSignatureDialogId] = useState<string | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [renewDialogContract, setRenewDialogContract] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("contratos");
  const [form, setForm] = useState({
    aluno_id: "",
    plano_id: null as string | null,
    corpo_texto: "",
    data_inicio: new Date().toISOString().split("T")[0],
    data_fim: "",
  });
  const [templateForm, setTemplateForm] = useState({ nome: "", corpo: "" });
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const { studioId } = useAuth();
  const { projectInstallments } = usePostSaleAutomation();

  // Queries
  const { data: contratos = [], isLoading } = useQuery<any[]>({
    queryKey: ["contratos", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*, students(nome, cpf, telefone), plans(nome, valor)")
        .eq("studio_id", studioId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(c => ({
        ...c,
        aluno_nome: c.students?.nome || "Aluno",
        aluno_telefone: c.students?.telefone || "",
        aluno_email: c.students?.email || "",
        plano_nome: c.plans?.nome || "Contrato Avulso"
      }));
    },
  });

  const sendWhatsApp = (c: any) => {
    const phone = c.aluno_telefone.replace(/\D/g, "");
    if (!phone) {
      toast.error("Aluno sem telefone cadastrado.");
      return;
    }
    const link = `${window.location.origin}/login`;
    const msg = `Olá *${c.aluno_nome}*! Gostaria de solicitar a assinatura do seu contrato. Você pode acessar por este link: ${link}`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const sendEmail = (c: any) => {
    if (!c.aluno_email || !studioId) {
      toast.error("Aluno sem e-mail cadastrado ou Estúdio não identificado.");
      return;
    }

    const promise = sendSystemEmail(studioId, {
      to: c.aluno_email,
      subject: "Assinatura de Contrato - Kineos",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h3>Olá, ${c.aluno_nome}! 🖊️</h3>
          <p>Solicitamos a assinatura eletrônica do seu novo contrato no estúdio.</p>
          <p>Você pode visualizar o documento e assinar acessando o seu portal:</p>
          <div style="margin: 30px 0;">
            <a href="${window.location.origin}/login" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Acessar Portal e Assinar
            </a>
          </div>
          <p style="font-size: 12px; color: #666;">Se o botão acima não funcionar, copie e cole este link: ${window.location.origin}/login</p>
        </div>
      `
    });

    toast.promise(promise, {
      loading: 'Enviando e-mail...',
      success: 'Convite para assinatura enviado com sucesso!',
      error: (err) => `Erro ao enviar e-mail: ${err.message}`
    });
  };

  const { data: alunos = [] } = useQuery<any[]>({
    queryKey: ["alunos-select", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("studio_id", studioId)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: planos = [] } = useQuery<any[]>({
    queryKey: ["planos-select", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("studio_id", studioId)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["contract-templates", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_templates")
        .select("*")
        .eq("studio_id", studioId)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      if (!studioId) return;
      const { error } = await supabase
        .from("contracts")
        .insert([{
          studio_id: studioId,
          student_id: values.aluno_id,
          plan_id: values.plano_id,
          corpo_texto: values.corpo_texto,
          data_inicio: values.data_inicio,
          data_fim: values.data_fim || null,
          status: "pendente"
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos", studioId] });
      setDialogOpen(false);
      setForm({ aluno_id: "", plano_id: null, corpo_texto: "", data_inicio: new Date().toISOString().split("T")[0], data_fim: "" });
      toast.success("Contrato criado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusContrato }) => {
      if (!studioId) return;
      const update: any = { status };
      if (status === "ativo") update.assinado_em = new Date().toISOString();
      
      const { error } = await supabase
        .from("contracts")
        .update(update)
        .eq("id", id);
      
      if (error) throw error;

      if (status === "ativo") {
        const { data: contract } = await supabase
          .from("contracts")
          .select("*, plans(valor)")
          .eq("id", id)
          .single();

        if (contract && contract.plan_id && contract.plans?.valor) {
          await projectInstallments({
            studioId,
            studentId: contract.student_id,
            planId: contract.plan_id,
            valor: Number(contract.plans.valor),
            dataInicio: contract.data_inicio || new Date().toISOString().split('T')[0],
            formaPagamento: "pix",
            contractId: contract.id
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos", studioId] });
      queryClient.invalidateQueries({ queryKey: ["student-financials"] });
      toast.success("Status atualizado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos", studioId] });
      toast.success("Contrato excluído!");
    }
  });

  const renewMutation = useMutation({
    mutationFn: async (contract: any) => {
      if (!studioId) return;
      const newStart = contract.data_fim || new Date().toISOString().split("T00:00:00")[0];
      let newEnd = "";
      if (contract.data_inicio && contract.data_fim) {
        const start = new Date(contract.data_inicio + "T00:00:00");
        const end = new Date(contract.data_fim + "T00:00:00");
        const diff = end.getTime() - start.getTime();
        const newEndDate = new Date(new Date(newStart + "T00:00:00").getTime() + diff);
        newEnd = newEndDate.toISOString().split("T")[0];
      }

      const { error: err1 } = await supabase
        .from("contracts")
        .update({ status: "expirado" })
        .eq("id", contract.id);
      
      if (err1) throw err1;

      const { error: err2 } = await supabase
        .from("contracts")
        .insert([{
          studio_id: studioId,
          student_id: contract.student_id,
          plan_id: contract.plan_id,
          corpo_texto: contract.corpo_texto,
          data_inicio: newStart,
          data_fim: newEnd || null,
          status: "pendente"
        }]);
      
      if (err2) throw err2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos", studioId] });
      setRenewDialogContract(null);
      toast.success("Contrato renovado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (values: { nome: string; corpo: string; id?: string }) => {
      if (!studioId) return;
      const vars = TEMPLATE_VARIABLES.filter((v) => values.corpo.includes(v.key)).map((v) => v.key);
      const payload = {
        studio_id: studioId,
        nome: values.nome,
        corpo: values.corpo,
        variaveis: vars,
        ativo: true,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from("contract_templates")
        .upsert(values.id ? { ...payload, id: values.id } : payload);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates", studioId] });
      setTemplateForm({ nome: "", corpo: "" });
      setEditingTemplateId(null);
      setTemplateDialogOpen(false);
      toast.success("Template salvo!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!studioId) return;
      const { error } = await supabase
        .from("contract_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates", studioId] });
      toast.success("Template excluído!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return contratos.filter((c: any) => {
      const matchSearch = !search || c.aluno_nome?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [contratos, search, statusFilter]);

  const expiringContracts = useMemo(() => {
    const now = new Date();
    return contratos.filter((c: any) => {
      if (c.status !== "ativo" || !c.data_fim) return false;
      const end = new Date(c.data_fim + "T00:00:00");
      const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diff <= 30 && diff >= 0;
    });
  }, [contratos]);

  const stats = useMemo(() => ({
    total: contratos.length,
    ativos: contratos.filter((c: any) => c.status === "ativo").length,
    pendentes: contratos.filter((c: any) => c.status === "pendente").length,
    expiring: expiringContracts.length,
  }), [contratos, expiringContracts]);

  const applyTemplate = (template: any) => {
    const selectedAluno = alunos.find((a) => a.id === form.aluno_id);
    const selectedPlano = planos.find((p) => p.id === form.plano_id);
    const filled = fillTemplate(template.corpo, {
      "{nome}": selectedAluno?.nome || "{nome}",
      "{cpf}": selectedAluno?.cpf || "{cpf}",
      "{plano}": selectedPlano?.nome || "{plano}",
      "{valor}": selectedPlano?.valor ? `R$ ${Number(selectedPlano.valor).toFixed(2)}` : "{valor}",
      "{data_inicio}": form.data_inicio ? new Date(form.data_inicio + "T00:00:00").toLocaleDateString("pt-BR") : "{data_inicio}",
      "{data_fim}": form.data_fim ? new Date(form.data_fim + "T00:00:00").toLocaleDateString("pt-BR") : "{data_fim}",
      "{data_hoje}": new Date().toLocaleDateString("pt-BR"),
    });
    setForm({ ...form, corpo_texto: filled });
    toast.success(`Template "${template.nome}" aplicado!`);
  };

  const formatDate = (d: string | null) => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" /> Contratos
            </h1>
            <p className="text-muted-foreground">Gerenciamento completo de contratos e templates</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Dialog open={parqDialogOpen} onOpenChange={setParqDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2"><ClipboardList className="h-4 w-4" /> PAR-Q</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Novo PAR-Q</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Aluno *</Label>
                    <Select value={parqAlunoId} onValueChange={setParqAlunoId}>
                      <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
                      <SelectContent>{alunos.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {parqAlunoId && <ParqForm alunoId={parqAlunoId} onSuccess={() => { setParqDialogOpen(false); setParqAlunoId(""); }} />}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Contrato</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Novo Contrato</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Aluno *</Label>
                      <Select value={form.aluno_id} onValueChange={(v) => setForm({ ...form, aluno_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{alunos.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Plano</Label>
                      <Select value={form.plano_id || ""} onValueChange={(v) => setForm({ ...form, plano_id: v || null })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome} — R$ {Number(p.valor).toFixed(2)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Início</Label>
                      <Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Fim</Label>
                      <Input type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
                    </div>
                  </div>
                  {templates.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs">Aplicar Template</Label>
                      <div className="flex flex-wrap gap-2">
                        {templates.filter((t: any) => t.ativo).map((t: any) => (
                          <Button key={t.id} type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={() => applyTemplate(t)}>
                            <LayoutTemplate className="h-3 w-3" /> {t.nome}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Corpo do Contrato</Label>
                    <Textarea rows={8} value={form.corpo_texto} onChange={(e) => setForm({ ...form, corpo_texto: e.target.value })} placeholder="Termos e condições..." />
                  </div>
                  <Button type="submit" className="w-full" disabled={createMutation.isPending || !form.aluno_id}>
                    {createMutation.isPending ? "Salvando..." : "Criar Contrato"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-primary">{stats.ativos}</p><p className="text-xs text-muted-foreground">Ativos</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats.pendentes}</p><p className="text-xs text-muted-foreground">Pendentes</p></CardContent></Card>
          <Card className={stats.expiring > 0 ? "border-warning/50" : ""}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${stats.expiring > 0 ? "text-warning" : ""}`}>{stats.expiring}</p>
              <p className="text-xs text-muted-foreground">Vencendo em 30d</p>
            </CardContent>
          </Card>
        </div>

        {expiringContracts.length > 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <p className="text-sm font-semibold">Contratos próximos do vencimento</p>
              </div>
              <div className="space-y-2">
                {expiringContracts.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between text-sm bg-background rounded-md p-2">
                    <div>
                      <p className="font-medium">{c.aluno_nome}</p>
                      <p className="text-xs text-muted-foreground">Vence em {formatDate(c.data_fim)}</p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => setRenewDialogContract(c)}>
                      <RefreshCw className="h-3 w-3" /> Renovar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="contratos">Contratos</TabsTrigger>
            <TabsTrigger value="templates" className="gap-1"><LayoutTemplate className="h-3.5 w-3.5" /> Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="contratos" className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar por aluno..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  {(Object.entries(STATUS_CONFIG) as [StatusContrato, typeof STATUS_CONFIG[StatusContrato]][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum contrato encontrado.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {filtered.map((c: any) => {
                  const cfg = STATUS_CONFIG[c.status as StatusContrato] || STATUS_CONFIG.pendente;
                  return (
                    <Card key={c.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{c.aluno_nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.plano_nome} · {formatDate(c.data_inicio)} → {formatDate(c.data_fim)}
                            </p>
                            {c.assinado_em && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                <CheckCircle2 className="h-3 w-3 inline mr-1 text-primary" />
                                Assinado em {new Date(c.assinado_em).toLocaleDateString("pt-BR")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem onClick={() => setSignatureDialogId(c.id)}>
                                <Eye className="h-4 w-4 mr-2" /> Visualizar / Assinatura
                              </DropdownMenuItem>
                              
                              {c.status === "pendente" && (
                                <>
                                  <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: c.id, status: "ativo" })}>
                                    <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" /> Ativar Manualmente
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => sendWhatsApp(c)}>
                                    <MessageCircle className="h-4 w-4 mr-2 text-emerald-500" /> Enviar p/ WhatsApp
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => sendEmail(c)}>
                                    <Mail className="h-4 w-4 mr-2 text-blue-500" /> Enviar p/ E-mail
                                  </DropdownMenuItem>
                                </>
                              )}

                              {c.status === "cancelado" && (
                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: c.id, status: "pendente" })}>
                                  <RefreshCw className="h-4 w-4 mr-2 text-primary" /> Reativar Contrato
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem onClick={() => setRenewDialogContract(c)}>
                                <RefreshCw className="h-4 w-4 mr-2" /> Renovar Contrato
                              </DropdownMenuItem>

                              {c.status !== "cancelado" && (
                                <DropdownMenuItem className="text-destructive" onClick={() => updateStatusMutation.mutate({ id: c.id, status: "cancelado" })}>
                                  <X className="h-4 w-4 mr-2" /> Cancelar Contrato
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuItem className="text-destructive" onClick={() => {
                                if (confirm("Deseja realmente excluir este contrato?")) {
                                  deleteMutation.mutate(c.id);
                                }
                              }}>
                                <Trash2 className="h-4 w-4 mr-2" /> Excluir Registro
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Modelos reutilizáveis com preenchimento automático de variáveis</p>
              <Dialog open={templateDialogOpen} onOpenChange={(o) => { setTemplateDialogOpen(o); if (!o) { setTemplateForm({ nome: "", corpo: "" }); setEditingTemplateId(null); } }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Novo Template</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingTemplateId ? "Editar" : "Novo"} Template</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); saveTemplateMutation.mutate({ ...templateForm, id: editingTemplateId || undefined }); }} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input value={templateForm.nome} onChange={(e) => setTemplateForm({ ...templateForm, nome: e.target.value })} placeholder="Ex: Contrato Mensal Pilates" />
                    </div>
                    <div className="space-y-2">
                      <Label>Corpo do Template</Label>
                      <Textarea rows={12} value={templateForm.corpo} onChange={(e) => setTemplateForm({ ...templateForm, corpo: e.target.value })} placeholder="Use variáveis como {nome}, {plano}, {valor}..." />
                    </div>
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-xs font-medium mb-2">Variáveis disponíveis:</p>
                      <div className="grid grid-cols-2 gap-1">
                        {TEMPLATE_VARIABLES.map((v) => (
                          <button
                            key={v.key}
                            type="button"
                            className="text-xs text-left px-2 py-1 rounded hover:bg-primary/10 transition-colors"
                            onClick={() => setTemplateForm({ ...templateForm, corpo: templateForm.corpo + v.key })}
                          >
                            <code className="text-primary">{v.key}</code> — {v.desc}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={saveTemplateMutation.isPending || !templateForm.nome}>
                      {saveTemplateMutation.isPending ? "Salvando..." : "Salvar Template"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {templates.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <LayoutTemplate className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                Nenhum template criado ainda.
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {templates.map((t: any) => (
                  <Card key={t.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{t.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{t.corpo.substring(0, 100)}...</p>
                        {t.variaveis?.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {t.variaveis.map((v: string) => (
                              <Badge key={v} variant="outline" className="text-[10px] font-mono">{v}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setTemplateForm({ nome: t.nome, corpo: t.corpo });
                            setEditingTemplateId(t.id);
                            setTemplateDialogOpen(true);
                          }}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => { if (confirm("Excluir este template?")) deleteTemplateMutation.mutate(t.id); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Signature viewer */}
        <Dialog open={!!signatureDialogId} onOpenChange={(o) => !o && setSignatureDialogId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Assinatura</DialogTitle></DialogHeader>
            {signatureDialogId && (() => {
              const c = contratos.find((ct: any) => ct.id === signatureDialogId);
              return c?.assinatura_url ? (
                <div className="space-y-2">
                  <img src={c.assinatura_url} alt="Assinatura" className="w-full rounded border" />
                  <p className="text-xs text-muted-foreground">
                    Assinado em {c.assinado_em ? new Date(c.assinado_em).toLocaleString("pt-BR") : "—"}
                  </p>
                </div>
              ) : <p className="text-sm text-muted-foreground">Sem assinatura</p>;
            })()}
          </DialogContent>
        </Dialog>

        {/* Renewal dialog */}
        <Dialog open={!!renewDialogContract} onOpenChange={(o) => !o && setRenewDialogContract(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" /> Renovar Contrato
              </DialogTitle>
              <DialogDescription>
                O contrato atual será marcado como expirado e um novo contrato será criado.
              </DialogDescription>
            </DialogHeader>
            {renewDialogContract && (
              <div className="space-y-3">
                <div className="rounded-md bg-muted p-3 space-y-1">
                  <p className="text-sm font-medium">{renewDialogContract.aluno_nome}</p>
                  <p className="text-xs text-muted-foreground">{renewDialogContract.plano_nome || "Sem plano"}</p>
                  <p className="text-xs text-muted-foreground">
                    Vigência atual: {formatDate(renewDialogContract.data_inicio)} → {formatDate(renewDialogContract.data_fim)}
                  </p>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setRenewDialogContract(null)}>Cancelar</Button>
              <Button onClick={() => renewMutation.mutate(renewDialogContract)} disabled={renewMutation.isPending} className="gap-1">
                <RefreshCw className="h-4 w-4" /> {renewMutation.isPending ? "Renovando..." : "Confirmar Renovação"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
