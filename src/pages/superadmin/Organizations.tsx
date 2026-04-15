import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Building2, Settings, ToggleLeft, Package, Edit, Search, Plus, Loader2, Users, UserPlus, Trash2, Save, CreditCard, ExternalLink, ShieldCheck, UserCircle, LayoutGrid, CheckCircle2, History, ArrowUpRight } from "lucide-react";

// Categorização de Features (Sincronizada com Features.tsx e Plans.tsx)
const FEATURE_GROUPS = [
  {
    id: "admin",
    label: "Administrativo",
    icon: <ShieldCheck className="h-4 w-4" />,
    features: [
      { key: "agenda", label: "Agenda / Grade" },
      { key: "alunos", label: "Alunos / Matrículas" },
      { key: "presencas", label: "Controle de Presença" },
      { key: "financeiro", label: "Financeiro" },
      { key: "contratos", label: "Contratos e Assinaturas" },
      { key: "crm", label: "CRM / Leads" },
      { key: "pdv", label: "PDV / Loja" },
      { key: "relatorios", label: "Relatórios Avançados" },
      { key: "integracoes", label: "Integrações" },
      { key: "avisos", label: "Mural de Avisos" },
    ]
  },
  {
    id: "instructor",
    label: "Instrutor",
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
    label: "Aluno (App)",
    icon: <UserCircle className="h-4 w-4" />,
    features: [
      { key: "student_booking", label: "Agendamento de Aulas" },
      { key: "student_financial", label: "Financeiro do Aluno" },
      { key: "student_progress", label: "Meu Progresso" },
      { key: "student_documents", label: "Meus Documentos" },
      { key: "student_checkin", label: "Check-in via QR Code" },
      { key: "student_messages", label: "Chat / Mensagens" },
    ]
  }
];

