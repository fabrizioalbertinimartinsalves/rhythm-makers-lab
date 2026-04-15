/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  CreditCard, 
  Search, 
  Calendar, 
  Pause, 
  Play, 
  XCircle, 
  AlertTriangle,
  Receipt,
  Building2,
  MoreVertical,
  Plus,
  TrendingUp,
  Users,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Ban,
  CheckCircle2,
  ExternalLink,
  Wallet,
  Loader2,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativa", color: "text-emerald-600 bg-emerald-50 border-emerald-100", icon: CheckCircle2, variant: "outline" },
  paused: { label: "Pausada", color: "text-amber-600 bg-amber-50 border-amber-100", icon: Pause, variant: "outline" },
  delinquent: { label: "Inadimplente", color: "text-red-600 bg-red-50 border-red-100", icon: AlertTriangle, variant: "outline" },
  cancelled: { label: "Cancelada", color: "text-slate-500 bg-slate-50 border-slate-100", icon: XCircle, variant: "outline" },
  inactive: { label: "Inativa", color: "text-slate-500 bg-slate-50 border-slate-100", icon: Ban, variant: "outline" },
};

export default function SuperAdminBilling() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedSub, setSelectedSub] = useState<any | null>(null);

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ["superadmin-subscriptions-sb"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_subscriptions")
        .select(`
          *,
          studios (id, nome, slug, logo_url, features),
          saas_plans (id, nome, valor_mensal, modulos)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const calculateAddons = (features: any, planModules: any): number => {
    if (!features) return 0;
    
    const planKeys = Array.isArray(planModules) 
      ? planModules 
      : planModules ? Object.entries(planModules).filter(([_, m]: [any, any]) => {
          if (typeof m === 'boolean') return m;
          return m?.enabled;
        }).map(([k]) => k) : [];

    return (Object.values(features) as any[]).reduce<number>((acc, f) => {
      const fKey = Object.keys(features).find(k => features[k] === f);
      const isPlanFeature = fKey && planKeys.includes(fKey);

      if (!isPlanFeature && typeof f === 'object' && f !== null && f.enabled) {
        return acc + Number(f.price || 0);
      }
      return acc;
    }, 0);
  };

  const metrics = useMemo(() => {
    const active = subscriptions.filter((s: any) => s.status === 'active');
    const delinquent = subscriptions.filter((s: any) => s.status === 'delinquent');
    
    const mrr = active.reduce((acc: number, s: any) => {
      const basePrice = Number(s.discount_price || 0);
      const addonPrice = calculateAddons(s.studios?.features, s.saas_plans?.modulos);
      const totalMonthly = basePrice + addonPrice;

      if (s.billing_cycle === 'monthly') return acc + totalMonthly;
      if (s.billing_cycle === 'quarterly') return acc + (totalMonthly / 3);
      if (s.billing_cycle === 'annual') return acc + (totalMonthly / 12);
      return acc;
    }, 0);

    const pendingAmount = delinquent.reduce((acc: number, s: any) => {
      const basePrice = Number(s.discount_price || 0);
      const addonPrice = calculateAddons(s.studios?.features, s.saas_plans?.modulos);
      return acc + basePrice + addonPrice;
    }, 0);

    return {
      mrr,
      activeCount: active.length,
      delinquentCount: delinquent.length,
      pendingAmount
    };
  }, [subscriptions]);

  const updateSubMutation = useMutation({
    mutationFn: async ({ subId, updates }: { subId: string; updates: any }) => {
      const { error } = await supabase
        .from("saas_subscriptions")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", subId);
      
      if (error) throw error;
      
      const sub = subscriptions.find((s: any) => s.id === subId);
      if (sub) {
        if (updates.status && ['paused', 'cancelled', 'delinquent'].includes(updates.status)) {
          await supabase.from("studios").update({ status_assinatura: updates.status, ativa: false }).eq("id", sub.studio_id);
        } else if (updates.status === 'active') {
          await supabase.from("studios").update({ status_assinatura: 'active', ativa: true }).eq("id", sub.studio_id);
        }
      }
    },
    onSuccess: () => {
      toast.success("Assinatura atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["superadmin-subscriptions-sb"] });
      setSelectedSub(null);
    },
  });

  const filtered = subscriptions.filter((s: any) => {
    const matchesSearch = (s.studios?.nome || "").toLowerCase().includes(search.toLowerCase()) || s.id.includes(search);
    const matchesTab = activeTab === "all" || s.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-500 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <Badge className="bg-primary/5 text-primary border-none text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 mb-1">Finance v7.5.2</Badge>
            <h1 className="text-lg md:text-xl font-bold uppercase tracking-tight text-slate-950 flex items-center gap-3 leading-none">
              Command <span className="text-primary tracking-normal">Billing</span>
            </h1>
            <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest">Gestão de Receita e Assinaturas</p>
          </div>
          <Button className="h-8 px-5 font-bold uppercase tracking-widest text-[9px] shadow-sm shadow-primary/5 rounded-lg gap-2 bg-slate-950">
             <Plus className="h-3.5 w-3.5" /> Nova Assinatura
          </Button>
        </div>

        {/* METRICS CARDS */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-none shadow-sm rounded-xl overflow-hidden bg-white ring-1 ring-slate-100 group hover:shadow-md transition-all">
             <CardContent className="p-3.5">
                <div className="flex justify-between items-start mb-2">
                   <div className="h-7 w-7 rounded-md bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                      <TrendingUp className="h-3.5 w-3.5" />
                   </div>
                   <Badge variant="outline" className="text-[6px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-100/50 border-emerald-100 px-1 py-0">
                      GROWTH
                   </Badge>
                </div>
                <p className="text-[7px] font-bold uppercase tracking-widest text-slate-400">MRR Projetado</p>
                <h2 className="text-lg font-bold mt-0.5 tracking-tight text-slate-900 leading-none">{formatCurrency(metrics.mrr)}</h2>
             </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-xl overflow-hidden bg-white ring-1 ring-slate-100 group hover:shadow-md transition-all">
             <CardContent className="p-3.5">
                <div className="flex justify-between items-start mb-2">
                   <div className="h-7 w-7 rounded-md bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                      <Users className="h-3.5 w-3.5" />
                   </div>
                   <Badge variant="outline" className="text-[6px] font-bold uppercase tracking-widest text-blue-600 bg-blue-100/50 border-blue-100 px-1 py-0">
                      ACTIVE
                   </Badge>
                </div>
                <p className="text-[7px] font-bold uppercase tracking-widest text-slate-400">Assinaturas Ativas</p>
                <h2 className="text-lg font-bold mt-0.5 tracking-tight text-slate-900 leading-none">{metrics.activeCount} <span className="text-[8px] uppercase text-slate-400 ml-0.5 font-bold">Units</span></h2>
             </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-xl overflow-hidden bg-white ring-1 ring-slate-100 group hover:shadow-md transition-all">
             <CardContent className="p-3.5">
                <div className="flex justify-between items-start mb-2">
                   <div className="h-7 w-7 rounded-md bg-red-50 flex items-center justify-center text-red-600 border border-red-100">
                      <Ban className="h-3.5 w-3.5" />
                   </div>
                   <Badge variant="outline" className="text-[6px] font-bold uppercase tracking-widest text-red-600 bg-red-100/50 border-red-200 px-1 py-0">
                      ALERT
                   </Badge>
                </div>
                <p className="text-[7px] font-bold uppercase tracking-widest text-slate-400">Inadimplência</p>
                <h2 className="text-lg font-bold mt-0.5 tracking-tight text-red-600 leading-none">{metrics.delinquentCount} <span className="text-[8px] uppercase text-slate-400 ml-0.5 font-bold">Block</span></h2>
             </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-xl overflow-hidden bg-slate-950 text-white transition-all ring-1 ring-white/10">
             <CardContent className="p-3.5 relative">
                <div className="flex justify-between items-start mb-2">
                   <div className="h-7 w-7 rounded-md bg-white/10 flex items-center justify-center text-white border border-white/10">
                      <Wallet className="h-3.5 w-3.5" />
                   </div>
                </div>
                <p className="text-[7px] font-bold uppercase tracking-widest text-slate-500">Valores Pendentes</p>
                <h2 className="text-lg font-bold mt-0.5 tracking-tight text-primary leading-none">{formatCurrency(metrics.pendingAmount)}</h2>
             </CardContent>
          </Card>
        </div>

        {/* FILTERS AND LIST */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
             <div className="w-full md:max-w-xs space-y-1">
                <Label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 ml-1">Busca de Tenant</Label>
                <div className="relative group">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 group-focus-within:text-primary transition-colors" />
                   <Input 
                     placeholder="Buscar estúdio..." 
                     value={search} 
                     onChange={(e) => setSearch(e.target.value)} 
                     className="pl-9 h-8 bg-white border border-slate-200 rounded-lg font-medium text-slate-900 px-4 text-[10px]" 
                   />
                </div>
             </div>

             <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                <TabsList className="bg-slate-100 p-1 h-8 rounded-lg gap-1">
                   {["all", "active", "delinquent", "paused"].map((tab) => (
                     <TabsTrigger key={tab} value={tab} className="rounded-md px-3 text-[8px] font-bold uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
                        {tab === 'all' ? 'Tudo' : tab === 'active' ? 'Ativos' : tab === 'delinquent' ? 'Blocked' : 'Pausados'}
                     </TabsTrigger>
                   ))}
                </TabsList>
             </Tabs>
          </div>

          <Card className="border-none shadow-sm overflow-hidden rounded-xl bg-white ring-1 ring-slate-100">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="py-2.5 font-bold uppercase text-[8px] tracking-widest text-slate-500 pl-4">Tenant</TableHead>
                    <TableHead className="py-2.5 font-bold uppercase text-[8px] tracking-widest text-slate-500">Tier</TableHead>
                    <TableHead className="py-2.5 font-bold uppercase text-[8px] tracking-widest text-slate-500">Status</TableHead>
                    <TableHead className="py-2.5 font-bold uppercase text-[8px] tracking-widest text-slate-500">Renewal</TableHead>
                    <TableHead className="py-2.5 font-bold uppercase text-[8px] tracking-widest text-slate-500">MRR</TableHead>
                    <TableHead className="py-2.5 w-[80px] pr-4"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-24">
                         <div className="flex flex-col items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center animate-pulse border border-slate-100">
                               <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                            <p className="text-slate-400 font-black italic text-[10px] uppercase tracking-widest">Sincronizando Ledger Central...</p>
                         </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20 text-slate-400 font-black uppercase italic text-[10px] tracking-widest">
                        Nenhum fluxo encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((sub: any) => {
                    const statusConfig = STATUS_CONFIG[sub.status] || STATUS_CONFIG.inactive;
                    const StatusIcon = statusConfig.icon;

                    return (
                      <TableRow key={sub.id} className="hover:bg-slate-50/30 transition-colors border-slate-100 group">
                        <TableCell className="pl-4 py-2.5">
                           <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-lg bg-slate-950 flex items-center justify-center text-white font-bold text-[8px] uppercase overflow-hidden border border-slate-800 shadow-inner">
                                 {sub.studios?.logo_url ? <img src={sub.studios.logo_url} className="h-full w-full object-cover" /> : sub.studios?.nome?.slice(0, 2)}
                              </div>
                              <div>
                                 <div className="font-bold text-[11px] text-slate-900 uppercase tracking-tight leading-none">{sub.studios?.nome || "Removido"}</div>
                                 <div className="text-[7px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">ID: {sub.id.slice(0, 8)}</div>
                              </div>
                           </div>
                        </TableCell>
                         <TableCell>
                          <div className="text-[10px] font-bold text-slate-700 uppercase leading-none">{sub.saas_plans?.nome || "N/A"}</div>
                          <p className="text-[7px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                             {sub.billing_cycle === 'monthly' ? 'Mensal' : sub.billing_cycle === 'quarterly' ? 'Trimestral' : 'Anual'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("gap-1.5 font-bold text-[7px] uppercase tracking-widest h-5 px-2.5 border rounded-md shadow-none", statusConfig.color)}>
                             <StatusIcon className="h-2 w-2" />
                             {statusConfig.label}
                          </Badge>
                        </TableCell>
                         <TableCell>
                          <div className="font-bold text-[10px] text-slate-700">
                            {sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString("pt-BR") : "—"}
                          </div>
                          <div className={cn("text-[7px] uppercase font-bold tracking-widest mt-0.1", sub.last_payment_status === 'paid' ? 'text-emerald-500' : 'text-amber-500')}>
                            {sub.last_payment_status === 'paid' ? 'Active Ledger' : 'Pending Transaction'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-[11px] text-slate-950 tracking-tight">
                            {formatCurrency(Number(sub.discount_price || 0) + calculateAddons(sub.studios?.features, sub.saas_plans?.modulos))}
                          </div>
                          {calculateAddons(sub.studios?.features, sub.saas_plans?.modulos) > 0 && (
                            <div className="text-[7px] text-emerald-600 font-bold uppercase tracking-widest flex items-center gap-0.5 mt-0.5">
                               <Plus className="h-2 w-2" /> {formatCurrency(calculateAddons(sub.studios?.features, sub.saas_plans?.modulos))} extras
                            </div>
                          )}
                        </TableCell>
                         <TableCell className="pr-4">
                            <div className="flex items-center gap-1 justification-end opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0 translate-x-1">
                               <Button 
                                 variant="outline" 
                                 size="icon" 
                                 className="h-6 w-6 rounded-md border-slate-200 hover:bg-slate-50 transition-all"
                                 onClick={() => setSelectedSub({ ...sub, studioName: sub.studios?.nome })}
                               >
                                  <MoreVertical className="h-3 w-3 text-slate-400" />
                               </Button>
                            </div>
                         </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={!!selectedSub} onOpenChange={(o) => !o && setSelectedSub(null)}>
        <DialogContent className="max-w-xl rounded-xl p-0 overflow-hidden border-none shadow-xl">
          <div className="bg-slate-950 p-6 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-5"><Sparkles className="h-20 w-20 text-primary" /></div>
             <div className="relative z-10 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-white text-slate-950 flex items-center justify-center font-bold text-lg uppercase shadow-lg ring-2 ring-white/10">
                   {selectedSub?.studioName?.slice(0, 2)}
                </div>
                <div>
                   <DialogTitle className="text-xl font-bold uppercase tracking-tight leading-none">
                     {selectedSub?.studioName}
                   </DialogTitle>
                   <DialogDescription className="text-slate-500 font-bold text-[8px] uppercase tracking-widest mt-1.5 flex items-center gap-2">
                     <CreditCard className="h-2.5 w-2.5" /> Subscription Ledger Control
                   </DialogDescription>
                </div>
             </div>
          </div>

          <div className="p-6 space-y-8 bg-white">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="bg-slate-50 p-1 h-9 rounded-lg gap-1 w-full">
                <TabsTrigger value="overview" className="flex-1 rounded-md font-bold uppercase text-[9px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">Management</TabsTrigger>
                <TabsTrigger value="payments" className="flex-1 rounded-md font-bold uppercase text-[9px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">Ledger History</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 hover:bg-white hover:shadow-sm transition-all">
                    <p className="text-[7px] font-bold tracking-widest text-slate-400 uppercase">Status Atual</p>
                    {selectedSub && (
                      <Badge variant="outline" className={cn("gap-1.5 font-bold text-[8px] uppercase tracking-widest h-6 px-3 border rounded-md shadow-none", STATUS_CONFIG[selectedSub.status]?.color)}>
                        {STATUS_CONFIG[selectedSub.status]?.label}
                      </Badge>
                    )}
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5 hover:bg-white hover:shadow-sm transition-all">
                    <p className="text-[7px] font-bold tracking-widest text-slate-400 uppercase">Renewal Date</p>
                    <p className="text-base font-bold text-slate-900 tracking-tight">{selectedSub?.next_billing_date ? new Date(selectedSub.next_billing_date).toLocaleDateString("pt-BR") : "—"}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                    <Receipt className="h-2.5 w-2.5" /> Composition Analysis
                  </Label>
                  <div className="p-5 rounded-xl bg-slate-950 text-white space-y-4 shadow-lg relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-5 opacity-5"><TrendingUp className="h-20 w-20" /></div>
                     <div className="flex justify-between items-center text-xs relative z-10">
                        <span className="font-bold text-slate-500 uppercase tracking-widest text-[8px]">Tier Base Price</span>
                        <span className="font-bold text-white">{formatCurrency(Number(selectedSub?.discount_price || 0))}</span>
                     </div>
                     
                     {selectedSub?.studios?.features && Object.entries(selectedSub.studios.features).filter(([_, f]: [any, any]) => f?.enabled && f?.price > 0).length > 0 && (
                       <div className="space-y-2 pt-4 border-t border-white/10 relative z-10">
                          <p className="text-[7px] font-bold text-primary uppercase tracking-widest mb-2">Módulos On-Demand (Addons)</p>
                          {Object.entries(selectedSub.studios.features).filter(([_, f]: [any, any]) => f?.enabled && f?.price > 0).map(([key, f]: [any, any]) => (
                             <div key={key} className="flex justify-between items-center text-[10px]">
                                <span className="font-bold text-slate-400 uppercase tracking-tight">+ {key}</span>
                                <span className="font-bold text-white">{formatCurrency(f.price)}</span>
                             </div>
                          ))}
                       </div>
                     )}

                     <div className="flex justify-between items-center pt-5 border-t border-white/20 text-lg relative z-10">
                        <span className="font-bold text-white uppercase tracking-tighter">Current MRR</span>
                        <span className="font-bold text-primary">
                          {formatCurrency(Number(selectedSub?.discount_price || 0) + calculateAddons(selectedSub?.studios?.features, selectedSub?.saas_plans?.modulos))}
                        </span>
                     </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                    <ShieldCheck className="h-2.5 w-2.5" /> Master Controls
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedSub?.status === 'active' ? (
                      <Button 
                        variant="outline" 
                        className="h-9 rounded-lg border border-slate-200 text-amber-600 hover:bg-amber-50 hover:border-amber-200 font-bold uppercase tracking-widest text-[9px] flex-1 gap-2 transition-all active:scale-95 shadow-sm"
                        onClick={() => updateSubMutation.mutate({ subId: selectedSub.id, updates: { status: 'paused' }})}
                      >
                        <Pause className="h-3.5 w-3.5" /> Pause Account
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="h-9 rounded-lg border border-slate-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 font-bold uppercase tracking-widest text-[9px] flex-1 gap-2 transition-all active:scale-95 shadow-sm"
                        onClick={() => updateSubMutation.mutate({ subId: selectedSub.id, updates: { status: 'active' }})}
                      >
                        <Play className="h-3.5 w-3.5" /> Reactivate Live
                      </Button>
                    )}
                    
                    <Button 
                      variant="destructive" 
                      className="h-9 rounded-lg font-bold uppercase tracking-widest text-[9px] flex-1 gap-2 shadow-sm transition-all"
                      onClick={() => {
                          if (confirm("ATENÇÃO: Deseja cancelar irrevogavelmente esta assinatura?")) {
                            updateSubMutation.mutate({ subId: selectedSub.id, updates: { status: 'cancelled' }});
                          }
                      }}
                    >
                      <Ban className="h-3.5 w-3.5" /> Hard Cancel
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="payments" className="py-20 text-center animate-in slide-in-from-bottom-2 duration-500">
                <div className="max-w-xs mx-auto space-y-4">
                   <div className="h-16 w-16 rounded-xl bg-slate-50 flex items-center justify-center mx-auto border border-slate-100 shadow-sm group">
                      <Receipt className="h-8 w-8 opacity-10 group-hover:opacity-25 transition-opacity" />
                   </div>
                   <div className="space-y-1">
                      <h4 className="font-bold uppercase tracking-widest text-slate-300 text-base">No Financial Data</h4>
                      <p className="text-[9px] text-slate-400 leading-relaxed font-bold uppercase tracking-widest">O histórico detalhado de invoices está sendo migrado para o motor v7.5.</p>
                   </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
