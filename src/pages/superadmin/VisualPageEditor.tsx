import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Save, Loader2, ArrowLeft, Plus, Trash2, 
  Settings, Globe, Layout, Type, HelpCircle, 
  MessageSquare, BarChart, CheckCircle2, AlertCircle,
  Eye, GripVertical, ChevronUp, ChevronDown
} from "lucide-react";

export default function VisualPageEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [localTitle, setLocalTitle] = useState("");
  const [localMetadata, setLocalMetadata] = useState<any>({});
  const [localContent, setLocalContent] = useState<any>({ hero: {}, sections: [] });
  const [isPublished, setIsPublished] = useState(true);

  const { data: page, isLoading } = useQuery({
    queryKey: ["site-page-admin-detail-sb", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_pages")
        .select("*")
        .eq("slug", slug)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (page) {
      setLocalTitle(page.title);
      setLocalMetadata(page.metadata || {});
      setLocalContent(page.content || { hero: {}, sections: [] });
      setIsPublished(page.is_published);
    }
  }, [page]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("site_pages")
        .update({
          title: localTitle,
          content: localContent,
          metadata: localMetadata,
          is_published: isPublished,
          updated_at: new Date().toISOString()
        })
        .eq("slug", slug);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Página salva com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["site-page-admin-detail-sb", slug] });
      queryClient.invalidateQueries({ queryKey: ["site-page-content-sb", slug] });
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar: " + err.message);
    }
  });

  const addSection = (type: string) => {
    const newSection = { type, content: "" };
    if (type === "faq") (newSection as any).items = [];
    if (type === "stats") (newSection as any).items = [];
    if (type === "cta_whatsapp") (newSection as any).phone = "5511999999999";
    
    setLocalContent((prev: any) => ({
      ...prev,
      sections: [...(prev.sections || []), newSection]
    }));
  };

  const updateSection = (index: number, data: any) => {
    setLocalContent((prev: any) => {
      const newSections = [...(prev.sections || [])];
      newSections[index] = { ...newSections[index], ...data };
      return { ...prev, sections: newSections };
    });
  };

  const removeSection = (index: number) => {
    setLocalContent((prev: any) => ({
      ...prev,
      sections: prev.sections.filter((_: any, i: number) => i !== index)
    }));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    setLocalContent((prev: any) => {
      const sections = [...prev.sections];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= sections.length) return prev;
      
      const temp = sections[index];
      sections[index] = sections[newIndex];
      sections[newIndex] = temp;
      
      return { ...prev, sections };
    });
  };

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center p-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="max-w-7xl mx-auto px-4 pb-20 space-y-6">
        {/* Header de Ações */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm sticky top-0 z-50">
          <div className="flex items-center gap-4">
             <Button variant="ghost" size="icon" onClick={() => navigate("/superadmin/pages")} className="h-10 w-10 border border-slate-100 rounded-xl hover:bg-slate-50">
                <ArrowLeft className="h-4 w-4" />
             </Button>
             <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                   <h1 className="text-lg font-black text-slate-900 tracking-tighter uppercase italic">{localTitle || "Carregando..."}</h1>
                   <Badge variant="outline" className="text-[7px] font-black uppercase tracking-widest px-1 py-0.5 border-slate-100 bg-slate-50">/{slug}</Badge>
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Visual Page Editor v1.0.0</p>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             <Button variant="outline" className="h-10 px-6 font-bold uppercase text-[10px] tracking-widest rounded-xl border-slate-200" asChild>
                <a href={slug === 'contato' ? '/contato' : `/${slug}`} target="_blank" className="flex items-center gap-2">
                   <Eye className="h-3.5 w-3.5" /> Ver Página
                </a>
             </Button>
             <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="h-10 px-8 bg-slate-950 hover:bg-black font-bold uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-slate-950/20 gap-2">
                {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-4 w-4" />} Salvar Alterações
             </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
           {/* Sidebar: Configurações Globais */}
           <div className="space-y-6">
              <Card className="border-none shadow-sm ring-1 ring-slate-100 rounded-2xl overflow-hidden">
                 <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                       <Settings className="h-3 w-3" /> Configurações Gerais
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="p-5 space-y-5">
                    <div className="space-y-1.5">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Título da Página</Label>
                       <Input value={localTitle} onChange={e => setLocalTitle(e.target.value)} className="h-10 border-slate-100 rounded-xl font-bold text-slate-900" />
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Descrição SEO (Meta Description)</Label>
                       <Textarea value={localMetadata.description || ""} onChange={e => setLocalMetadata((p: any) => ({...p, description: e.target.value}))} rows={3} className="border-slate-100 rounded-xl text-xs font-medium" />
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status de Visibilidade</Label>
                       <Button 
                         variant={isPublished ? "default" : "secondary"} 
                         onClick={() => setIsPublished(!isPublished)}
                         className={`h-7 px-4 rounded-full text-[9px] font-black uppercase tracking-widest border-none ${isPublished ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                       >
                         {isPublished ? "Pública" : "Rascunho"}
                       </Button>
                    </div>
                 </CardContent>
              </Card>

              <Card className="border-none shadow-sm ring-1 ring-slate-100 rounded-2xl overflow-hidden">
                 <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                       <Plus className="h-3 w-3" /> Adicionar Seção
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="p-2 grid grid-cols-2 gap-1 p-2">
                    {[
                      {type: 'text', label: 'Texto Simples', icon: Type},
                      {type: 'rich_text', label: 'Rich Text', icon: Layout},
                      {type: 'faq', label: 'FAQ', icon: HelpCircle},
                      {type: 'stats', label: 'Estatísticas', icon: BarChart},
                      {type: 'cta_whatsapp', label: 'WhatsApp', icon: MessageSquare},
                      {type: 'status_indicator', label: 'Indicator Status', icon: AlertCircle},
                      {type: 'contact_form', label: 'Lead Form', icon: CheckCircle2},
                    ].map(btn => (
                      <button 
                        key={btn.type}
                        onClick={() => addSection(btn.type)}
                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group"
                      >
                         <btn.icon className="h-5 w-5 text-slate-400 group-hover:text-primary" />
                         <span className="text-[8px] font-black uppercase tracking-tight text-slate-400 group-hover:text-slate-600">{btn.label}</span>
                      </button>
                    ))}
                 </CardContent>
              </Card>
           </div>

           {/* Editor de Blocos Principal */}
           <div className="lg:col-span-2 space-y-6">
              {/* Seção Hero - Fixa no Topo */}
              <Card className="border-none shadow-md ring-2 ring-primary/10 rounded-2xl overflow-hidden">
                 <CardHeader className="bg-primary/5 py-4 flex flex-row items-center justify-between border-b border-primary/10">
                    <div className="flex items-center gap-4">
                       <div className="h-10 w-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                          <Layout className="h-5 w-5" />
                       </div>
                       <div className="space-y-0.5">
                          <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900 leading-none">Seção de Identidade (Hero)</CardTitle>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Título e impacto principal da página</p>
                       </div>
                    </div>
                 </CardHeader>
                 <CardContent className="p-6 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                       <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Título de Impacto</Label>
                          <Input 
                            value={localContent.hero?.title || ""} 
                            onChange={e => setLocalContent((p: any) => ({...p, hero: {...p.hero, title: e.target.value}}))} 
                            className="h-12 border-slate-100 rounded-xl font-black text-lg p-4 bg-slate-50/50"
                          />
                       </div>
                       <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Sub-legenda</Label>
                          <Textarea 
                            value={localContent.hero?.subtitle || ""} 
                            onChange={e => setLocalContent((p: any) => ({...p, hero: {...p.hero, subtitle: e.target.value}}))} 
                            className="border-slate-100 rounded-xl text-xs font-medium bg-slate-50/50"
                            rows={3}
                          />
                       </div>
                    </div>
                 </CardContent>
              </Card>

              {/* Seções Dinâmicas */}
              <div className="space-y-4">
                 {(localContent.sections || []).length === 0 && (
                   <div className="p-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
                      <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Nenhuma seção adicional. Use a barra lateral para adicionar.</p>
                   </div>
                 )}
                 {localContent.sections?.map((section: any, index: number) => (
                   <Card key={index} className="border-none shadow-sm ring-1 ring-slate-100 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-3 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <GripVertical className="h-4 w-4 text-slate-200" />
                            <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white shadow-sm border-slate-100">
                               #{index + 1} - {section.type}
                            </Badge>
                         </div>
                         <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(index, 'up')} disabled={index === 0}>
                               <ChevronUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(index, 'down')} disabled={index === (localContent.sections.length - 1)}>
                               <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                            <div className="w-px h-4 bg-slate-200 mx-1" />
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => removeSection(index)}>
                               <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                         </div>
                      </div>
                      <CardContent className="p-6">
                         {section.type === 'text' && (
                           <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Conteúdo do Bloco (Markdown Suportado)</Label>
                              <Textarea 
                                value={section.content} 
                                onChange={e => updateSection(index, { content: e.target.value })} 
                                rows={6}
                                className="border-slate-100 rounded-xl text-sm font-medium p-4 bg-slate-50/30"
                              />
                           </div>
                         )}
                         {section.type === 'rich_text' && (
                           <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Conteúdo HTML / Rich Text</Label>
                              <Textarea 
                                value={section.content} 
                                onChange={e => updateSection(index, { content: e.target.value })} 
                                rows={6}
                                className="border-slate-100 rounded-xl font-mono text-xs p-4 bg-slate-900 text-teal-400"
                                placeholder="<div>Exemplo HTML</div>"
                              />
                           </div>
                         )}
                         {section.type === 'cta_whatsapp' && (
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1"><Label className="text-[9px] font-black">Número (55...)</Label><Input value={section.phone} onChange={e => updateSection(index, { phone: e.target.value })} /></div>
                              <div className="space-y-1"><Label className="text-[9px] font-black">Texto do Botão</Label><Input value={section.text} onChange={e => updateSection(index, { text: e.target.value })} /></div>
                           </div>
                         )}
                         {section.type === 'contact_form' && (
                           <div className="py-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed text-xs font-bold uppercase tracking-widest">
                             O formulário de leads padrão será renderizado nesta posição.
                           </div>
                         )}
                         {section.type === 'status_indicator' && (
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                 <Label className="text-[9px] font-black">Status Global</Label>
                                 <select value={section.status} onChange={e => updateSection(index, { status: e.target.value })} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase">
                                    <option value="operational">Operacional</option>
                                    <option value="unstable">Instável</option>
                                 </select>
                              </div>
                              <div className="space-y-1"><Label className="text-[9px] font-black">Última Checagem (texto)</Label><Input value={section.last_check} onChange={e => updateSection(index, { last_check: e.target.value })} placeholder="agora mesmo..." /></div>
                           </div>
                         )}
                      </CardContent>
                   </Card>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
