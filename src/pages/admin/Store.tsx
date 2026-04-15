import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, Package, Edit, AlertTriangle, 
  RotateCcw, ShoppingCart, Search, Banknote, 
  CheckCircle2, Receipt, BarChart3, Settings2, 
  FileInput, ClipboardCheck, LayoutGrid, ListFilter,
  Wallet, Layers, History, Loader2, Zap
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { usePaymentCheckout } from "@/hooks/usePaymentCheckout";
import { PaymentMethodModal } from "@/components/financial/PaymentMethodModal";
import { differenceInDays, parseISO } from "date-fns";

// Componentes modulares
import { CategoriesManager } from "@/components/store/CategoriesManager";
import { StoreReports } from "@/components/store/StoreReports";
import { StockEntryForm } from "@/components/store/StockEntryForm";
import { InventoryForm } from "@/components/store/InventoryForm";

type CheckoutStep = "produtos" | "revisao" | "pagamento" | "confirmado";
type ProductType = "geral" | "alimento";

// --- Sub-componentes ---

function StatDisplay({ label, value, icon: Icon, color, alert }: any) {
   return (
      <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border ${color} shadow-sm flex items-center gap-3 sm:gap-5 transition-all hover:shadow-md h-20 sm:h-24 ${alert ? 'animate-pulse' : ''}`}>
         <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm border border-current">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
         </div>
         <div>
            <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">{label}</p>
            <p className="text-lg sm:text-2xl font-black tracking-tighter text-slate-800 leading-none">{value}</p>
         </div>
      </div>
   );
}

function TabTrigger({ value, icon: Icon, label }: any) {
   return (
      <TabsTrigger value={value} className="rounded-xl sm:rounded-2xl px-3 sm:px-5 py-2 sm:py-2.5 font-black uppercase text-[8px] sm:text-[10px] tracking-widest gap-1.5 sm:gap-2.5 data-[state=active]:bg-slate-900 data-[state=active]:text-white whitespace-nowrap">
         <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {label}
      </TabsTrigger>
   );
}

function ProductCard({ product, onEdit }: any) {
   const isLow = (product.estoque || 0) <= (product.estoque_minimo || 0);
   return (
      <Card className="group relative overflow-hidden rounded-[2.5rem] border-none shadow-sm hover:shadow-2xl transition-all duration-500 bg-white hover:-translate-y-2">
         <div className="p-6 flex flex-col h-full min-h-[220px]">
            <div className="flex justify-between mb-4">
               <Badge variant="outline" className="text-[8px] font-black px-2 py-0.5" style={{ color: product.product_categories?.cor, borderColor: `${product.product_categories?.cor}40` }}>
                  {product.product_categories?.nome || "Geral"}
               </Badge>
               <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-all" onClick={onEdit}>
                  <Edit className="h-3.5 w-3.5" />
               </Button>
            </div>
            <h3 className="font-black text-slate-800 text-base uppercase truncate">{product.nome}</h3>
            <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 italic">{product.descricao || "Sem detalhes..."}</p>
            <div className="mt-auto pt-6 flex justify-between items-end">
               <div>
                  <span className="text-[8px] font-black uppercase text-slate-300">Preço</span>
                  <p className="text-xl font-black text-slate-900 tracking-tighter">R$ {Number(product.preco).toFixed(2)}</p>
               </div>
               <div className={`h-10 px-3 rounded-xl flex flex-col items-center justify-center border-2 ${isLow ? 'border-rose-100 bg-rose-50 text-rose-500' : 'border-slate-50 bg-slate-50 text-slate-900'}`}>
                  <span className="text-[7px] font-black uppercase opacity-50">Est.</span>
                  <span className="text-xs font-black">{product.estoque}</span>
               </div>
            </div>
         </div>
      </Card>
   );
}

function SalesHistory({ comandas }: { comandas: any[] }) {
  return (
    <div className="grid gap-3">
       {comandas.map((c: any) => (
          <div key={c.id} className="p-4 bg-white/80 rounded-2xl flex justify-between items-center shadow-sm">
             <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${c.status==='aberta'?'bg-amber-50 text-amber-500':'bg-emerald-50 text-emerald-500'}`}>
                   <Receipt className="h-5 w-5" />
                </div>
                <div>
                   <p className="font-bold text-sm italic uppercase">#{c.id.slice(0,8)}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(c.created_at).toLocaleString("pt-BR")}</p>
                </div>
             </div>
             <div className="text-right">
                <p className="text-lg font-black tracking-tighter">R$ {Number(c.valor_total).toFixed(2)}</p>
                <Badge variant="outline" className={`text-[8px] uppercase font-black ${c.status==='aberta'?'text-amber-50 border-amber-100':'text-emerald-500 border-emerald-100'}`}>
                   {c.status}
                </Badge>
             </div>
          </div>
       ))}
       {comandas.length === 0 && <div className="py-20 text-center text-slate-300 italic">Nenhuma venda registrada</div>}
    </div>
  );
}

