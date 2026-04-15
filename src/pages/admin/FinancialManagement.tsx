/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Calendar, 
  BarChart3,
  ArrowRightLeft,
  PieChart as PieChartIcon,
  HelpCircle,
  LayoutDashboard,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  ListFilter,
  ShieldAlert
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { FinancialCard } from "@/components/financial/FinancialCard";
import { TransactionTable } from "@/components/financial/TransactionTable";
import { TransactionDialog } from "@/components/financial/TransactionDialog";
import { BillingTab } from "@/components/financial/BillingTab";
import { usePaymentCheckout } from "@/hooks/usePaymentCheckout";
import { PaymentMethodModal } from "@/components/financial/PaymentMethodModal";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

// --- Sub-components adapted from Dashboard ---
function StatCard({ title, value, trend, trendUp, icon: Icon, color, description }: any) {
  const colorMap = {
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 border-emerald-500/20",
    blue: "from-blue-500/10 to-blue-500/5 text-blue-600 border-blue-500/20",
    rose: "from-rose-500/10 to-rose-500/5 text-rose-600 border-rose-500/20",
    amber: "from-amber-500/10 to-amber-500/5 text-amber-600 border-amber-500/20",
  } as any;

  const ringMap = {
    emerald: "ring-emerald-500/30",
    blue: "ring-blue-500/30",
    rose: "ring-rose-500/30",
    amber: "ring-amber-500/30",
  } as any;

  return (
    <Card className={cn(
      "border-none shadow-lg bg-white/40 backdrop-blur-md overflow-hidden ring-1 transition-all hover:shadow-xl duration-300",
      ringMap[color]
    )}>
      <CardContent className="p-3 sm:p-5 relative">
        <div className={cn("absolute -top-6 -right-6 h-24 w-24 rounded-full blur-2xl opacity-10 bg-gradient-to-br", colorMap[color])} />
        
        <div className="flex justify-between items-start mb-2 sm:mb-4">
          <div className={cn("p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-white shadow-sm ring-1", ringMap[color])}>
            <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", colorMap[color].split(' ')[2])} />
          </div>
          {trend && (
            <Badge variant="outline" className={cn(
              "text-[8px] sm:text-[10px] font-bold border-none px-1.5 sm:px-2 py-0.5",
              trendUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            )}>
              {trendUp ? <ArrowUpRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" /> : <ArrowDownRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />}
              {trend}
            </Badge>
          )}
        </div>
 
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 italic truncate">{title}</h3>
            {description && (
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger><HelpCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-slate-300" /></TooltipTrigger>
                  <TooltipContent><p className="text-[10px] font-bold uppercase">{description}</p></TooltipContent>
                </UITooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="text-sm xs:text-base sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tighter tabular-nums leading-none truncate lg:overflow-visible">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FinancialManagement() {
  const queryClient = useQueryClient();
  const { studioId } = useAuth() as any;
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // States from Financial
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { checkout, modalOpen, setModalOpen, checkoutOptions } = usePaymentCheckout();
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-01"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });

  // States from Dashboard
  const [monthsCount, setMonthsCount] = useState(6);

  // --- Common Queries ---
  const { data: transactions = [], isLoading: loadingTx } = useQuery({
    queryKey: ["admin", "finances", "transactions", studioId, dateRange],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*, financial_categories(nome, cor), students(nome)")
        .eq("studio_id", studioId)
        .gte("date", dateRange.start)
        .lte("date", dateRange.end)
        .order("date", { ascending: false });

      if (error) throw error;
      return (data || []).map(t => ({
        ...t,
        category: t.financial_categories,
        student: t.students
      }));
    },
  });

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["admin", "finances", "accounts", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_accounts")
        .select("*")
        .eq("studio_id", studioId);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "finances", "categories", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase.from("financial_categories").select("*").eq("studio_id", studioId);
      if (error) throw error;
      return data || [];
    }
  });

  const { data: dreData = [], isLoading: loadingDRE } = useQuery({
    queryKey: ["admin", "finances", "dre", studioId, monthsCount],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_financial_dre")
        .select("*")
        .eq("studio_id", studioId)
        .order("month", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // --- Calculations ---
  const operationalMetrics = useMemo(() => {
    // Faturamento Realizado (Já pago)
    const income = transactions.filter(t => t.type === "income" && t.status === "pago").reduce((sum, t) => sum + Number(t.amount), 0);
    
    // Despesas Efetivadas
    const expenses = transactions.filter(t => t.type === "expense" && t.status === "pago").reduce((sum, t) => sum + Number(t.amount), 0);
    
    // Receitas em Aberto (Pendente ou Atrasado)
    const pendingIncome = transactions.filter(t => t.type === "income" && (t.status === "pendente" || t.status === "atrasado")).reduce((sum, t) => sum + Number(t.amount), 0);
    
    // Despesas em Aberto
    const pendingExpenses = transactions.filter(t => t.type === "expense" && (t.status === "pendente" || t.status === "atrasado")).reduce((sum, t) => sum + Number(t.amount), 0);
    
    // Total Faturado (Tudo que foi gerado)
    const totalFaturado = income + pendingIncome;
    
    // Líquido Estimado (~3.5% de taxa média)
    const liquidoEstimado = totalFaturado * 0.965;
    
    return { 
      total: income - expenses, 
      income, 
      expenses, 
      pendingIncome, 
      pendingExpenses,
      totalFaturado,
      liquidoEstimado,
      saldoPrevisto: totalFaturado - (expenses + pendingExpenses)
    };
  }, [transactions]);

  const dashboardMetrics = useMemo(() => {
    if (dreData.length === 0) return { faturamento: 0, despesas: 0, lucro: 0, margem: 0, fTrend: 0, lTrend: 0 };
    const latest = dreData[dreData.length - 1];
    const prev = dreData[dreData.length - 2];
    const fTrend = prev ? ((latest.faturamento_bruto - prev.faturamento_bruto) / prev.faturamento_bruto) * 100 : 0;
    const lTrend = prev ? ((latest.lucro_liquido - prev.lucro_liquido) / prev.lucro_liquido) * 100 : 0;
    const margem = latest.faturamento_bruto > 0 ? (latest.lucro_liquido / latest.faturamento_bruto) * 100 : 0;
    return { faturamento: latest.faturamento_bruto, despesas: latest.despesas_fixas, lucro: latest.lucro_liquido, margem, fTrend, lTrend };
  }, [dreData]);

  // --- Mutations ---
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: any) => {
      const { error } = await supabase.from("financial_transactions").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Liquidado com sucesso");
      // Nuclear Sync for Finance context
      queryClient.invalidateQueries({ queryKey: ["admin", "finances"] });
      // Double Check: Sync Global Admin (for Dashboard widgets)
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    }
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento excluído com sucesso");
      queryClient.invalidateQueries({ queryKey: ["admin", "finances"] });
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (err: any) => toast.error("Erro ao excluir: " + err.message)
  });

  if (loadingTx && loadingDRE) {
    return <AdminLayout><div className="p-8 space-y-8"><Skeleton className="h-20 w-1/2" /><div className="grid grid-cols-4 gap-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header Consolidado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1 max-w-full overflow-hidden">
             <Badge className="bg-emerald-500/5 text-emerald-600 border-none text-[8px] font-black uppercase tracking-[0.2em] mb-1.5 px-2 py-0.5">Gestão Financeira Consolidada</Badge>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-slate-950 flex flex-wrap items-center gap-x-3 gap-y-1 leading-tight sm:leading-none">
                Financeiro <span className="text-primary tracking-normal italic-none shrink-0" style={{ fontStyle: 'normal' }}>& Caixa</span>
             </h1>
             <p className="text-slate-400 text-[8px] sm:text-[10px] uppercase font-bold tracking-widest italic truncate">Dashboards, Mensalidades e Lançamentos em um só lugar</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
             <Button 
                onClick={() => setIsDialogOpen(true)}
                className="h-9 sm:h-10 px-4 sm:px-6 bg-slate-950 hover:bg-black font-bold uppercase text-[9px] sm:text-[10px] tracking-widest rounded-xl shadow-lg shadow-slate-950/20 gap-2 w-full md:w-auto"
             >
                <Plus className="h-4 w-4" /> Novo Lançamento
             </Button>
          </div>
        </div>
 
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="bg-slate-100 p-1 rounded-2xl h-12 w-max sm:w-full min-w-full">
              <TabsTrigger value="dashboard" className="rounded-xl px-4 sm:px-8 text-[10px] sm:text-[11px] font-black uppercase tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap">
                 <BarChart3 className="h-4 w-4" /> <span className="hidden xs:inline">Análise</span> <span className="xs:hidden">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="transactions" className="rounded-xl px-4 sm:px-8 text-[10px] sm:text-[11px] font-black uppercase tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap">
                 <ArrowRightLeft className="h-4 w-4" /> <span className="hidden xs:inline">Mensalidades & Caixa</span> <span className="xs:hidden">Lançamentos</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="rounded-xl px-4 sm:px-8 text-[10px] sm:text-[11px] font-black uppercase tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap">
                 <ShieldAlert className="h-4 w-4" /> Cobrança
              </TabsTrigger>
              <TabsTrigger value="settings" className="rounded-xl px-4 sm:px-8 text-[10px] sm:text-[11px] font-black uppercase tracking-widest gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap">
                 <Settings className="h-4 w-4" /> Config.
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: DASHBOARD (Copied from FinancialDashboard) */}
          <TabsContent value="dashboard" className="space-y-6 animate-in slide-in-from-left-2 duration-300">
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
               <StatCard 
                 title="Total Faturado"
                 value={`R$ ${operationalMetrics.totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                 trend={dashboardMetrics.fTrend !== 0 ? `${Math.abs(dashboardMetrics.fTrend).toFixed(1)}%` : undefined}
                 trendUp={dashboardMetrics.fTrend > 0}
                 icon={TrendingUp}
                 color="blue"
                 description={`O faturamento total gerado (Pago + Pendente). Líquido est.: R$ ${operationalMetrics.liquidoEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
               />
               <StatCard 
                 title="Saldo Caixa" 
                 value={`R$ ${operationalMetrics.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                 icon={DollarSign} 
                 color="emerald" 
                 description="Saldo líquido (Receitas Pagas - Despesas Pagas)" 
               />
               <StatCard 
                 title="Previsto" 
                 value={`R$ ${operationalMetrics.saldoPrevisto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                 icon={BarChart3} 
                 color="amber" 
                 description="Saldo final estimado se todos os pagamentos forem realizados" 
               />
               <StatCard 
                 title="Lucratividade" 
                 value={`${dashboardMetrics.margem.toFixed(1)}%`} 
                 icon={PieChartIcon} 
                 color="rose" 
                 description="Relação entre lucro líquido e faturamento bruto conforme DRE" 
               />
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-none shadow-xl bg-white rounded-3xl overflow-hidden ring-1 ring-slate-100">
                   <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 py-4 sm:py-5 px-4 sm:px-6">
                      <div>
                         <h3 className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-slate-900 italic flex items-center gap-2">
                           <TrendingUp className="h-4 w-4 text-emerald-500" /> Histórico
                         </h3>
                      </div>
                      <div className="flex gap-1 sm:gap-2">
                         {[3, 6, 12].map(m => (
                           <button key={m} onClick={() => setMonthsCount(m)} className={cn("px-2 py-1 rounded-md sm:rounded-lg text-[8px] sm:text-[9px] font-black transition-all", monthsCount === m ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-50")}>{m}M</button>
                         ))}
                      </div>
                   </CardHeader>
                   <CardContent className="p-3 sm:p-6 h-[200px] sm:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={dreData.map(d => ({ name: format(new Date(d.month + "T12:00:00"), "MMM", { locale: ptBR }), rev: d.faturamento_bruto, profit: d.lucro_liquido }))}>
                            <defs>
                              <linearGradient id="colorR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 900 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 900 }} tickFormatter={v => `R$${v}`} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            <Area type="monotone" dataKey="rev" name="Faturamento" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorR)" />
                            <Area type="monotone" dataKey="profit" name="Lucro" stroke="#10b981" strokeWidth={3} fillOpacity={0} />
                         </AreaChart>
                      </ResponsiveContainer>
                   </CardContent>
                </Card>

                <Card className="border-none shadow-xl bg-slate-900 text-white rounded-3xl overflow-hidden p-6 sm:p-8 flex flex-col justify-between">
                   <div className="space-y-4 sm:space-y-6">
                      <div>
                         <h4 className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-1 sm:mb-2 italic">Saúde de Caixa</h4>
                         <h2 className="text-xl sm:text-3xl font-black italic tracking-tighter uppercase leading-tight sm:leading-none">Equilíbrio<br/>Operacional</h2>
                      </div>
                      <div className="space-y-4">
                         <div>
                            <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                               <span className="text-slate-400">Ponto de Equilíbrio</span>
                               <span>{dashboardMetrics.faturamento > 0 ? ((dashboardMetrics.despesas / dashboardMetrics.faturamento) * 100).toFixed(0) : 0}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                               <div className="h-full bg-emerald-500" style={{ width: `${dashboardMetrics.faturamento > 0 ? (dashboardMetrics.despesas / dashboardMetrics.faturamento) * 100 : 0}%` }} />
                            </div>
                         </div>
                         <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                            <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Lucratividade Média</p>
                            <p className="text-2xl font-black text-emerald-400">{dashboardMetrics.margem.toFixed(1)}%</p>
                         </div>
                      </div>
                   </div>
                   <div className="mt-8 text-[10px] font-bold italic text-slate-400">"Sua margem está {(dashboardMetrics.margem > 30 ? 'excelente' : 'abaixo da média')}. Foco em reduzir custos fixos para expandir o lucro."</div>
                </Card>
             </div>
          </TabsContent>

          {/* TAB 2: TRANSAÇÕES (Copied from Financial) */}
          <TabsContent value="transactions" className="space-y-6 animate-in slide-in-from-right-2 duration-300">
             <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 bg-white p-4 sm:p-6 rounded-3xl shadow-sm ring-1 ring-slate-100 mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full lg:w-auto">
                   <div className="space-y-1 w-full sm:w-auto">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filtrar Período</Label>
                      <div className="flex items-center gap-2 sm:gap-3 bg-slate-50 px-3 sm:px-4 py-2 rounded-xl ring-1 ring-slate-100 w-full sm:w-auto">
                         <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                         <Input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="h-6 border-none bg-transparent shadow-none p-0 text-[11px] font-black uppercase w-full sm:w-28" />
                         <span className="text-slate-300">-</span>
                         <Input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="h-6 border-none bg-transparent shadow-none p-0 text-[11px] font-black uppercase w-full sm:w-28" />
                      </div>
                   </div>
                </div>
                 <div className="flex flex-col items-start lg:items-end gap-1 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-none border-slate-50">
                    <div className="flex items-center gap-1.5 opacity-60">
                       <DollarSign className="h-2.5 w-2.5" />
                       <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest">Saldo Líquido Atual</p>
                    </div>
                    <p className="text-xl xs:text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 leading-none tabular-nums">
                       R$ {operationalMetrics.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                 </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="space-y-4">
                   <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-500" /> Receitas Pendentes
                      </h3>
                   </div>
                   <TransactionTable 
                     transactions={transactions.filter(t => t.type === 'income' && t.status === 'pendente')} 
                     onAction={(id, action) => {
                       if (action === 'pay') updateStatusMutation.mutate({ id, status: 'pago' });
                       if (action === 'revert') updateStatusMutation.mutate({ id, status: 'pendente' });
                       if (action === 'delete') {
                         if (window.confirm("Deseja realmente excluir este lançamento pendente?")) {
                            deleteTransactionMutation.mutate(id);
                         }
                       }
                       if (action === 'pay_online') {
                         const t = transactions.find(x => x.id === id);
                         if (t) checkout({ 
                           amount: Number(t.amount), 
                           description: `Pagamento: ${t.description}`, 
                           transactionId: t.id,
                           metadata: { financial_record_id: t.id }, 
                           returnPath: "/admin/financial" 
                         });
                       }
                     }} 
                     isLoading={loadingTx} 
                   />
                </section>
                <section className="space-y-4">
                   <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-950 flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-rose-500" /> Despesas Pendentes
                      </h3>
                   </div>
                   <TransactionTable 
                     transactions={transactions.filter(t => t.type === 'expense' && t.status === 'pendente')} 
                    onAction={(id, action) => {
                       if (action === 'pay') updateStatusMutation.mutate({ id, status: 'pago' });
                       if (action === 'revert') updateStatusMutation.mutate({ id, status: 'pendente' });
                       if (action === 'delete') {
                         if (window.confirm("Deseja realmente excluir este lançamento pendente?")) {
                            deleteTransactionMutation.mutate(id);
                         }
                       }
                     }} 
                     isLoading={loadingTx} 
                   />
                </section>
             </div>

             <section className="pt-8">
                <div className="flex items-center gap-2 mb-6">
                   <ListFilter className="h-5 w-5 text-slate-400" />
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Extrato Efetivado do Período</h3>
                </div>
                <TransactionTable 
                   transactions={transactions.filter(t => t.status === 'pago')} 
                   isLoading={loadingTx} 
                   onAction={(id, action) => {
                      if (action === 'revert') updateStatusMutation.mutate({ id, status: 'pendente' });
                   }}
                />
             </section>
          </TabsContent>

          {/* TAB 3: COBRANÇA */}
          <TabsContent value="billing" className="space-y-6">
             <BillingTab />
          </TabsContent>

          {/* TAB 4: CONFIGURAÇÕES */}
          <TabsContent value="settings" className="space-y-6 animate-in slide-in-from-right-2 duration-300">
             <div className="grid md:grid-cols-2 gap-8">
                <Card className="border-none shadow-xl ring-1 ring-slate-100 rounded-3xl">
                   <CardHeader className="bg-slate-50/50 py-4 px-6 border-b border-slate-100 items-center justify-between flex-row">
                      <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">Categorias Financeiras</CardTitle>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Plus className="h-4 w-4" /></Button>
                   </CardHeader>
                   <CardContent className="p-6">
                      <div className="space-y-3">
                         {categories.map((c: any) => (
                           <div key={c.id} className="flex justify-between items-center p-3 rounded-2xl border border-slate-50 hover:bg-slate-50/50 transition-all">
                              <div className="flex items-center gap-3">
                                 <div className="h-3 w-3 rounded-full" style={{ backgroundColor: c.cor }} />
                                 <span className="text-xs font-bold text-slate-700">{c.nome}</span>
                              </div>
                              <Badge className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 border-none">{c.tipo === 'income' ? 'Receita' : 'Despesa'}</Badge>
                           </div>
                         ))}
                      </div>
                   </CardContent>
                </Card>

                <Card className="border-none shadow-xl ring-1 ring-slate-100 rounded-3xl">
                   <CardHeader className="bg-slate-50/50 py-4 px-6 border-b border-slate-100 items-center justify-between flex-row">
                      <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">Contas & Cartões</CardTitle>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Plus className="h-4 w-4" /></Button>
                   </CardHeader>
                   <CardContent className="p-6">
                      <div className="space-y-3">
                         {accounts.map((a: any) => (
                           <div key={a.id} className="flex flex-col p-4 rounded-2xl border border-slate-50 hover:bg-slate-50/50 transition-all group">
                              <div className="flex justify-between items-start mb-2">
                                 <span className="text-xs font-black uppercase text-slate-900">{a.nome}</span>
                                 <Badge className="bg-emerald-50 text-emerald-600 border-none text-[8px] font-black uppercase">Ativa</Badge>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{a.tipo} - {a.banco || "Brasil"}</span>
                           </div>
                         ))}
                      </div>
                   </CardContent>
                </Card>
             </div>
          </TabsContent>
        </Tabs>
      </div>

      <TransactionDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      <PaymentMethodModal open={modalOpen} onOpenChange={setModalOpen} studioId={studioId || ""} checkoutOptions={checkoutOptions} />
    </AdminLayout>
  );
}
