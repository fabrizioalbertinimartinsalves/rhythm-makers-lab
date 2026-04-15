import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { uploadFile } from "@/utils/upload";
import { Palette, Building2, CalendarCog, Type, ImageIcon, Save, Loader2, Upload, Percent, Globe, MapPin, Search, Smartphone, User, Zap, Mail, MessageCircle, FileSignature, CheckCircle2, AlertCircle, Send, CreditCard, Plug, ArrowRight } from "lucide-react";
import { HslColorPicker } from "react-colorful";
import { whatsappService, WhatsAppConfig } from "@/services/whatsappService";

function useConfiguracoes() {
  const { studioId } = useAuth();
  return useQuery({
    queryKey: ["configuracoes-estudio", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      if (!studioId) return {};
      const { data, error } = await supabase
        .from("studio_configs")
        .select("config")
        .eq("studio_id", studioId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found'
        console.error("Erro ao carregar configurações:", error);
      }
      return data?.config || {};
    },
  });
}

/** Parse "H S% L%" string to {h, s, l} object */
function parseHsl(hslStr: string): { h: number; s: number; l: number } {
  const parts = hslStr.replace(/%/g, "").split(/\s+/).map(Number);
  return { h: parts[0] || 0, s: parts[1] || 0, l: parts[2] || 0 };
}

/** Convert {h, s, l} to "H S% L%" string */
function formatHsl(hsl: { h: number; s: number; l: number }): string {
  return `${Math.round(hsl.h)} ${Math.round(hsl.s)}% ${Math.round(hsl.l)}%`;
}

/** Flatten a nested JSON object into a flat map with dot-separated keys */
function flattenConfig(obj: any, prefix = ""): Record<string, string> {
  let result: Record<string, string> = {};
  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      result = { ...result, ...flattenConfig(value, newKey) };
    } else {
      result[newKey] = String(value ?? "");
    }
  }
  return result;
}

/** Unflatten a flat map with dot-separated keys back into a nested JSON object */
function unflattenConfig(flat: Record<string, any>): any {
  const result: any = {};
  for (const key in flat) {
    const parts = key.split(".");
    let current = result;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = flat[key];
      } else {
        current[part] = current[part] || {};
        current = current[part];
      }
    }
  }
  return result;
}

function ColorPickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const hsl = parseHsl(value);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="h-10 w-10 rounded-lg border-2 border-border shrink-0 cursor-pointer hover:ring-2 hover:ring-ring transition-all shadow-sm"
              style={{ backgroundColor: `hsl(${value})` }}
              aria-label={`Selecionar ${label}`}
            />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <HslColorPicker
              color={hsl}
              onChange={(newHsl) => onChange(formatHsl(newHsl))}
            />
            <p className="text-[10px] text-muted-foreground mt-2 text-center font-mono">
              {value}
            </p>
          </PopoverContent>
        </Popover>
        <div
          className="flex-1 h-10 rounded-lg border border-border"
          style={{
            background: `linear-gradient(90deg, hsl(${hsl.h} 10% 50%), hsl(${hsl.h} ${hsl.s}% ${hsl.l}%), hsl(${hsl.h} 100% 50%))`,
          }}
        />
      </div>
    </div>
  );
}

const FONT_OPTIONS = [
  "Plus Jakarta Sans",
  "Inter",
  "Roboto",
  "Open Sans",
  "Montserrat",
  "Poppins",
  "Lato",
  "Nunito",
  "Raleway",
  "Source Sans 3",
];

function getTitleSize(baseSize: string, scale: string): number {
  const base = parseInt(baseSize) || 16;
  const multipliers: Record<string, number> = { compact: 1.15, normal: 1.35, large: 1.6 };
  return Math.round(base * (multipliers[scale] || 1.35));
}

