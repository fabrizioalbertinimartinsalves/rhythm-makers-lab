/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  ToggleLeft, 
  Search, 
  Building2, 
  UserCircle, 
  Users, 
  ShieldCheck, 
  LayoutGrid,
  Zap,
  CheckCircle2,
  AlertCircle,
  Archive,
  ChevronRight,
  Filter,
  Layers,
  Sparkles,
  Smartphone,
  Crown,
  DollarSign,
  Coins,
  TrendingUp,
  BarChart3,
  Globe,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURE_GROUPS = [
  {
    id: "admin_core",
    label: "Gestão Core",
    desc: "Módulos essenciais de operação",
    icon: <ShieldCheck className="h-5 w-5" />,
    color: "bg-blue-600",
    features: [
      { key: "agenda", label: "Agenda / Grade", desc: "Grade de horários e agendamento de turmas" },
      { key: "alunos", label: "Gestão de Alunos (Inteligência)", desc: "Controle de vagas e inteligência de ocupação" },
      { key: "presencas", label: "Controle de Presença", desc: "Gestão centralizada de faltas e presenças" },
      { key: "modalidades", label: "Gestão de Modalidades", desc: "Configuração de taxas e regras por aula" },
      { key: "agenda_hibrida", label: "Grade Híbrida", desc: "Gestão de aulas presenciais e online" },
      { key: "agendamentos", label: "Controle de Agendamentos", desc: "Gestão de reservas e cancelamentos" },
      { key: "checkin", label: "Check-in Consolidado", desc: "Painel de recepção e confirmação rápida" },
    ]
  },
  {
    id: "financeiro",
    label: "Financeiro & Contratos",
    desc: "Faturamento, repasses e documentos",
    icon: <DollarSign className="h-5 w-5" />,
    color: "bg-emerald-600",
    features: [
      { key: "financeiro", label: "Faturamento Automatizado", desc: "Motor de cobrança recorrente inteligente" },
      { key: "repasses", label: "Repasses a Instrutores", desc: "Cálculo automatizado de comissões/salários" },
      { key: "instrutores", label: "Gestão de Equipe", desc: "Cadastro e controle de acessos da equipe" },
      { key: "contratos", label: "Contratos Automáticos", desc: "Geração e assinatura digital" },
      { key: "planos_estudio", label: "Gestão de Planos", desc: "Criação de ofertas para os alunos" },
      { key: "vendas_avulsas", label: "Vendas Avulsas", desc: "Lançamentos financeiros de balcão" },
    ]
  },
  {
    id: "comercial",
    label: "Comercial & Vendas",
    desc: "Aquisição e fidelização de alunos",
    icon: <Sparkles className="h-5 w-5" />,
    color: "bg-orange-600",
    features: [
      { key: "crm", label: "CRM / Funil", desc: "Gestão de leads e funil de vendas" },
      { key: "experimentais", label: "Experimentos (Pagos)", desc: "Venda de aulas experimentais individualizadas" },
      { key: "pre_matriculas", label: "Pré-Matrículas Online", desc: "Reserva de vaga via link externo" },
      { key: "parcerias", label: "Parcerias & Convênios", desc: "Gestão de descontos e convênios" },
      { key: "agendamento_online", label: "Agendamento Online", desc: "Check-in/Agendamento via site público" },
    ]
  },
  {
    id: "loja_festival",
    label: "Loja & Eventos",
    desc: "Produtos, figurinos e produção",
    icon: <Archive className="h-5 w-5" />,
    color: "bg-pink-600",
    features: [
      { key: "pdv", label: "PDV / Balcão", desc: "Venda rápida de produtos e lanchonete" },
      { key: "loja", label: "Loja Online / Catálogo", desc: "Venda de produtos via e-commerce" },
      { key: "figurinos", label: "Gestão de Figurinos", desc: "Aluguel, venda e estoque de figurinos" },
      { key: "festivais", label: "Gestão Festival", desc: "Inscrições, ensaios e produção de eventos" },
    ]
  },
  {
    id: "inteligencia",
    label: "Inteligência & Sistema",
    desc: "Relatórios, BI e configurações",
    icon: <BarChart3 className="h-5 w-5" />,
    color: "bg-blue-900",
    features: [
      { key: "relatorios", label: "Relatórios Avançados", desc: "Dashboards e exportações de dados" },
      { key: "ltv", label: "Análise LTV / Churn", desc: "Métricas de retenção e evasão" },
      { key: "backups", label: "Backups de Segurança", desc: "Exportação total da base de dados" },
      { key: "integracoes", label: "Integrações", desc: "WhatsApp, Mercado Pago, etc." },
      { key: "avisos", label: "Mural de Comunicação", desc: "Avisos gerais para alunos e equipe" },
    ]
  },
  {
    id: "instructor",
    label: "Portal do Instrutor",
    desc: "Acesso para professores",
    icon: <Users className="h-5 w-5" />,
    color: "bg-purple-600",
    features: [
      { key: "instructor_agenda", label: "Agenda do Instrutor", desc: "Visualização das próprias aulas" },
      { key: "instructor_attendance", label: "Realizar Chamada", desc: "Lançamento manual de presenças" },
      { key: "instructor_records", label: "Prontuários / Evolução", desc: "Registro técnico do aluno" },
      { key: "instructor_notices", label: "Avisos Internos", desc: "Acesso ao mural da equipe" },
    ]
  },
  {
    id: "student",
    label: "Portal do Aluno (APP)",
    desc: "Experiência mobile",
    icon: <Smartphone className="h-5 w-5" />,
    color: "bg-teal-600",
    features: [
      { key: "student_booking", label: "Agendamento App", desc: "Check-in via aplicativo" },
      { key: "student_financial", label: "Minhas Faturas", desc: "Histórico de pagamentos" },
      { key: "student_progress", label: "Meu Progresso", desc: "Evolução e registros físicos" },
      { key: "student_documents", label: "Meus Documentos", desc: "Contratos e assinaturas" },
      { key: "student_checkin", label: "Auto Check-in (QR)", desc: "Confirmação via QR Code" },
      { key: "student_messages", label: "Chat Direto", desc: "Mensagens com a recepção" },
    ]
  }
];