function ComandaDialog({ open, onOpenChange, alunos, produtos, queryClient, studioId }: any) {
  const { checkout, modalOpen, setModalOpen, checkoutOptions } = usePaymentCheckout();
  const [step, setStep] = useState<CheckoutStep>("produtos");
  const [form, setForm] = useState({ cliente_nome: "", aluno_id: "" });
  const [cart, setCart] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const total = cart.reduce((acc, i) => acc + (i.preco * i.quantidade), 0);

  const createOrder = useMutation({
    mutationFn: async (forma: string) => {
      const { data: order, error: orderErr } = await supabase.from("orders").insert([{ 
        studio_id: studioId, cliente_nome: form.cliente_nome || null, student_id: form.aluno_id || null, 
        valor_total: total, status: "fechada", forma_pagamento: forma, fechada_em: new Date().toISOString() 
      }]).select().single();
      
      if (orderErr) throw orderErr;
      
      for (const item of cart) {
        await supabase.from("order_items").insert({ 
           studio_id: studioId, order_id: order.id, product_id: item.id, 
           quantidade: item.quantidade, preco_unitario: item.preco 
        });
        await supabase.from("products").update({ estoque: item.estoque - item.quantidade }).eq("id", item.id);
        await supabase.from("stock_logs").insert({ 
           studio_id: studioId, product_id: item.id, tipo: "saida", 
           quantidade: item.quantidade, motivo: `Venda #${order.id.slice(0, 8)}` 
        });
      }
      return order.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      setStep("confirmado");
    },
    onError: (e: any) => toast.error(e.message)
  });

  return (
    <Dialog open={open} onOpenChange={(val) => {
       if (!val) {
          setSelectedMethod("");
          setStep("produtos");
          setCart([]);
          setForm({ cliente_nome: "", aluno_id: "" });
       }
       onOpenChange(val);
    }}>
      <DialogContent className="w-[95vw] sm:max-w-2xl h-[95vh] sm:h-[85vh] p-0 border-none shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col">
        <div className="bg-slate-900 p-5 sm:p-8 text-white shrink-0 flex justify-between items-center">
           <DialogTitle className="text-lg sm:text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" /> Checkout
           </DialogTitle>
           <Badge variant="outline" className="text-[8px] sm:text-[10px] font-black uppercase text-primary border-primary/20">{step}</Badge>
        </div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 custom-scrollbar">
          {step === "produtos" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <Input placeholder="Nome do Cliente" value={form.cliente_nome} onChange={e => setForm({...form, cliente_nome: e.target.value})} className="h-12 rounded-2xl bg-slate-50 border-none font-bold" />
                 <Select value={form.aluno_id} onValueChange={v => { const a = alunos.find((x:any)=>x.id===v); setForm({...form, aluno_id: v, cliente_nome: a?.nome || ""}) }}>
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-none font-bold"><SelectValue placeholder="Vincular Aluno" /></SelectTrigger>
                    <SelectContent>{alunos.map((a:any) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent>
                 </Select>
              </div>
              <Separator />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                 {produtos.filter((p:any)=>p.estoque > 0).map((p:any) => (
                    <button key={p.id} onClick={() => {
                       const exist = cart.find(i=>i.id===p.id);
                       if(exist) setCart(cart.map(i=>i.id===p.id ? {...i, quantidade: i.quantidade + 1} : i));
                       else setCart([...cart, {...p, quantidade: 1}]);
                    }} className="p-3 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-lg transition-all text-left">
                       <p className="font-bold text-[10px] truncate">{p.nome}</p>
                       <p className="text-lg font-black text-primary italic">R$ {p.preco}</p>
                    </button>
                 ))}
              </div>
            </div>
          )}
          {step === "revisao" && (
            <div className="space-y-3">
               {cart.map(i => (
                  <div key={i.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl font-bold">
                     <div><p className="text-xs">{i.nome}</p><p className="text-slate-400 text-[10px]">{i.quantidade}x R$ {i.preco}</p></div>
                     <p className="text-lg">R$ {(i.quantidade * i.preco).toFixed(2)}</p>
                  </div>
               ))}
               <div className="pt-6 text-center">
                  <p className="text-xs uppercase font-black text-slate-400">Total</p>
                  <p className="text-4xl font-black italic tracking-tighter">R$ {total.toFixed(2)}</p>
               </div>
            </div>
          )}
          {step === "pagamento" && (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8 animate-in fade-in zoom-in duration-500">
               <div className="flex flex-col items-center gap-2 mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Selecione o Método</p>
                  <div className="h-1 w-12 bg-primary/20 rounded-full" />
               </div>
               
               <div className="grid grid-cols-3 gap-3 w-full">
                  {[
                    { id: 'online', icon: Zap, label: 'Online' },
                    { id: 'dinheiro', icon: Banknote, label: 'Dinheiro' },
                    { id: 'conta_aluno', icon: Wallet, label: 'Conta Aluno' },
                  ].map(m => (
                     <button 
                        key={m.id} 
                        onClick={() => setSelectedMethod(m.id)} 
                        className={`h-24 sm:h-28 rounded-3xl border-2 flex flex-col items-center justify-center gap-2 sm:gap-3 transition-all group relative overflow-hidden ${
                           selectedMethod === m.id 
                           ? 'border-primary bg-primary/5 ring-4 ring-primary/10' 
                           : 'border-slate-100 hover:border-primary/20'
                        }`}
                     >
                        {selectedMethod === m.id && <div className="absolute top-0 right-0 p-1.5 bg-primary text-white rounded-bl-xl"><CheckCircle2 className="h-3 w-3" /></div>}
                        <m.icon className={`h-6 w-6 sm:h-7 sm:w-7 transition-colors ${selectedMethod === m.id ? 'text-primary' : 'text-slate-300 group-hover:text-slate-400'}`} />
                        <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${selectedMethod === m.id ? 'text-primary' : 'text-slate-500'}`}>{m.label}</span>
                     </button>
                  ))}
               </div>

               <div className="w-full pt-4 sm:pt-8 space-y-3">
                  <Button 
                    disabled={!selectedMethod || createOrder.isPending}
                    onClick={() => {
                       if (selectedMethod === 'online') {
                           checkout({
                               amount: total,
                               description: `Venda Loja - ${cart.length} itens`,
                               transactionId: crypto.randomUUID(),
                               metadata: { tipo: "venda_loja", studio_id: studioId! },
                               returnPath: "admin/store",
                           });
                       } else {
                           createOrder.mutate(selectedMethod);
                       }
                    }}
                    className={`w-full h-14 sm:h-16 rounded-[1.2rem] sm:rounded-[1.5rem] font-black uppercase text-[10px] sm:text-xs tracking-widest shadow-xl transition-all shadow-primary/10`}
                  >
                     {createOrder.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                        <>{selectedMethod === 'online' ? 'Pagar e Finalizar' : 'Concluir Recebimento'}</>
                     )}
                  </Button>
               </div>
            </div>
          )}
          {step === "confirmado" && (
            <div className="text-center space-y-4 py-16 flex flex-col items-center">
               <div className="h-20 w-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center animate-bounce"><CheckCircle2 className="h-10 w-10" /></div>
               <h3 className="text-2xl font-black uppercase italic">Venda Concluída</h3>
               <Button onClick={() => onOpenChange(false)} className="rounded-2xl px-10 h-14 font-black">Fechar</Button>
            </div>
          )}
        </div>
        {step !== "confirmado" && (
          <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
             <div><p className="text-[10px] font-black uppercase text-slate-400">Subtotal</p><p className="text-xl font-black">R$ {total.toFixed(2)}</p></div>
             <div className="flex gap-2">
                {step !== "produtos" && <Button variant="ghost" onClick={()=>setStep(step==='pagamento'?'revisao':'produtos')} className="font-bold uppercase text-[10px]">Voltar</Button>}
                <Button onClick={() => setStep(step==='produtos'?'revisao':'pagamento')} disabled={cart.length===0} className="rounded-xl px-10 font-black uppercase text-[10px] h-11 tracking-widest">{step==='pagamento'?'Finalizar':'Avançar'}</Button>
             </div>
          </div>
        )}
        <PaymentMethodModal 
          open={modalOpen} 
          onOpenChange={setModalOpen} 
          checkoutOptions={checkoutOptions} 
          studioId={studioId!} 
          onSuccess={() => createOrder.mutate('online')}
        />
      </DialogContent>
    </Dialog>
  );
}

// --- Componente Principal ---

export default function Store() {
  const { studioId } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("catalogo");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [comandaOpen, setComandaOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  
  const [form, setForm] = useState({ 
    nome: "", descricao: "", preco: 0, estoque: 0, estoque_minimo: 0, 
    tipo: "geral" as ProductType, lote: "", data_vencimento: "",
    fornecedor: "", preco_custo: 0, category_id: "", localizacao: ""
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");

  // --- Data Fetching ---

  const { data: produtos = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin", "store", "products", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_categories(nome, cor)")
        .eq("studio_id", studioId)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "store", "categories", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("studio_id", studioId)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: alunos = [] } = useQuery<any[]>({
    queryKey: ["admin", "students", "list-minimal", studioId],
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

  const { data: comandas = [] } = useQuery<any[]>({
    queryKey: ["admin", "store", "orders", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("studio_id", studioId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // --- Derived State ---

  const stats = useMemo(() => {
    const totalCusto = produtos.reduce((acc, p) => acc + (Number(p.estoque || 0) * Number(p.preco_custo || 0)), 0);
    const criticos = produtos.filter(p => (p.estoque || 0) <= (p.estoque_minimo || 0)).length;
    const vencendo = produtos.filter(p => p.data_vencimento && differenceInDays(parseISO(p.data_vencimento), new Date()) <= 30).length;
    return { totalCusto, criticos, vencendo };
  }, [produtos]);

  const filteredProducts = useMemo(() => {
    return produtos.filter((p) => {
      const matchSearch = !searchTerm || p.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === "todos" || p.category_id === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [produtos, searchTerm, selectedCategory]);

  // --- Helpers ---

  const resetProductForm = () => {
    setForm({ 
      nome: "", descricao: "", preco: 0, estoque: 0, estoque_minimo: 0, 
      tipo: "geral", lote: "", data_vencimento: "", fornecedor: "", 
      preco_custo: 0, category_id: "", localizacao: "" 
    });
    setEditing(null);
  };

  // --- Mutations ---

  const upsertProduct = useMutation({
    mutationFn: async (values: any) => {
      if (!studioId) return;
      const payload = {
        studio_id: studioId, nome: values.nome, descricao: values.descricao,
        preco: values.preco, estoque: values.estoque, estoque_minimo: values.estoque_minimo,
        tipo: values.tipo, lote: values.lote || null, data_vencimento: values.data_vencimento || null,
        fornecedor: values.fornecedor, preco_custo: values.preco_custo, 
        category_id: values.category_id || null, localizacao: values.localizacao,
        updated_at: new Date().toISOString()
      };
      
      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert([{ ...payload, ativo: true }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "store", "products"] });
      setDialogOpen(false);
      resetProductForm();
      toast.success(editing ? "Produto atualizado!" : "Produto cadastrado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({ 
      nome: p.nome, descricao: p.descricao || "", preco: Number(p.preco), 
      estoque: p.estoque, estoque_minimo: p.estoque_minimo || 0,
      tipo: p.tipo || "geral", lote: p.lote || "", data_vencimento: p.data_vencimento || "",
      fornecedor: p.fornecedor || "", preco_custo: Number(p.preco_custo) || 0,
      category_id: p.category_id || "", localizacao: p.localizacao || ""
    });
    setDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
        {/* HEADER */}
        <div className="bg-white rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
           <div className="space-y-1 sm:space-y-2 relative z-10">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] mb-1">Store & Logistics</span>
              <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-2 sm:gap-3">
                <Package className="h-6 w-6 sm:h-9 text-primary animate-pulse" /> Loja & Estoque
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-md">Controle inteligente de estoque</p>
           </div>
           <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:gap-3 relative z-10">
             <Button variant="outline" className="h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-white border-slate-200 text-[10px] font-black uppercase flex-1 sm:flex-none" onClick={() => { resetProductForm(); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Novo Produto
             </Button>
             <Button className="h-12 sm:h-14 rounded-xl sm:rounded-2xl shadow-xl shadow-primary/20 text-[10px] font-black uppercase px-4 sm:px-8 flex-1 sm:flex-none" onClick={() => { setComandaOpen(true); }}>
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" /> Iniciar Venda
             </Button>
           </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           <StatDisplay label="Custo em Estoque" value={`R$ ${stats.totalCusto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={Wallet} color="bg-emerald-50 text-emerald-600 border-emerald-100" />
           <StatDisplay label="Estoque Crítico" value={stats.criticos} icon={AlertTriangle} color="bg-rose-50 text-rose-600 border-rose-100" alert={stats.criticos > 0} />
           <StatDisplay label="Itens Vencendo" value={stats.vencendo} icon={History} color="bg-amber-50 text-amber-600 border-amber-100" alert={stats.vencendo > 0} />
           <StatDisplay label="Total Produtos" value={produtos.length} icon={Layers} color="bg-blue-50 text-blue-600 border-blue-100" />
        </div>

        {/* TABS */}
        <Tabs value={tab} onValueChange={setTab} className="space-y-4 sm:space-y-8">
           <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
             <TabsList className="bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50 h-auto flex min-w-max shadow-inner">
                <TabTrigger value="catalogo" icon={LayoutGrid} label="Catálogo" />
                <TabTrigger value="comandas" icon={Receipt} label="Vendas" />
                <TabTrigger value="entradas" icon={FileInput} label="Entradas (NF)" />
                <TabTrigger value="inventario" icon={ClipboardCheck} label="Inventário" />
                <TabTrigger value="categorias" icon={Settings2} label="Categorias" />
                <TabTrigger value="relatorios" icon={BarChart3} label="Relatórios" />
             </TabsList>
           </div>
          
          <TabsContent value="catalogo" className="mt-0">
             <div className="flex items-center gap-3 mb-6">
                <div className="relative group flex-1">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                   <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar por nome..." className="h-11 rounded-2xl pl-10 bg-white border-slate-100 font-bold text-xs" />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                   <SelectTrigger className="w-[180px] h-11 rounded-2xl bg-white border-slate-100 font-black uppercase text-[10px]">
                      <ListFilter className="h-3.5 w-3.5 mr-2 text-primary" />
                      <SelectValue placeholder="Categoria" />
                   </SelectTrigger>
                   <SelectContent className="rounded-2xl shadow-2xl">
                      <SelectItem value="todos" className="font-black uppercase text-[10px]">Todas</SelectItem>
                      {categories.map((c: any) => <SelectItem key={c.id} value={c.id} className="font-black uppercase text-[10px]">{c.nome}</SelectItem>)}
                   </SelectContent>
                </Select>
             </div>
             {isLoading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                   {filteredProducts.map((p: any) => <ProductCard key={p.id} product={p} onEdit={() => openEdit(p)} />)}
                </div>
             )}
          </TabsContent>

          <TabsContent value="comandas"><SalesHistory comandas={comandas} /></TabsContent>
          <TabsContent value="entradas"><StockEntryForm onSuccess={() => setTab("catalogo")} /></TabsContent>
          <TabsContent value="inventario"><InventoryForm onSuccess={() => setTab("catalogo")} /></TabsContent>
          <TabsContent value="categorias"><CategoriesManager /></TabsContent>
          <TabsContent value="relatorios"><StoreReports /></TabsContent>
        </Tabs>

        {/* PRODUCT MODAL */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
           <DialogContent className="w-[95vw] sm:max-w-2xl h-[95vh] sm:h-[90vh] p-0 border-none shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col">
              <div className="bg-slate-900 p-5 sm:p-8 text-white shrink-0">
                <DialogTitle className="text-xl sm:text-2xl font-black uppercase italic">{editing ? "Refinar Item" : "Novo Cadastro"}</DialogTitle>
                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mt-1">Gestão de Portfólio & Auditoria</p>
              </div>
              <div className="flex-1 overflow-y-auto p-5 sm:p-8 bg-white custom-scrollbar">
                 <form onSubmit={(e) => { e.preventDefault(); upsertProduct.mutate(form); }} className="space-y-10">
                    <section className="space-y-6">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Identificação Base</Label>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-2">
                             <Input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="h-12 rounded-2xl bg-slate-50 border-none font-bold" placeholder="Nome do Produto" required />
                          </div>
                          <Select value={form.category_id} onValueChange={v => setForm({...form, category_id: v})}>
                             <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-none font-bold text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
                             <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                          </Select>
                          <Select value={form.tipo} onValueChange={v => setForm({...form, tipo: v as ProductType})}>
                             <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-none font-bold text-xs"><SelectValue /></SelectTrigger>
                             <SelectContent>
                                <SelectItem value="geral">Geral</SelectItem>
                                <SelectItem value="alimento">Alimentação</SelectItem>
                             </SelectContent>
                          </Select>
                          <div className="md:col-span-2">
                             <Input value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="h-12 rounded-2xl bg-slate-50 border-none font-bold" placeholder="Descrição" />
                          </div>
                       </div>
                    </section>
                    <section className="space-y-6">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Economia & Volume</Label>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Input type="number" step="0.01" value={form.preco} onChange={e => setForm({...form, preco: Number(e.target.value)})} className="h-12 rounded-2xl bg-slate-50 border-none font-black text-primary" placeholder="Preço Venda" />
                          <Input type="number" step="0.01" value={form.preco_custo} onChange={e => setForm({...form, preco_custo: Number(e.target.value)})} className="h-12 rounded-2xl bg-slate-50 border-none font-bold" placeholder="Custo" />
                          <Input type="number" value={form.estoque} onChange={e => setForm({...form, estoque: Number(e.target.value)})} className="h-12 rounded-2xl bg-slate-50 border-none font-bold" placeholder="Estoque Inicial" />
                          <Input type="number" value={form.estoque_minimo} onChange={e => setForm({...form, estoque_minimo: Number(e.target.value)})} className="h-12 rounded-2xl bg-slate-50 border-none font-bold" placeholder="Mínimo" />
                       </div>
                    </section>
                    {form.tipo === 'alimento' && (
                       <section className="space-y-6 p-6 rounded-[2rem] bg-amber-50/50 border border-amber-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <Input value={form.lote} onChange={e => setForm({...form, lote: e.target.value})} className="h-12 rounded-2xl bg-white border-none font-bold" placeholder="Lote" required />
                             <Input type="date" value={form.data_vencimento} onChange={e => setForm({...form, data_vencimento: e.target.value})} className="h-12 rounded-2xl bg-white border-none font-bold" required />
                          </div>
                       </section>
                    )}
                    <Button type="submit" className="h-16 w-full rounded-2xl font-black uppercase shadow-xl shadow-primary/20" disabled={upsertProduct.isPending}>
                       {upsertProduct.isPending ? <RotateCcw className="animate-spin" /> : <CheckCircle2 className="mr-2" />}
                       {editing ? "Salvar Atualização" : "Ativar no Catálogo"}
                    </Button>
                 </form>
              </div>
           </DialogContent>
        </Dialog>

        {/* SALES MODAL */}
        <ComandaDialog open={comandaOpen} onOpenChange={setComandaOpen} alunos={alunos} produtos={produtos} queryClient={queryClient} studioId={studioId} />
      </div>
    </AdminLayout>
  );
}
