
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Plus, 
  Edit, 
  ShieldCheck, 
  Users, 
  UserCircle, 
  Package, 
  CheckCircle2, 
  DollarSign, 
  Sparkles,
  TrendingUp,
  BarChart3,
  Layers,
  Zap,
  Star,
  Activity,
  ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURE_GROUPS = [
  {
    id: "admin_core",
    label: "Gestão Core",
    icon: <ShieldCheck className="h-4 w-4" />,
    features: [
      { key: "agenda", label: "Agenda / Grade" },
      { key: "alunos", label: "Gestão de Alunos (Inteligência)" },
      { key: "presencas", label: "Controle de Presença" },
      { key: "modalidades", label: "Gestão de Modalidades" },
      { key: "agenda_hibrida", label: "Grade Híbrida" },
      { key: "agendamentos", label: "Controle de Agendamentos" },
      { key: "checkin", label: "Check-in Consolidado" },
    ]
  },
  {
    id: "financeiro",
    label: "Financeiro & Contratos",
    icon: <DollarSign className="h-4 w-4" />,
    features: [
      { key: "financeiro", label: "Faturamento Automatizado" },
      { key: "repasses", label: "Repasses a Instrutores" },
      { key: "instrutores", label: "Gestão de Equipe" },
      { key: "contratos", label: "Contratos Automáticos" },
      { key: "planos_estudio", label: "Gestão de Planos" },
      { key: "vendas_avulsas", label: "Vendas Avulsas" },
    ]
  },
  {
    id: "comercial",
    label: "Comercial & Vendas",
    icon: <Sparkles className="h-4 w-4" />,
    features: [
      { key: "crm", label: "CRM / Funil" },
      { key: "experimentais", label: "Experimentos (Pagos)" },
      { key: "pre_matriculas", label: "Pré-Matrículas Online" },
      { key: "parcerias", label: "Parcerias & Convênios" },
      { key: "agendamento_online", label: "Agendamento Online" },
    ]
  },
  {
    id: "loja_festival",
    label: "Loja & Eventos",
    icon: <Package className="h-4 w-4" />,
    features: [
      { key: "pdv", label: "PDV / Balcão" },
      { key: "loja", label: "Loja Online / Catálogo" },
      { key: "figurinos", label: "Gestão de Figurinos" },
      { key: "festivais", label: "Gestão Festival" },
    ]
  },
  {
    id: "inteligencia",
    label: "Inteligência & Sistema",
    icon: <BarChart3 className="h-4 w-4" />,
    features: [
      { key: "relatorios", label: "Relatórios Avançados" },
      { key: "ltv", label: "Análise LTV / Churn" },
      { key: "backups", label: "Backups de Segurança" },
      { key: "integracoes", label: "Integrações" },
      { key: "avisos", label: "Mural de Comunicação" },
    ]
  },
  {
    id: "instructor",
    label: "Portal do Instrutor",
    icon: <Users className="h-4 w-4" />,
    features: [
      { key: "instructor_agenda", label: "Agenda do Instrutor" },
      { key: "instructor_attendance", label: "Realizar Chamada" },
      { key: "instructor_records", label: "Prontuários / Evolução" },
      { key: "instructor_notices", label: "Avisos Internos" },
    ]
  },
  {
    id: "student",
    label: "Portal do Aluno (APP)",
    icon: <UserCircle className="h-4 w-4" />,
    features: [
      { key: "student_booking", label: "Agendamento App" },
      { key: "student_financial", label: "Minhas Faturas" },
      { key: "student_progress", label: "Meu Progresso" },
      { key: "student_documents", label: "Meus Documentos" },
      { key: "student_checkin", label: "Auto Check-in (QR)" },
      { key: "student_messages", label: "Chat Direto" },
    ]
  }
];

const MODULE_LABELS: Record<string, string> = {};
FEATURE_GROUPS.forEach(g => g.features.forEach(f => { MODULE_LABELS[f.key] = f.label; }));

