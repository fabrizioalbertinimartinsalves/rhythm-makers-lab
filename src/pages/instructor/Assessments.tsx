import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import InstructorLayout from "@/components/layouts/InstructorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ClipboardList, Loader2, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Assessments() {
  const { studioId } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ student_id: "", tipo: "postura", observacoes: "" });

  const { data: avaliacoes = [], isLoading } = useQuery<any[]>({
    queryKey: ["avaliacoes-sb", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avaliacoes")
        .select(`
          *,
          students ( nome )
        `)
        .eq("studio_id", studioId)
        .order("data", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["students-select-sb", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, nome")
        .eq("studio_id", studioId)
        .eq("status", "ativo")
        .order("nome");
      
      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      if (!studioId) return;
      
      const { error } = await supabase
        .from("avaliacoes")
        .insert({
          studio_id: studioId,
          student_id: values.student_id,
          tipo: values.tipo,
          observacoes: values.observacoes,
          data: new Date().toISOString().split("T")[0],
          conteudo: {},
          status: "pendente"
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avaliacoes-sb"] });
      setDialogOpen(false);
      setForm({ student_id: "", tipo: "postura", observacoes: "" });
      toast.success("Avaliação criada!");
    },
    onError: (e: any) => toast.error("Erro ao criar: " + e.message),
  });

  const completeAssessment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("avaliacoes")
        .update({ status: "completa", updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avaliacoes-sb"] });
      toast.success("Avaliação concluída!");
    },
    onError: (e: any) => toast.error("Erro ao atualizar: " + e.message),
  });

  const filtered = avaliacoes.filter((a: any) => 
    !search || a.students?.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <InstructorLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> Avaliações
            </h1>
            <p className="text-sm text-muted-foreground">Protocolos de avaliação física</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Nova</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Nova Avaliação</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Aluno *</Label>
                  <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um aluno" /></SelectTrigger>
                    <SelectContent>
                      {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="postura">Postura</SelectItem>
                      <SelectItem value="flexibilidade">Flexibilidade</SelectItem>
                      <SelectItem value="bioimpedancia">Bioimpedância</SelectItem>
                      <SelectItem value="forca">Força</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea 
                    placeholder="Notas iniciais..."
                    value={form.observacoes} 
                    onChange={(e) => setForm({ ...form, observacoes: e.target.value })} 
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={createMutation.isPending || !form.student_id}
                >
                  {createMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</> : "Criar Avaliação"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por aluno..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma avaliação encontrada.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((a: any) => (
              <Card key={a.id} className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{a.students?.nome}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">
                      {a.tipo} · {new Date(a.data + "T00:00:00").toLocaleDateString("pt-BR")}
                    </p>
                    {a.observacoes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.observacoes}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <Badge variant={a.status === "completa" ? "default" : "secondary"} className="text-[10px capitalize]">
                      {a.status}
                    </Badge>
                    {a.status === "pendente" && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={() => completeAssessment.mutate(a.id)}
                        disabled={completeAssessment.isPending}
                      >
                        {completeAssessment.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Concluir"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </InstructorLayout>
  );
}