const PRESETS: Record<string, { label: string; icon: any; features: string[] }> = {
  essential: {
    label: "Essencial",
    icon: Zap,
    features: ["agenda", "alunos", "presencas", "avisos", "instructor_agenda", "instructor_attendance", "student_booking"]
  },
  pro: {
    label: "Profissional",
    icon: Layers,
    features: ["agenda", "alunos", "presencas", "financeiro", "crm", "avisos", "instructor_agenda", "instructor_attendance", "instructor_records", "instructor_notices", "student_booking", "student_financial", "student_progress"]
  },
  enterprise: {
    label: "Enterprise",
    icon: Crown,
    features: FEATURE_GROUPS.flatMap(g => g.features.map(f => f.key))
  }
};

export default function SuperAdminFeatures() {
  const queryClient = useQueryClient();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: orgs = [] } = useQuery({
    queryKey: ["superadmin-orgs-list-sb"],
    queryFn: async () => {
      const { data, error } = await supabase.from("studios").select("id, nome, slug, logo_url").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: studioData } = useQuery({
    queryKey: ["superadmin-org-features-sb", selectedOrgId],
    enabled: !!selectedOrgId,
    queryFn: async () => {
      const { data, error } = await supabase.from("studios").select("features, nome").eq("id", selectedOrgId!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: globalStats = {} } = useQuery({
    queryKey: ["superadmin-features-global-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("studios").select("features");
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach((s: any) => {
        const f = s.features || {};
        Object.keys(f).forEach(key => {
          const val = f[key];
          const isEnabled = typeof val === 'boolean' ? val : !!val?.enabled;
          if (isEnabled) counts[key] = (counts[key] || 0) + 1;
        });
      });
      return counts;
    },
  });

  const { data: activeSub } = useQuery({
    queryKey: ["superadmin-org-sub-sb", selectedOrgId],
    enabled: !!selectedOrgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_subscriptions")
        .select("*, saas_plans(*)")
        .eq("studio_id", selectedOrgId!)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const updateFeaturesMutation = useMutation({
    mutationFn: async (newFeatures: any) => {
      const { error } = await supabase.from("studios").update({
        features: newFeatures,
        updated_at: new Date().toISOString()
      }).eq("id", selectedOrgId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-org-features-sb", selectedOrgId] });
      toast.success("Configuração de módulos atualizada!");
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar: " + err.message);
    }
  });

  // HELPER: Check if a module is included in the plan
  const isIncludedInPlan = (key: string): boolean => {
    const planMods = activeSub?.saas_plans?.modulos;
    if (!planMods) return false;
    
    if (Array.isArray(planMods)) return planMods.includes(key);
    
    const modData = planMods[key];
    if (typeof modData === 'boolean') return modData;
    if (typeof modData === 'object' && modData !== null) return !!modData.enabled;
    
    return false;
  };

  // HELPER: Normalize feature data (handles old boolean or new object style)
  const getFeatureData = (key: string): { enabled: boolean; price: number; isAddon: boolean } => {
    const f = studioData?.features || {};
    const val = f[key];
    const isPlanFeature = isIncludedInPlan(key);

    let enabled = false;
    let price = 0;

    if (typeof val === 'boolean') {
        enabled = val;
    } else if (typeof val === 'object' && val !== null) {
        enabled = !!val.enabled;
        price = Number(val.price || 0);
    }

    // If it's in the plan, it's ALWAYS enabled (or at least available) 
    // and its price doesn't count as an addon for the studio
    return { 
      enabled: isPlanFeature || enabled, 
      price: isPlanFeature ? 0 : price,
      isAddon: !isPlanFeature && enabled
    };
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    
    if (confirm(`Deseja aplicar o Preset "${preset.label}"? Isso manterá os preços atuais de cada módulo.`)) {
      const currentFeatures = studioData?.features || {};
      const newFeatures: any = {};
      
      preset.features.forEach(key => {
        const existing = getFeatureData(key);
        newFeatures[key] = { enabled: true, price: existing.price };
      });
      
      // Also keep disabled features if they had a price or just set them to disabled
      Object.keys(currentFeatures).forEach(key => {
        if (!preset.features.includes(key)) {
          const existing = getFeatureData(key);
          newFeatures[key] = { enabled: false, price: existing.price };
        }
      });

      updateFeaturesMutation.mutate(newFeatures);
    }
  };

  const toggleFeature = (key: string, enabled: boolean) => {
    const currentFeatures = studioData?.features || {};
    const existing = getFeatureData(key);
    updateFeaturesMutation.mutate({ 
      ...currentFeatures, 
      [key]: { enabled, price: existing.price } 
    });
  };

  const updateFeaturePrice = (key: string, price: number) => {
    const currentFeatures = studioData?.features || {};
    const existing = getFeatureData(key);
    updateFeaturesMutation.mutate({ 
      ...currentFeatures, 
      [key]: { enabled: existing.enabled, price } 
    });
  };

  const bulkToggleGroup = (groupId: string, enabled: boolean) => {
    const group = FEATURE_GROUPS.find(g => g.id === groupId);
    if (!group) return;

    const currentFeatures = studioData?.features || {};
    const newFeatures = { ...currentFeatures };
    group.features.forEach(f => {
      const existing = getFeatureData(f.key);
      newFeatures[f.key] = { enabled, price: existing.price };
    });
    updateFeaturesMutation.mutate(newFeatures);
  };

  const activeFeaturesCount = useMemo(() => {
    const f = studioData?.features || {};
    return Object.keys(f).filter(key => getFeatureData(key).enabled).length;
  }, [studioData]);

  const totalExtraCost = useMemo(() => {
    const f = studioData?.features || {};
    return Object.keys(f).reduce((acc, key) => {
      const data = getFeatureData(key);
      return data.enabled ? acc + data.price : acc;
    }, 0);
  }, [studioData]);

  const selectedOrg = orgs.find((o: any) => o.id === selectedOrgId);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-20 animate-in fade-in duration-500 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <Badge className="bg-primary/5 text-primary border-none text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 mb-1">Inventory v7.5.2</Badge>
            <h1 className="text-lg md:text-xl font-bold tracking-tight flex items-center gap-3 uppercase text-slate-900 leading-none">
              Command <span className="text-primary tracking-normal">Features</span>
            </h1>
            <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest">Gestão de Módulos e Monetização</p>
          </div>
          {selectedOrgId && (
            <div className="flex bg-slate-100/30 backdrop-blur-sm p-1 rounded-lg gap-1 border border-slate-200 shadow-sm">
               {Object.entries(PRESETS).map(([key, preset]) => (
                 <Button 
                   key={key}
                   variant="ghost" 
                   size="sm" 
                   className="rounded-md text-[8px] font-bold uppercase tracking-widest gap-2 hover:bg-white hover:shadow-sm h-7 px-3 transition-all text-slate-500 hover:text-primary"
                   onClick={() => applyPreset(key)}
                 >
                   <preset.icon className="h-3 w-3" />
                   {preset.label}
                 </Button>
               ))}
            </div>
          )}
        </div>

        {/* Global Stats Dashboard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
           <Card className="border-none shadow-sm rounded-xl bg-slate-900 text-white overflow-hidden p-3.5 hover:scale-[1.01] transition-all ring-1 ring-white/10">
              <div className="flex justify-between items-start mb-2">
                 <div className="h-7 w-7 rounded-md bg-white/10 flex items-center justify-center">
                    <LayoutGrid className="h-3.5 w-3.5 text-primary" />
                 </div>
                 <Badge className="bg-primary/20 text-primary border-none text-[6px] font-bold uppercase px-1 py-0">STOCK</Badge>
              </div>
              <p className="text-[7px] font-bold uppercase tracking-widest text-slate-500">Inventory</p>
              <h3 className="text-lg font-bold tracking-tight text-white leading-none mt-0.5">
                 {FEATURE_GROUPS.reduce((acc, g) => acc + g.features.length, 0)}
              </h3>
           </Card>

           <Card className="border-none shadow-sm rounded-xl bg-white overflow-hidden p-3.5 hover:scale-[1.01] transition-all ring-1 ring-slate-100">
              <div className="flex justify-between items-start mb-2">
                 <div className="h-7 w-7 rounded-md bg-orange-50 flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5 text-orange-600" />
                 </div>
                 <Badge variant="outline" className="text-orange-500 border-orange-100 text-[6px] font-bold uppercase px-1 py-0">ADDONS</Badge>
              </div>
              <p className="text-[7px] font-bold uppercase tracking-widest text-slate-400">Paid Features</p>
              <h3 className="text-lg font-bold tracking-tight text-slate-900 leading-none mt-0.5">
                 {Object.values(studioData?.features || {}).filter((f: any) => !isIncludedInPlan(f.key) && f.enabled).length || 0}
              </h3>
           </Card>

           <Card className="border-none shadow-sm rounded-xl bg-white overflow-hidden p-3.5 hover:scale-[1.01] transition-all ring-1 ring-slate-100">
              <div className="flex justify-between items-start mb-2">
                 <div className="h-7 w-7 rounded-md bg-emerald-50 flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                 </div>
                 <Badge variant="outline" className="text-emerald-500 border-emerald-100 text-[6px] font-bold uppercase px-1 py-0">REV</Badge>
              </div>
              <p className="text-[7px] font-bold uppercase tracking-widest text-slate-400">Total MRR Impact</p>
              <h3 className="text-lg font-bold tracking-tight text-slate-900 leading-none mt-0.5">{formatCurrency(totalExtraCost)}</h3>
           </Card>

           <Card className="border-none shadow-sm rounded-xl bg-white overflow-hidden p-3.5 hover:scale-[1.01] transition-all ring-1 ring-slate-100">
              <div className="flex justify-between items-start mb-2">
                 <div className="h-7 w-7 rounded-md bg-blue-50 flex items-center justify-center">
                    <Globe className="h-3.5 w-3.5 text-blue-600" />
                 </div>
                 <Badge variant="outline" className="text-blue-500 border-blue-100 text-[6px] font-bold uppercase px-1 py-0">POP</Badge>
              </div>
              <p className="text-[7px] font-bold uppercase tracking-widest text-slate-400">Hottest Module</p>
              <h3 className="text-sm font-bold tracking-tight text-slate-900 leading-none uppercase truncate max-w-full mt-0.5">
                 {Object.entries(globalStats).sort(([,a], [,b]) => b - a)[0]?.[0] || '—'}
              </h3>
           </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* SELECTOR SIDEBAR */}
          <div className="lg:col-span-4 space-y-6">
              <Card className="border-none shadow-sm rounded-xl bg-white overflow-hidden group ring-1 ring-slate-100">
                <div className="h-20 bg-slate-950 relative overflow-hidden flex items-center px-6">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                   <div className="relative z-10">
                      <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500 mb-1">Target Tenant</p>
                      <h2 className="text-base md:text-lg font-bold text-white uppercase tracking-tight leading-none">{selectedOrg?.nome || "Selecione" }</h2>
                   </div>
                </div>
                
                 <CardContent className="p-5 space-y-5">
                   <div className="space-y-2">
                      <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 pl-1">Selecione o Estúdio</Label>
                      <Select value={selectedOrgId || ""} onValueChange={setSelectedOrgId}>
                        <SelectTrigger className="h-10 rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-900 focus:ring-primary/20 shadow-sm hover:border-primary/20 transition-all px-4 text-xs">
                          <SelectValue placeholder="Escolha um estúdio..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-2xl p-1">
                          {orgs.map((org: any) => (
                            <SelectItem key={org.id} value={org.id} className="rounded-lg font-bold py-2.5 hover:bg-slate-50">
                               <div className="flex items-center gap-2.5">
                                  <div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                                     {org.logo_url ? <img src={org.logo_url} className="h-full w-full object-cover" /> : <Building2 className="h-3.5 w-3.5 text-slate-400" />}
                                  </div>
                                  <span className="text-xs uppercase tracking-tight">{org.nome}</span>
                               </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                   </div>

                   {selectedOrgId && (
                     <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="p-5 rounded-xl bg-slate-950 text-white relative overflow-hidden shadow-md">
                           <div className="absolute top-0 right-0 p-4 opacity-10">
                              <Coins className="h-12 w-12" />
                           </div>
                           <div className="relative z-10">
                              <p className="text-[8px] font-bold uppercase tracking-widest text-primary mb-3">Conciliação Mensal</p>
                              <div className="space-y-0.5 mb-4">
                                 <h4 className="text-2xl font-bold tracking-tight">{formatCurrency(totalExtraCost)}</h4>
                              </div>
                              <div className="flex justify-between items-end">
                                 <div>
                                    <p className="text-[8px] font-bold uppercase text-slate-500 tracking-widest">Módulos</p>
                                    <p className="text-base font-bold text-primary">{activeFeaturesCount} <span className="text-[8px] font-normal text-slate-500">/ 20</span></p>
                                 </div>
                              </div>
                           </div>
                        </div>
                        <div className="p-1 bg-slate-100 rounded-lg flex items-center">
                           <div className="relative flex-1 group">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-primary transition-colors" />
                              <Input 
                                placeholder="Filtrar..." 
                                value={search} 
                                onChange={(e) => setSearch(e.target.value)} 
                                className="pl-9 h-9 bg-white border-none rounded-md font-bold uppercase text-[9px] tracking-widest focus-visible:ring-0 shadow-sm" 
                              />
                           </div>
                        </div>
                     </div>
                   )}
                </CardContent>
             </Card>

             <div className="px-8 space-y-2 py-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Guia de Valuation</p>
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                   <div className="h-2 w-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
                   <span>Admin Core (Faturamento Base)</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                   <div className="h-2 w-2 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
                   <span>Instrutor (Addon de Escala)</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                   <div className="h-2 w-2 rounded-full bg-pink-500 shadow-sm shadow-pink-500/50" />
                   <span>Aluno App (Engagement Plus)</span>
                </div>
             </div>
          </div>

          {/* FEATURES GRID */}
          <div className="lg:col-span-8 space-y-10">
            {!selectedOrgId ? (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-20 rounded-[4rem] border-2 border-dashed border-slate-200 bg-slate-50/50">
                 <div className="h-24 w-24 rounded-full bg-white shadow-xl flex items-center justify-center mb-8 pulse">
                    <Building2 className="h-10 w-10 text-primary animate-pulse" />
                 </div>
                 <h3 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">Cockpit Inativo</h3>
                 <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] max-w-xs mt-3 leading-relaxed">Selecione um estúdio no painel lateral para iniciar a configuração da matriz de features.</p>
              </div>
            ) : (
              FEATURE_GROUPS.map((group) => {
                const features = group.features.filter(f => 
                  f.label.toLowerCase().includes(search.toLowerCase()) || 
                  f.key.toLowerCase().includes(search.toLowerCase())
                );

                if (features.length === 0) return null;

                return (
                  <div key={group.id} className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                    <div className="flex items-center justify-between px-1">
                       <div className="flex items-center gap-3">
                          <div className={cn("h-9 w-9 rounded-lg text-white shadow-md flex items-center justify-center", group.color)}>
                             {group.icon}
                          </div>
                           <div>
                              <h3 className="font-bold text-lg text-slate-900 uppercase tracking-tight leading-none">{group.label}</h3>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 opacity-70">{group.desc}</p>
                           </div>
                        </div>
                        <div className="flex bg-slate-100/80 backdrop-blur-sm p-0.5 rounded-lg border border-slate-200">
                           <Button variant="ghost" size="sm" className="h-7 px-3 text-[8px] font-bold uppercase tracking-widest text-slate-600 hover:text-primary rounded-md" onClick={() => bulkToggleGroup(group.id, true)}>Habilitar</Button>
                           <Button variant="ghost" size="sm" className="h-7 px-3 text-[8px] font-bold uppercase tracking-widest text-slate-400 hover:text-destructive rounded-md" onClick={() => bulkToggleGroup(group.id, false)}>Zerar</Button>
                        </div>
                     </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      {features.map((f) => {
                        const data = getFeatureData(f.key);
                        const usage = globalStats[f.key] || 0;
                        const included = isIncludedInPlan(f.key);

                        return (
                           <Card key={f.key} className={cn(
                             "border-none shadow-md transition-all rounded-xl overflow-hidden group hover:scale-[1.01] active:scale-[0.99] ring-1 ring-slate-100",
                             data.enabled ? "bg-white" : "bg-slate-50/50 opacity-60 grayscale shadow-none"
                           )}>
                             <CardContent className="p-4">
                              <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 space-y-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <p className={cn("font-bold uppercase text-[12px] tracking-tight leading-none", data.enabled ? "text-slate-900" : "text-slate-400")}>{f.label}</p>
                                      {included && (
                                        <Badge className="bg-sky-50 text-sky-600 border-none text-[6px] font-bold uppercase h-3 px-1 tracking-widest shadow-none">Nativo</Badge>
                                      )}
                                    </div>
                                    <p className="text-[7.5px] font-bold text-slate-400 leading-none uppercase tracking-widest">{f.desc}</p>
                                  </div>
                                  <Switch 
                                    checked={data.enabled} 
                                    onCheckedChange={(enabled) => toggleFeature(f.key, enabled)} 
                                    disabled={included}
                                    className="scale-90 data-[state=checked]:bg-primary shadow-sm"
                                  />
                                </div>

                                 <div className="flex items-center gap-3 pt-3 border-t border-slate-50">
                                    <div className="flex-1 relative">
                                       <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-[9px]">R$</div>
                                       <Input 
                                         type="number"
                                         step="0.01"
                                         placeholder="0,00"
                                         value={data.price || ""}
                                         onChange={(e) => updateFeaturePrice(f.key, Number(e.target.value))}
                                         className="h-7 pl-7 bg-slate-900 text-white border-none rounded-md font-bold text-[11px] tracking-tight focus-visible:ring-primary/40"
                                       />
                                    </div>
                                    <div className="h-7 w-7 rounded-md bg-slate-50 flex flex-col items-center justify-center border border-slate-100 group-hover:bg-primary/5 transition-colors">
                                       <span className="text-[11px] font-bold text-slate-900 leading-none">{usage}</span>
                                       <span className="text-[5px] font-bold uppercase text-slate-400">Labs</span>
                                    </div>
                                  </div>

                                  {included && (
                                     <div className="pt-1 flex items-center gap-1.5">
                                        <ShieldCheck className="h-3 w-3 text-sky-500" />
                                        <p className="text-[8px] font-black uppercase text-sky-600 tracking-widest italic leading-none">Módulo nativo do plano</p>
                                     </div>
                                  )}
                                </div>
                             </CardContent>
                           </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
