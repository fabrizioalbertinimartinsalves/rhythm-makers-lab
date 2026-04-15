import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, RefreshCw, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export function InventoryForm({ onSuccess }: { onSuccess: () => void }) {
  const { studioId } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["inventory-products", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, nome, estoque, categoria, preco_custo")
        .eq("studio_id", studioId)
        .order("nome");
      if (error) throw error;
      return (data || []) as any[];
    }
  });

  // Replaces the deprecated onSuccess from React Query v5
  useEffect(() => {
    if (produtos.length > 0 && Object.keys(counts).length === 0) {
      const initialCounts: Record<string, number> = {};
      produtos.forEach(p => initialCounts[p.id] = p.estoque || 0);
      setCounts(initialCounts);
    }
  }, [produtos]);

  const handleCountChange = (id: string, val: number) => {
    setCounts(prev => ({ ...prev, [id]: val }));
  };

  const hasChanges = produtos.some(p => counts[p.id] !== (p.estoque || 0));

  const applyInventory = async () => {
    if (!studioId) return;
    setLoading(true);
    try {
      for (const p of produtos) {
        const counted = counts[p.id];
        const current = p.estoque || 0;
        const diff = counted - current;

        if (diff !== 0) {
          // 1. Update Product Stockholm
          await supabase
            .from("products")
            .update({ estoque: counted, updated_at: new Date().toISOString() })
            .eq("id", p.id);

          // 2. Log adjustment
          await supabase
            .from("stock_logs")
            .insert([{
              studio_id: studioId,
              product_id: p.id,
              tipo: diff > 0 ? "entrada" : "saida",
              quantidade: Math.abs(diff),
              motivo: `Ajuste de Inventário (Conciliação)`
            }]);
        }
      }

      toast.success("Inventário aplicado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["produtos", studioId] });
      onSuccess();
    } catch (error: any) {
      toast.error("Erro ao aplicar inventário: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Conciliação de Estoque</h3>
            <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-tight">Conte os itens fisicamente e registre abaixo para ajustar o sistema</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {produtos.map((p: any) => {
          const current = p.estoque || 0;
          const counted = counts[p.id] ?? current;
          const diff = counted - current;

          return (
            <Card key={p.id} className={`border-none shadow-sm transition-all hover:shadow-md ${diff !== 0 ? 'bg-amber-50/50 ring-1 ring-amber-200' : 'bg-white'}`}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate text-slate-700">{p.nome}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{p.categoria || "Geral"}</p>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="text-[10px] font-black uppercase text-slate-400">Sistema:</span>
                     <span className="text-xs font-bold text-slate-600">{current}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                   <div className="text-right">
                      <Label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Contado</Label>
                      <Input
                        type="number"
                        value={counted}
                        onChange={e => handleCountChange(p.id, Number(e.target.value))}
                        className="h-10 w-20 rounded-xl bg-slate-50 border-none text-center font-black text-slate-800"
                      />
                   </div>
                   
                   {diff !== 0 && (
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs shadow-sm ${diff > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                         {diff > 0 ? `+${diff}` : diff}
                      </div>
                   )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {produtos.length === 0 && (
         <div className="py-20 text-center space-y-4">
            <Package className="h-12 w-12 text-slate-100 mx-auto" />
            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Nenhum produto cadastrado</p>
         </div>
      )}

      {hasChanges && (
         <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5">
            <Button
              size="lg"
              onClick={applyInventory}
              className="h-14 px-10 rounded-full gap-3 font-black uppercase tracking-widest shadow-2xl shadow-primary/40 bg-slate-900 border-none transition-all hover:scale-105 active:scale-95"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <RefreshCw className="h-5 w-5 text-primary" />}
              Aplicar Ajustes do Inventário
            </Button>
         </div>
      )}
    </div>
  );
}
