/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Code, Pencil, Plus, Save, Search, Trash2, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface SystemLabel {
  id: string;
  studio_id: string | null;
  key: string;
  value: string;
  category: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export default function DevPanel() {
  const { studioId } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ key: "", value: "", category: "geral", description: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ key: "", value: "", category: "geral", description: "" });

  const { data: labels = [], isLoading } = useQuery({
    queryKey: ["system-labels-sb", studioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_labels")
        .select("*")
        .or(`studio_id.is.null,studio_id.eq.${studioId || '00000000-0000-0000-0000-000000000000'}`)
        .order("category")
        .order("key");
      
      if (error) throw error;
      return data as SystemLabel[];
    },
  });

  const upsertLabel = useMutation({
    mutationFn: async (values: typeof form) => {
      const { error } = await supabase
        .from("system_labels")
        .upsert({
          ...values,
          studio_id: studioId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'studio_id,key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-labels-sb"] });
      setDialogOpen(false);
      setForm({ key: "", value: "", category: "geral", description: "" });
      toast.success("Label salvo!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateLabel = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: typeof editForm }) => {
      const { error } = await supabase
        .from("system_labels")
        .update({
          ...values,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-labels-sb"] });
      setEditingId(null);
      toast.success("Label atualizado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteLabel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("system_labels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-labels-sb"] });
      toast.success("Label removido!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startEditing = (label: SystemLabel) => {
    setEditingId(label.id);
    setEditForm({ key: label.key, value: label.value, category: label.category, description: label.description || "" });
  };

  const filtered = labels.filter((l) =>
    l.key.toLowerCase().includes(search.toLowerCase()) ||
    l.value.toLowerCase().includes(search.toLowerCase()) ||
    l.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(labels.map((l) => l.category))];

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Code className="h-6 w-6 text-primary" /> Painel do Desenvolvedor
            </h1>
            <p className="text-muted-foreground">Edite textos e labels do sistema</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Label</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Label</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); upsertLabel.mutate(form); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Chave (ex: dashboard.title)</Label>
                  <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="modulo.chave" required />
                </div>
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="Texto exibido" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="geral">Geral</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="instructor">Instrutor</SelectItem>
                        <SelectItem value="student">Aluno</SelectItem>
                        <SelectItem value="financial">Financeiro</SelectItem>
                        <SelectItem value="clinical">Clínico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Onde é usado" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={upsertLabel.isPending}>
                  {upsertLabel.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />} Salvar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar label..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary mb-2" /><p className="text-sm text-muted-foreground">Carregando labels...</p></div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum label cadastrado. Clique em "+ Novo Label" para começar.
            </CardContent>
          </Card>
        ) : (
          categories.map((cat) => {
            const catLabels = filtered.filter((l) => l.category === cat);
            if (catLabels.length === 0) return null;
            return (
              <Card key={cat}>
                <CardHeader className="pb-3 px-4">
                  <CardTitle className="text-base capitalize">{cat}</CardTitle>
                  <CardDescription>{catLabels.length} labels</CardDescription>
                </CardHeader>
                <CardContent className="px-4">
                  <div className="space-y-2">
                    {catLabels.map((l) => (
                      <div key={l.id} className="rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                        {editingId === l.id ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Chave</Label>
                                <Input value={editForm.key} onChange={(e) => setEditForm({ ...editForm, key: e.target.value })} className="h-8 text-sm font-mono" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Categoria</Label>
                                <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="geral">Geral</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="instructor">Instrutor</SelectItem>
                                    <SelectItem value="student">Aluno</SelectItem>
                                    <SelectItem value="financial">Financeiro</SelectItem>
                                    <SelectItem value="clinical">Clínico</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Valor</Label>
                              <Input value={editForm.value} onChange={(e) => setEditForm({ ...editForm, value: e.target.value })} className="h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Descrição</Label>
                              <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="h-8 text-sm" />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                                <X className="h-3 w-3 mr-1" /> Cancelar
                              </Button>
                              <Button size="sm" onClick={() => updateLabel.mutate({ id: l.id, values: editForm })} disabled={updateLabel.isPending}>
                                {updateLabel.isPending ? <Loader2 className="animate-spin h-3 w-3 mr-1" /> : <Save className="h-3 w-3 mr-1" />} Salvar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{l.key}</code>
                                {l.description && <span className="text-[10px] text-muted-foreground">{l.description}</span>}
                                {l.studio_id && <span className="text-[10px] bg-teal-100 text-teal-700 px-1 rounded">Personalizado</span>}
                              </div>
                              <p className="text-sm mt-1 truncate">{l.value}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => startEditing(l)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteLabel.mutate(l.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </AdminLayout>
  );
}
