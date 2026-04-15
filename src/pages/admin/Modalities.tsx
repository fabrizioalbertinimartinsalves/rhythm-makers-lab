import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Palette, Edit, Trash2, Users, BookOpen, CreditCard } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";
import { toast } from "sonner";

export default function Modalities() {
  const queryClient = useQueryClient();
  const { studioId } = useAuth() as any;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ nome: "", descricao: "", emoji: "🏋️", cor: "#6B9B7A", valor_base: 0, valor_avulso: 0, ativa: true });

  const resetForm = () => {
    setForm({ nome: "", descricao: "", emoji: "🏋️", cor: "#6B9B7A", valor_base: 0, valor_avulso: 0, ativa: true });
    setEditing(null);
  };

  const { data: modalidades = [], isLoading } = useQuery({
    queryKey: ["admin", "modalities", "list", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      if (!studioId) return [];
      const { data, error } = await supabase
        .from("modalities")
        .select("*")
        .eq("studio_id", studioId)
        .order("nome");
      
      if (error) {
        console.error("Erro ao buscar modalidades:", error);
        return [];
      }
      return data || [];
    },
  });

  const { data: turmas = [] } = useQuery({
    queryKey: ["admin", "classes", "all", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      if (!studioId) return [];
      const { data } = await supabase.from("classes").select("id, modality_id, ativa").eq("studio_id", studioId);
      return (data || []).map(t => ({ ...t, modalidade_id: t.modality_id }));
    },
  });

  const { data: planos = [] } = useQuery({
    queryKey: ["admin", "plans", "all", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      if (!studioId) return [];
      const { data } = await supabase.from("plans").select("id, modalidade_id, ativo").eq("studio_id", studioId);
      return data || [];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      if (!studioId) return;
      
      const payload = { 
        studio_id: studioId, 
        nome: values.nome, 
        descricao: values.descricao, 
        emoji: values.emoji, 
        cor: values.cor, 
        valor_base: values.valor_base, 
        valor_avulso: values.valor_avulso,
        ativa: values.ativa 
      };

      if (values.id) {
        const { error } = await supabase.from("modalities").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("modalities").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "modalities"] }); setDialogOpen(false); resetForm(); toast.success(editing ? "Modalidade atualizada!" : "Modalidade criada!"); },
    onError: (e: any) => {
      console.error("Erro no upsert de modalidade:", e);
      toast.error(e.message);
    },
  });

  const { requestDelete, ConfirmDialog } = useConfirmDelete({
    childChecks: [
      { table: "turmas", column: "modalidade_id", label: "turma(s)" },
      { table: "planos", column: "modalidade_id", label: "plano(s)" },
    ],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!studioId) return;
      const { error } = await supabase.from("modalities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "modalities"] }); toast.success("Modalidade removida!"); },
    onError: (e: any) => toast.error(e.message),
  });


  const openEdit = (m: any) => {
    setEditing(m);
    setForm({ 
      nome: m.nome, 
      descricao: m.descricao || "", 
      emoji: m.emoji || "🏋️", 
      cor: m.cor || "#6B9B7A", 
      valor_base: Number(m.valor_base), 
      valor_avulso: Number(m.valor_avulso || 0), 
      ativa: m.ativa 
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertMutation.mutate(editing ? { ...form, id: editing.id } : form);
  };

  const getTurmasCount = (modId: string) => turmas.filter((t) => t.modalidade_id === modId && t.ativa).length;
  const getPlanosCount = (modId: string) => planos.filter((p) => p.modalidade_id === modId && p.ativo).length;

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Palette className="h-6 w-6 text-primary" /> Modalidades
            </h1>
            <p className="text-muted-foreground">Tipos de aula oferecidos · Cada modalidade agrupa turmas e planos</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Modalidade</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Modalidade" : "Nova Modalidade"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Nome *</Label>
                    <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required placeholder="Ex: Pilates Solo" />
                  </div>
                  <div className="space-y-2">
                    <Label>Emoji</Label>
                    <Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} placeholder="🏋️" />
                  </div>
                  <div className="space-y-2">
                    <Label>Cor</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} className="w-12 h-10 p-1 cursor-pointer" />
                      <Input value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Mensalidade (R$)</Label>
                    <Input type="number" step="0.01" value={form.valor_base} onChange={(e) => setForm({ ...form, valor_base: parseFloat(e.target.value) || 0 })} />
                    <p className="text-[10px] text-muted-foreground">Valor da mensalidade/plano</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Aula Avulsa (R$)</Label>
                    <Input type="number" step="0.01" value={form.valor_avulso} onChange={(e) => setForm({ ...form, valor_avulso: parseFloat(e.target.value) || 0 })} />
                    <p className="text-[10px] text-muted-foreground">Cobrado no agendamento público</p>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch checked={form.ativa} onCheckedChange={(v) => setForm({ ...form, ativa: v })} />
                    <Label>Ativa</Label>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Descrição</Label>
                    <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Breve descrição da modalidade" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Relationship explanation */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-3 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="font-semibold text-foreground">Fluxo:</span>
            <span className="flex items-center gap-1"><Palette className="h-3.5 w-3.5" /> Modalidade</span>
            <span>→</span>
            <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> Turmas (horários)</span>
            <span>→</span>
            <span className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" /> Planos (preços)</span>
            <span>→</span>
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Matrícula</span>
          </CardContent>
        </Card>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
        ) : modalidades.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma modalidade cadastrada. Clique em "Nova Modalidade" para começar.</CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modalidades.map((m) => {
              const turmasCount = getTurmasCount(m.id);
              const planosCount = getPlanosCount(m.id);
              return (
                <Card key={m.id} className="hover:shadow-md transition-shadow group relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: m.cor || "#6B9B7A" }} />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{m.emoji}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => requestDelete(m.id, m.nome, () => deleteMutation.mutate(m.id))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-lg">{m.nome}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{m.descricao || "Sem descrição"}</p>
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <div>
                        <span className="text-lg font-bold text-foreground">
                          R$ {Number(m.valor_base).toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">/mês</span>
                      </div>
                      {Number((m as any).valor_avulso) > 0 && (
                        <div className="text-right">
                          <span className="text-sm font-semibold text-primary">
                            R$ {Number((m as any).valor_avulso).toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">/avulsa</span>
                        </div>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.ativa ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {m.ativa ? "Ativa" : "Inativa"}
                    </span>
                    <div className="flex gap-3 pt-1 border-t border-border">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>{turmasCount} turma{turmasCount !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>{planosCount} plano{planosCount !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
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