export default function SuperAdminPlans() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({
    nome: "", descricao: "", valor_mensal: 0,
    limite_alunos: 0, limite_instrutores: 0, limite_turmas: 0,
    modulos: {} as any, ativo: true,
  });

  const { data: plansData = [] } = useQuery({
    queryKey: ["superadmin-plans-sb", user?.id],
    enabled: !!user && !loading,
    queryFn: async () => {
      // Fetch plans AND subscription counts in parallel or join
      const { data: plans, error: pError } = await supabase
        .from("saas_plans")
        .select("*")
        .order("valor_mensal", { ascending: true });
      
      if (pError) throw pError;

      // Get counts of active subscriptions per plan
      const { data: subs, error: sError } = await supabase
        .from("saas_subscriptions")
        .select("plan_id, status")
        .eq("status", "active");

      if (sError) throw sError;

      return plans.map(p => ({
        ...p,
        active_count: subs.filter(s => s.plan_id === p.id).length
      }));
    },
  });

  const plans = plansData;

  const savePlan = useMutation({
    mutationFn: async () => {
      console.warn("[SuperAdminPlans] Saving plan. Form:", form);
      if (editing?.id) {
        console.warn("[SuperAdminPlans] Updating plan ID:", editing.id);
        const { error, data } = await supabase
          .from("saas_plans")
          .update(form)
          .eq("id", editing.id)
          .select();
        
        if (error) {
          console.error("[SuperAdminPlans] Update error:", error);
          throw error;
        }
        console.warn("[SuperAdminPlans] Update success:", data);
      } else {
        console.warn("[SuperAdminPlans] Inserting new plan");
        const { error, data } = await supabase
          .from("saas_plans")
          .insert(form)
          .select();
        
        if (error) {
          console.error("[SuperAdminPlans] Insert error:", error);
          throw error;
        }
        console.warn("[SuperAdminPlans] Insert success:", data);
      }
    },
    onSuccess: (data: any) => {
      console.warn("[SuperAdminPlans] Mutation success response:", data);
      toast.success("Plano salvo com sucesso!");
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["superadmin-plans-sb"] });
      
      // Force reload after a short delay to ensure the user sees the persistent state
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    },
    onError: (error: any) => {
      console.error("[SuperAdminPlans] Mutation error details:", error);
      toast.error("Erro ao salvar: " + (error.message || JSON.stringify(error)));
    },
  });

  // HELPER: Normalize module data
  const getModuleData = (mods: any, key: string): { enabled: boolean; price: number } => {
    if (!mods) return { enabled: false, price: 0 };
    // If it's an array of strings (old format)
    if (Array.isArray(mods)) {
      return { enabled: mods.includes(key), price: 0 };
    }
    // If it's the new object format
    const val = mods[key];
    if (typeof val === 'boolean') return { enabled: val, price: 0 };
    if (typeof val === 'object' && val !== null) return { enabled: !!val.enabled, price: Number(val.price || 0) };
    return { enabled: false, price: 0 };
  };

  const openEdit = (plan?: any) => {
    if (plan) {
      // Normalize modulos when loading
      const normalizedMods: any = {};
      const rawMods = plan.modulos || {};
      
      if (Array.isArray(rawMods)) {
        rawMods.forEach((k: string) => { normalizedMods[k] = { enabled: true, price: 0 }; });
      } else {
        Object.keys(rawMods).forEach(k => {
          normalizedMods[k] = getModuleData(rawMods, k);
        });
      }

      setForm({
        nome: plan.nome || "", 
        descricao: plan.descricao || "", 
        valor_mensal: Number(plan.valor_mensal || 0),
        limite_alunos: Number(plan.limite_alunos || 0), 
        limite_instrutores: Number(plan.limite_instrutores || 0),
        limite_turmas: Number(plan.limite_turmas || 0), 
        modulos: normalizedMods, 
        ativo: plan.ativo !== false,
      });
      setEditing(plan);
    } else {
      setForm({ 
        nome: "", 
        descricao: "", 
        valor_mensal: 0, 
        limite_alunos: 0, 
        limite_instrutores: 0, 
        limite_turmas: 0, 
        modulos: {}, 
        ativo: true 
      });
      setEditing({});
    }
  };

  const toggleModule = (key: string) => {
    const existing = getModuleData(form.modulos, key);
    setForm((f) => ({
      ...f,
      modulos: {
        ...f.modulos,
        [key]: { enabled: !existing.enabled, price: existing.price }
      }
    }));
  };

  const updateModulePrice = (key: string, price: number) => {
    const existing = getModuleData(form.modulos, key);
    setForm((f) => ({
      ...f,
      modulos: {
        ...f.modulos,
        [key]: { enabled: existing.enabled, price }
      }
    }));
  };

  const toggleGroup = (groupId: string, enabled: boolean) => {
    const group = FEATURE_GROUPS.find(g => g.id === groupId);
    if (!group) return;

    setForm(f => {
      const nextModulos = { ...f.modulos };
      group.features.forEach(feat => {
        const existing = getModuleData(f.modulos, feat.key);
        nextModulos[feat.key] = { enabled, price: existing.price };
      });
      return { ...f, modulos: nextModulos };
    });
  };

  const totalModuleValuation = useMemo(() => {
    return (Object.values(form.modulos) as any[]).reduce<number>((acc, m) => {
      if (m?.enabled) return acc + (Number(m.price) || 0);
      return acc;
    }, 0);
  }, [form.modulos]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-20 animate-in fade-in duration-500 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <Badge className="bg-primary/5 text-primary border-none text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 mb-1">Architecture v7.5.2</Badge>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 uppercase leading-none">
              Command <span className="text-primary tracking-normal">Plans</span>
            </h1>
            <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest">Modelagem de Pacotes SaaS</p>
          </div>
          <Button onClick={() => openEdit()} className="w-full md:w-auto h-8 px-5 font-bold uppercase tracking-widest gap-2 shadow-sm shadow-primary/5 rounded-lg text-[9px] bg-slate-950">
            <Plus className="h-3.5 w-3.5" /> Novo Plano
          </Button>
        </div>

        {/* Plan Metrics Dashboard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
           <Card className="border-none shadow-sm rounded-xl bg-slate-950 text-white overflow-hidden p-3.5 hover:scale-[1.01] transition-all ring-1 ring-white/10">
              <div className="flex justify-between items-start mb-2">
                 <div className="h-7 w-7 rounded-md bg-white/10 flex items-center justify-center">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                 </div>
                 <Badge className="bg-primary/20 text-primary border-none text-[6px] font-bold uppercase px-1 py-0">SHOP</Badge>
              </div>
              <p className="text-[7px] font-bold uppercase tracking-widest text-slate-500">Active Plans</p>
              <h3 className="text-lg font-bold text-white leading-none mt-0.5">
                 {plans.filter(p => p.ativo).length}
              </h3>
           </Card>

           <Card className="border-none shadow-sm rounded-xl bg-white overflow-hidden p-3.5 hover:scale-[1.01] transition-all ring-1 ring-slate-100">
              <div className="flex justify-between items-start mb-2">
                 <div className="h-7 w-7 rounded-md bg-blue-50 flex items-center justify-center">
                    <Users className="h-3.5 w-3.5 text-blue-600" />
                 </div>
                 <Badge variant="outline" className="text-blue-500 border-blue-100 text-[6px] font-bold uppercase px-1 py-0">LIVE</Badge>
              </div>
              <p className="text-[7px] font-bold uppercase tracking-widest text-slate-400">Total Subs</p>
              <h3 className="text-lg font-bold text-slate-900 leading-none mt-0.5">
                 {plans.reduce((acc, p) => acc + (p.active_count || 0), 0)}
              </h3>
           </Card>

           <Card className="border-none shadow-sm rounded-xl bg-white overflow-hidden p-3.5 hover:scale-[1.01] transition-all ring-1 ring-slate-100">
              <div className="flex justify-between items-start mb-2">
                 <div className="h-7 w-7 rounded-md bg-emerald-50 flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                 </div>
                 <Badge variant="outline" className="text-emerald-500 border-emerald-100 text-[6px] font-bold uppercase px-1 py-0">MRR</Badge>
              </div>
              <p className="text-[7px] font-bold uppercase tracking-widest text-slate-400">Recurring Rev</p>
              <h3 className="text-lg font-bold text-slate-900 leading-none mt-0.5">
                 {formatCurrency(plans.reduce((acc, p) => acc + (p.valor_mensal * (p.active_count || 0)), 0))}
              </h3>
           </Card>

           <Card className="border-none shadow-sm rounded-xl bg-white overflow-hidden p-3.5 hover:scale-[1.01] transition-all ring-1 ring-slate-100">
              <div className="flex justify-between items-start mb-2">
                 <div className="h-7 w-7 rounded-md bg-orange-50 flex items-center justify-center">
                    <Star className="h-3.5 w-3.5 text-orange-600" />
                 </div>
                 <Badge variant="outline" className="text-orange-500 border-orange-100 text-[6px] font-bold uppercase px-1 py-0">BEST</Badge>
              </div>
              <p className="text-[7px] font-bold uppercase tracking-widest text-slate-400">Most Popular</p>
              <h3 className="text-sm font-bold text-slate-900 leading-none uppercase truncate max-w-full mt-0.5">
                 {plans.sort((a, b) => (b.active_count || 0) - (a.active_count || 0))[0]?.nome || '—'}
              </h3>
           </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan: any) => (
            <Card key={plan.id} className={cn(
                "relative border-none shadow-sm rounded-xl overflow-hidden transition-all hover:scale-[1.01] group ring-1 ring-slate-100",
                !plan.ativo ? 'opacity-60 grayscale bg-slate-50' : 'bg-white'
             )}>
               <div className="absolute top-0 right-0 p-3 z-10">
                  {!plan.ativo ? (
                     <Badge variant="outline" className="bg-slate-100 border-slate-200 uppercase text-[6px] font-bold tracking-widest py-0 px-1">OFFLINE</Badge>
                  ) : (
                     <div className="flex flex-col items-end gap-0.5">
                        <Badge className="bg-primary/5 text-primary border-none uppercase text-[6px] font-bold tracking-widest py-0 px-1">LIVE</Badge>
                        <div className="flex items-center gap-1 text-slate-400 group-hover:text-primary transition-colors">
                           <Users className="h-2 w-2" />
                           <span className="text-[7px] font-bold">{plan.active_count || 0}</span>
                        </div>
                     </div>
                  )}
               </div>

               <CardHeader className="p-3.5 pb-1">
                 <div className="space-y-1">
                   <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-md bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all border border-slate-100">
                         <Package className="h-3.5 w-3.5" />
                      </div>
                      <div>
                         <CardTitle className="text-sm font-bold uppercase tracking-tight text-slate-900 leading-none">{plan.nome}</CardTitle>
                         <p className="text-[6px] font-bold uppercase text-slate-400 tracking-widest">SaaS Node</p>
                      </div>
                   </div>
                 </div>
               </CardHeader>

               <CardContent className="p-3.5 pt-1 space-y-4">
                 <div className="relative">
                   <div className="text-xl font-bold tracking-tight text-slate-950 leading-none flex items-baseline">
                     <span className="text-[9px] font-bold mr-0.5">R$</span>
                     {Number(plan.valor_mensal).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                     <span className="text-[7px] font-bold text-slate-400 uppercase ml-1 tracking-widest">/ month</span>
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 group-hover:bg-white group-hover:border-primary/5 transition-colors">
                    <div className="space-y-0.5">
                       <p className="text-[6px] font-bold uppercase text-slate-400 tracking-widest">Capacidade</p>
                       <p className="text-base font-bold tracking-tight text-slate-800 leading-none">{plan.limite_alunos || "MAX"}</p>
                       <p className="text-[5px] font-bold uppercase text-slate-500">Students</p>
                    </div>
                    <div className="space-y-0.5 border-l border-slate-200 pl-2">
                       <p className="text-[6px] font-bold uppercase text-slate-400 tracking-widest">Revenue</p>
                       <p className="text-base font-bold tracking-tight text-emerald-600 leading-none">{formatCurrency(plan.valor_mensal * (plan.active_count || 0))}</p>
                       <p className="text-[5px] font-bold uppercase text-slate-500">Current MRR</p>
                    </div>
                 </div>

                 <div className="space-y-2">
                   <div className="flex flex-wrap gap-1.5 min-h-[25px]">
                     {plan.modulos && Object.entries(plan.modulos).length > 0 ? Object.entries(plan.modulos).filter(([_, m]: [any, any]) => m?.enabled).slice(0, 3).map(([k, _]) => (
                       <Badge key={k} variant="secondary" className="text-[7px] font-bold uppercase bg-white border border-slate-100 shadow-none rounded-md px-1.5 py-0 text-slate-600 tracking-tight">{MODULE_LABELS[k] || k}</Badge>
                     )) : (
                       <span className="text-[7px] text-slate-300 font-bold uppercase tracking-widest">Core Access</span>
                     )}
                     {Object.entries(plan.modulos || {}).filter(([_, m]: [any, any]) => m?.enabled).length > 3 && (
                       <Badge variant="outline" className="text-[6px] font-bold bg-slate-950 text-white border-none rounded-md px-1">
                         +{Object.entries(plan.modulos || {}).filter(([_, m]: [any, any]) => m?.enabled).length - 3}
                       </Badge>
                     )}
                   </div>
                 </div>

                 <div className="pt-3 border-t border-slate-50 flex gap-2">
                    <Button onClick={() => openEdit(plan)} className="flex-1 h-7.5 rounded-md bg-white border border-slate-200 text-slate-900 font-bold uppercase tracking-widest text-[8px] shadow-sm hover:shadow-md transition-all gap-1.5 px-0">
                       <Edit className="h-2.5 w-2.5" /> Configure
                    </Button>
                    <Button variant="ghost" className="h-7.5 w-7.5 rounded-md bg-slate-50 border border-slate-100 text-slate-400 hover:text-primary transition-all p-0">
                       <ArrowUpRight className="h-3 w-3" />
                    </Button>
                 </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
          <DialogHeader className="p-5 md:p-6 bg-slate-950 text-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Package className="h-5 w-5" />
                 </div>
                 <div>
                   <DialogTitle className="text-lg md:text-xl font-bold uppercase tracking-tight">{editing?.id ? "Editar Plano" : "Novo Plano"}</DialogTitle>
                   <DialogDescription className="text-slate-400 font-medium text-[8px] uppercase tracking-widest mt-0.5">SaaS Node Architecture</DialogDescription>
                 </div>
              </div>
              <div className="text-right flex flex-col items-end">
                 <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500">MRR Base</p>
                 <div className="text-xl font-bold text-primary">{formatCurrency(form.valor_mensal)}</div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10 custom-scrollbar bg-slate-50/30">
            {/* Informações Básicas */}
            <div className="grid lg:grid-cols-12 gap-8">
               <div className="lg:col-span-8 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                       <BarChart3 className="h-3 w-3" /> Identificação Comercial
                    </Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                       <div className="space-y-1">
                          <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome (ex: Pro Elite)" className="h-10 bg-white border border-slate-200 shadow-sm rounded-lg font-bold text-slate-900 px-3 text-sm uppercase tracking-tight" />
                          <p className="text-[7px] font-medium text-slate-400 uppercase tracking-widest pl-1">Identificação Comercial</p>
                       </div>
                       <div className="space-y-1">
                          <div className="relative group">
                             <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                             <Input type="number" value={form.valor_mensal} onChange={(e) => setForm({ ...form, valor_mensal: parseFloat(e.target.value) || 0 })} placeholder="0.00" className="h-10 pl-8 bg-white border border-slate-200 shadow-sm rounded-lg font-bold text-base text-primary px-3" />
                          </div>
                          <p className="text-[7px] font-medium text-slate-400 uppercase tracking-widest pl-1">Valor da Assinatura</p>
                       </div>
                    </div>
                    <div className="space-y-1">
                       <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Pitch de venda..." className="h-10 bg-white border border-slate-200 shadow-sm rounded-lg font-medium px-3 text-xs" />
                       <p className="text-[7px] font-medium text-slate-400 uppercase tracking-widest pl-1">Descrição Curta</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                     <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Layers className="h-3 w-3" /> Hard Limits (Capacidade)
                     </Label>
                     <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1.5">
                          <Input type="number" value={form.limite_alunos} onChange={(e) => setForm({ ...form, limite_alunos: parseInt(e.target.value) || 0 })} placeholder="0" className="h-10 bg-white border border-slate-200 rounded-lg font-bold text-center text-base" />
                          <p className="text-[7px] font-bold uppercase text-slate-400 text-center tracking-widest leading-none">Alunos Ativos</p>
                        </div>
                        <div className="space-y-1.5">
                          <Input type="number" value={form.limite_instrutores} onChange={(e) => setForm({ ...form, limite_instrutores: parseInt(e.target.value) || 0 })} placeholder="0" className="h-10 bg-white border border-slate-200 rounded-lg font-bold text-center text-base" />
                          <p className="text-[7px] font-bold uppercase text-slate-400 text-center tracking-widest leading-none">Professores</p>
                        </div>
                        <div className="space-y-1.5">
                          <Input type="number" value={form.limite_turmas} onChange={(e) => setForm({ ...form, limite_turmas: parseInt(e.target.value) || 0 })} placeholder="0" className="h-10 bg-white border border-slate-200 rounded-lg font-bold text-center text-base" />
                          <p className="text-[7px] font-bold uppercase text-slate-400 text-center tracking-widest leading-none">Turmas/Grade</p>
                        </div>
                     </div>
                  </div>
                  <div className="lg:col-span-4 space-y-5">
                  <div className="p-6 rounded-2xl bg-slate-950 text-white space-y-5 shadow-xl relative overflow-hidden group border border-white/5">
                     <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                        <Sparkles className="h-24 w-24 text-primary" />
                     </div>
                     <div className="relative z-10 space-y-0.5">
                        <p className="text-[8px] font-bold uppercase tracking-widest text-primary italic">Valuation Interno</p>
                        <h4 className="text-xl font-bold tracking-tight leading-none">{formatCurrency(totalModuleValuation)}</h4>
                        <p className="text-[7px] font-medium text-slate-500 uppercase tracking-widest">Soma dos Módulos</p>
                     </div>
                     
                     <div className="relative z-10 pt-4 border-t border-white/10 space-y-4">
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                           <div className="space-y-0.5">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Status Plano</p>
                              <p className="text-[7px] text-slate-500">Marketplace Live</p>
                           </div>
                           <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} className="data-[state=checked]:bg-primary scale-90" />
                        </div>
                        
                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-1.5">
                           <p className="text-[8px] font-bold text-primary uppercase tracking-widest italic flex items-center gap-2">
                              <ShieldCheck className="h-3 w-3" /> Billing Note
                           </p>
                           <p className="text-[7px] font-medium text-slate-400 leading-relaxed">
                              O valor final será <span className="text-white">R$ {form.valor_mensal}</span>.
                           </p>
                        </div>
                     </div>
                  </div>
               </div>
               </div>
            </div>

            {/* Módulos e Features Grupos */}
            <div className="space-y-6">
               <div className="border-b border-slate-200 pb-2 flex justify-between items-end">
                 <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Módulos & Valuation Individual</h3>
                 <p className="text-[8px] font-medium text-slate-400 uppercase">Referência de custo por módulo incluso</p>
               </div>

               {FEATURE_GROUPS.map(group => (
                 <div key={group.id} className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                       <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">{group.icon} {group.label}</h4>
                       <div className="flex gap-3">
                          <button className="text-[9px] font-bold uppercase text-primary hover:underline" onClick={() => toggleGroup(group.id, true)}>Ativar Tudo</button>
                          <button className="text-[9px] font-bold uppercase text-slate-400 hover:text-slate-600" onClick={() => toggleGroup(group.id, false)}>Limpar</button>
                       </div>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.features.map(feat => {
                        const data = getModuleData(form.modulos, feat.key);
                        return (
                          <div key={feat.key} className={cn(
                            "flex flex-col p-3 rounded-xl border transition-all space-y-3 group",
                            data.enabled ? "bg-white border-primary/20 shadow-sm ring-1 ring-primary/5" : "bg-slate-50/50 border-slate-200 grayscale opacity-60 hover:opacity-80"
                          )}>
                             <div className="flex items-start justify-between">
                                <span className={cn("text-[11px] font-bold uppercase tracking-tight", data.enabled ? "text-slate-900" : "text-slate-500")}>{feat.label}</span>
                                <Switch 
                                  checked={data.enabled} 
                                  onCheckedChange={() => toggleModule(feat.key)}
                                  className="scale-75 data-[state=checked]:bg-primary" 
                                />
                             </div>
                             
                             {data.enabled && (
                               <div className="flex items-center gap-2 animate-in slide-in-from-top-0.5 duration-200">
                                  <div className="relative flex-1">
                                     <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 uppercase">R$</span>
                                     <Input 
                                       type="number"
                                       step="0.01"
                                       value={data.price || ""}
                                       onChange={(e) => updateModulePrice(feat.key, parseFloat(e.target.value) || 0)}
                                       className="h-8 pl-7 bg-slate-50 border-none rounded-md font-bold text-xs text-slate-700 focus:ring-primary/20"
                                     />
                                  </div>
                                  <div className="h-7 w-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
                                     <DollarSign className="h-3 w-3" />
                                  </div>
                               </div>
                             )}
                          </div>
                        );
                      })}
                    </div>
                 </div>
               ))}
            </div>
          </div>

          <DialogFooter className="p-5 md:p-6 bg-slate-950 border-t shrink-0 flex flex-col sm:flex-row gap-3">
             <Button variant="ghost" onClick={() => setEditing(null)} className="h-9 px-5 font-bold uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 order-2 sm:order-1 transition-all text-[9px]">Descartar</Button>
             <Button className="h-10 px-8 font-bold uppercase tracking-widest shadow-xl shadow-primary/20 rounded-lg order-1 sm:order-2 text-[10px]" onClick={() => savePlan.mutate()} disabled={!form.nome || savePlan.isPending}>
               {savePlan.isPending ? "Processando..." : editing?.id ? "Atualizar Plano" : "Publicar Plano"}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
