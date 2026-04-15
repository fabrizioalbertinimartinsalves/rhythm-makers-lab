import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Trash2, Edit, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export function CategoriesManager() {
  const { studioId } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", cor: "#6366f1" });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["product-categories", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("studio_id", studioId)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (id?: string) => {
      if (!studioId) return;
      if (id) {
        const { error } = await supabase
          .from("product_categories")
          .update(form)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("product_categories")
          .insert([{ ...form, studio_id: studioId }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories", studioId] });
      setIsEditing(null);
      setForm({ nome: "", cor: "#6366f1" });
      toast.success("Categoria salva!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories", studioId] });
      toast.success("Categoria removida!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-md bg-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-2">
                <div className="h-1 bg-primary w-4 rounded-full" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800">
                   Nova Categoria
                </h3>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Alimentos, Acessórios..."
                className="h-10 rounded-xl bg-slate-50 border-none font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cor</Label>
              <div className="flex gap-2 items-center">
                 <Input
                   type="color"
                   value={form.cor}
                   onChange={(e) => setForm({ ...form, cor: e.target.value })}
                   className="h-10 w-20 p-1 rounded-xl bg-slate-50 border-none cursor-pointer"
                 />
                 <span className="text-xs font-mono text-slate-400 uppercase">{form.cor}</span>
              </div>
            </div>
            <Button
              onClick={() => upsertMutation.mutate(isEditing || undefined)}
              className="h-10 rounded-xl gap-2 font-bold shadow-lg shadow-primary/20"
              disabled={upsertMutation.isPending || !form.nome}
            >
              {isEditing ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isEditing ? "Salvar Alteração" : "Adicionar Categoria"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {categories.map((cat: any) => (
          <div
            key={cat.id}
            className="group relative bg-white rounded-2xl border border-slate-100 p-4 transition-all hover:shadow-md hover:border-primary/20"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border border-slate-50"
                  style={{ backgroundColor: `${cat.cor}10`, color: cat.cor }}
                >
                  <Package className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate text-slate-800">{cat.nome}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Categoria</p>
                </div>
              </div>
              
              <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg"
                  onClick={() => {
                    setIsEditing(cat.id);
                    setForm({ nome: cat.nome, cor: cat.cor || "#6366f1" });
                  }}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-destructive hover:bg-destructive/5 rounded-lg"
                  onClick={() => deleteMutation.mutate(cat.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div
              className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
              style={{ backgroundColor: cat.cor }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