function PaymentsTab({ studioId }: { studioId: string }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ provider: "mercadopago", config: {} as any, ativa: true });

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["superadmin-studio-payments-v53-sb", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase.from("integrations").select("*").eq("studio_id", studioId).eq("category", "pagamento");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        studio_id: studioId, provider: form.provider, category: "pagamento",
        display_name: form.provider.charAt(0).toUpperCase() + form.provider.slice(1),
        config: form.config, ativa: form.ativa, updated_at: new Date().toISOString(),
      };
      if (editingId && editingId !== "new") {
        const { error } = await supabase.from("integrations").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("integrations").insert({ ...payload, created_at: new Date().toISOString() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Pagamento configurado!");
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["superadmin-studio-payments-v53-sb", studioId] });
    },
    onError: (err: any) => toast.error("Erro ao salvar: " + err.message),
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary/30 h-10 w-10" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b pb-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 italic">Configurações de Gateway</h3>
        {!editingId && (
          <Button size="sm" variant="outline" className="uppercase font-bold text-[10px] tracking-widest border-slate-300 shadow-sm" onClick={()=>{setEditingId("new"); setForm({provider:"mercadopago", config:{}, ativa:true});}}>Nova Conexão</Button>
        )}
      </div>

      {editingId ? (
        <Card className="border-none shadow-md ring-1 ring-primary/20 bg-slate-50/50 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-xs uppercase tracking-widest text-primary">{editingId === "new" ? "Cadastrar" : "Editar"} Integração</h4>
            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button>
          </div>
          
          <div className="grid gap-6">
            <div className="space-y-2">
              <Label className="font-bold">Provedor de Pagamento</Label>
              <Select value={form.provider} onValueChange={(v)=>setForm({...form, provider: v, config: {}})}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stripe">Stripe (Global)</SelectItem>
                  <SelectItem value="mercadopago">Mercado Pago (América Latina)</SelectItem>
                  <SelectItem value="pagarme">Pagar.me (Brasil)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.provider === "mercadopago" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Access Token</Label>
                  <Input type="password" value={form.config.access_token || ""} onChange={(e)=>setForm({...form, config: {...form.config, access_token: e.target.value}})} placeholder="APP_USR-..." className="h-12 rounded-2xl bg-white border-slate-100 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Public Key</Label>
                  <Input value={form.config.public_key || ""} onChange={(e)=>setForm({...form, config: {...form.config, public_key: e.target.value}})} placeholder="APP_USR-..." className="h-12 rounded-2xl bg-white border-slate-100 font-bold" />
                </div>
              </div>
            )}

            {form.provider === "stripe" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 opacity-60">
                <div className="space-y-2"><Label className="text-xs font-bold uppercase text-slate-500">Publishable Key</Label><Input value={form.config.publishable_key || ""} onChange={(e)=>setForm({...form, config: {...form.config, publishable_key: e.target.value}})} placeholder="pk_live_..." className="h-12" /></div>
                <div className="space-y-2"><Label className="text-xs font-bold uppercase text-slate-500">Secret Key</Label><Input type="password" value={form.config.secret_key || ""} onChange={(e)=>setForm({...form, config: {...form.config, secret_key: e.target.value}})} placeholder="sk_live_..." className="h-12" /></div>
              </div>
            )}

            <div className="flex items-center gap-3 p-4 bg-white border rounded-xl">
              <Switch checked={form.ativa} onCheckedChange={(v)=>setForm({...form, ativa: v})} className="data-[state=checked]:bg-teal-600" />
              <div className="space-y-0.5"><Label className="font-bold block uppercase text-[10px] tracking-widest">Gateway Ativado</Label><p className="text-[10px] text-muted-foreground">O estúdio poderá receber pagamentos através desta conta.</p></div>
            </div>

            <Button className="w-full h-12 font-black uppercase tracking-widest shadow-lg" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Salvar Gateway
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {integrations.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-slate-50">
               <CreditCard className="h-10 w-10 text-slate-200 mx-auto" />
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-4">Nenhuma configuração financeira ativa.</p>
            </div>
          ) : integrations.map((i: any) => (
            <div key={i.id} className="flex items-center justify-between p-5 border rounded-2xl bg-white hover:shadow-md transition-all group">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-black text-sm uppercase tracking-tight italic">{i.display_name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{i.provider === 'stripe' ? (i.config.publishable_key?.slice(0, 12) + '...') : (i.config.public_key?.slice(0, 12) + '...')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                 <Badge variant={i.ativa ? "default" : "outline"} className={`uppercase text-[9px] font-black ${i.ativa ? 'bg-teal-600' : ''}`}>{i.ativa ? "Operacional" : "Offline"}</Badge>
                 <Button variant="ghost" size="icon" className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity" onClick={()=>{setEditingId(i.id); setForm({provider: i.provider, config: i.config, ativa: i.ativa});}}>
                    <Edit className="h-4 w-4" />
                 </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SuperAdminOrganizations() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
  const [editTab, setEditTab] = useState("config");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newOrg, setNewOrg] = useState({ nome: "", slug: "", email_contato: "", saas_plan_id: "" });
  const [editOrgData, setEditOrgData] = useState<any>({});
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("admin");
  const [addingMember, setAddingMember] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (selectedOrg) setEditOrgData(selectedOrg);
  }, [selectedOrg]);

  // 1. Fetching base studios and plans
  const { data: orgs = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["superadmin-orgs-v53-sb", user?.id],
    enabled: !!user && !loading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studios")
        .select(`*, saas_plans (id, nome, valor_mensal, modulos)`)
        .order("nome", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: plansList = [] } = useQuery({
    queryKey: ["superadmin-saas-plans-shared-sb"],
    queryFn: async () => {
      const { data, error } = await supabase.from("saas_plans").select("*").order("valor_mensal", { ascending: true });
      if (error) return [];
      return data;
    },
  });

  const { data: orgMembers = [] } = useQuery({
    queryKey: ["superadmin-org-members-v53-sb", selectedOrg?.id],
    enabled: !!selectedOrg,
    queryFn: async () => {
      // In multi-tenant, we fetch from memberships and join profiles
      const { data, error } = await supabase
        .from("memberships")
        .select(`
          user_id,
          roles,
          profiles (
            id,
            nome,
            email,
            avatar_url
          )
        `)
        .eq("studio_id", selectedOrg.id);
      
      if (error) return [];
      
      // Flatten for the UI
      return (data || []).map(m => ({
        ...m.profiles,
        role: Array.isArray(m.roles) ? m.roles[0] : m.roles
      }));
    },
  });

  const handleAddMember = async () => {
    if (!memberEmail.trim() || !selectedOrg) return;
    setAddingMember(true);
    try {
      const { data: profile, error: findError } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", memberEmail.trim().toLowerCase())
        .maybeSingle();

      if (findError) throw findError;
      if (!profile) throw new Error("Usuário não cadastrado no sistema.");
      
      const { error: updateError } = await supabase
        .from("memberships")
        .upsert({ 
          user_id: profile.id, 
          studio_id: selectedOrg.id, 
          roles: [memberRole] 
        }, { onConflict: 'user_id, studio_id' });

      if (updateError) throw updateError;

      toast.success(`${profile.nome || memberEmail} vinculado como ${memberRole}!`);
      setMemberEmail("");
      queryClient.invalidateQueries({ queryKey: ["superadmin-org-members-v53-sb", selectedOrg.id] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao adicionar membro");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!confirm(`Desvincular ${memberName} deste estúdio?`)) return;
    const { error } = await supabase
      .from("memberships")
      .delete()
      .eq("user_id", userId)
      .eq("studio_id", selectedOrg?.id);
    if (error) { toast.error("Erro ao remover: " + error.message); return; }
    toast.success("Vínculo removido.");
    queryClient.invalidateQueries({ queryKey: ["superadmin-org-members-v53-sb", selectedOrg?.id] });
  };

  const updateOrg = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from("studios").update(updates).eq("id", selectedOrg.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dados do estúdio salvos!");
      queryClient.invalidateQueries({ queryKey: ["superadmin-orgs-v53-sb"] });
    },
    onError: (err: any) => toast.error("Erro ao salvar: " + err.message),
  });

  const toggleFeature = (key: string, enabled: boolean) => {
    const currentFeatures = editOrgData.features || {};
    setEditOrgData({
      ...editOrgData,
      features: { ...currentFeatures, [key]: enabled }
    });
  };

  const toggleGroup = (groupId: string, enabled: boolean) => {
    const group = FEATURE_GROUPS.find(g => g.id === groupId);
    if (!group) return;

    const groupKeys = group.features.map(f => f.key);
    const nextFeatures = { ...editOrgData.features || {} };
    groupKeys.forEach(k => { nextFeatures[k] = enabled; });
    setEditOrgData({ ...editOrgData, features: nextFeatures });
  };

  const handleCreateOrg = async () => {
    if (!newOrg.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    setCreating(true);
    try {
      const slug = newOrg.slug.trim() || newOrg.nome.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { error } = await supabase.from("studios").insert({
        nome: newOrg.nome.trim(),
        slug,
        email_contato: newOrg.email_contato || null,
        saas_plan_id: newOrg.saas_plan_id || null,
        ativa: true,
        features: {}, // Iniciará herdando do plano ou vazio
        created_at: new Date().toISOString()
      });
      if (error) throw error;
      toast.success("Novo estúdio criado!");
      setCreateOpen(false);
      setNewOrg({ nome: "", slug: "", email_contato: "", saas_plan_id: "" });
      queryClient.invalidateQueries({ queryKey: ["superadmin-orgs-v53-sb"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar");
    } finally {
      setCreating(false);
    }
  };

  // 2. Fetching all active subscriptions for MRR calculating
  const { data: subs = [] } = useQuery({
    queryKey: ["superadmin-org-subs-sb"],
    enabled: !!user && !loading,
    queryFn: async () => {
      const { data, error } = await supabase.from("saas_subscriptions").select("*").eq("status", "active");
      if (error) return [];
      return data;
    },
  });

  // 3. Counting profiles (members) total per studio
  const { data: memberCounts = [] } = useQuery({
    queryKey: ["superadmin-org-member-counts-sb"],
    enabled: !!user && !loading,
    queryFn: async () => {
      // Manual fetch from memberships instead of profiles
      const { data: membs, error: mErr } = await supabase.from("memberships").select("studio_id, roles");
      if (mErr) return {};
      
      const counts: Record<string, { total: number, students: number }> = {};
      membs.forEach(m => {
        if (!m.studio_id) return;
        if (!counts[m.studio_id]) counts[m.studio_id] = { total: 0, students: 0 };
        counts[m.studio_id].total++;
        const roleArray = Array.isArray(m.roles) ? m.roles : [m.roles];
        if (roleArray.includes('student')) counts[m.studio_id].students++;
      });
      return counts;
    },
  });

  const getAddonTotal = (features: any, planModules: any): number => {
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

  const consolidatedOrgs = useMemo(() => {
    return orgs.filter((o: any) =>
      (o.nome || "").toLowerCase().includes(search.toLowerCase()) || (o.slug || "").toLowerCase().includes(search.toLowerCase())
    ).map((o: any) => {
      const studioSub = subs.find((s: any) => s.studio_id === o.id);
      const basePrice = Number(studioSub?.discount_price || o.saas_plans?.valor_mensal || 0);
      const addonPrice = getAddonTotal(o.features, o.saas_plans?.modulos);
      const mrr = basePrice + addonPrice;
      const counts = (memberCounts as any)[o.id] || { total: 0, students: 0 };
      
      return { ...o, mrr, ...counts };
    });
  }, [orgs, search, subs, memberCounts]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-10 animate-in fade-in duration-700 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <Badge className="bg-primary/5 text-primary border-none text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 mb-1">Partners Center</Badge>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 uppercase leading-none">
               Command <span className="text-primary tracking-normal">Organizações</span>
            </h1>
            <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest">Infraestrutura Multitenant</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="w-full md:w-auto h-8 px-5 font-bold uppercase tracking-widest gap-2 shadow-sm shadow-primary/5 rounded-lg text-[9px]">
            <Plus className="h-3.5 w-3.5" /> Novo Estúdio
          </Button>
        </div>

        <Card className="border-none shadow-sm rounded-xl bg-white overflow-hidden ring-1 ring-slate-100">
          <div className="p-3 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-4">
             <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <Input 
                  placeholder="Localizar estúdio por nome ou slug..." 
                  value={search} onChange={(e) => setSearch(e.target.value)} 
                  className="pl-9 h-9 bg-white/5 border-white/5 text-white placeholder:text-slate-600 rounded-lg focus:ring-primary/20 text-[11px]" />
             </div>
             <div className="flex gap-2">
                <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 flex flex-col items-center min-w-[50px]">
                   <span className="text-[6px] font-bold text-slate-600 uppercase tracking-widest">Total</span>
                   <span className="text-xs font-bold text-white leading-none mt-0.5">{orgs.length}</span>
                </div>
                <div className="px-3 py-1 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex flex-col items-center min-w-[70px]">
                   <span className="text-[6px] font-bold text-emerald-600 uppercase tracking-widest leading-none">Profitability</span>
                   <span className="text-xs font-bold text-emerald-400 leading-none mt-0.5">{formatCurrency(consolidatedOrgs.reduce((acc, o) => acc + o.mrr, 0))}</span>
                </div>
             </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 border-none">
                  <TableHead className="font-bold text-[7px] uppercase tracking-widest py-2.5 pl-5">Organização / Studio</TableHead>
                  <TableHead className="font-bold text-[7px] uppercase tracking-widest">Configuração SaaS</TableHead>
                  <TableHead className="font-bold text-[7px] uppercase tracking-widest">Uso de Limites</TableHead>
                  <TableHead className="font-bold text-[7px] uppercase tracking-widest">MRR Previsto</TableHead>
                  <TableHead className="font-bold text-[7px] uppercase tracking-widest text-right pr-5">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgsLoading ? (
                  <TableRow><TableCell colSpan={5} className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary/30" /></TableCell></TableRow>
                ) : consolidatedOrgs.map((org: any) => (
                  <TableRow key={org.id} className="hover:bg-slate-50/50 transition-all group border-b border-slate-100">
                    <TableCell className="py-3 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                           {org.logo_url ? <img src={org.logo_url} className="h-full w-full object-cover" /> : <Building2 className="h-4 w-4 text-slate-300" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 uppercase tracking-tight leading-none text-sm">{org.nome}</p>
                          <div className="flex items-center gap-2 mt-1">
                             <Badge variant="outline" className="text-[7px] font-bold uppercase tracking-tight h-3.5 bg-slate-50 border-slate-200 px-1">@{org.slug}</Badge>
                             <span className="text-[7px] text-slate-400 font-medium uppercase"><History className="h-1.5 w-1.5 inline mr-1" /> {new Date(org.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                       <div className="space-y-1.5">
                          <Badge className="font-black text-[9px] uppercase tracking-widest bg-blue-50 text-blue-600 border-blue-100 shadow-none px-2 h-5">
                             {org.saas_plans?.nome || "Plano Custom"}
                          </Badge>
                          <div className="flex items-center gap-2">
                             <Badge variant={org.status_assinatura === "active" ? "default" : "destructive"} className={`uppercase text-[8px] font-black h-4 px-1.5 ${org.status_assinatura === "active" ? 'bg-emerald-500' : ''}`}>
                               {org.status_assinatura === "active" ? "Regular" : (org.status_assinatura || "No Sub")}
                             </Badge>
                             <Switch checked={org.ativa} className="scale-50 h-4 w-8 data-[state=checked]:bg-emerald-500" disabled />
                          </div>
                       </div>
                    </TableCell>
                           <TableCell>
                        <div className="max-w-[120px] space-y-1.5">
                           <div className="flex justify-between items-center px-0.5">
                              <span className="text-[8px] font-bold uppercase text-slate-400">{org.students} / {org.limite_alunos || 0} alunos</span>
                              <span className="text-[8px] font-bold text-slate-900">{Math.round((org.students / (org.limite_alunos || 1)) * 100)}%</span>
                           </div>
                           <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                              <div 
                                 className={cn(
                                   "h-full transition-all duration-1000",
                                   (org.students / (org.limite_alunos || 1)) > 0.9 ? "bg-red-500" : "bg-primary"
                                 )} 
                                 style={{ width: `${Math.min(100, (org.students / (org.limite_alunos || 1)) * 100)}%` }} 
                              />
                           </div>
                        </div>
                     </TableCell>
                     <TableCell>
                        <div className="space-y-0.5">
                           <p className="text-sm font-bold tracking-tight text-slate-900">{formatCurrency(org.mrr)}</p>
                        </div>
                     </TableCell>
                    <TableCell className="text-right pr-6">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                          <Button variant="outline" size="sm" 
                            className="h-9 rounded-lg bg-slate-900 text-white font-black text-[9px] uppercase hover:bg-black gap-2 border-none shadow-md px-3" 
                            onClick={() => { localStorage.setItem("selectedTenant", JSON.stringify({ id: org.id, nome: org.nome })); window.location.href = "/admin"; }}>
                             <ExternalLink className="h-3 w-3" /> Aceder
                          </Button>
                          <Button variant="secondary" size="icon" className="h-9 w-9 rounded-lg shadow-sm bg-white border border-slate-100" onClick={() => setSelectedOrg(org)}>
                             <Edit className="h-3.5 w-3.5 text-slate-600" />
                          </Button>
                       </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* MODAL DE EDIÇÃO (Dialog) */}
      <Dialog open={!!selectedOrg} onOpenChange={(o) => !o && setSelectedOrg(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden rounded-[2rem]">
          <DialogHeader className="p-5 md:p-6 bg-slate-900 text-white shrink-0">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                  <Building2 className="h-5 w-5 text-primary-foreground" />
               </div>
               <div>
                  <DialogTitle className="text-lg md:text-xl font-bold uppercase tracking-tight leading-none">{selectedOrg?.nome}</DialogTitle>
                  <DialogDescription className="text-slate-400 font-mono text-[8px] mt-1 uppercase">ID: {selectedOrg?.id}</DialogDescription>
               </div>
            </div>
          </DialogHeader>

          <Tabs value={editTab} onValueChange={setEditTab} className="flex-1 flex flex-col overflow-hidden">
             <div className="px-8 bg-slate-50 border-b">
                <TabsList className="bg-transparent border-none gap-8 h-12">
                   <TabsTrigger value="config" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary font-bold text-xs uppercase rounded-none px-0">Geral</TabsTrigger>
                   <TabsTrigger value="plan" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary font-bold text-xs uppercase rounded-none px-0">SaaS & Limites</TabsTrigger>
                   <TabsTrigger value="features" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary font-bold text-xs uppercase rounded-none px-0">Módulos Ativos</TabsTrigger>
                   <TabsTrigger value="members" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary font-bold text-xs uppercase rounded-none px-0">Usuários Vinculados</TabsTrigger>
                   <TabsTrigger value="payments" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary font-bold text-xs uppercase rounded-none px-0">Gateways</TabsTrigger>
                   <TabsTrigger value="danger" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-red-600 data-[state=active]:text-red-600 font-bold text-xs uppercase rounded-none px-0">Zona de Perigo</TabsTrigger>
                </TabsList>
             </div>

             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {/* TAB: CONFIG GERAL */}
                <TabsContent value="config" className="space-y-8 mt-0">
                   <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                         <Label className="font-bold">Nome Fantasia</Label>
                         <Input value={editOrgData?.nome || ""} onChange={(e) => setEditOrgData({...editOrgData, nome: e.target.value})} className="h-12" />
                      </div>
                      <div className="space-y-2">
                         <Label className="font-bold">Identificador (Slug)</Label>
                         <Input value={editOrgData?.slug || ""} onChange={(e) => setEditOrgData({...editOrgData, slug: e.target.value})} className="h-12 font-mono uppercase" />
                      </div>
                      <div className="space-y-2">
                         <Label className="font-bold">E-mail Administrativo</Label>
                         <Input value={editOrgData?.email_contato || ""} onChange={(e) => setEditOrgData({...editOrgData, email_contato: e.target.value})} className="h-12" />
                      </div>
                      <div className="space-y-2">
                         <Label className="font-bold">Telefone / WhatsApp</Label>
                         <Input value={editOrgData?.telefone || ""} onChange={(e) => setEditOrgData({...editOrgData, telefone: e.target.value})} className="h-12" />
                      </div>
                   </div>
                   
                   <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
                         <div className="space-y-0.5">
                            <Label className="font-bold text-slate-900 italic uppercase">Estado de Atividade</Label>
                            <p className="text-xs text-slate-500">Se inativo, nenhum usuário poderá acessar o tenant.</p>
                         </div>
                         <Switch checked={editOrgData?.ativa ?? true} onCheckedChange={(v) => setEditOrgData({...editOrgData, ativa: v})} className="data-[state=checked]:bg-teal-600" />
                      </div>

                      <div className="space-y-2">
                         <Label className="font-bold text-slate-900 uppercase text-xs">Status Crítico de Assinatura</Label>
                         <Select value={editOrgData?.status_assinatura || "active"} onValueChange={(v) => setEditOrgData({...editOrgData, status_assinatura: v})}>
                            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                            <SelectContent>
                               <SelectItem value="active" className="font-bold text-teal-600">ATIVO (Sessão normal)</SelectItem>
                               <SelectItem value="blocked">BLOQUEADO (Suspensão imediata)</SelectItem>
                               <SelectItem value="unpaid">INADIMPLENTE (Aviso recorrente)</SelectItem>
                               <SelectItem value="canceled text-red-600">CANCELADO (Remoção programada)</SelectItem>
                            </SelectContent>
                         </Select>
                      </div>
                   </div>
                </TabsContent>

                {/* TAB: SAAS & LIMITES */}
                <TabsContent value="plan" className="space-y-6 mt-0">
                   <div className="p-5 bg-slate-900 rounded-xl text-white flex items-center justify-between shadow-md">
                      <div className="flex items-center gap-3">
                        <Package className="h-6 w-6 text-primary" />
                        <div>
                           <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Plano Atribuído</p>
                           <h3 className="text-xl font-bold uppercase tracking-tight">
                             {plansList.find((p:any)=>p.id === editOrgData?.saas_plan_id)?.nome || "Personalizado"}
                           </h3>
                        </div>
                      </div>
                      <Select value={editOrgData?.saas_plan_id || ""} onValueChange={(val) => {
                        const plan = plansList.find((p: any) => p.id === val);
                        setEditOrgData({...editOrgData, saas_plan_id: val, limite_alunos: plan?.limite_alunos ?? editOrgData.limite_alunos, limite_instrutores: plan?.limite_instrutores ?? editOrgData.limite_instrutores });
                      }}>
                        <SelectTrigger className="w-52 bg-white/10 border-white/20 text-white font-bold h-10 uppercase tracking-tight"><SelectValue placeholder="Trocar Plano..." /></SelectTrigger>
                        <SelectContent>
                           {plansList.map((p: any) => (<SelectItem key={p.id} value={p.id} className="font-bold text-xs">{p.nome} - R$ {p.valor_mensal}</SelectItem>))}
                        </SelectContent>
                      </Select>
                   </div>

                   <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1.5 p-4 border rounded-xl bg-slate-50/50">
                         <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Limite Real: Alunos</Label>
                         <Input type="number" value={editOrgData?.limite_alunos || 0} onChange={(e) => setEditOrgData({...editOrgData, limite_alunos: parseInt(e.target.value) || 0})} className="h-10 text-xl font-bold tracking-tight text-slate-800" />
                      </div>
                      <div className="space-y-1.5 p-4 border rounded-xl bg-slate-50/50">
                         <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Instrutores</Label>
                         <Input type="number" value={editOrgData?.limite_instrutores || 0} onChange={(e) => setEditOrgData({...editOrgData, limite_instrutores: parseInt(e.target.value) || 0})} className="h-10 text-xl font-bold tracking-tight text-slate-800" />
                      </div>
                      <div className="space-y-1.5 p-4 border rounded-xl bg-slate-50/50">
                         <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Turmas</Label>
                         <Input type="number" value={editOrgData?.limite_turmas || 0} onChange={(e) => setEditOrgData({...editOrgData, limite_turmas: parseInt(e.target.value) || 0})} className="h-10 text-xl font-bold tracking-tight text-slate-800" />
                      </div>
                   </div>
                </TabsContent>

                {/* TAB: FEATURES (Agrupadas) */}
                <TabsContent value="features" className="space-y-6 mt-0">
                   <div className="flex items-center justify-between mb-2">
                       <div className="space-y-1">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Módulos Habilitados</h3>
                          <p className="text-[10px] text-muted-foreground">O acesso às rotas é bloqueado se o módulo estiver inativo.</p>
                       </div>
                   </div>
                   
                   <div className="grid gap-6">
                      {FEATURE_GROUPS.map(group => (
                        <Card key={group.id} className="border-none shadow-sm ring-1 ring-slate-100 overflow-hidden rounded-xl">
                           <CardHeader className="bg-slate-50/50 flex flex-row items-center justify-between py-2.5">
                              <CardTitle className="text-[10px] font-bold uppercase flex items-center gap-2 tracking-wider text-slate-600">
                                 {group.icon} {group.label}
                              </CardTitle>
                              <div className="flex gap-4">
                                 <span className="text-[8px] font-bold uppercase cursor-pointer text-teal-600 underline" onClick={()=>toggleGroup(group.id, true)}>Habilitar Todos</span>
                                 <span className="text-[8px] font-bold uppercase cursor-pointer text-slate-400 underline" onClick={()=>toggleGroup(group.id, false)}>Limpar</span>
                              </div>
                           </CardHeader>
                           <CardContent className="p-4 grid grid-cols-2 gap-3">
                              {group.features.map(f => (
                                 <div key={f.key} className="flex items-center justify-between p-3 rounded-xl border hover:bg-slate-50 transition-colors">
                                    <span className="text-xs font-bold text-slate-700">{f.label}</span>
                                    <Switch checked={editOrgData?.features?.[f.key] !== false} onCheckedChange={(v)=>toggleFeature(f.key, v)} className="scale-75 data-[state=checked]:bg-teal-600" />
                                 </div>
                              ))}
                           </CardContent>
                        </Card>
                      ))}
                   </div>
                </TabsContent>

                {/* TAB: MEMBERS */}
                <TabsContent value="members" className="space-y-6 mt-0">
                   <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <div className="flex gap-4 items-end">
                         <div className="flex-1 space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest">E-mail do Usuário</Label>
                            <Input placeholder="usuario@kineos.com" value={memberEmail} onChange={(e)=>setMemberEmail(e.target.value)} className="h-12" />
                         </div>
                         <div className="w-32 space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest">Cargo</Label>
                            <Select value={memberRole} onValueChange={setMemberRole}>
                               <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                               <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="instructor">Instrutor</SelectItem>
                                  <SelectItem value="student">Aluno</SelectItem>
                               </SelectContent>
                            </Select>
                         </div>
                         <Button onClick={handleAddMember} disabled={addingMember} className="h-12 px-6 gap-2 font-bold uppercase tracking-tight">
                            {addingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Vincular
                         </Button>
                      </div>
                   </div>

                   <div className="space-y-2 divide-y">
                      {orgMembers.map((m: any) => (
                         <div key={m.id} className="py-4 flex items-center justify-between group/user">
                            <div className="flex items-center gap-3">
                               <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                  {m.nome?.[0] || m.email?.[0]}
                               </div>
                               <div>
                                  <p className="font-bold text-slate-800">{m.nome || "Novo Integrante"}</p>
                                  <p className="text-xs text-muted-foreground">{m.email} · <Badge variant="outline" className="text-[9px] uppercase font-black">{m.role}</Badge></p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover/user:opacity-100" onClick={() => handleRemoveMember(m.id, m.nome)}>
                               <Trash2 className="h-4 w-4" />
                            </Button>
                         </div>
                      ))}
                      {orgMembers.length === 0 && <p className="text-center py-20 text-slate-400 italic">Nenhum membro vinculado.</p>}
                   </div>
                </TabsContent>

                {/* TAB: PAYMENTS */}
                <TabsContent value="payments" className="mt-0">
                   <PaymentsTab studioId={selectedOrg?.id} />
                </TabsContent>

                {/* TAB: DANGER ZONE */}
                <TabsContent value="danger" className="space-y-6 mt-0">
                   <div className="p-8 border-2 border-red-100 bg-red-50/30 rounded-3xl space-y-6">
                      <div className="flex items-center gap-4 text-red-600">
                         <div className="p-3 bg-red-100 rounded-full">
                            <Trash2 className="h-6 w-6" />
                         </div>
                         <div>
                            <h3 className="text-lg font-black uppercase tracking-tighter">Exclusão Irreversível</h3>
                            <p className="text-xs font-medium text-red-800 opacity-80">Esta ação apagará todos os dados, alunos, financeiro e membros exclusivos deste estúdio.</p>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Para confirmar, digite o nome do estúdio abaixo:</Label>
                            <Input 
                               placeholder={selectedOrg?.nome}
                               value={deleteConfirmName}
                               onChange={(e) => setDeleteConfirmName(e.target.value)}
                               className="h-12 border-red-200 focus:ring-red-500/20 font-bold"
                            />
                         </div>

                         <Button 
                            variant="destructive"
                            className="w-full h-14 font-black uppercase tracking-widest shadow-xl shadow-red-600/20 gap-2"
                            disabled={deleteConfirmName !== selectedOrg?.nome || isDeleting}
                            onClick={async () => {
                               if (!confirm("VOCÊ TEM CERTEZA? Esta ação não pode ser desfeita e todos os dados serão perdidos permanentemente.")) return;
                               setIsDeleting(true);
                               try {
                                  const { data, error } = await supabase.rpc('delete_studio_completely', { p_studio_id: selectedOrg.id });
                                  if (error) throw error;
                                  if (!data.success) throw new Error(data.message);

                                  toast.success(data.message);
                                  setSelectedOrg(null);
                                  queryClient.invalidateQueries({ queryKey: ["superadmin-orgs-v53-sb"] });
                               } catch (err: any) {
                                  toast.error("Erro na exclusão: " + err.message);
                               } finally {
                                  setIsDeleting(false);
                                  setDeleteConfirmName("");
                               }
                            }}
                         >
                            {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                            Confirmar Remoção Nuclear
                         </Button>
                      </div>
                   </div>

                   <div className="p-4 bg-slate-900 rounded-2xl text-white text-[10px] space-y-2 opacity-80">
                      <p className="font-bold uppercase tracking-widest text-amber-500 flex items-center gap-2">
                         <LayoutGrid className="h-3 w-3" /> Política de Retenção Multi-tenant
                      </p>
                      <p className="leading-relaxed">
                         Usuários que possuem acesso a outros estúdios no ecossistema Kineos **NÃO** serão excluídos do sistema global. Apenas o vínculo (membership) e os perfis vinculados estritamente a esta empresa serão removidos.
                      </p>
                   </div>
                </TabsContent>
             </div>

             <DialogFooter className="p-5 md:p-6 bg-slate-50 border-t shrink-0">
                <Button variant="ghost" onClick={() => setSelectedOrg(null)} className="font-bold text-[10px] uppercase">Descartar</Button>
                <Button className="h-10 px-6 font-bold uppercase tracking-widest shadow-sm shadow-primary/10 gap-2 text-[10px] rounded-lg" 
                  onClick={() => updateOrg.mutate({
                    nome: editOrgData?.nome,
                    slug: editOrgData?.slug,
                    email_contato: editOrgData?.email_contato,
                    telefone: editOrgData?.telefone,
                    ativa: editOrgData?.ativa,
                    status_assinatura: editOrgData?.status_assinatura,
                    saas_plan_id: editOrgData?.saas_plan_id,
                    limite_alunos: editOrgData?.limite_alunos,
                    limite_instrutores: editOrgData?.limite_instrutores,
                    limite_turmas: editOrgData?.limite_turmas,
                    features: editOrgData?.features
                  })} 
                  disabled={updateOrg.isPending}>
                  {updateOrg.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Atualizar Estúdio
                </Button>
             </DialogFooter>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CRIAÇÃO */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-900 p-8 text-white relative">
             <div className="absolute top-0 right-0 p-8 opacity-10"><Building2 className="h-32 w-32" /></div>
             <DialogHeader>
                <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter italic">Novo Tenant</DialogTitle>
                <DialogDescription className="text-slate-400">Inicie uma nova jornada de estúdio no Kineos.</DialogDescription>
             </DialogHeader>
          </div>
          <div className="p-8 space-y-6 bg-white">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold">Nome do Estúdio</Label>
                <Input placeholder="Ex: Studio Pilates Vitta" value={newOrg.nome} onChange={(e) => setNewOrg({ ...newOrg, nome: e.target.value })} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase text-slate-400">Selecione o Plano SaaS</Label>
                <Select value={newOrg.saas_plan_id} onValueChange={(v)=>setNewOrg({...newOrg, saas_plan_id: v})}>
                   <SelectTrigger className="h-12 italic font-bold uppercase tracking-tighter"><SelectValue placeholder="Escolha um plano de entrada..." /></SelectTrigger>
                   <SelectContent>
                      {plansList.map((p: any) => (<SelectItem key={p.id} value={p.id} className="font-bold">{p.nome}</SelectItem>))}
                   </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full h-14 font-black uppercase tracking-widest gap-2 shadow-xl shadow-primary/20" onClick={handleCreateOrg} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Ativar Estúdio Agora
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}

