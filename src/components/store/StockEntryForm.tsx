import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Package, Calculator, Receipt, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export function StockEntryForm({ onSuccess }: { onSuccess: () => void }) {
  const { studioId } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [header, setHeader] = useState({
    fornecedor: "",
    numero_nf: "",
    data_entrada: new Date().toISOString().split("T")[0],
    observacoes: ""
  });

  const [items, setItems] = useState<any[]>([
    { product_id: "", quantidade: 1, preco_custo: 0, lote: "", data_vencimento: "" }
  ]);

  const { data: produtos = [] } = useQuery({
    queryKey: ["all-products", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, nome, tipo, estoque, lote, data_vencimento")
        .eq("studio_id", studioId)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const addItem = () => {
    setItems([...items, { product_id: "", quantidade: 1, preco_custo: 0, lote: "", data_vencimento: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const totalValue = items.reduce((acc, item) => acc + (item.quantidade * item.preco_custo), 0);

  const handleSubmit = async () => {
    if (!studioId) return;
    if (!header.fornecedor || items.some(i => !i.product_id || i.quantidade <= 0)) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      // 1. Criar Nota de Entrada
      const { data: entry, error: entryErr } = await supabase
        .from("stock_entries")
        .insert([{
          ...header,
          studio_id: studioId,
          valor_total: totalValue
        }])
        .select()
        .single();
      
      if (entryErr) throw entryErr;

      for (const item of items) {
        const prod = produtos.find(p => p.id === item.product_id);
        let lotId = null;

        // 2. Se tiver lote, gerenciar product_lots
        if (item.lote && item.data_vencimento) {
          // Tentar encontrar lote existente para o produto
          const { data: existingLot } = await supabase
            .from("product_lots")
            .select("id, qtd_atual")
            .eq("product_id", item.product_id)
            .eq("lote", item.lote)
            .single();

          if (existingLot) {
            lotId = existingLot.id;
            await supabase
              .from("product_lots")
              .update({ 
                qtd_atual: Number(existingLot.qtd_atual) + Number(item.quantidade),
                data_vencimento: item.data_vencimento // Garantir que a validade é a informada na NF
              })
              .eq("id", lotId);
          } else {
            const { data: newLot, error: lotErr } = await supabase
              .from("product_lots")
              .insert([{
                studio_id: studioId,
                product_id: item.product_id,
                lote: item.lote,
                data_vencimento: item.data_vencimento,
                qtd_atual: item.quantidade
              }])
              .select()
              .single();
            if (lotErr) throw lotErr;
            lotId = newLot.id;
          }
        }

        // 3. Criar Stock Entry Item
        await supabase
          .from("stock_entry_items")
          .insert([{
            entry_id: entry.id,
            studio_id: studioId,
            product_id: item.product_id,
            lot_id: lotId,
            quantidade: item.quantidade,
            preco_custo: item.preco_custo,
            lote: item.lote || null,
            data_vencimento: item.data_vencimento || null
          }]);

        // 4. Atualizar Estoque do Produto e campos de custo/lote
        await supabase
          .from("products")
          .update({
             estoque: Number(prod.estoque || 0) + Number(item.quantidade),
             preco_custo: item.preco_custo,
             lote: item.lote || prod.lote,
             data_vencimento: item.data_vencimento || prod.data_vencimento,
             updated_at: new Date().toISOString()
          })
          .eq("id", item.product_id);

        // 5. Log de Estoque
        await supabase
          .from("stock_logs")
          .insert([{
            studio_id: studioId,
            product_id: item.product_id,
            tipo: "entrada",
            quantidade: item.quantidade,
            motivo: `NF Entrada #${header.numero_nf || entry.id.slice(0,8)}`
          }]);
      }

      toast.success("Nota de entrada registrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["produtos", studioId] });
      queryClient.invalidateQueries({ queryKey: ["report-products", studioId] });
      queryClient.invalidateQueries({ queryKey: ["report-lots", studioId] });
      onSuccess();
    } catch (error: any) {
      toast.error("Erro ao processar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card className="border-none shadow-md bg-slate-50/50">
        <CardContent className="p-6">
           <div className="flex items-center gap-2 mb-6">
              <Receipt className="h-5 w-5 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Dados da Nota / Entrada</h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fornecedor *</Label>
                 <Input value={header.fornecedor} onChange={e => setHeader({...header, fornecedor: e.target.value})} className="h-10 rounded-xl bg-white border-slate-100 font-medium" placeholder="Nome da empresa/distribuidor" />
              </div>
              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nº da Nota</Label>
                 <Input value={header.numero_nf} onChange={e => setHeader({...header, numero_nf: e.target.value})} className="h-10 rounded-xl bg-white border-slate-100 font-medium" placeholder="000.000.000" />
              </div>
              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data de Entrada</Label>
                 <Input type="date" value={header.data_entrada} onChange={e => setHeader({...header, data_entrada: e.target.value})} className="h-10 rounded-xl bg-white border-slate-100 font-medium" />
              </div>
              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor Total</Label>
                 <div className="h-10 rounded-xl bg-slate-200/50 flex items-center px-4 font-black text-slate-700">
                    R$ {totalValue.toFixed(2)}
                 </div>
              </div>
           </div>
        </CardContent>
      </Card>

      {/* Items List */}
      <div className="space-y-3">
         <div className="flex items-center justify-between px-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Itens da Entrada</h4>
            <Button variant="ghost" size="sm" onClick={addItem} className="h-7 rounded-lg text-primary hover:bg-primary/5 font-black uppercase tracking-tight gap-1.5">
               <Plus className="h-3.5 w-3.5" /> Adicionar Item
            </Button>
         </div>

         {items.map((item, idx) => {
           const selectedProd = produtos.find(p => p.id === item.product_id);
           const isAlimento = selectedProd?.tipo === "alimento";

           return (
             <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                   <div className="md:col-span-3 space-y-1.5">
                      <Label className="text-[9px] font-black uppercase text-slate-400">Produto</Label>
                      <Select value={item.product_id} onValueChange={v => updateItem(idx, "product_id", v)}>
                         <SelectTrigger className="h-9 rounded-lg bg-slate-50 border-none font-bold text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                         <SelectContent>{produtos.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                      </Select>
                   </div>
                   <div className="md:col-span-1 space-y-1.5">
                      <Label className="text-[9px] font-black uppercase text-slate-400">Qtd</Label>
                      <Input type="number" value={item.quantidade} onChange={e => updateItem(idx, "quantidade", Number(e.target.value))} className="h-9 rounded-lg bg-slate-50 border-none text-center font-bold" />
                   </div>
                   <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-[9px] font-black uppercase text-slate-400">Custo Unit.</Label>
                      <Input type="number" step="0.01" value={item.preco_custo} onChange={e => updateItem(idx, "preco_custo", Number(e.target.value))} className="h-9 rounded-lg bg-slate-50 border-none font-bold" />
                   </div>
                   <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-[9px] font-black uppercase text-slate-400">Lote {isAlimento && "*"}</Label>
                      <Input value={item.lote} onChange={e => updateItem(idx, "lote", e.target.value)} className="h-9 rounded-lg bg-slate-50 border-none font-bold placeholder:text-slate-300" placeholder="Lote..." required={isAlimento} />
                   </div>
                   <div className="md:col-span-3 space-y-1.5">
                      <Label className="text-[9px] font-black uppercase text-slate-400">Validade {isAlimento && "*"}</Label>
                      <Input type="date" value={item.data_vencimento} onChange={e => updateItem(idx, "data_vencimento", e.target.value)} className="h-9 rounded-lg bg-slate-50 border-none font-bold" required={isAlimento} />
                   </div>
                   <div className="md:col-span-1 flex justify-center pb-1">
                      <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} disabled={items.length === 1} className="h-8 w-8 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-full">
                         <Trash2 className="h-4 w-4" />
                      </Button>
                   </div>
                </CardContent>
             </Card>
           );
         })}
      </div>

      <div className="flex justify-end pt-4">
         <Button
           size="lg"
           onClick={handleSubmit}
           className="h-12 px-10 rounded-2xl gap-3 font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
           disabled={loading}
         >
           {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
           Processar Entrada em Estoque
         </Button>
      </div>
    </div>
  );
}
