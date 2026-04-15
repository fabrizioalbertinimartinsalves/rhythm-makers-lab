import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import SuperAdminLayout from "@/components/layouts/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { uploadFile } from "@/utils/upload";
import { Paintbrush, Type, Image, Link2, Eye, Save, Loader2, Upload, AlertCircle, Sparkles } from "lucide-react";

interface LoginConfig {
  id?: number;
  config_key: string;
  config_value: string;
  config_type: "text" | "color" | "image_url" | "json" | "boolean" | "url" | "number" | "textarea";
  config_group: string;
  description: string;
}

const NEW_KEYS: LoginConfig[] = [
  { config_key: "login_right_logo_1", config_value: "", config_type: "image_url", config_group: "Imagens e Identidade", description: "Logo Direita 1 (Superior Esquerda)" },
  { config_key: "login_right_logo_2", config_value: "", config_type: "image_url", config_group: "Imagens e Identidade", description: "Logo Direita 2 (Superior Direita)" },
];

export default function LoginBranding() {
  const queryClient = useQueryClient();
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const { data: configs, isLoading, error } = useQuery<LoginConfig[]>({
    queryKey: ["superadmin-login-cms-v54-sb"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("login_page_config")
        .select("*")
        .order("config_group", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const allConfigs = useMemo(() => {
    if (!configs) return [];
    // Merge existing from DB with new ones if they don't exist yet
    const existingKeys = configs.map(c => c.config_key);
    const merged = [...configs];
    NEW_KEYS.forEach(nk => {
      if (!existingKeys.includes(nk.config_key)) {
        merged.push(nk);
      }
    });
    return merged;
  }, [configs]);

  useEffect(() => {
    if (allConfigs.length > 0) {
      const map: Record<string, string> = {};
      allConfigs.forEach((c) => {
        map[c.config_key] = c.config_value || "";
      });
      setLocalValues(map);
    }
  }, [allConfigs]);

  const saveMutation = useMutation({
    mutationFn: async (updatedConfigs: any[]) => {
      const { error } = await supabase.from("login_page_config").upsert(updatedConfigs, { onConflict: "config_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-login-cms-v54-sb"] });
      queryClient.invalidateQueries({ queryKey: ["login-branding-sb"] });
      toast.success("Configurações de login salvas!");
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar: " + err.message);
    }
  });

  const handleSave = () => {
    if (allConfigs.length === 0) return;
    const upserts = allConfigs.map(c => ({
      config_key: c.config_key,
      config_value: localValues[c.config_key] || "",
      config_type: c.config_type,
      config_group: c.config_group,
      description: c.description
    }));
    saveMutation.mutate(upserts);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, configKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(prev => ({ ...prev, [configKey]: true }));
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `login_cms_${configKey}_${Date.now()}.${fileExt}`;
      const filePath = `branding/${fileName}`;

      const publicUrl = await uploadFile(file, filePath);

      setLocalValues(prev => ({ ...prev, [configKey]: publicUrl }));
      toast.success("Imagem enviada com sucesso!");
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    } finally {
      setUploading(prev => ({ ...prev, [configKey]: false }));
    }
  };

  const groups = Array.from(new Set(allConfigs.map(c => c.config_group)));

  if (error) {
    return (
      <SuperAdminLayout>
        <div className="p-8 text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">Erro ao carregar configurações</h2>
          <p className="text-muted-foreground">Verifique a conexão ou a tabela `login_page_config`.</p>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-500 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <Badge className="bg-primary/5 text-primary border-none text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 mb-1">CMS v7.5.2</Badge>
            <h1 className="text-lg md:text-xl font-bold uppercase tracking-tight text-slate-950 flex items-center gap-3 leading-none">
              Command <span className="text-primary tracking-normal">Branding</span>
            </h1>
            <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest">Personalização da Identidade de Acesso</p>
          </div>
          <Button onClick={handleSave} disabled={saveMutation.isPending || isLoading} className="h-8 px-5 font-bold uppercase tracking-widest text-[9px] shadow-sm shadow-primary/5 rounded-lg gap-2 bg-slate-950">
             {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Salvar Identidade
          </Button>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            {isLoading ? (
              <div className="flex items-center justify-center p-20"><Loader2 className="h-10 w-10 animate-spin text-primary/30" /></div>
            ) : (
              groups.map(group => (
                <Card key={group} className="border-none shadow-sm overflow-hidden ring-1 ring-slate-100 bg-white rounded-xl">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-2.5">
                    <CardTitle className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{group}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-5">
                    {allConfigs.filter(c => c.config_group === group).map(item => (
                      <div key={item.config_key} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="font-bold text-[10px] uppercase tracking-tight text-slate-600">{item.description}</Label>
                          <span className="text-[8px] font-mono font-bold text-slate-300 uppercase">{item.config_key}</span>
                        </div>

                        {item.config_type === 'color' ? (
                          <div className="flex items-center gap-3 p-1 rounded-lg border bg-slate-50 transition-all hover:ring-1 hover:ring-primary/10">
                            <input 
                              type="color" 
                              value={localValues[item.config_key] || "#000000"} 
                              onChange={(e) => setLocalValues(p => ({...p, [item.config_key]: e.target.value}))} 
                              className="h-7 w-12 cursor-pointer rounded-md border-none bg-transparent" 
                            />
                            <Input 
                              value={localValues[item.config_key] || ""} 
                              onChange={(e) => setLocalValues(p => ({...p, [item.config_key]: e.target.value}))} 
                              className="h-7 border-none bg-transparent font-mono font-bold text-slate-700 text-xs"
                            />
                          </div>
                        ) : item.config_type === 'image_url' ? (
                          <div className="space-y-2 group/img">
                            <div className="flex gap-2">
                              <Input 
                                value={localValues[item.config_key] || ""} 
                                onChange={(e) => setLocalValues(p => ({...p, [item.config_key]: e.target.value}))} 
                                placeholder="https://exemplo.com/imagem.png" 
                                className="flex-1 h-8 border-slate-200 text-[10px] rounded-lg"
                              />
                              <div className="relative">
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full" 
                                  onChange={(e) => handleImageUpload(e, item.config_key)}
                                  disabled={uploading[item.config_key]}
                                />
                                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" disabled={uploading[item.config_key]}>
                                  {uploading[item.config_key] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3 text-slate-400" />}
                                </Button>
                              </div>
                            </div>
                            {localValues[item.config_key] && (
                              <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center transition-all">
                                <img src={localValues[item.config_key]} className="max-w-full max-h-full object-contain p-2" />
                              </div>
                            )}
                          </div>
                        ) : item.config_type === 'textarea' ? (
                          <Textarea 
                            value={localValues[item.config_key] || ""} 
                            onChange={(e) => setLocalValues(p => ({...p, [item.config_key]: e.target.value}))} 
                            className="min-h-[100px] border-slate-200"
                          />
                        ) : (
                          <Input 
                            value={localValues[item.config_key] || ""} 
                            onChange={(e) => setLocalValues(p => ({...p, [item.config_key]: e.target.value}))} 
                            placeholder={item.description}
                            className="h-9 border-slate-200 text-xs rounded-lg"
                          />
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="space-y-6">
            <Card className="sticky top-6 border-none shadow-sm ring-1 ring-slate-200 overflow-hidden rounded-xl">
              <CardHeader className="bg-slate-900 text-white p-4">
                <CardTitle className="text-xs flex items-center gap-2 font-bold uppercase tracking-widest">
                  <Eye className="h-3.5 w-3.5 text-primary" /> Visualização Real-Time
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 bg-slate-950">
                <div className="aspect-[16/10] relative flex overflow-hidden border shadow-inner">
                   {/* Left Panel */}
                   <div className="hidden md:flex flex-1 relative flex-col items-center justify-center p-4 overflow-hidden" style={{ backgroundColor: localValues.primary_color || "#0F172A" }}>
                      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                      <div className="relative z-10 text-center scale-[0.5] space-y-4">
                        <h1 className="text-4xl font-extrabold text-white tracking-tighter leading-none">
                          {localValues.login_hero_title?.split(localValues.login_hero_highlight_text || "").map((part, i, arr) => (
                            <span key={i}>
                              {part}
                              {i < arr.length - 1 && <span className="text-teal-400 font-black italic">{localValues.login_hero_highlight_text}</span>}
                            </span>
                          )) || "Título Marketing"}
                        </h1>
                        <p className="text-white/50 text-xl font-medium">{localValues.login_hero_subtitle || "Subtítulo do Hero"}</p>
                        {localValues.login_hero_placeholder_img && (
                          <img src={localValues.login_hero_placeholder_img} className="mt-6 rounded-2xl shadow-2xl opacity-90 max-w-[220px] mx-auto border border-white/10" />
                        )}
                      </div>
                   </div>

                   {/* Right Panel */}
                   <div className="flex-1 bg-white flex flex-col items-center justify-center p-4 scale-[0.6] relative">
                      {/* NOVOS LOGOS NO PREVIEW */}
                      <div className="flex justify-between w-full max-w-[280px] mb-8 gap-4 px-2">
                         <div className="flex-1 h-12 bg-slate-50 border border-dashed border-slate-200 rounded-lg flex items-center justify-center">
                            {localValues.login_right_logo_1 ? <img src={localValues.login_right_logo_1} className="max-h-full max-w-full object-contain p-1" /> : <span className="text-[6px] uppercase font-bold text-slate-300">LOGO 1</span>}
                         </div>
                         <div className="flex-1 h-12 bg-slate-50 border border-dashed border-slate-200 rounded-lg flex items-center justify-center">
                            {localValues.login_right_logo_2 ? <img src={localValues.login_right_logo_2} className="max-h-full max-w-full object-contain p-1" /> : <span className="text-[6px] uppercase font-bold text-slate-300">LOGO 2</span>}
                         </div>
                      </div>

                      <div className="w-full max-w-[280px] space-y-4">
                         <div className="space-y-1 text-left mb-6">
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight uppercase">{localValues.login_form_title || "Bem-vindo"}</h2>
                            <p className="text-[9px] text-slate-500 font-medium leading-relaxed">{localValues.login_form_subtitle || "Controle eficiente para o seu estúdio."}</p>
                         </div>
                         <div className="space-y-3 opacity-50">
                            <div className="h-9 bg-slate-100 border border-slate-200 rounded-lg flex items-center px-3 text-[8px] font-bold text-slate-400">{localValues.login_input_email_placeholder}</div>
                            <div className="h-9 bg-slate-100 border border-slate-200 rounded-lg flex items-center px-3 text-[8px] font-bold text-slate-400">{localValues.login_input_password_placeholder}</div>
                            <div className="h-10 rounded-xl shadow-sm flex items-center justify-center text-[9px] font-bold uppercase tracking-widest text-white" style={{ backgroundColor: localValues.primary_color || "#0F172A" }}>{localValues.login_cta_primary_text}</div>
                         </div>
                         <p className="text-[8px] text-center text-slate-300 mt-6 tracking-tight">{localValues.footer_placeholder_text || "© 2024 Todos os direitos reservados."}</p>
                      </div>
                   </div>
                </div>
                <div className="p-4 bg-slate-100/50 text-center flex justify-between px-6 border-t">
                   <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Kineos Cloud</p>
                   <p className="text-[9px] text-slate-400 font-mono">v5.4.0 Stable</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
