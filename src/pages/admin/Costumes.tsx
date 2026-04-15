import React, { useState, useMemo } from "react";
import { 
  ClipboardList, Plus, Search, Filter, History, UserPlus,
  ArrowRightCircle, CheckCircle2, AlertTriangle, MoreVertical,
  Edit, Trash2, Calendar, Layers, Shirt, Box, ChevronRight,
  TrendingDown, TrendingUp, Clock, AlertCircle, Check, Loader2,
  Package, User, CreditCard
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// --- Types ---
interface Costume {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface CostumeStock {
  id: string;
  costume_id: string;
  size: string;
  total_quantity: number;
  available_quantity: number;
}

interface CostumeMovement {
  id: string;
  costume_id: string;
  stock_id: string;
  type: 'ALUGUEL' | 'EMPRESTIMO';
  status: 'ATIVO' | 'DEVOLVIDO';
  current_status: 'ATIVO' | 'DEVOLVIDO' | 'ATRASADO';
  checkout_date: string;
  expected_return_date: string;
  actual_return_date: string;
  person: string;
  amount: number;
  costume_name: string;
  costume_size: string;
}

// Subcomponent for better organization
function CardFooter({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={cn("flex px-8 pb-8", className)}>{children}</div>;
}

export default function CostumesV2() {
  const { studioId } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  
  const [selectedCostumeId, setSelectedCostumeId] = useState<string | null>(null);

  // Form States
  const [modelForm, setModelForm] = useState({ name: "", category: "clássico", description: "" });
  const [stockForm, setStockForm] = useState({ costume_id: "", size: "", total_quantity: 1 });
  const [movementForm, setMovementForm] = useState({
    costume_id: "",
    stock_id: "",
    type: "ALUGUEL" as "ALUGUEL" | "EMPRESTIMO",
    person: "",
    expected_return_date: format(new Date(), "yyyy-MM-dd"),
    amount: 0,
    notes: ""
  });

  // --- Data Fetching ---
  const { data: costumes = [], isLoading: loadingCostumes } = useQuery({
    queryKey: ["costumes-v2", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("costumes")
        .select(`*, costume_stock(*)`)
        .eq("studio_id", studioId)
        .order("name");
      if (error) throw error;
      return data;
    }
  });

  const { data: movements = [], isLoading: loadingMovements } = useQuery({
    queryKey: ["costume-movements-v2", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_costume_movements")
        .select("*")
        .eq("studio_id", studioId)
        .order("checkout_date", { ascending: false });
      if (error) throw error;
      return data as CostumeMovement[];
    }
  });

  // --- Derived State (Stats) ---
  const stats = useMemo(() => {
    const activeMovements = movements.filter(m => m.status === 'ATIVO');
    return {
      totalModels: costumes.length,
      rented: activeMovements.filter(m => m.type === 'ALUGUEL').length,
      loaned: activeMovements.filter(m => m.type === 'EMPRESTIMO').length,
      delayed: activeMovements.filter(m => m.current_status === 'ATRASADO').length,
      totalStock: costumes.reduce((acc, c) => acc + (c.costume_stock?.reduce((sAcc: number, s: any) => sAcc + s.total_quantity, 0) || 0), 0)
    };
  }, [costumes, movements]);

  // --- Mutations ---
  const createModelMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from("costumes")
        .insert([{ ...payload, studio_id: studioId }])
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costumes-v2"] });
      setIsModelDialogOpen(false);
      setModelForm({ name: "", category: "clássico", description: "" });
      toast.success("Modelo de figurino criado!");
    }
  });

  const addStockMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from("costume_stock")
        .insert([{ ...payload, studio_id: studioId, available_quantity: payload.total_quantity }])
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costumes-v2"] });
      setIsStockDialogOpen(false);
      toast.success("Estoque adicionado!");
    }
  });

  const registerMovementMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from("costume_movements")
        .insert([{ ...payload, studio_id: studioId, status: 'ATIVO' }])
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costumes-v2"] });
      queryClient.invalidateQueries({ queryKey: ["costume-movements-v2"] });
      setIsMovementDialogOpen(false);
      toast.success("Saída registrada com sucesso!");
    },
    onError: (err: any) => toast.error("Falha ao registrar saída", { description: err.message })
  });

  const returnMovementMutation = useMutation({
    mutationFn: async (movementId: string) => {
      const { error } = await supabase
        .from("costume_movements")
        .update({ status: 'DEVOLVIDO', actual_return_date: new Date().toISOString().split('T')[0] })
        .eq("id", movementId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costumes-v2"] });
      queryClient.invalidateQueries({ queryKey: ["costume-movements-v2"] });
      toast.success("Devolução registrada! Estoque atualizado.");
    }
  });

  if (loadingCostumes || loadingMovements) {
    return (
      <AdminLayout>
        <div className="p-8 space-y-8">
           <Skeleton className="h-10 w-64" />
           <div className="grid grid-cols-4 gap-6">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
           </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8 pb-32">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight text-slate-900 leading-tight">
              Figurinos <span className="text-primary italic">v2</span>
            </h1>
            <p className="text-slate-500 font-medium tracking-tight">Arquitetura de movimentos • Controle Total</p>
          </div>
          <div className="flex items-center gap-3">
             <Button 
               onClick={() => setIsModelDialogOpen(true)}
               className="rounded-2xl h-14 px-8 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
             >
               <Plus className="mr-2 h-5 w-5" /> Novo Modelo
             </Button>
          </div>
        </header>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="rounded-[2.5rem] border-none shadow-sm ring-1 ring-slate-100 bg-white overflow-hidden p-6 hover:shadow-xl transition-all duration-500 group">
             <div className="flex justify-between items-start mb-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                   <Package className="h-6 w-6 text-slate-400 group-hover:text-primary transition-colors" />
                </div>
                <Badge variant="outline" className="rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-400 border-slate-100">Modelos</Badge>
             </div>
             <div className="text-4xl font-black text-slate-900 tracking-tighter">{stats.totalModels}</div>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Acervo Cadastrado</p>
          </Card>

          <Card className="rounded-[2.5rem] border-none shadow-sm ring-1 ring-slate-100 bg-white overflow-hidden p-6 hover:shadow-xl transition-all duration-500 group">
             <div className="flex justify-between items-start mb-4">
                <div className="h-12 w-12 rounded-2xl bg-sky-50 flex items-center justify-center">
                   <CreditCard className="h-6 w-6 text-sky-500" />
                </div>
                <Badge className="bg-sky-500/10 text-sky-600 rounded-lg text-[8px] font-black uppercase tracking-widest border-none px-2 py-0.5">Alugados</Badge>
             </div>
             <div className="text-4xl font-black text-slate-900 tracking-tighter">{stats.rented}</div>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gerando Receita</p>
          </Card>

          <Card className="rounded-[2.5rem] border-none shadow-sm ring-1 ring-slate-100 bg-white overflow-hidden p-6 hover:shadow-xl transition-all duration-500 group">
             <div className="flex justify-between items-start mb-4">
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                   <TrendingUp className="h-6 w-6 text-emerald-500" />
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 rounded-lg text-[8px] font-black uppercase tracking-widest border-none px-2 py-0.5">Empréstimos</Badge>
             </div>
             <div className="text-4xl font-black text-slate-900 tracking-tighter">{stats.loaned}</div>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Uso Administrativo</p>
          </Card>

          <Card className={cn(
            "rounded-[2.5rem] border-none shadow-sm ring-1 ring-slate-100 p-6 transition-all duration-500",
            stats.delayed > 0 ? "bg-rose-500 text-white shadow-rose-200" : "bg-white"
          )}>
             <div className="flex justify-between items-start mb-4">
                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", stats.delayed > 0 ? "bg-white/20" : "bg-rose-50")}>
                   <Clock className={cn("h-6 w-6", stats.delayed > 0 ? "text-white" : "text-rose-500")} />
                </div>
                <Badge className={cn("rounded-lg text-[8px] font-black uppercase tracking-widest border-none px-2 py-0.5", stats.delayed > 0 ? "bg-white/20 text-white" : "bg-rose-500/10 text-rose-600")}>Atrasos</Badge>
             </div>
             <div className="text-4xl font-black tracking-tighter">{stats.delayed}</div>
             <p className={cn("text-[10px] font-bold uppercase tracking-widest mt-1", stats.delayed > 0 ? "text-white/60" : "text-slate-400")}>Pendentes Online</p>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-2">
              <TabsList className="bg-slate-100/50 p-1 rounded-2xl h-14">
                <TabsTrigger value="dashboard" className="rounded-xl h-11 px-6 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg">Visão Geral</TabsTrigger>
                <TabsTrigger value="inventory" className="rounded-xl h-11 px-6 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg">Inventário</TabsTrigger>
                <TabsTrigger value="active" className="rounded-xl h-11 px-6 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg">Saídas Ativas</TabsTrigger>
                <TabsTrigger value="history" className="rounded-xl h-11 px-6 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg text-slate-400">Todo Histórico</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-3 ml-auto">
                 <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Pesquisar por modelo ou pessoa..." 
                      className="pl-11 h-14 rounded-2xl border-none bg-white shadow-sm ring-1 ring-slate-100 focus:ring-primary/20 transition-all font-medium"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                 </div>
              </div>
           </div>

           <TabsContent value="dashboard" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <Card className="rounded-[3rem] border-none shadow-sm ring-1 ring-slate-100 bg-white p-10">
                    <CardHeader className="p-0 mb-8">
                       <CardTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Figurinos em Atraso</CardTitle>
                       <CardDescription className="text-slate-400 font-medium">Itens cuja data prevista de devolução expirou.</CardDescription>
                    </CardHeader>
                    <div className="space-y-4">
                       {movements.filter(m => m.current_status === 'ATRASADO').length === 0 ? (
                          <div className="py-20 flex flex-col items-center justify-center opacity-20 grayscale">
                             <CheckCircle2 className="h-16 w-16 mb-4" />
                             <p className="font-black uppercase text-xs">Tudo no lugar!</p>
                          </div>
                       ) : (
                          movements.filter(m => m.current_status === 'ATRASADO').map(m => (
                             <div key={m.id} className="group p-5 rounded-[2rem] bg-rose-50/50 hover:bg-rose-500 hover:text-white transition-all duration-500 flex items-center justify-between border border-rose-100/30">
                                <div className="flex items-center gap-4">
                                   <div className="h-14 w-14 rounded-2xl bg-white/50 flex items-center justify-center shadow-sm text-rose-500 font-black">
                                       {m.costume_size}
                                   </div>
                                   <div>
                                      <p className="font-black uppercase text-sm tracking-tight">{m.costume_name}</p>
                                      <p className={cn("text-[10px] font-bold uppercase", "opacity-50 group-hover:opacity-80")}>Pessoa: {m.person}</p>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Deveria voltar</p>
                                   <p className="font-bold text-sm">{format(new Date(m.expected_return_date), "dd MMM", { locale: ptBR })}</p>
                                </div>
                             </div>
                          ))
                       )}
                    </div>
                 </Card>

                 <Card className="rounded-[3rem] border-none shadow-sm ring-1 ring-slate-100 bg-white p-10 flex flex-col justify-between overflow-hidden relative">
                    <div className="absolute -top-10 -right-10 opacity-[0.03] rotate-12">
                       <Shirt className="h-96 w-96 text-primary" />
                    </div>
                    <CardHeader className="p-0">
                       <CardTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Próximas Entregas</CardTitle>
                       <CardDescription className="text-slate-400 font-medium tracking-tight">Previstas para os próximos 7 dias.</CardDescription>
                    </CardHeader>
                    <div className="mt-8 space-y-4">
                       {movements.filter(m => m.status === 'ATIVO' && !isAfter(new Date(), parseISO(m.expected_return_date))).slice(0, 4).map(m => (
                          <div key={m.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                             <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                   <Calendar className="h-4 w-4" />
                                </div>
                                <div>
                                   <p className="font-bold text-sm text-slate-800">{m.costume_name}</p>
                                   <p className="text-[10px] text-slate-400 uppercase font-bold">{m.person}</p>
                                </div>
                             </div>
                             <Badge variant="outline" className="rounded-lg text-[9px] font-black border-slate-100 text-slate-400">
                                {format(new Date(m.expected_return_date), "dd/MM")}
                             </Badge>
                          </div>
                       ))}
                    </div>
                    <Button variant="ghost" className="w-full mt-8 rounded-2xl h-12 font-black uppercase text-[10px] text-primary hover:bg-primary/5">Ver agenda completa</Button>
                 </Card>
              </div>
           </TabsContent>

           <TabsContent value="inventory" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {costumes.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                    <Card key={c.id} className="rounded-[2.5rem] border-none shadow-sm ring-1 ring-slate-100 bg-white overflow-hidden group hover:shadow-2xl hover:shadow-primary/5 transition-all duration-700">
                       <div className="p-8 pb-4">
                          <div className="flex justify-between items-start mb-4">
                             <h3 className="text-xl font-black uppercase text-slate-900 tracking-tighter leading-none">{c.name}</h3>
                             <Badge variant="outline" className="rounded-lg px-2 py-0.5 text-[8px] font-black uppercase border-slate-100 text-slate-400">{c.category}</Badge>
                          </div>
                          <div className="space-y-4 mt-6">
                             {c.costume_stock?.length > 0 ? (
                                c.costume_stock.map((s: any) => (
                                   <div key={s.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 group-hover:bg-white border border-transparent group-hover:border-slate-100 transition-all">
                                      <div className="flex items-center gap-3">
                                         <span className="font-black text-xs text-slate-900">{s.size}</span>
                                         <div className="h-1 w-8 rounded-full bg-slate-100 overflow-hidden">
                                            <div className="h-full bg-primary" style={{width: `${(s.available_quantity/s.total_quantity)*100}%`}} />
                                         </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                         <span className={cn("font-black text-xs", s.available_quantity > 0 ? "text-emerald-500" : "text-rose-500")}>{s.available_quantity}</span>
                                         <span className="text-[10px] text-slate-400 font-bold">/ {s.total_quantity}</span>
                                      </div>
                                   </div>
                                ))
                             ) : (
                                <div className="py-4 text-center border-2 border-dashed border-slate-100 rounded-2xl px-4">
                                   <p className="text-[10px] font-bold text-slate-300 uppercase italic">Nenhum estoque cadastrado.</p>
                                </div>
                             )}
                          </div>
                       </div>
                       <CardFooter className="p-4 pt-0 gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                               setStockForm(prev => ({ ...prev, costume_id: c.id }));
                               setIsStockDialogOpen(true);
                            }}
                            className="flex-1 rounded-xl h-10 font-bold uppercase text-[9px] text-slate-400 hover:text-primary hover:bg-primary/5"
                          >
                             <Plus className="h-3 w-3 mr-1.5" /> Estoque
                          </Button>
                          <Button 
                             disabled={!c.costume_stock?.some((s: any) => s.available_quantity > 0)}
                             onClick={() => {
                                setMovementForm(prev => ({ ...prev, costume_id: c.id }));
                                setSelectedCostumeId(c.id);
                                setIsMovementDialogOpen(true);
                             }}
                             className="flex-1 rounded-xl h-10 font-black uppercase text-[9px] shadow-lg shadow-primary/20"
                          >
                             Registrar Saída
                          </Button>
                       </CardFooter>
                    </Card>
                 ))}
              </div>
           </TabsContent>

           <TabsContent value="active" className="mt-0">
              <Card className="rounded-[3rem] border-none shadow-sm ring-1 ring-slate-100 bg-white overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead className="bg-slate-50/50 border-b border-slate-100">
                          <tr>
                             <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Figurino</th>
                             <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Pessoa / Solicitante</th>
                             <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Data Saída</th>
                             <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Prev. Retorno</th>
                             <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                             <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-right">Ações</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {movements.filter(m => m.status === 'ATIVO').length === 0 ? (
                             <tr>
                                <td colSpan={6} className="px-8 py-32 text-center">
                                   <div className="flex flex-col items-center opacity-20">
                                      <Box className="h-16 w-16 mb-4" />
                                      <p className="font-black uppercase text-xs">Nenhum figurino fora da casa.</p>
                                   </div>
                                </td>
                             </tr>
                          ) : (
                             movements.filter(m => m.status === 'ATIVO').map(m => (
                                <tr key={m.id} className="group hover:bg-slate-50/30 transition-all duration-300">
                                   <td className="px-8 py-6">
                                      <div className="flex items-center gap-4">
                                         <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center font-black text-primary text-sm shadow-sm ring-1 ring-primary/10">
                                            {m.costume_size}
                                         </div>
                                         <div>
                                            <p className="font-black text-slate-900 uppercase text-xs tracking-tight">{m.costume_name}</p>
                                            <Badge variant="outline" className="rounded-lg text-[8px] border-slate-100 text-slate-400 uppercase font-black px-1.5">{m.type}</Badge>
                                         </div>
                                      </div>
                                   </td>
                                   <td className="px-8 py-6">
                                      <div className="flex items-center gap-2">
                                         <User className="h-3.5 w-3.5 text-slate-300" />
                                         <span className="font-bold text-sm text-slate-700">{m.person}</span>
                                      </div>
                                   </td>
                                   <td className="px-8 py-6 text-sm text-slate-500 font-medium">{format(new Date(m.checkout_date), "dd/MM/yyyy")}</td>
                                   <td className="px-8 py-6 text-sm text-slate-500 font-medium">{format(new Date(m.expected_return_date), "dd/MM/yyyy")}</td>
                                   <td className="px-8 py-6 text-center">
                                      <Badge className={cn(
                                         "rounded-full px-4 py-1 font-black uppercase text-[9px] tracking-widest border-none",
                                         m.current_status === 'ATRASADO' ? "bg-rose-500 text-white animate-pulse" : "bg-emerald-50 text-emerald-600"
                                      )}>
                                         {m.current_status}
                                      </Badge>
                                   </td>
                                   <td className="px-8 py-6 text-right">
                                      <Button 
                                         onClick={() => returnMovementMutation.mutate(m.id)}
                                         disabled={returnMovementMutation.isPending}
                                         className="rounded-xl h-10 px-6 font-black uppercase text-[10px] bg-slate-900 text-white hover:bg-emerald-500 shadow-xl shadow-black/5 hover:scale-105 transition-all active:scale-95"
                                      >
                                         {returnMovementMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar Devolução"}
                                      </Button>
                                   </td>
                                </tr>
                             ))
                          )}
                       </tbody>
                    </table>
                 </div>
              </Card>
           </TabsContent>
        </Tabs>
      </div>

      {/* --- Modals --- */}
      
      {/* 1. Modal Novo Modelo */}
      <Dialog open={isModelDialogOpen} onOpenChange={setIsModelDialogOpen}>
         <DialogContent className="rounded-[3rem] border-none shadow-2xl p-10 max-w-lg">
            <DialogHeader className="mb-8">
               <DialogTitle className="text-3xl font-black uppercase tracking-tighter">Novo Modelo</DialogTitle>
               <CardDescription className="text-slate-400 font-medium">Cadastre a base do figurino no acervo.</CardDescription>
            </DialogHeader>
            <div className="space-y-6">
               <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Nome do Figurino</label>
                  <Input 
                    placeholder="Ex: Smoking Clássico Adulto"
                    value={modelForm.name}
                    onChange={(e) => setModelForm(p => ({ ...p, name: e.target.value }))}
                    className="h-14 rounded-2xl bg-slate-50/50 border-none ring-1 ring-slate-100 focus:ring-primary/20 transition-all font-bold"
                  />
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Categoria</label>
                  <Select onValueChange={(v) => setModelForm(p => ({ ...p, category: v }))} defaultValue={modelForm.category}>
                     <SelectTrigger className="h-14 rounded-2xl bg-slate-50/50 border-none ring-1 ring-slate-100">
                        <SelectValue placeholder="Selecione..." />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="clássico">Clássico</SelectItem>
                        <SelectItem value="neoclássico">Neoclássico</SelectItem>
                        <SelectItem value="contemporâneo">Contemporâneo</SelectItem>
                        <SelectItem value="jazz">Jazz</SelectItem>
                        <SelectItem value="urbano">Urbano</SelectItem>
                        <SelectItem value="acessório">Acessório</SelectItem>
                     </SelectContent>
                  </Select>
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Descrição / Observações</label>
                  <Input 
                    placeholder="Detalhes sobre tecido, brilhos, etc..."
                    value={modelForm.description}
                    onChange={(e) => setModelForm(p => ({ ...p, description: e.target.value }))}
                    className="h-14 rounded-2xl bg-slate-50/50 border-none ring-1 ring-slate-100"
                  />
               </div>
            </div>
            <DialogFooter className="pt-8">
               <Button 
                  onClick={() => createModelMutation.mutate(modelForm)}
                  disabled={createModelMutation.isPending || !modelForm.name}
                  className="w-full h-14 rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 grow"
               >
                  {createModelMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "Criar Modelo"}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* 2. Modal Adicionar Estoque */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
         <DialogContent className="rounded-[3rem] border-none shadow-2xl p-10 max-w-sm">
            <DialogHeader className="mb-8">
               <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Adicionar Estoque</DialogTitle>
               <CardDescription className="text-slate-400 font-medium italic">Selecione tamanho e quantidade.</CardDescription>
            </DialogHeader>
            <div className="space-y-6">
               <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Tamanho</label>
                  <Input 
                    placeholder="Ex: PP, P, M, G, 12, Adulto..."
                    value={stockForm.size}
                    onChange={(e) => setStockForm(p => ({ ...p, size: e.target.value }))}
                    className="h-14 rounded-2xl bg-slate-50/50 border-none ring-1 ring-slate-100 font-bold uppercase"
                  />
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Quantidade Total</label>
                  <Input 
                    type="number"
                    value={stockForm.total_quantity}
                    onChange={(e) => setStockForm(p => ({ ...p, total_quantity: Number(e.target.value) }))}
                    className="h-14 rounded-2xl bg-slate-50/50 border-none ring-1 ring-slate-100 font-black text-lg"
                  />
               </div>
            </div>
            <DialogFooter className="pt-8">
               <Button 
                  onClick={() => addStockMutation.mutate(stockForm)}
                  disabled={addStockMutation.isPending || !stockForm.size}
                  className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest"
               >
                  Registrar Itens
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* 3. Modal Registrar Saída (Aluguel/Empréstimo) */}
      <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
         <DialogContent className="rounded-[4rem] border-none shadow-2xl p-0 overflow-hidden max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 min-h-[500px]">
               {/* Left: Info */}
               <div className="bg-slate-900 p-12 text-white flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 opacity-10 blur-3xl h-full w-full bg-primary" />
                  <div className="relative z-10">
                     <Badge className="bg-white/10 text-white rounded-lg px-2 py-0.5 text-[8px] font-black uppercase mb-6 tracking-widest border-none">Registro de Saída</Badge>
                     <h3 className="text-4xl font-black uppercase tracking-tighter leading-tight mb-2">
                        {costumes.find(c => c.id === movementForm.costume_id)?.name}
                     </h3>
                     <p className="text-slate-400 font-medium">Configure os detalhes da movimentação para atualizar o estoque.</p>
                  </div>
                  
                  <div className="relative z-10 space-y-4">
                     <div className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/10">
                        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center font-black">?</div>
                        <div>
                           <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Saldo Atual</p>
                           <p className="text-xs font-bold text-white/80 italic">Selecione o tamanho ao lado</p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Right: Form */}
               <div className="bg-white p-12 space-y-6 overflow-y-auto">
                  <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Tipo de Operação</label>
                     <Tabs defaultValue="ALUGUEL" onValueChange={(v) => setMovementForm(p => ({ ...p, type: v as any }))}>
                        <TabsList className="grid grid-cols-2 h-12 rounded-2xl bg-slate-50 p-1">
                           <TabsTrigger value="ALUGUEL" className="rounded-xl text-[10px] font-black uppercase">💰 Aluguel</TabsTrigger>
                           <TabsTrigger value="EMPRESTIMO" className="rounded-xl text-[10px] font-black uppercase">🤝 Empréstimo</TabsTrigger>
                        </TabsList>
                     </Tabs>
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Tamanho Disponível</label>
                     <Select onValueChange={(v) => setMovementForm(p => ({ ...p, stock_id: v }))}>
                        <SelectTrigger className="h-14 rounded-2xl bg-slate-50/50 border-none ring-1 ring-slate-100 font-bold">
                           <SelectValue placeholder="Escolha um tamanho..." />
                        </SelectTrigger>
                        <SelectContent>
                           {costumes.find(c => c.id === selectedCostumeId)?.costume_stock?.map((s: any) => (
                              <SelectItem key={s.id} value={s.id} disabled={s.available_quantity <= 0}>
                                 TAM: {s.size} • {s.available_quantity} em estoque
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>

                  <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Nome da Pessoa/Aluno</label>
                     <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                          placeholder="Quem está retirando?"
                          className="pl-11 h-14 rounded-2xl bg-slate-50/50 border-none ring-1 ring-slate-100 font-bold"
                          value={movementForm.person}
                          onChange={(e) => setMovementForm(p => ({ ...p, person: e.target.value }))}
                        />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                     <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Data Prevista Devolução</label>
                        <Input 
                           type="date"
                           className="h-14 rounded-2xl bg-slate-50/50 border-none ring-1 ring-slate-100 font-bold"
                           value={movementForm.expected_return_date}
                           onChange={(e) => setMovementForm(p => ({ ...p, expected_return_date: e.target.value }))}
                        />
                     </div>
                  </div>

                  {movementForm.type === 'ALUGUEL' && (
                     <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Valor do Aluguel</span>
                        <div className="flex items-center gap-1">
                           <span className="text-xs font-bold text-emerald-400">R$</span>
                           <Input 
                             type="number"
                             className="h-8 w-24 bg-transparent border-none text-right font-black text-2xl p-0 text-emerald-700 focus-visible:ring-0"
                             value={movementForm.amount}
                             onChange={(e) => setMovementForm(p => ({ ...p, amount: Number(e.target.value) }))}
                           />
                        </div>
                     </div>
                  )}

                  <Button 
                    onClick={() => registerMovementMutation.mutate(movementForm)}
                    disabled={registerMovementMutation.isPending || !movementForm.person || !movementForm.stock_id}
                    className="w-full h-16 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/20"
                  >
                     {registerMovementMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "Confirmar Saída"}
                  </Button>
               </div>
            </div>
         </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

