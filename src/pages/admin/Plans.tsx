import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, BookOpen, Filter } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";
import { toast } from "sonner";

type TipoPlano = "recorrente" | "pacote" | "avulso";

export default function Plans() {
  const queryClient = useQueryClient();
  const { studioId } = useAuth() as any;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [filterModalidade, setFilterModalidade] = useState<string>("all");
  const [form, setForm] = useState({ nome: "", descricao: "", tipo: "recorrente" as TipoPlano, valor: 0, modalidade_id: null as string | null, quantidade_aulas: null as number | null, validade_dias: null as number | null });

  const resetForm = () => {
    setForm({ nome: "", descricao: "", tipo: "recorrente", valor: 0, modalidade_id: null, quantidade_aulas: null, validade_dias: null });
    setEditing(null);
  };

  const { data: planos = [], isLoading } = useQuery({
    queryKey: ["admin", "plans", "list", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      if (!studioId) return [];
      const { data } = await supabase.from("plans").select("*, modalities(id, nome, emoji, cor)").eq("studio_id", studioId).order("nome");
      return (data || []).map(p => ({ ...p, modalidades: p.modalities }));
    },
  });

  const { data: modalidades = [] } = useQuery({
    queryKey: ["admin", "modalities", "list-actives", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      if (!studioId) return [];
      const { data } = await supabase.from("modalities").select("id, nome, emoji, cor").eq("studio_id", studioId).eq("ativa", true).order("nome");
      return data || [];
    },
  });

  const { data: turmas = [] } = useQuery({
    queryKey: ["admin", "classes", "regulares-for-plans", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      if (!studioId) return [];
      const { data } = await supabase.from("classes").select("id, nome, modality_id").eq("studio_id", studioId).eq("ativa", true);
      return (data || []).map(t => ({ ...t, modalidade_id: t.modality_id }));
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!studioId) return;
      const payload = { studio_id: studioId, nome: values.nome, descricao: values.descricao, tipo: values.tipo, valor: values.valor, modalidade_id: values.modalidade_id || null };
      if (values.id) {
        const { error } = await supabase.from("plans").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("plans").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "plans"] }); setDialogOpen(false); resetForm(); toast.success(editing ? "Plano atualizado!" : "Plano criado!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const { requestDelete, ConfirmDialog } = useConfirmDelete({
    childChecks: [
      { table: "mensalidades", column: "plano_id", label: "mensalidade(s)" },
      { table: "contratos", column: "plano_id", label: "contrato(s)" },
    ],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!studioId) return;
      const { error } = await supabase.from("plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "plans"] }); toast.success("Plano removido!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({ nome: p.nome, descricao: p.descricao || "", tipo: p.tipo, valor: Number(p.valor), modalidade_id: p.modalidade_id, quantidade_aulas: p.quantidade_aulas, validade_dias: p.validade_dias });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertMutation.mutate(editing ? { ...form, id: editing.id } : form);
  };

  const tipoLabels: Record<TipoPlano, string> = { recorrente: "Recorrente", pacote: "Pacote", avulso: "Avulso" };

  const getTurmasForModalidade = (modalidadeId: string | null) => {
    if (!modalidadeId) return [];
    return turmas.filter((t) => t.modalidade_id === modalidadeId);
  };

  const filtered = planos.filter((p: any) => {
    if (filterModalidade === "all") return true;
    if (filterModalidade === "geral") return !p.modalidade_id;
    return p.modalidade_id === filterModalidade;
  });

  const planosWithMod = filtered.map(p => {
    const mod = modalidades.find((m: any) => m.id === p.modalidade_id);
    return { ...p, modalidades: mod };
  });

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Planos</h1>
            <p className="text-muted-foreground">Cada plano é vinculado a uma modalidade · Usado na matrícula</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Plano</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Editar Plano" : "Novo Plano"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required placeholder="Ex: Pilates 3x/semana" />
                </div>
                <div className="space-y-2">
                  <Label>Modalidade *</Label>
                  <Select value={form.modalidade_id || ""} onValueChange={(v) => setForm({ ...form, modalidade_id: v || null })}>
                    <SelectTrigger><SelectValue placeholder="Selecione a modalidade" /></SelectTrigger>
                    <SelectContent>
                      {modalidades.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.emoji} {m.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    O plano ficará disponível apenas para turmas desta modalidade na matrícula.
                    {form.modalidade_id && (() => {
                      const linkedTurmas = getTurmasForModalidade(form.modalidade_id);
                      return linkedTurmas.length > 0
                        ? ` (${linkedTurmas.length} turma${linkedTurmas.length > 1 ? "s" : ""} vinculada${linkedTurmas.length > 1 ? "s" : ""})`
                        : " (nenhuma turma vinculada ainda)";
                    })()}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as TipoPlano })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recorrente">Recorrente</SelectItem>
                        <SelectItem value="pacote">Pacote</SelectItem>
                        <SelectItem value="avulso">Avulso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor (R$) *</Label>
                    <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: parseFloat(e.target.value) || 0 })} required />
                  </div>
                </div>
                {form.tipo !== "recorrente" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Qtd. de Aulas</Label>
                      <Input type="number" value={form.quantidade_aulas || ""} onChange={(e) => setForm({ ...form, quantidade_aulas: parseInt(e.target.value) || null })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Validade (dias)</Label>
                      <Input type="number" value={form.validade_dias || ""} onChange={(e) => setForm({ ...form, validade_dias: parseInt(e.target.value) || null })} />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                </div>
                <Button type="submit" className="w-full" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter by modalidade */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Button size="sm" variant={filterModalidade === "all" ? "default" : "outline"} onClick={() => setFilterModalidade("all")}>Todos</Button>
          {modalidades.map((m) => (
            <Button key={m.id} size="sm" variant={filterModalidade === m.id ? "default" : "outline"} onClick={() => setFilterModalidade(m.id)}>
              {m.emoji} {m.nome}
            </Button>
          ))}
          <Button size="sm" variant={filterModalidade === "geral" ? "default" : "outline"} onClick={() => setFilterModalidade("geral")}>Sem modalidade</Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            {planos.length === 0 ? "Nenhum plano cadastrado. Cadastre modalidades primeiro." : "Nenhum plano nesta modalidade."}
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {planosWithMod.map((p: any) => {
              const linkedTurmas = getTurmasForModalidade(p.modalidade_id);
              return (
                <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer group relative overflow-hidden">
                  {p.modalidades?.cor && <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: p.modalidades.cor }} />}
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">{tipoLabels[p.tipo as TipoPlano]}</Badge>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => requestDelete(p.id, p.nome, () => deleteMutation.mutate(p.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    <CardTitle className="text-lg mt-2">{p.nome}</CardTitle>
                    <CardDescription className="text-xl font-bold text-foreground">
                      R$ {Number(p.valor).toFixed(2)}{p.tipo === "recorrente" ? "/mês" : p.tipo === "avulso" ? "/aula" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {p.modalidades ? (
                      <Badge variant="outline" className="gap-1">
                        {p.modalidades.emoji} {p.modalidades.nome}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Sem modalidade</Badge>
                    )}
                    {p.quantidade_aulas && <p className="text-xs text-muted-foreground">{p.quantidade_aulas} aulas</p>}
                    {p.validade_dias && <p className="text-xs text-muted-foreground">Validade: {p.validade_dias} dias</p>}
                    {linkedTurmas.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t border-border">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Turmas: {linkedTurmas.map((t) => t.nome).join(", ")}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <ConfirmDialog />
    </AdminLayout>
  );
}