function FinancialRulesCard() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { studioId } = useAuth();
  const { data: regras, isLoading } = useQuery({
    queryKey: ["regras-financeiras", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      if (!studioId) return null;
      const { data, error } = await supabase
        .from("studio_configs")
        .select("config")
        .eq("studio_id", studioId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data?.config?.regras_financeiras || null;
    },
  });

  const [form, setForm] = useState({
    juros_ao_dia: 0,
    multa_percentual: 0,
    dias_carencia: 0,
    atualizar_automaticamente: true,
    multa_cancelamento: 10, // Default 10%
  });

  useEffect(() => {
    if (regras) {
      setForm({
        juros_ao_dia: regras.juros_ao_dia || 0,
        multa_percentual: regras.multa_percentual || 0,
        dias_carencia: regras.dias_carencia || 0,
        atualizar_automaticamente: regras.atualizar_automaticamente !== false,
        multa_cancelamento: regras.multa_cancelamento ?? 10,
      });
    }
  }, [regras]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!studioId) return;
      
      const { data: current, error: getErr } = await supabase
        .from("studio_configs")
        .select("config")
        .eq("studio_id", studioId)
        .single();

      const existingConfig = (!getErr && current?.config) ? current.config : {};
      
      const newConfig = {
        ...existingConfig,
        regras_financeiras: {
          ...form,
          updated_at: new Date().toISOString(),
        }
      };

      const { error } = await supabase
        .from("studio_configs")
        .upsert({
          studio_id: studioId,
          config: newConfig,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["regras-financeiras"] });
      toast.success("Regras financeiras salvas!");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Percent className="h-4 w-4 text-primary" /> Regras Financeiras
        </CardTitle>
        <CardDescription>Configure juros, multas e carência para pagamentos em atraso</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Juros ao dia (%)</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              value={form.juros_ao_dia}
              onChange={(e) => setForm({ ...form, juros_ao_dia: parseFloat(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">Ex: 0.033 = 0,033% ao dia (≈1% ao mês)</p>
          </div>
          <div className="space-y-2">
            <Label>Multa por atraso (%)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={form.multa_percentual}
              onChange={(e) => setForm({ ...form, multa_percentual: parseFloat(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">Percentual fixo aplicado uma vez sobre o valor</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Dias de carência</Label>
            <Input
              type="number"
              min="0"
              value={form.dias_carencia}
              onChange={(e) => setForm({ ...form, dias_carencia: parseInt(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">Dias após o vencimento antes de aplicar juros/multa</p>
          </div>
          <div className="space-y-2">
            <Label>Multa de Cancelamento (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={form.multa_cancelamento}
              onChange={(e) => setForm({ ...form, multa_cancelamento: parseFloat(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">Aplicada sobre o saldo devedor restante (Sugestão: 10%)</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Atualização automática</Label>
            <p className="text-xs text-muted-foreground">Calcular juros e multa automaticamente ao visualizar</p>
          </div>
          <Switch
            checked={form.atualizar_automaticamente}
            onCheckedChange={(v) => setForm({ ...form, atualizar_automaticamente: v })}
          />
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> Salvar Regras Financeiras
        </Button>
      </CardContent>
    </Card>
  );
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

function CheckinRulesCard({
  getValue,
  setValue,
  saving,
  onSave,
}: {
  getValue: (k: string) => string;
  setValue: (k: string, v: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarCog className="h-4 w-4 text-primary" /> Parâmetros de Check-in (Instrutor)
        </CardTitle>
        <CardDescription>Configure as janelas de tolerância e permissões de horário</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Check-in fora do horário</Label>
            <p className="text-xs text-muted-foreground">Permitir registro mesmo fora da janela de tolerância</p>
          </div>
          <Switch
            checked={getValue("checkin.allow_out_of_schedule") === "true"}
            onCheckedChange={(v) => setValue("checkin.allow_out_of_schedule", v ? "true" : "false")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tolerância Antecipada (min)</Label>
            <Input
              type="number"
              min="0"
              value={getValue("checkin.early_window") || "15"}
              onChange={(e) => setValue("checkin.early_window", e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">Tempo máximo permitido ANTES do início da aula</p>
          </div>
          <div className="space-y-2">
            <Label>Tolerância de Atraso (min)</Label>
            <Input
              type="number"
              min="0"
              value={getValue("checkin.late_window") || "60"}
              onChange={(e) => setValue("checkin.late_window", e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">Tempo máximo permitido APÓS o início da aula</p>
          </div>
        </div>

        <Button onClick={onSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> Salvar Regras de Check-in
        </Button>
      </CardContent>
    </Card>
  );
}

function GeoCheckinSettingsCard({
  getValue,
  setValue,
  saving,
  onSave,
}: {
  getValue: (k: string) => string;
  setValue: (k: string, v: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<NominatimResult[]>([]);

  const searchAddress = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        { headers: { "User-Agent": "StudioApp/1.0" } }
      );
      const data: NominatimResult[] = await res.json();
      setResults(data);
      if (data.length === 0) toast.info("Nenhum endereço encontrado.");
    } catch {
      toast.error("Erro ao buscar endereço.");
    } finally {
      setSearching(false);
    }
  };

  const selectResult = (r: NominatimResult) => {
    setValue("checkin.latitude", r.lat);
    setValue("checkin.longitude", r.lon);
    setResults([]);
    setQuery(r.display_name);
    toast.success("Coordenadas preenchidas!");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" /> Geolocalização do Check-in
        </CardTitle>
        <CardDescription>Busque o endereço ou insira as coordenadas manualmente</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Nominatim search */}
        <div className="space-y-2">
          <Label>Buscar endereço</Label>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: Rua das Flores, 123, Belo Horizonte"
              onKeyDown={(e) => e.key === "Enter" && searchAddress()}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={searchAddress}
              disabled={searching}
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {results.length > 0 && (
            <div className="border border-border rounded-md divide-y divide-border max-h-48 overflow-y-auto">
              {results.map((r, i) => (
                <button
                  key={i}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                  onClick={() => selectResult(r)}
                >
                  <span className="line-clamp-2">{r.display_name}</span>
                  <span className="text-xs text-muted-foreground block mt-0.5">
                    {r.lat}, {r.lon}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Latitude</Label>
            <Input
              type="text"
              value={getValue("checkin.latitude")}
              onChange={(e) => setValue("checkin.latitude", e.target.value)}
              placeholder="-19.9191"
            />
          </div>
          <div className="space-y-2">
            <Label>Longitude</Label>
            <Input
              type="text"
              value={getValue("checkin.longitude")}
              onChange={(e) => setValue("checkin.longitude", e.target.value)}
              placeholder="-43.9386"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Raio máximo (metros)</Label>
          <Input
            type="number"
            min="10"
            value={getValue("checkin.raio_metros")}
            onChange={(e) => setValue("checkin.raio_metros", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Distância máxima aceita para o aluno fazer check-in</p>
        </div>
        <Button onClick={onSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> Salvar Geolocalização
        </Button>
      </CardContent>
    </Card>
  );
}

import PersonalPreferencesTabComponent from "@/components/PersonalPreferencesTab";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { studioId } = useAuth();
  const { data: configs = [], isLoading } = useConfiguracoes();
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testingWa, setTestingWa] = useState(false);
  const [waStatus, setWaStatus] = useState<{ status: 'idle' | 'success' | 'error', message?: string }>({ status: 'idle' });

  useEffect(() => {
    if (configs && Object.keys(configs).length > 0) {
      setLocalValues(flattenConfig(configs));
    }
  }, [configs]);

  const getValue = (chave: string) => localValues[chave] ?? "";
  const setValue = (chave: string, valor: string) =>
    setLocalValues((prev) => ({ ...prev, [chave]: valor }));

  const saveCategory = async (categoria: string) => {
    setSaving(true);
    try {
      if (!studioId) return;
      console.warn(`[DEBUG] Salvando categoria: ${categoria} para ID: ${studioId}`);
      
      const { data: current, error: getErr } = await supabase
        .from("studio_configs")
        .select("config")
        .eq("studio_id", studioId)
        .single();

      const existingConfig = (!getErr && current?.config) ? current.config : {};
      
      // Unflatten localValues and merge with existingConfig
      const localNested = unflattenConfig(localValues);
      const newConfig = {
        ...existingConfig,
        ...localNested
      };

      // 1. Save to studio_configs
      const { error } = await supabase
        .from("studio_configs")
        .upsert({
          studio_id: studioId,
          config: newConfig,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // 2. Sync core fields to studios table if category is "geral", "aparencia" or "regras"
      if (categoria === "geral" || categoria === "aparencia" || categoria === "regras") {
        console.warn(`[Settings] Iniciando sincronia da categoria "${categoria}" para o estúdio:`, studioId);
        
        const syncData: any = {};
        
        // Brand fields (always sync if they exist in localValues)
        if (localValues["tema.logo_url"] !== undefined) syncData.logo_url = localValues["tema.logo_url"];
        if (localValues["tema.sidebar_logo_url"] !== undefined) syncData.sidebar_logo_url = localValues["tema.sidebar_logo_url"];
        if (localValues["tema.sidebar_icon_url"] !== undefined) syncData.sidebar_icon_url = localValues["tema.sidebar_icon_url"];

        // Studio general fields (only sync if they have values to avoid accidental wipes)
        if (localValues["estudio.nome"]) syncData.nome = localValues["estudio.nome"];
        if (localValues["estudio.slug"]) syncData.slug = localValues["estudio.slug"];
        if (localValues["estudio.telefone"]) syncData.telefone = localValues["estudio.telefone"];
        if (localValues["estudio.endereco"]) syncData.endereco = localValues["estudio.endereco"];

        // Check-in limits (sync to studios table)
        if (localValues["checkin.allow_out_of_schedule"] !== undefined) {
          syncData.allow_out_of_schedule_checkin = localValues["checkin.allow_out_of_schedule"] === "true";
        }
        if (localValues["checkin.early_window"]) {
          syncData.checkin_early_window_minutes = parseInt(localValues["checkin.early_window"]) || 15;
        }
        if (localValues["checkin.late_window"]) {
          syncData.checkin_late_window_minutes = parseInt(localValues["checkin.late_window"]) || 60;
        }

        if (Object.keys(syncData).length > 0) {
          console.warn("[Settings] Dados de sincronia sugeridos:", syncData);
          
          const { data: updatedRows, error: syncErr } = await supabase
            .from("studios")
            .update(syncData)
            .eq("id", studioId)
            .select();
          
          if (syncErr) {
            console.error("[Settings] Erro ao sincronizar com tabela studios:", syncErr);
            toast.error("Erro ao sincronizar dados básicos: " + syncErr.message);
          } else {
            const count = updatedRows?.length || 0;
            console.warn(`[Settings] Sincronia concluída. Linhas afetadas: ${count}`);
            if (count > 0) {
              toast.success(`Sincronizado com o estúdio! (${count} registro atualizado)`);
            } else {
              toast.warning("Atenção: Nenhuma linha foi atualizada na tabela de estúdios. Verifique se o ID está correto.");
            }
          }
        } else {
           console.warn("[Settings] Nada para sincronizar com a tabela studios.");
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["configuracoes-estudio"] });
      await queryClient.refetchQueries({ queryKey: ["studio-header-config-sb"] });
      
      toast.success("Configurações salvas com sucesso!");
    } catch (e: any) {
      console.error("[DEBUG] Erro capturado no saveCategory:", e);
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, chave: string) => {
    const file = e.target.files?.[0];
    if (!file || !studioId) return;
    
    const ext = file.name.split('.').pop();
    const fileName = `${chave.replace('.', '-')}-${Date.now()}.${ext}`;
    const filePath = `studio-assets/${studioId}/${fileName}`;
    
    try {
      const publicUrl = await uploadFile(file, filePath);
      
      setValue(chave, publicUrl);
      toast.success("Imagem carregada!");
    } catch (error: any) {
      toast.error("Erro ao fazer upload: " + error.message);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Personalize seu estúdio, tema e regras do sistema</p>
        </div>

        <Tabs defaultValue="aparencia" className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto max-w-2xl">
            <TabsTrigger value="aparencia" className="gap-1.5 min-w-0 flex-1 text-xs sm:text-sm">
              <Palette className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Aparência</span><span className="sm:hidden">Tema</span>
            </TabsTrigger>
            <TabsTrigger value="automacao" className="gap-1.5 min-w-0 flex-1 text-xs sm:text-sm">
              <Zap className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">WhatsApp & Automação</span><span className="sm:hidden">WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger value="geral" className="gap-1.5 min-w-0 flex-1 text-xs sm:text-sm">
              <Building2 className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Estúdio & Pix</span><span className="sm:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger value="regras" className="gap-1.5 min-w-0 flex-1 text-xs sm:text-sm">
              <CalendarCog className="h-4 w-4 shrink-0" /> Regras
            </TabsTrigger>
            <TabsTrigger value="pessoais" className="gap-1.5 min-w-0 flex-1 text-xs sm:text-sm">
              <User className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Pessoais</span><span className="sm:hidden">Eu</span>
            </TabsTrigger>
          </TabsList>

          {/* ===== APARÊNCIA ===== */}
          <TabsContent value="aparencia" className="space-y-6 max-w-2xl">
            {/* Cores */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" /> Cores do Tema
                </CardTitle>
                <CardDescription>Clique na cor para abrir o seletor visual</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {[
                  { chave: "tema.cor_primaria", label: "Cor Primária" },
                  { chave: "tema.cor_accent", label: "Cor de Destaque" },
                  { chave: "tema.cor_sidebar", label: "Cor da Sidebar" },
                  { chave: "tema.cor_foreground", label: "Cor do Texto Principal" },
                  { chave: "tema.cor_muted_foreground", label: "Cor do Texto Secundário" },
                  { chave: "tema.cor_card", label: "Cor de Fundo dos Cards" },
                ].map(({ chave, label }) => (
                  <ColorPickerField
                    key={chave}
                    label={label}
                    value={getValue(chave)}
                    onChange={(v) => setValue(chave, v)}
                  />
                ))}

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <Label>Modo Escuro Padrão</Label>
                    <p className="text-xs text-muted-foreground">Ativar tema escuro por padrão</p>
                  </div>
                  <Switch
                    checked={getValue("tema.modo_escuro") === "true"}
                    onCheckedChange={(v) => setValue("tema.modo_escuro", v ? "true" : "false")}
                  />
                </div>

                <Button onClick={() => saveCategory("aparencia")} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" /> Salvar Cores
                </Button>
              </CardContent>
            </Card>

            {/* Tipografia */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Type className="h-4 w-4 text-primary" /> Tipografia
                </CardTitle>
                <CardDescription>Escolha as fontes, tamanhos e pesos do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Fonte dos Títulos</Label>
                  <Select value={getValue("tema.fonte_titulo")} onValueChange={(v) => setValue("tema.fonte_titulo", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((f) => (
                        <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fonte do Corpo</Label>
                  <Select value={getValue("tema.fonte_corpo")} onValueChange={(v) => setValue("tema.fonte_corpo", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((f) => (
                        <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tamanho Base (px)</Label>
                    <Select value={getValue("tema.tamanho_base") || "16"} onValueChange={(v) => setValue("tema.tamanho_base", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["13", "14", "15", "16", "17", "18", "20"].map((s) => (
                          <SelectItem key={s} value={s}>{s}px</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Tamanho padrão do texto do corpo</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Escala dos Títulos</Label>
                    <Select value={getValue("tema.escala_titulo") || "normal"} onValueChange={(v) => setValue("tema.escala_titulo", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Compacta</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="large">Grande</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Proporção dos títulos em relação ao corpo</p>
                  </div>
                </div>

                {/* Preview */}
                <div className="rounded-lg border border-border p-4 bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-2">Pré-visualização</p>
                  <h3
                    className="font-bold"
                    style={{
                      fontFamily: getValue("tema.fonte_titulo") || "Plus Jakarta Sans",
                      fontSize: `${getTitleSize(getValue("tema.tamanho_base") || "16", getValue("tema.escala_titulo") || "normal")}px`,
                    }}
                  >
                    Título de Exemplo
                  </h3>
                  <p
                    className="text-muted-foreground mt-1"
                    style={{
                      fontFamily: getValue("tema.fonte_corpo") || "Inter",
                      fontSize: `${getValue("tema.tamanho_base") || "16"}px`,
                    }}
                  >
                    Este é um texto de corpo para visualizar a fonte e tamanho escolhidos.
                  </p>
                </div>

                <Button onClick={() => saveCategory("aparencia")} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" /> Salvar Tipografia
                </Button>
              </CardContent>
            </Card>

            {/* Logo e Ícones */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" /> Logotipo e Ícones
                </CardTitle>
                <CardDescription>Faça upload do logotipo e favicon do estúdio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { chave: "tema.logo_url", label: "Logotipo Principal", hint: "Recomendado: PNG transparente, 200x60px" },
                  { chave: "tema.sidebar_icon_url", label: "Ícone da Sidebar (Quadrado)", hint: "Exibido à esquerda do nome ou logo na sidebar. Recomendado: 128x128px" },
                  { chave: "tema.sidebar_logo_url", label: "Logo da Sidebar (Retangular)", hint: "Substitui o nome em texto na sidebar. Recomendado: 120x30px" },
                  { chave: "tema.favicon_url", label: "Favicon", hint: "Recomendado: ICO ou PNG, 32x32px" },
                ].map(({ chave, label, hint }) => (
                  <div key={chave} className="space-y-2">
                    <Label>{label}</Label>
                    <p className="text-xs text-muted-foreground">{hint}</p>
                    <div className="flex items-center gap-3">
                      {getValue(chave) && (
                        <img
                          src={getValue(chave)}
                          alt={label}
                          className="h-12 w-auto max-w-[200px] rounded border border-border bg-muted/50 object-contain p-1"
                        />
                      )}
                      <div className="flex-1">
                        <Input
                          value={getValue(chave)}
                          onChange={(e) => setValue(chave, e.target.value)}
                          placeholder="URL da imagem ou faça upload"
                          className="text-sm"
                        />
                      </div>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleLogoUpload(e, chave)}
                        />
                        <Button variant="outline" size="icon" asChild>
                          <span><Upload className="h-4 w-4" /></span>
                        </Button>
                      </label>
                    </div>
                  </div>
                ))}

                <Button onClick={() => saveCategory("aparencia")} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" /> Salvar Imagens
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== ESTÚDIO ===== */}
          <TabsContent value="geral" className="space-y-6 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dados do Estúdio</CardTitle>
                <CardDescription>Informações básicas do seu estúdio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { chave: "estudio.nome", label: "Nome do Estúdio" },
                  { chave: "estudio.slug", label: "Link Curto / Identificador (ex: meu-studio)" },
                  { chave: "estudio.cnpj", label: "CNPJ" },
                  { chave: "estudio.telefone", label: "Telefone" },
                  { chave: "estudio.email", label: "E-mail" },
                  { chave: "estudio.endereco", label: "Endereço" },
                ].map(({ chave, label }) => (
                  <div key={chave} className="space-y-2">
                    <Label>{label}</Label>
                    <Input
                      value={getValue(chave)}
                      onChange={(e) => setValue(chave, e.target.value)}
                    />
                  </div>
                ))}
                <Button onClick={() => saveCategory("geral")} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" /> Salvar
                </Button>
              </CardContent>
            </Card>

            {/* Pix Config (Manual) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" /> Configuração do Pix (Transferência Direta)
                </CardTitle>
                <CardDescription>Configure sua chave Pix para exibição manual (não automatizada) no sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo da Chave</Label>
                  <Select value={getValue("financeiro.pix_tipo_chave")} onValueChange={(v) => setValue("financeiro.pix_tipo_chave", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="telefone">Telefone</SelectItem>
                      <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Chave Pix</Label>
                  <Input
                    value={getValue("financeiro.pix_chave")}
                    onChange={(e) => setValue("financeiro.pix_chave", e.target.value)}
                    placeholder="Sua chave Pix"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome do Beneficiário</Label>
                  <Input
                    value={getValue("financeiro.pix_nome_beneficiario")}
                    onChange={(e) => setValue("financeiro.pix_nome_beneficiario", e.target.value)}
                    placeholder="Nome que aparece no comprovante"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    value={getValue("financeiro.pix_cidade")}
                    onChange={(e) => setValue("financeiro.pix_cidade", e.target.value)}
                    placeholder="Ex: Sao Paulo"
                  />
                  <p className="text-xs text-muted-foreground">Sem acentos, máximo 15 caracteres</p>
                </div>
                <Button onClick={() => saveCategory("financeiro")} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" /> Salvar Configuração Pix
                </Button>
              </CardContent>
            </Card>


            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" /> Redes Sociais
                </CardTitle>
                <CardDescription>Links das mídias sociais do estúdio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { chave: "estudio.instagram", label: "Instagram", placeholder: "https://instagram.com/seuestudio" },
                  { chave: "estudio.facebook", label: "Facebook", placeholder: "https://facebook.com/seuestudio" },
                  { chave: "estudio.whatsapp", label: "WhatsApp", placeholder: "https://wa.me/5511999999999" },
                  { chave: "estudio.youtube", label: "YouTube", placeholder: "https://youtube.com/@seuestudio" },
                  { chave: "estudio.tiktok", label: "TikTok", placeholder: "https://tiktok.com/@seuestudio" },
                  { chave: "estudio.website", label: "Website", placeholder: "https://seuestudio.com.br" },
                ].map(({ chave, label, placeholder }) => (
                  <div key={chave} className="space-y-2">
                    <Label>{label}</Label>
                    <Input
                      value={getValue(chave)}
                      onChange={(e) => setValue(chave, e.target.value)}
                      placeholder={placeholder}
                    />
                  </div>
                ))}
                <Button onClick={() => saveCategory("geral")} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" /> Salvar Redes Sociais
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== REGRAS ===== */}
          <TabsContent value="regras" className="space-y-6 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Regras de Agendamento</CardTitle>
                <CardDescription>Configure limites e prazos do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Antecedência mínima para cancelamento (horas)</Label>
                  <Input
                    type="number"
                    value={getValue("agendamento.antecedencia_cancelamento_horas")}
                    onChange={(e) => setValue("agendamento.antecedencia_cancelamento_horas", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Taxa de Matrícula (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={getValue("estudio.taxa_matricula") || "0"}
                    onChange={(e) => setValue("estudio.taxa_matricula", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Taxa cobrada em novas inscrições ou se inativo por mais de 1 ano. 0 para não cobrar.</p>
                </div>
                <div className="space-y-2">
                  <Label>Prazo para reposição (dias)</Label>
                  <Input
                    type="number"
                    value={getValue("agendamento.prazo_reposicao_dias")}
                    onChange={(e) => setValue("agendamento.prazo_reposicao_dias", e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Bloqueio automático por inadimplência</Label>
                    <p className="text-xs text-muted-foreground">Bloquear check-in de alunos inadimplentes</p>
                  </div>
                  <Switch
                    checked={getValue("agendamento.bloqueio_inadimplencia") === "true"}
                    onCheckedChange={(v) => setValue("agendamento.bloqueio_inadimplencia", v ? "true" : "false")}
                  />
                </div>
                <Button onClick={() => saveCategory("regras")} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" /> Salvar
                </Button>
              </CardContent>
            </Card>

            {/* Regras de Check-in */}
            <CheckinRulesCard
              getValue={getValue}
              setValue={setValue}
              saving={saving}
              onSave={() => saveCategory("regras")}
            />

            {/* Geolocalização Check-in */}
            <GeoCheckinSettingsCard
              getValue={getValue}
              setValue={setValue}
              saving={saving}
              onSave={() => saveCategory("regras")}
            />

            <FinancialRulesCard />
          </TabsContent>

          {/* ===== AUTOMAÇÃO ===== */}
          <TabsContent value="automacao" className="space-y-6 max-w-2xl">
            {/* Regras de Pós-Venda */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" /> Automação Pós-Venda
                </CardTitle>
                <CardDescription>Configure gatilhos automáticos após a matrícula</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Projetar Parcelas Automático</Label>
                      <p className="text-xs text-muted-foreground">Gerar todas as parcelas do plano na matrícula</p>
                    </div>
                    <Switch
                      checked={getValue("automacao.projetar_parcelas") === "true"}
                      onCheckedChange={(v) => setValue("automacao.projetar_parcelas", v ? "true" : "false")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Desconto para Pagamento Antecipado (%)</Label>
                    <Input
                      type="number"
                      value={getValue("automacao.desconto_antecipado") || "5"}
                      onChange={(e) => setValue("automacao.desconto_antecipado", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Aplicado se data de pagamento {"<"} vencimento</p>
                  </div>
                </div>
                <Button onClick={() => saveCategory("automacao")} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" /> Salvar Regras de Automação
                </Button>
              </CardContent>
            </Card>

            {/* Evolution API Config */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                 <div className="flex items-center gap-2 text-primary">
                    <Plug className="h-5 w-5" />
                    <CardTitle className="text-base font-black uppercase italic tracking-tighter">Gestão de Conexões</CardTitle>
                 </div>
                 <CardDescription className="text-xs font-medium text-slate-600">
                    As credenciais técnicas (URLs, Chaves de API e Tokens) agora são gerenciadas centralmente no menu <b>Integrações</b> para maior segurança.
                 </CardDescription>
              </CardHeader>
              <CardContent>
                 <Button variant="outline" className="w-full justify-between group" onClick={() => window.location.href = '/admin/integracoes'}>
                    Acessar Menu de Integrações <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                 </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" /> Automação e Notificações
                </CardTitle>
                <CardDescription>Configure quando o sistema deve enviar mensagens automáticas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs">Msg na Matrícula</Label>
                      <p className="text-[10px] text-muted-foreground">Boas-vindas automático</p>
                    </div>
                    <Switch
                      checked={getValue("whatsapp.auto_send_enrollment") === "true"}
                      onCheckedChange={(v) => setValue("whatsapp.auto_send_enrollment", v ? "true" : "false")}
                    />
                  </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs">Aviso de Fatura</Label>
                        <p className="text-[10px] text-muted-foreground">Lembrete de vencimento</p>
                      </div>
                      <Switch
                        checked={getValue("whatsapp.auto_send_payment") === "true"}
                        onCheckedChange={(v) => setValue("whatsapp.auto_send_payment", v ? "true" : "false")}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs">Msg Aniversário</Label>
                        <p className="text-[10px] text-muted-foreground">Parabéns automático</p>
                      </div>
                      <Switch
                        checked={getValue("whatsapp.auto_send_birthday") === "true"}
                        onCheckedChange={(v) => setValue("whatsapp.auto_send_birthday", v ? "true" : "false")}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs">Botão Automação Geral</Label>
                        <p className="text-[10px] text-muted-foreground">Exibir gatilho manual na cobrança</p>
                      </div>
                      <Switch
                        checked={getValue("whatsapp.show_automation_trigger") === "true"}
                        onCheckedChange={(v) => setValue("whatsapp.show_automation_trigger", v ? "true" : "false")}
                      />
                    </div>
                </div>

                <Button onClick={() => saveCategory("automacao")} disabled={saving} className="gap-2 w-full sm:w-auto">
                  <Save className="h-4 w-4" /> Salvar Configuração WhatsApp
                </Button>
              </CardContent>
            </Card>

            {/* WhatsApp Templates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-primary" /> Templates de WhatsApp
                </CardTitle>
                <CardDescription>Personalize o texto dos lembretes de pagamento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Boas-vindas (Nova Matrícula)</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={getValue("automacao.whatsapp_welcome") || "Olá [nome]! Bem-vindo(a) ao [studio_nome]. Sua matrícula foi realizada com sucesso! 🎉"}
                    onChange={(e) => setValue("automacao.whatsapp_welcome", e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">Variáveis: [nome], [studio_nome]</p>
                </div>
                <div className="space-y-2">
                  <Label>Lembrete (Dia do Vencimento)</Label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={getValue("automacao.whatsapp_lembrete") || "Olá [nome], passando para lembrar que sua mensalidade de [valor] vence hoje. Segue link: [link]"}
                    onChange={(e) => setValue("automacao.whatsapp_lembrete", e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">Variáveis: [nome], [valor], [vencimento], [link]</p>
                </div>
                <div className="space-y-2">
                  <Label>Aviso de Atraso Crítico (7+ dias)</Label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={getValue("automacao.whatsapp_delay_critical") || "Olá [nome], notamos que sua mensalidade de [valor] está com mais de 7 dias de atraso. Por favor, regularize assim que possível: [link]"}
                    onChange={(e) => setValue("automacao.whatsapp_delay_critical", e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">Variáveis: [nome], [valor], [vencimento], [link]</p>
                </div>
                <div className="space-y-2">
                  <Label>Parabéns (Aniversário)</Label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={getValue("automacao.whatsapp_birthday") || "Parabéns, [nome]! 🎉 Toda a equipe do [studio_nome] te deseja um dia incrível e cheio de dança!"}
                    onChange={(e) => setValue("automacao.whatsapp_birthday", e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">Variáveis: [nome], [studio_nome]</p>
                </div>
                <Button onClick={() => saveCategory("automacao")} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" /> Salvar Templates
                </Button>
              </CardContent>
            </Card>

            {/* Contract Template */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSignature className="h-4 w-4 text-primary" /> Modelo de Contrato Padrão
                </CardTitle>
                <CardDescription>Texto base usado para gerar novos contratos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Corpo do Contrato</Label>
                  <textarea
                    className="flex min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-serif"
                    value={getValue("automacao.contrato_template") || "CONTRATO DE PRESTAÇÃO DE SERVIÇOS\n\nContratado: [estudio_nome]\nContratante: [aluno_nome], CPF: [aluno_cpf]\nPlano: [plano_nome]\nValor: [plano_valor]\nTaxa de Matrícula: [taxa_matricula]\n\n..." }
                    onChange={(e) => setValue("automacao.contrato_template", e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">Placeholders: [aluno_nome], [aluno_cpf], [plano_nome], [plano_valor], [estudio_nome], [taxa_matricula]</p>
                </div>
                <Button onClick={() => saveCategory("automacao")} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" /> Salvar Modelo de Contrato
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== E-MAIL (SMTP) ===== */}
           <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                 <div className="flex items-center gap-2 text-primary">
                    <Plug className="h-5 w-5" />
                    <CardTitle className="text-base font-black uppercase italic tracking-tighter">Configuração de Servidor</CardTitle>
                 </div>
                 <CardDescription className="text-xs font-medium text-slate-600">
                    As credenciais do servidor SMTP (Host, Porta, Usuário e Senha) agora são gerenciadas no menu <b>Integrações</b>.
                 </CardDescription>
              </CardHeader>
              <CardContent>
                 <Button variant="outline" className="w-full justify-between group" onClick={() => window.location.href = '/admin/integracoes'}>
                    Configurar E-mail em Integrações <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                 </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" /> Identidade de E-mail
                </CardTitle>
                <CardDescription>Como o aluno verá seus e-mails</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Remetente</Label>
                  <Input 
                    value={getValue("email.sender_name")} 
                    onChange={(e) => setValue("email.sender_name", e.target.value)} 
                    placeholder="Ex: Studio Kineos"
                  />
                  <p className="text-[10px] text-muted-foreground">Como o nome aparecerá na caixa de entrada do aluno</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button onClick={() => saveCategory("email")} disabled={saving} className="gap-2 w-full">
                    <Save className="h-4 w-4" /> Salvar Nome do Remetente
                  </Button>
                </div>
              </CardContent>
            </Card>


          {/* ===== PREFERÊNCIAS PESSOAIS ===== */}
          <TabsContent value="pessoais" className="space-y-6 max-w-2xl">
            <PersonalPreferencesTabComponent role="admin" showDashboardSections={true} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
