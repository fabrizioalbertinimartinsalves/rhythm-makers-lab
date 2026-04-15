import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Search, Users, ArrowRight, UserPlus, CalendarCheck, Eye, CheckCircle2,
  XCircle, MoreHorizontal, Edit, Trash2, ExternalLink, Copy, Loader2,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";
import { useAuth } from "@/hooks/useAuth";

type StatusLead = "novo" | "aula_marcada" | "compareceu" | "convertido" | "perdido";

type Lead = {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  modalidade_interesse?: string;
  status: StatusLead;
  data_aula_experimental?: string;
  observacoes?: string;
  origem: string;
  created_at: string;
  studio_id: string;
};

const FUNNEL_STAGES: { status: StatusLead; label: string; icon: React.ElementType; color: string }[] = [
  { status: "novo", label: "Novo Lead", icon: UserPlus, color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  { status: "aula_marcada", label: "Aula Marcada", icon: CalendarCheck, color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  { status: "compareceu", label: "Compareceu", icon: Eye, color: "bg-purple-500/10 text-purple-600 border-purple-200" },
  { status: "convertido", label: "Convertido", icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
];

export default function CRM() {
  const { studioId } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [viewMode, setViewMode] = useState<"funnel" | "list">("funnel");
  const [form, setForm] = useState({
    nome: "", telefone: "", email: "", modalidade_interesse: "",
    status: "novo" as StatusLead, data_aula_experimental: "", observacoes: "", origem: "manual",
  });

  const resetForm = () => {
    setForm({ nome: "", telefone: "", email: "", modalidade_interesse: "", status: "novo", data_aula_experimental: "", observacoes: "", origem: "manual" });
    setEditing(null);
  };

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["leads", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("studio_id", studioId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Lead[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!studioId) return;
      if (values.id) {
        const { error } = await supabase
          .from("leads")
          .update(values)
          .eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("leads")
          .insert([{ ...values, studio_id: studioId }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", studioId] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-stats", studioId] });
      setDialogOpen(false);
      resetForm();
      toast.success(editing ? "Lead atualizado!" : "Lead adicionado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusLead }) => {
      if (!studioId) return;
      const { error } = await supabase
        .from("leads")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", studioId] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-stats", studioId] });
      toast.success("Status atualizado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { requestDelete, ConfirmDialog } = useConfirmDelete();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!studioId) return;
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", studioId] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-stats", studioId] });
      toast.success("Lead removido!");
    },
    onError: (e: any) => toast.error(e.message),
  });


  const openEdit = (lead: Lead) => {
    setEditing(lead);
    setForm({
      nome: lead.nome, telefone: lead.telefone || "", email: lead.email || "",
      modalidade_interesse: lead.modalidade_interesse || "", status: lead.status,
      data_aula_experimental: lead.data_aula_experimental || "", observacoes: lead.observacoes || "",
      origem: lead.origem || "manual",
    });
    setDialogOpen(true);
  };

  const filtered = leads.filter((l: Lead) =>
    l.nome?.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase()) ||
    l.telefone?.includes(search)
  );

  const getNextStatus = (current: StatusLead): StatusLead | null => {
    const order: StatusLead[] = ["novo", "aula_marcada", "compareceu", "convertido"];
    const idx = order.indexOf(current);
    return idx < order.length - 1 ? order[idx + 1] : null;
  };

  const publicFormUrl = `${window.location.origin}/aula-experimental`;

  const copyFormLink = () => {
    navigator.clipboard.writeText(publicFormUrl);
    toast.success("Link copiado!");
  };

  // Funnel counts
  const funnelCounts = FUNNEL_STAGES.map((stage) => ({
    ...stage,
    count: filtered.filter((l: Lead) => l.status === stage.status).length,
    leads: filtered.filter((l: Lead) => l.status === stage.status),
  }));

  const perdidos = filtered.filter((l: Lead) => l.status === "perdido");

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /> CRM — Funil de Vendas
            </h1>
            <p className="text-muted-foreground">{leads.length} leads no sistema</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={copyFormLink}>
              <Copy className="h-3.5 w-3.5" /> Copiar Link
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Lead</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editing ? "Editar Lead" : "Novo Lead"}</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); upsertMutation.mutate(editing ? { ...form, id: editing.id } : form); }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label>Nome *</Label>
                      <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Modalidade de Interesse</Label>
                      <Input value={form.modalidade_interesse} onChange={(e) => setForm({ ...form, modalidade_interesse: e.target.value })} placeholder="Ex: Pilates" />
                    </div>
                    <div className="space-y-2">
                      <Label>Data Aula Experimental</Label>
                      <Input type="date" value={form.data_aula_experimental} onChange={(e) => setForm({ ...form, data_aula_experimental: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as StatusLead })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="novo">Novo Lead</SelectItem>
                          <SelectItem value="aula_marcada">Aula Marcada</SelectItem>
                          <SelectItem value="compareceu">Compareceu</SelectItem>
                          <SelectItem value="convertido">Convertido</SelectItem>
                          <SelectItem value="perdido">Perdido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Origem</Label>
                      <Select value={form.origem} onValueChange={(v) => setForm({ ...form, origem: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="formulario">Formulário</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="indicacao">Indicação</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Observações</Label>
                      <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={upsertMutation.isPending}>
                    {upsertMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Public form link */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between p-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-primary" />
              <span className="text-sm">Formulário público de aula experimental:</span>
              <code className="text-xs bg-background px-2 py-1 rounded border">/aula-experimental</code>
            </div>
            <Button variant="outline" size="sm" onClick={copyFormLink}>Copiar link</Button>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar lead..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* Funnel Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {funnelCounts.map((stage) => (
                <Card key={stage.status} className={`border ${stage.color.split(" ")[2] || "border-border"}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${stage.color.split(" ").slice(0, 2).join(" ")}`}>
                      <stage.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stage.count}</p>
                      <p className="text-xs text-muted-foreground">{stage.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Funnel Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {funnelCounts.map((stage) => (
                <div key={stage.status} className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <stage.icon className={`h-4 w-4 ${stage.color.split(" ")[1]}`} />
                    <h3 className="text-sm font-semibold">{stage.label}</h3>
                    <Badge variant="secondary" className="text-[10px] ml-auto">{stage.count}</Badge>
                  </div>
                  {stage.leads.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-lg">Nenhum lead</p>
                  ) : (
                    stage.leads.map((lead: Lead) => {
                      const nextStatus = getNextStatus(lead.status);
                      return (
                        <Card key={lead.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium truncate">{lead.nome}</p>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEdit(lead)}><Edit className="h-3.5 w-3.5 mr-2" /> Editar</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: lead.id, status: "perdido" })}><XCircle className="h-3.5 w-3.5 mr-2" /> Marcar Perdido</DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => requestDelete(lead.id, lead.nome, () => deleteMutation.mutate(lead.id))}><Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            {lead.telefone && <p className="text-xs text-muted-foreground">{lead.telefone}</p>}
                            {lead.modalidade_interesse && (
                              <Badge variant="outline" className="text-[10px]">{lead.modalidade_interesse}</Badge>
                            )}
                            {lead.data_aula_experimental && (
                              <p className="text-[10px] text-muted-foreground">Aula: {lead.data_aula_experimental}</p>
                            )}
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-[9px]">{lead.origem}</Badge>
                              <span className="text-[9px] text-muted-foreground ml-auto">
                                {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                            {nextStatus && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs gap-1 mt-1"
                                onClick={() => updateStatusMutation.mutate({ id: lead.id, status: nextStatus })}
                              >
                                <ArrowRight className="h-3 w-3" />
                                {FUNNEL_STAGES.find((s) => s.status === nextStatus)?.label}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              ))}
            </div>

            {/* Perdidos */}
            {perdidos.length > 0 && (
              <Card className="border-destructive/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
                    <XCircle className="h-4 w-4" /> Perdidos ({perdidos.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {perdidos.map((lead: Lead) => (
                      <Badge key={lead.id} variant="outline" className="text-xs gap-1 cursor-pointer" onClick={() => openEdit(lead)}>
                        {lead.nome}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
      <ConfirmDialog />
    </AdminLayout>
  );
}
