import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { uploadFile } from "@/utils/upload";
import { 
  Save, Loader2, ExternalLink, Image as ImageIcon, 
  Type, Palette, Layout, Upload, CheckCircle2,
  Settings, Phone, HelpCircle, UserCheck, BarChart4, Plus
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ConfigItem {
  id: number;
  config_key: string;
  config_value: string;
  config_type: string;
  config_group: string;
  description: string;
}

const SECTION_ICONS: Record<string, any> = {
  "Identidade": Settings,
  "Cores e Estilo": Palette,
  "Header": Layout,
  "Hero": Layout,
  "Barra de Números": BarChart4,
  "Funcionalidades": CheckCircle2,
  "Planos": Layout,
  "FAQ": HelpCircle,
  "Depoimentos": UserCheck,
  "Footer": Layout,
  "Links": Phone,
};

const ORDERED_GROUPS = [
  "Identidade", "Cores e Estilo", "Header", "Hero", 
  "Barra de Números", "Funcionalidades", "Planos", 
  "FAQ", "Depoimentos", "Footer", "Links"
];

const INITIAL_DATA = [
  { key: 'primary_color', val: '#008080', type: 'color', group: 'Cores e Estilo', desc: 'Cor principal para botões, destaques e ícones.' },
  { key: 'brand_name', val: 'Kineos', type: 'text', group: 'Identidade', desc: 'Nome da marca (exibido como texto se o logotipo retangular não existir).' },
  { key: 'header_logo_square_url', val: '', type: 'image_url', group: 'Identidade', desc: 'Logotipo quadrado ou ícone (ex: a letra K).' },
  { key: 'header_logo_rect_url', val: '', type: 'image_url', group: 'Identidade', desc: 'Logotipo retangular ou marca nominativa (ex: o nome Kineos).' },
  { key: 'header_link1_text', val: 'Agendamento', type: 'text', group: 'Header', desc: 'Texto do primeiro link do menu.' },
  { key: 'header_link1_url', val: '#features', type: 'url', group: 'Header', desc: 'Link do primeiro link do menu.' },
  { key: 'header_cta_text', val: 'Acessar o Painel', type: 'text', group: 'Header', desc: 'Texto do botão CTA do header.' },
  { key: 'header_cta_url', val: '/login', type: 'url', group: 'Header', desc: 'Link do botão CTA do header.' },
  { key: 'hero_title', val: 'Gestão simples e fluida para o seu estúdio crescer.', type: 'text', group: 'Hero', desc: 'Título principal da seção Hero.' },
  { key: 'hero_highlight_text', val: 'estúdio', type: 'text', group: 'Hero', desc: 'Texto que recebe a cor de destaque no título.' },
  { key: 'hero_subtitle', val: 'Simplifique agendamentos, finanças e o controle de alunos em um único lugar.', type: 'text', group: 'Hero', desc: 'Subtítulo do Hero.' },
  { key: 'hero_placeholder_img', val: '', type: 'image_url', group: 'Hero', desc: 'Imagem do mockup do painel à direita.' },
  { key: 'hero_cta_primary_text', val: 'Começar Gratuitamente', type: 'text', group: 'Hero', desc: 'Texto do botão principal do Hero.' },
  { key: 'hero_cta_primary_url', val: '/register', type: 'url', group: 'Hero', desc: 'Link do botão principal do Hero.' },
  { key: 'stats_students_count', val: '127', type: 'number', group: 'Barra de Números', desc: 'Número de alunos ativos na estatística.' },
  { key: 'stats_students_text', val: 'Alunos Ativos', type: 'text', group: 'Barra de Números', desc: 'Texto da estatística de alunos.' },
  { key: 'stats_studios_count', val: '15', type: 'number', group: 'Barra de Números', desc: 'Número de estúdios ativos na estatística.' },
  { key: 'stats_studios_text', val: 'Estúdios Cadastrados', type: 'text', group: 'Barra de Números', desc: 'Texto da estatística de estúdios.' },
  { key: 'func_feature1_title', val: 'Agendamento Inteligente', type: 'text', group: 'Funcionalidades', desc: 'Título da primeira funcionalidade.' },
  { key: 'func_feature1_desc', val: 'Gerencie horários e aulas de forma intuitiva e sem conflitos.', type: 'text', group: 'Funcionalidades', desc: 'Descrição da primeira funcionalidade.' },
  { key: 'func_feature1_icon', val: 'calendar-check', type: 'icon', group: 'Funcionalidades', desc: 'Ícone para a primeira funcionalidade.' },
  { key: 'func_placeholder_img', val: '', type: 'image_url', group: 'Funcionalidades', desc: 'Imagem ou ícone para a seção de funcionalidades.' },
  { key: 'plan_master_price', val: 'R$ 0,00', type: 'text', group: 'Planos', desc: 'Preço mensal do Plano Master.' },
  { key: 'faq_title', val: 'Perguntas Frequentes', type: 'text', group: 'FAQ', desc: 'Título da seção FAQ.' },
  { key: 'faq_q1_title', val: 'Preciso instalar algum programa?', type: 'text', group: 'FAQ', desc: 'Título da primeira pergunta do FAQ.' },
  { key: 'faq_q1_answer', val: 'Não, o Kineos é 100% online.', type: 'textarea', group: 'FAQ', desc: 'Resposta da primeira pergunta do FAQ.' },
  { key: 'testim_title', val: 'O que nossos clientes dizem', type: 'text', group: 'Depoimentos', desc: 'Título da seção de depoimentos.' },
  { key: 'testim_quote1_text', val: 'O Kineos mudou a gestão do meu estúdio.', type: 'textarea', group: 'Depoimentos', desc: 'Texto do primeiro depoimento.' },
  { key: 'testim_quote1_name', val: 'Ana Luiza', type: 'text', group: 'Depoimentos', desc: 'Nome da primeira cliente do depoimento.' },
  { key: 'footer_linkedin_url', val: 'https://linkedin.com/', type: 'url', group: 'Footer', desc: 'Link para o perfil do LinkedIn no rodapé.' },
  { key: 'footer_placeholder_text', val: '© 2024 Kineos. Todos os direitos reservados.', type: 'text', group: 'Footer', desc: 'Texto de direitos autorais no rodapé.' },
  { key: 'link_wpp_placeholder', val: 'https://wa.me/5500000000000', type: 'url', group: 'Links', desc: 'Link para o botão flutuante do WhatsApp.' },
  { key: 'link_contact_email', val: 'contato@kineos.com', type: 'text', group: 'Links', desc: 'E-mail de contato.' }
];

export default function LandingEditor() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("Identidade");
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["landpage-configs-admin-sb", user?.id],
    enabled: !!user && !authLoading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landpage_config")
        .select("*")
        .is("tenant_id", null)
        .order("id", { ascending: true });
      
      if (error) throw error;
      return data as ConfigItem[];
    },
  });

  useEffect(() => {
    if (configs.length > 0) {
      const vals: Record<string, string> = {};
      configs.forEach(c => { vals[c.config_key] = c.config_value || ""; });
      setLocalValues(vals);
    }
  }, [configs]);

  const groups = ORDERED_GROUPS.filter(g => configs.some(c => c.config_group === g));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const upserts = configs.map(c => ({
        tenant_id: null,
        config_key: c.config_key,
        config_value: localValues[c.config_key] || "",
        config_type: c.config_type,
        config_group: c.config_group,
        description: c.description
      }));

      const { error } = await supabase
        .from("landpage_config")
        .upsert(upserts, { onConflict: "tenant_id,config_key" });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["landpage-configs-admin-sb"] });
      queryClient.invalidateQueries({ queryKey: ["landing-content-sb"] });
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar: " + err.message);
    }
  });

  const handleInitialize = async () => {
    try {
      const upserts = INITIAL_DATA.map(d => ({
        tenant_id: null,
        config_key: d.key,
        config_value: d.val,
        config_type: d.type,
        config_group: d.group,
        description: d.desc
      }));

      const { error } = await supabase
        .from("landpage_config")
        .upsert(upserts, { onConflict: "tenant_id,config_key" });
      
      if (error) throw error;
      toast.success("Dados iniciais carregados!");
      queryClient.invalidateQueries({ queryKey: ["landpage-configs-admin-sb"] });
    } catch (err: any) {
      toast.error("Erro ao inicializar: " + err.message + ". Certifique-se de ter rodado o SQL da tabela.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(prev => ({ ...prev, [key]: true }));
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${key}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `landing/${fileName}`;

      const publicUrl = await uploadFile(file, filePath);

      setLocalValues(prev => ({ ...prev, [key]: publicUrl }));
      toast.success("Imagem enviada com sucesso!");
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  if (isLoading || authLoading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SuperAdminLayout>
    );
  }

  const currentConfigs = configs.filter(c => c.config_group === activeTab);

  return (
    <SuperAdminLayout>
      <div className="flex h-[calc(100vh-140px)] overflow-hidden gap-6 px-4">
        {/* Sidebar Especializada */}
        <div className="w-60 flex flex-col shrink-0 bg-white/50 backdrop-blur-sm rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h1 className="text-xs font-bold uppercase tracking-widest text-slate-900 leading-none">Landing Editor</h1>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">CMS v7.5.2</p>
          </div>
          
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {groups.map(group => {
              const Icon = SECTION_ICONS[group] || Layout;
              return (
                <button
                  key={group}
                  onClick={() => setActiveTab(group)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all ${
                    activeTab === group 
                      ? "bg-slate-900 text-white shadow-sm" 
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${activeTab === group ? "text-primary" : "text-current"}`} />
                  {group}
                </button>
              );
            })}
          </nav>
          
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col gap-1.5">
            <Button 
                onClick={() => saveMutation.mutate()} 
                disabled={saveMutation.isPending}
                className="w-full bg-slate-950 hover:bg-black h-8 rounded-lg shadow-sm font-bold uppercase text-[9px] tracking-widest"
            >
              {saveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Save className="h-3.5 w-3.5 mr-2" />}
              Salvar
            </Button>
            <Button variant="ghost" className="w-full text-[8px] font-bold uppercase tracking-tight h-7 rounded-md" asChild>
              <a href="/" target="_blank" className="flex items-center justify-center gap-2">
                <ExternalLink className="h-2.5 w-2.5" /> Visualizar
              </a>
            </Button>
          </div>
        </div>

        {/* Painel de Edição Centralizado */}
        <div className="flex-1 overflow-y-auto pr-4">
          <div className="max-w-2xl mx-auto space-y-6 pb-20 pt-2">
            <header className="flex items-end justify-between px-1 border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <span className="text-[8px] font-bold uppercase tracking-widest text-primary">Seção Selecionada</span>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight uppercase">{activeTab}</h2>
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-0.5 border-slate-200 text-[9px] font-bold uppercase text-slate-400 bg-white">
                {currentConfigs.length} {currentConfigs.length === 1 ? 'Campo' : 'Campos'}
              </Badge>
            </header>

            <div className="grid gap-4">
              {currentConfigs.map(item => (
                <Card key={item.id} className="border-none shadow-sm rounded-xl bg-white ring-1 ring-slate-100 overflow-hidden">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-primary" />
                          {item.config_key
                            .replace(/hero_/g, 'HERO: ')
                            .replace(/header_/g, 'HEADER: ')
                            .replace(/footer_/g, 'FOOTER: ')
                            .replace(/stats_/g, 'ESTATÍSTICA: ')
                            .replace(/func_/g, 'FUNCIONALIDADE: ')
                            .replace(/faq_/g, 'FAQ: ')
                            .replace(/testim_/g, 'DEPOIMENTO: ')
                            .replace(/link_/g, 'LINK: ')
                            .replace(/_/g, ' ')
                            .toUpperCase()}
                        </Label>
                        {item.description && (
                          <p className="text-[10px] text-muted-foreground leading-relaxed max-w-md">{item.description}</p>
                        )}
                      </div>
                      <Badge variant="secondary" className="bg-slate-50 text-[9px] text-slate-400 font-mono border-none h-5">
                        {item.config_type}
                      </Badge>
                    </div>

                    <div className="relative pt-0.5">
                      {item.config_type === 'color' ? (
                        <div className="flex items-center gap-3 p-2.5 bg-slate-50/50 rounded-lg border border-slate-100">
                          <div className="relative w-8 h-8 shrink-0 rounded-md border border-white shadow-sm overflow-hidden ring-1 ring-slate-100">
                             <input 
                               type="color" 
                               value={localValues[item.config_key] || "#000000"} 
                               onChange={e => setLocalValues(p => ({ ...p, [item.config_key]: e.target.value }))}
                               className="absolute inset-[-20%] w-[140%] h-[140%] scale-150 cursor-pointer"
                             />
                          </div>
                          <div className="flex-1 space-y-0">
                             <Label className="text-[8px] font-bold text-slate-400 uppercase">Cor Hexadecimal</Label>
                             <Input 
                               value={localValues[item.config_key] || ""} 
                               onChange={e => setLocalValues(p => ({ ...p, [item.config_key]: e.target.value }))}
                               className="font-mono text-[10px] h-5 bg-transparent border-none p-0 focus-visible:ring-0 shadow-none text-slate-700 font-bold"
                             />
                          </div>
                        </div>
                      ) : item.config_type === 'image_url' ? (
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <Input 
                              value={localValues[item.config_key] || ""} 
                              onChange={e => setLocalValues(p => ({ ...p, [item.config_key]: e.target.value }))}
                              placeholder="https://..."
                              className="h-10 bg-slate-50/50 border-slate-100 rounded-lg flex-1 text-slate-600 focus:bg-white text-xs"
                            />
                            <div className="relative shrink-0">
                               <input 
                                 type="file" 
                                 accept="image/*" 
                                 onChange={e => handleFileUpload(e, item.config_key)}
                                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                 disabled={uploading[item.config_key]}
                               />
                               <Button variant="outline" className="h-10 w-10 p-0 rounded-lg bg-white border-slate-100 shadow-sm hover:bg-slate-50 transition-colors" disabled={uploading[item.config_key]}>
                                  {uploading[item.config_key] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-4 w-4 text-primary" />}
                               </Button>
                            </div>
                          </div>
                          {localValues[item.config_key] && (
                            <div className="w-full aspect-[21/9] bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center overflow-hidden p-2">
                               <img src={localValues[item.config_key]} alt="Preview" className="h-full w-full object-contain rounded-lg" />
                            </div>
                          )}
                        </div>
                      ) : (item.config_type === 'textarea' || item.config_key.includes('desc') || item.config_key.includes('answer')) ? (
                        <Textarea 
                          value={localValues[item.config_key] || ""} 
                          onChange={e => setLocalValues(p => ({ ...p, [item.config_key]: e.target.value }))}
                          rows={3}
                          className="bg-slate-50/50 border-slate-100 rounded-xl p-4 text-slate-600 focus:bg-white transition-all text-xs leading-relaxed"
                        />
                      ) : (
                        <Input 
                          type={item.config_type === 'number' ? 'number' : 'text'}
                          value={localValues[item.config_key] || ""} 
                          onChange={e => setLocalValues(p => ({ ...p, [item.config_key]: e.target.value }))}
                          className="h-10 bg-slate-50/50 border-slate-100 rounded-lg text-slate-600 focus:bg-white text-xs"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {configs.length === 0 && (
                <div className="py-20 text-center space-y-6 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border-2 border-dashed border-slate-100">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto ring-8 ring-primary/5">
                     <Plus className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-900">Nenhum dado encontrado</h3>
                    <p className="text-slate-500 max-w-xs mx-auto">Sua tabela de configurações está vazia. Deseja carregar os campos e textos padrão agora?</p>
                  </div>
                  <Button onClick={handleInitialize} className="bg-slate-900 hover:bg-slate-800 text-white px-8 h-12 rounded-xl font-bold">
                    Carregar Configurações Iniciais
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
