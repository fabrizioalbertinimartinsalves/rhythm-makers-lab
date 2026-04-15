/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Building2, 
  Users, 
  Package, 
  Globe, 
  TrendingUp, 
  DollarSign, 
  ArrowUpRight, 
  Calendar,
  Layers,
  ShieldCheck,
  Zap,
  BarChart3,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function SuperAdminDashboard() {
  const { user, loading: authLoading } = useAuth();

  // 1. Fetch Basic Totals
  const { data: counts } = useQuery({
    queryKey: ["superadmin-dashboard-counts", user?.id],
    enabled: !!user && !authLoading,
    queryFn: async () => {
      const [studios, users, plans] = await Promise.all([
        supabase.from("studios").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("saas_plans").select("*", { count: "exact", head: true }),
      ]);
      return {
        studios: studios.count || 0,
        users: users.count || 0,
        plans: plans.count || 0
      };
    },
  });

  // 2. Fetch Subscriptions for MRR Calculation
  const { data: subscriptions = [] } = useQuery({
    queryKey: ["superadmin-dashboard-mrr", user?.id],
    enabled: !!user && !authLoading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_subscriptions")
        .select("*, saas_plans(valor_mensal, modulos), studios(features)")
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  // 3. Fetch Recent Studios
  const { data: recentStudios = [] } = useQuery({
    queryKey: ["superadmin-recent-studios", user?.id],
    enabled: !!user && !authLoading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studios")
        .select("id, nome, created_at, slug")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // HELPER: Same calculateAddons logic from Billing.tsx
  const calculateAddons = (features: any, planModules: any): number => {
    if (!features) return 0;
    const planKeys = Array.isArray(planModules) 
      ? planModules 
      : planModules ? Object.entries(planModules).filter(([_, m]: [any, any]) => m === true || m?.enabled).map(([k]) => k) : [];

    return (Object.values(features) as any[]).reduce<number>((acc, f) => {
      const fKey = Object.keys(features).find(k => features[k] === f);
      const isPlanFeature = fKey && planKeys.includes(fKey);
      if (!isPlanFeature && typeof f === 'object' && f !== null && f.enabled) {
        return acc + Number(f.price || 0);
      }
      return acc;
    }, 0);
  };

  // 4. Consolidate Metrics
  const metrics = useMemo(() => {
    const mrr = subscriptions.reduce((acc: number, s: any) => {
      const basePrice = Number(s.discount_price || s.saas_plans?.valor_mensal || 0);
      const addonPrice = calculateAddons(s.studios?.features, s.saas_plans?.modulos);
      const total = basePrice + addonPrice;

      if (s.billing_cycle === 'monthly') return acc + total;
      if (s.billing_cycle === 'quarterly') return acc + (total / 3);
      if (s.billing_cycle === 'annual') return acc + (total / 12);
      return acc;
    }, 0);

    return { mrr };
  }, [subscriptions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-20 animate-in fade-in duration-700 px-4">
        
        {/* HEADER AREA */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
               <Badge className="bg-primary/5 text-primary border-none text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5">v7.5.2</Badge>
               <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                 <Clock className="h-2 w-2" /> Real-time
               </span>
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 uppercase leading-none">
              Command <span className="text-primary tracking-normal">Center</span>
            </h1>
            <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest">SaaS Master Control</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             <Button variant="outline" className="flex-1 md:flex-none h-8 px-3 rounded-lg border-slate-200 text-[9px] font-bold uppercase tracking-widest gap-2" asChild>
                <Link to="/" target="_blank">
                  <Globe className="h-3 w-3" /> External
                </Link>
             </Button>
             <Button className="flex-1 md:flex-none h-8 px-4 rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-sm shadow-primary/5 gap-2">
                <Zap className="h-3 w-3" /> Report
             </Button>
          </div>
        </div>

        {/* TOP METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm rounded-xl bg-slate-950 text-white overflow-hidden group">
            <CardContent className="p-4 space-y-2.5">
              <div className="flex justify-between items-start">
                 <div className="h-7 w-7 bg-white/5 rounded-md border border-white/5 flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                 </div>
                 <ArrowUpRight className="h-2.5 w-2.5 text-emerald-400 opacity-30" />
              </div>
              <div>
                <p className="text-[7px] font-bold uppercase tracking-widest text-slate-500">MRR Estimado</p>
                <p className="text-lg font-bold mt-0.5">{formatCurrency(metrics.mrr)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-xl bg-white ring-1 ring-slate-100 group">
            <CardContent className="p-4 space-y-2.5">
              <div className="flex justify-between items-start">
                 <div className="h-7 w-7 bg-blue-50 rounded-md border border-blue-100 flex items-center justify-center">
                    <Building2 className="h-3.5 w-3.5 text-blue-600" />
                 </div>
              </div>
              <div>
                <p className="text-[7px] font-bold uppercase tracking-widest text-slate-400">Estúdios Ativos</p>
                <p className="text-lg font-bold mt-0.5 text-slate-900">{counts?.studios || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-xl bg-white ring-1 ring-slate-100 group">
            <CardContent className="p-4 space-y-2.5">
              <div className="flex justify-between items-start">
                 <div className="h-7 w-7 bg-amber-50 rounded-md border border-amber-100 flex items-center justify-center">
                    <Users className="h-3.5 w-3.5 text-amber-600" />
                 </div>
              </div>
              <div>
                <p className="text-[7px] font-bold uppercase tracking-widest text-slate-400">Usuários Totais</p>
                <p className="text-lg font-bold mt-0.5 text-slate-900">{counts?.users || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-xl bg-white ring-1 ring-slate-100 group">
            <CardContent className="p-4 space-y-2.5">
              <div className="flex justify-between items-start">
                 <div className="h-7 w-7 bg-indigo-50 rounded-md border border-indigo-100 flex items-center justify-center">
                    <Package className="h-3.5 w-3.5 text-indigo-600" />
                 </div>
              </div>
              <div>
                <p className="text-[7px] font-bold uppercase tracking-widest text-slate-400">SaaS Plans</p>
                <p className="text-lg font-bold mt-0.5 text-slate-900">{counts?.plans || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* SECONDARY ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           
           {/* QUICK TOOLS - LEFTSIDE */}
           <div className="lg:col-span-8 space-y-6">
              <div>
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                       Ferramentas de Gestão
                    </h3>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link to="/superadmin/billing">
                       <Card className="border-none shadow-sm bg-white hover:shadow-md transition-all rounded-xl overflow-hidden group">
                          <CardHeader className="flex flex-row items-center gap-3 py-4 px-4">
                             <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform border border-emerald-100">
                                <DollarSign className="h-5 w-5" />
                             </div>
                             <div className="space-y-0.5">
                                <CardTitle className="text-sm font-bold uppercase tracking-tight">Financeiro</CardTitle>
                                <CardDescription className="text-[9px] font-medium">Controle de receitas</CardDescription>
                             </div>
                          </CardHeader>
                       </Card>
                    </Link>

                    <Link to="/superadmin/features">
                       <Card className="border-none shadow-sm bg-white hover:shadow-md transition-all rounded-xl overflow-hidden group">
                          <CardHeader className="flex flex-row items-center gap-3 py-4 px-4">
                             <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform border border-indigo-100">
                                <Layers className="h-5 w-5" />
                             </div>
                             <div className="space-y-0.5">
                                <CardTitle className="text-sm font-bold uppercase tracking-tight">Módulos</CardTitle>
                                <CardDescription className="text-[9px] font-medium">Addons e monetização</CardDescription>
                             </div>
                          </CardHeader>
                       </Card>
                    </Link>

                    <Link to="/superadmin/database">
                       <Card className="border-none shadow-sm bg-white hover:shadow-md transition-all rounded-xl overflow-hidden group">
                          <CardHeader className="flex flex-row items-center gap-3 py-4 px-4">
                             <div className="h-9 w-9 rounded-lg bg-slate-900 text-white flex items-center justify-center group-hover:scale-105 transition-transform border border-slate-700">
                                <ShieldCheck className="h-5 w-5" />
                             </div>
                             <div className="space-y-0.5">
                                <CardTitle className="text-sm font-bold uppercase tracking-tight">Database</CardTitle>
                                <CardDescription className="text-[9px] font-medium">Backups Google Drive</CardDescription>
                             </div>
                          </CardHeader>
                       </Card>
                    </Link>

                    <Link to="/superadmin/landing">
                       <Card className="border-none shadow-sm bg-white hover:shadow-md transition-all rounded-xl overflow-hidden group">
                          <CardHeader className="flex flex-row items-center gap-3 py-4 px-4">
                             <div className="h-9 w-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform border border-teal-100">
                                <Globe className="h-5 w-5" />
                             </div>
                             <div className="space-y-0.5">
                                <CardTitle className="text-sm font-bold uppercase tracking-tight">Landing Page</CardTitle>
                                <CardDescription className="text-[9px] font-medium">Website público e CMS</CardDescription>
                             </div>
                          </CardHeader>
                       </Card>
                    </Link>
                 </div>
              </div>
           </div>

           {/* RECENT ACTIVITY - RIGHTSIDE */}
           <div className="lg:col-span-4 space-y-6">
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 mb-4">
                   Novos Estúdios
                </h3>
                <div className="space-y-2">
                   {recentStudios.map((studio) => (
                      <div key={studio.id} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-slate-100 transition-all hover:border-primary/20">
                         <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center font-bold text-slate-400 text-[9px]">
                               {studio.nome.substring(0,2).toUpperCase()}
                            </div>
                            <div className="space-y-0.5">
                               <p className="text-[10px] font-bold uppercase tracking-tight text-slate-800">{studio.nome}</p>
                               <div className="flex items-center gap-2">
                                  <Badge className="bg-emerald-50 text-emerald-600 border-none text-[6px] font-bold h-3 px-1 lowercase">@{studio.slug}</Badge>
                                  <span className="text-[7px] text-slate-400 flex items-center gap-1"><Calendar className="h-1.5 w-1.5" /> {new Date(studio.created_at).toLocaleDateString('pt-BR')}</span>
                               </div>
                            </div>
                         </div>
                         <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-200 hover:text-primary transition-colors" asChild>
                            <Link to={`/superadmin/organizations?id=${studio.id}`}><ArrowUpRight className="h-3 w-3" /></Link>
                         </Button>
                      </div>
                   ))}
                    <Button variant="ghost" className="w-full text-[8px] font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-all py-3" asChild>
                       <Link to="/superadmin/organizations">Gerenciar Todas Organizações</Link>
                    </Button>
                </div>
              </div>
           </div>

        </div>
      </div>
    </SuperAdminLayout>
  );
}
