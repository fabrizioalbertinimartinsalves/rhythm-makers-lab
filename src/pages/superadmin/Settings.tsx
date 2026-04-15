import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Globe, 
  Shield, 
  Database, 
  Settings2, 
  Bell, 
  FileText, 
  Palette, 
  Zap, 
  Save, 
  Loader2,
  Mail,
  Smartphone,
  MessageSquare,
  ArrowUpRight,
  Users,
  Package,
  Plus,
  CreditCard,
  Edit,
  Search
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function SuperAdminSettings() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");
  const [brandingConfig, setBrandingConfig] = useState({
    primary_color: "#0D9488",
    logo_url: "",
    success_message: "",
    community_link: "",
    success_redirect_url: ""
  });

  // 2. Fetch System Metrics
  const { data: stats } = useQuery({
    queryKey: ["superadmin-system-stats-sb"],
    enabled: !!user && !authLoading,
    queryFn: async () => {
      const [orgs, users, plans] = await Promise.all([
        supabase.from("studios").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("saas_plans").select("*", { count: "exact", head: true }).eq("ativo", true),
      ]);
      return {
        orgs: orgs.count || 0,
        users: users.count || 0,
        plans: plans.count || 0,
      };
    },
  });
  
  // 3. Fetch Branding Config
  const { data: defaultOrg } = useQuery({
    queryKey: ["superadmin-default-org-sb"],
    enabled: !!user && !authLoading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studios")
        .select("*")
        .eq("slug", "platform")
        .maybeSingle();
      
      if (data) {
        setBrandingConfig({
          primary_color: data.primary_color || "#0D9488",
          logo_url: data.logo_url || "",
          success_message: data.success_message || "",
          community_link: data.community_link || "",
          success_redirect_url: data.success_redirect_url || ""
        });
      }
      return data;
    },
  });

  const updateDefaultOrg = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!defaultOrg?.id) return;
      const { error } = await supabase
        .from("studios")
        .update(updates)
        .eq("id", defaultOrg.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-default-org-sb"] });
      toast.success("Configuração global atualizada!");
    },
    onError: (err: any) => toast.error("Erro ao salvar: " + err.message),
  });

  const updateBranding = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase
        .from("studios")
        .update(updates)
        .eq("slug", "platform");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-default-org-sb"] });
      toast.success("Identidade visual atualizada!");
    },
    onError: (err: any) => toast.error("Erro ao salvar branding: " + err.message),
  });

  return (
    <SuperAdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-500 px-4">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <Badge className="bg-primary/5 text-primary border-none text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 mb-1">Control v7.5.2</Badge>
            <h1 className="text-lg md:text-xl font-bold uppercase tracking-tight text-slate-950 flex items-center gap-3 leading-none">
              Command <span className="text-primary tracking-normal">Center</span>
            </h1>
            <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest">Controle Mestre da Infraestrutura SaaS</p>
          </div>
          <Button className="h-8 px-5 font-bold uppercase tracking-widest text-[9px] shadow-sm shadow-primary/5 rounded-lg gap-2 bg-slate-950" onClick={() => (window as any).location.reload()}>
            <Loader2 className="h-3.5 w-3.5 animate-spin hidden group-hover:block" /> Sync Ledger
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
           <div className="bg-white/50 backdrop-blur-sm p-1 rounded-xl border border-slate-200 inline-flex shadow-sm">
              <TabsList className="bg-transparent border-none h-8 gap-1">
                 <TabsTrigger value="general" className="rounded-lg px-3 text-[9px] font-bold uppercase tracking-tight data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                    <Globe className="h-3 w-3 mr-1.5" /> Plataforma
                 </TabsTrigger>
                 <TabsTrigger value="branding" className="rounded-lg px-3 text-[9px] font-bold uppercase tracking-tight data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                    <Palette className="h-3 w-3 mr-1.5" /> Branding
                 </TabsTrigger>
                 <TabsTrigger value="notifications" className="rounded-lg px-3 text-[9px] font-bold uppercase tracking-tight data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                    <Bell className="h-3 w-3 mr-1.5" /> Webhooks
                 </TabsTrigger>
                 <TabsTrigger value="legal" className="rounded-lg px-3 text-[9px] font-bold uppercase tracking-tight data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                    <FileText className="h-3 w-3 mr-1.5" /> Legal
                 </TabsTrigger>
                 <TabsTrigger value="payments" className="rounded-lg px-3 text-[9px] font-bold uppercase tracking-tight data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                    <CreditCard className="h-3 w-3 mr-1.5" /> Gateway SaaS
                 </TabsTrigger>
              </TabsList>
           </div>

           {/* CONTENT: PLATAFORMA */}
           <TabsContent value="general" className="animate-in fade-in slide-in-from-bottom-2 duration-500 mt-0">
              <div className="grid lg:grid-cols-12 gap-6">
                 <div className="lg:col-span-8 space-y-6">
                    <Card className="border-none shadow-sm rounded-xl overflow-hidden bg-white ring-1 ring-slate-100">
                       <CardHeader className="p-4 border-b bg-slate-50/50">
                          <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-800 flex items-center gap-2">
                             <Shield className="h-3.5 w-3.5 text-primary" /> Master Organization (Branding)
                          </CardTitle>
                          <CardDescription className="text-[9px] font-medium">Dados globais da plataforma Kineos.</CardDescription>
                       </CardHeader>
                       <CardContent className="p-4 space-y-5">
                          <div className="grid gap-3.5 sm:grid-cols-2">
                             <div className="space-y-1">
                                <Label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nome Fantasia Público</Label>
                                <Input defaultValue="Kineos" disabled className="h-8 border-slate-100 bg-slate-50/50 font-bold text-slate-700" />
                             </div>
                             <div className="space-y-1">
                                <Label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 ml-1">Identificador Global</Label>
                                <Input defaultValue="kineos-platform" disabled className="h-8 border-slate-100 bg-slate-50/50 font-mono text-[9px] uppercase" />
                             </div>
                             <div className="space-y-1">
                                <Label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 ml-1">Timezone do Sistema</Label>
                                <Input defaultValue="America/Sao_Paulo" disabled className="h-8 border-slate-100 bg-slate-50/50 font-bold text-xs" />
                             </div>
                             <div className="space-y-1">
                                <Label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 ml-1">Moeda Padrão</Label>
                                <Input defaultValue="BRL" disabled className="h-8 border-slate-100 bg-slate-50/50 font-bold text-xs" />
                             </div>
                          </div>
                          <div className="bg-amber-50 p-2 rounded flex gap-2 items-center text-[9px] text-amber-700 font-bold uppercase tracking-widest">
                             <Shield className="h-3 w-3" /> Propriedades read-only em nível de banco
                          </div>
                       </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm rounded-xl overflow-hidden bg-white ring-1 ring-slate-100">
                        <CardHeader className="p-4 border-b bg-slate-50/50">
                           <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-800 flex items-center gap-2">
                              <Zap className="h-3.5 w-3.5 text-primary" /> Defaults Administrativos
                           </CardTitle>
                           <CardDescription className="text-[9px] font-medium">Configurações para novos estúdios cadastrados.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                           <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="space-y-0.5">
                                 <Label className="font-bold text-[10px] uppercase tracking-widest leading-tight">Período de Trial Automático</Label>
                                 <p className="text-[9px] text-slate-400 font-medium">Novos estúdios ganham acesso por este tempo.</p>
                              </div>
                              <div className="flex items-center gap-3">
                                 <Input type="number" defaultValue={15} className="w-16 h-8 font-bold text-center text-xs border-none shadow-sm" />
                                 <span className="text-[9px] font-bold uppercase text-slate-400">Dias</span>
                              </div>
                           </div>
                           <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="space-y-0.5">
                                 <Label className="font-bold text-[10px] uppercase tracking-widest leading-tight">Auto-ativação de Features</Label>
                                 <p className="text-[9px] text-slate-400 font-medium">Ativa módulos essenciais ao criar conta.</p>
                              </div>
                              <Switch defaultChecked className="data-[state=checked]:bg-teal-600 scale-90" />
                           </div>
                        </CardContent>
                    </Card>
                 </div>

                 <div className="lg:col-span-4 space-y-6">
                    <Card className="border-none shadow-sm rounded-xl bg-slate-900 text-white overflow-hidden p-5 space-y-4">
                       <h3 className="text-[8px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                          <Database className="h-3 w-3" /> Snapshot do Sistema
                       </h3>
                       <div className="space-y-3">
                          <div className="flex justify-between items-end border-b border-white/10 pb-2.5">
                             <div>
                                <p className="text-[7px] font-bold uppercase tracking-widest text-slate-400">Total de Organizações</p>
                                <p className="text-xl font-bold tracking-tight text-primary leading-none">{stats?.orgs ?? "—"}</p>
                             </div>
                             <ArrowUpRight className="h-3.5 w-3.5 text-primary mb-1" />
                          </div>
                          <div className="flex justify-between items-end border-b border-white/10 pb-2.5">
                             <div>
                                <p className="text-[7px] font-bold uppercase tracking-widest text-slate-400">Contas de Usuário</p>
                                <p className="text-lg font-bold tracking-tight leading-none">{stats?.users ?? "—"}</p>
                             </div>
                             <Users className="h-3.5 w-3.5 text-slate-500 mb-1" />
                          </div>
                          <div className="flex justify-between items-end pb-1">
                             <div>
                                <p className="text-[7px] font-bold uppercase tracking-widest text-slate-400">Planos em Oferta</p>
                                <p className="text-lg font-bold tracking-tight leading-none">{stats?.plans ?? "—"}</p>
                             </div>
                             <Package className="h-3.5 w-3.5 text-slate-500 mb-1" />
                          </div>
                       </div>
                    </Card>

                    <div className="p-5 rounded-xl border-2 border-dashed border-slate-200 text-center space-y-2">
                       <Shield className="h-5 w-5 text-slate-300 mx-auto" />
                       <p className="text-[8px] font-bold uppercase text-slate-400">Sessão Autenticada</p>
                       <p className="text-xs font-bold text-slate-600 truncate">{user?.email}</p>
                       <Badge className="bg-slate-100 text-slate-500 border-none text-[7px] font-bold uppercase tracking-widest">Global Master Access</Badge>
                    </div>
                 </div>
              </div>
           </TabsContent>

           {/* CONTENT: BRANDING DEFAULTS */}
           <TabsContent value="branding" className="animate-in fade-in slide-in-from-bottom-2 duration-500 mt-0 pt-0">
                <Card className="border-none shadow-sm rounded-xl bg-white max-w-4xl overflow-hidden ring-1 ring-slate-100">
                   <div className="grid lg:grid-cols-2">
                      <div className="p-6 space-y-6 bg-slate-50/50 border-r">
                         <div className="space-y-4">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Identidade da Plataforma (SaaS)</h3>
                            
                            <div className="space-y-4">
                               <div className="space-y-2">
                                  <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Cor Primária (HEX)</Label>
                                  <div className="flex items-center gap-3">
                                     <div 
                                       className="h-10 w-10 rounded-xl shadow-inner border border-white/20" 
                                       style={{ backgroundColor: brandingConfig.primary_color }} 
                                     />
                                     <Input 
                                       value={brandingConfig.primary_color} 
                                       onChange={(e) => setBrandingConfig({...brandingConfig, primary_color: e.target.value})}
                                       className="h-10 border-slate-200 bg-white font-mono text-xs uppercase"
                                       placeholder="#0D9488"
                                     />
                                  </div>
                               </div>

                               <div className="space-y-2">
                                  <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">URL do Logotipo</Label>
                                  <Input 
                                    value={brandingConfig.logo_url} 
                                    onChange={(e) => setBrandingConfig({...brandingConfig, logo_url: e.target.value})}
                                    className="h-10 border-slate-200 bg-white text-xs"
                                    placeholder="https://..."
                                  />
                               </div>

                               <div className="space-y-2">
                                  <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Link da Comunidade (WhatsApp/Discord)</Label>
                                  <Input 
                                    value={brandingConfig.community_link} 
                                    onChange={(e) => setBrandingConfig({...brandingConfig, community_link: e.target.value})}
                                    className="h-10 border-slate-200 bg-white text-xs"
                                    placeholder="Ex: https://chat.whatsapp.com/..."
                                  />
                               </div>
                            </div>
                         </div>
                      </div>
                      <div className="p-6 space-y-6">
                         <div className="space-y-4">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mensagens de Sucesso</h3>
                            
                            <div className="space-y-4">
                               <div className="space-y-2">
                                  <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Mensagem de Boas-Vindas</Label>
                                  <Textarea 
                                    value={brandingConfig.success_message} 
                                    onChange={(e) => setBrandingConfig({...brandingConfig, success_message: e.target.value})}
                                    className="min-h-[100px] border-slate-200 bg-white text-xs resize-none"
                                    placeholder="Mensagem exibida na página de sucesso do pagamento..."
                                  />
                               </div>

                               <div className="space-y-2">
                                  <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">URL de Redirecionamento Final (Auto)</Label>
                                  <Input 
                                    value={brandingConfig.success_redirect_url} 
                                    onChange={(e) => setBrandingConfig({...brandingConfig, success_redirect_url: e.target.value})}
                                    className="h-10 border-slate-200 bg-white text-xs"
                                    placeholder="Para onde levar o usuário após 5 segundos..."
                                  />
                               </div>

                               <Button 
                                 disabled={updateBranding.isPending}
                                 onClick={() => updateBranding.mutate(brandingConfig)}
                                 className="w-full h-11 bg-slate-950 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-950/10 gap-2"
                               >
                                 {updateBranding.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                 Salvar Identidade Visual
                               </Button>
                            </div>
                         </div>
                      </div>
                   </div>
                </Card>
            </TabsContent>

           {/* CONTENT: NOTIFICATIONS / WEBHOOKS */}
           <TabsContent value="notifications" className="animate-in fade-in slide-in-from-bottom-2 duration-500 mt-0">
                <div className="max-w-4xl space-y-4">
                   <div className="grid sm:grid-cols-2 gap-4">
                      <Card className="border-none shadow-sm rounded-xl p-6 space-y-4 bg-white ring-1 ring-slate-100 group hover:shadow-md transition-all">
                         <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <MessageSquare className="h-5 w-5" />
                         </div>
                         <div className="space-y-1">
                            <h3 className="text-sm font-bold uppercase tracking-tight">Discord Webhook</h3>
                            <p className="text-[9px] text-slate-500 font-medium leading-relaxed">Notificar instantaneamente sobre novos estúdios e faturas pagas.</p>
                         </div>
                         <Input placeholder="https://discord.com/api/webhooks/..." className="h-9 border-slate-100 bg-slate-50 rounded-lg text-xs" />
                      </Card>
 
                      <Card className="border-none shadow-sm rounded-xl p-6 space-y-4 bg-white ring-1 ring-slate-100 group hover:shadow-md transition-all">
                         <div className="h-10 w-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 group-hover:bg-teal-600 group-hover:text-white transition-all">
                            <Mail className="h-5 w-5" />
                         </div>
                         <div className="space-y-1">
                            <h3 className="text-sm font-bold uppercase tracking-tight">SMTP Transacional</h3>
                            <p className="text-[9px] text-slate-500 font-medium leading-relaxed">Relatórios diários para o e-mail do SuperAdmin.</p>
                         </div>
                         <div className="flex gap-2">
                            <Input value={user?.email || ""} className="h-9 border-slate-100 bg-slate-50 rounded-lg flex-1 text-xs" />
                            <Button size="icon" className="h-9 w-9 rounded-lg bg-slate-950"><Plus className="h-4 w-4" /></Button>
                         </div>
                      </Card>
                   </div>
 
                   <Card className="border-none shadow-sm rounded-xl overflow-hidden bg-white ring-1 ring-slate-100">
                      <CardContent className="p-4">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <Smartphone className="h-5 w-5 text-slate-400" />
                               <div className="space-y-0.5">
                                  <p className="text-[10px] font-bold uppercase text-slate-800">Notificações Push (Dashboard)</p>
                                  <p className="text-[9px] text-slate-400 leading-tight">Receber popups de sistema quando houver nova venda.</p>
                               </div>
                            </div>
                            <Switch defaultChecked className="scale-90" />
                         </div>
                      </CardContent>
                   </Card>
                </div>
            </TabsContent>

           {/* CONTENT: SAAS GATEWAY */}
           <TabsContent value="payments" className="animate-in fade-in slide-in-from-bottom-2 duration-500 mt-0">
                <div className="max-w-4xl space-y-6">
                   <Card className="border-none shadow-sm rounded-xl bg-white overflow-hidden ring-1 ring-slate-100 p-8">
                      <div className="flex items-center gap-4 mb-8">
                         <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                            <CreditCard className="h-6 w-6" />
                         </div>
                         <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">Faturamento da Plataforma</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Credenciais de cobrança para gerenciar e faturar assinaturas de Estúdios.</p>
                         </div>
                      </div>

                      <div className="p-8 border-2 border-dashed rounded-3xl bg-slate-50 space-y-6 flex flex-col items-center">
                         <Shield className="h-14 w-14 text-slate-300" />
                         <div className="text-center space-y-2 max-w-lg">
                           <h4 className="font-black text-slate-800 uppercase tracking-tight">Acesso Via Cloud Console</h4>
                           <p className="text-slate-500 text-xs font-medium leading-relaxed">
                             O sistema principal da Kineos não possui um limite de "estúdio". Para assegurar a máxima segurança em conformidade com o <strong>PCI DSS</strong> e manter chaves de faturamento longe de vetores web, o Token e a Public Key do Master Gateway estão armazenados como <code className="bg-slate-200 text-slate-800 px-1 rounded">Edge Secrets</code> globais no Supabase.
                           </p>
                         </div>
                         
                         <div className="space-y-3 w-full max-w-md pt-4">
                           <div className="bg-slate-900 rounded-xl p-4 text-left">
                              <p className="font-mono text-[10px] text-teal-400 font-bold mb-1">Passos para alteração (Dashboard Supabase):</p>
                              <ol className="text-[9px] text-slate-400 space-y-1.5 font-mono list-decimal pl-4">
                                <li>Acesse as configurações do projeto <strong>kfajalmdnycdxlhpoqvf</strong></li>
                                <li>Vá para a seção <strong>Edge Functions</strong> &gt; <strong>Secrets</strong></li>
                                <li>Atualize a chave <span className="text-white">SAAS_MP_ACCESS_TOKEN</span></li>
                                <li>Atualize a chave <span className="text-white">SAAS_MP_PUBLIC_KEY</span></li>
                              </ol>
                           </div>
                         </div>
                      </div>
                   </Card>
                </div>
            </TabsContent>
        </Tabs>

      </div>
    </SuperAdminLayout>
  );
}


