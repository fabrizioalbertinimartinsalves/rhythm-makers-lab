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
import { cn } from "@/lib/utils";
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
    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white/50 hover:bg-white hover:shadow-sm transition-all group">
      <div className="space-y-0.5">
        <Label className="text-[11px] font-black uppercase tracking-tight text-slate-700">{label}</Label>
        <p className="text-[9px] font-mono text-slate-400">{value}</p>
      </div>
      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild title={`Seletor de cor para ${label}`}>
            <button
              className={cn(
                "h-10 w-10 rounded-full border-4 border-white shrink-0 cursor-pointer shadow-md hover:scale-110 transition-transform ring-1 ring-slate-100",
                `bg-[hsl(${value?.replace(/\s+/g, '_') || '0_0%_100%'})]`
              )}
              aria-label={`Selecionar ${label}`}
            />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4 rounded-2xl shadow-2xl border-none bg-white/90 backdrop-blur-xl" align="end">
            <h4 className="text-[10px] font-black uppercase mb-3 text-slate-500 tracking-widest">{label}</h4>
            <HslColorPicker
              color={hsl}
              onChange={(newHsl) => onChange(formatHsl(newHsl))}
            />
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
               <span className="text-[10px] font-bold font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded">HSL: {value}</span>
            </div>
          </PopoverContent>
        </Popover>
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
    <Card className="border-none shadow-xl bg-white/40 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-tighter flex items-center gap-2 text-slate-800">
          <div className="bg-primary text-white p-1.5 rounded-lg shadow-sm"><Percent className="h-4 w-4" /></div>
          Regras Financeiras
        </CardTitle>
        <CardDescription className="text-[10px] font-medium text-slate-500">Configure juros, multas e carência para pagamentos em atraso</CardDescription>
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
    <Card className="border-none shadow-xl bg-white/40 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-tighter flex items-center gap-2 text-slate-800">
          <div className="bg-primary text-white p-1.5 rounded-lg shadow-sm"><CalendarCog className="h-4 w-4" /></div>
          Parâmetros de Check-in (Instrutor)
        </CardTitle>
        <CardDescription className="text-[10px] font-medium text-slate-500">Configure as janelas de tolerância e permissões de horário</CardDescription>
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
    <Card className="border-none shadow-xl bg-white/40 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-tighter flex items-center gap-2 text-slate-800">
          <div className="bg-primary text-white p-1.5 rounded-lg shadow-sm"><MapPin className="h-4 w-4" /></div>
          Geolocalização do Check-in
        </CardTitle>
        <CardDescription className="text-[10px] font-medium text-slate-500">Busque o endereço ou insira as coordenadas manualmente</CardDescription>
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

function PreviewUI({ values }: { values: Record<string, string> }) {
  const getV = (k: string) => values[k] || "";
  const fTitulo = getV("tema.fonte_titulo") || "Plus Jakarta Sans";
  const fCorpo = getV("tema.fonte_corpo") || "Inter";
  
  return (
    <div className="sticky top-6 space-y-4">
      <div className="flex items-center justify-between">
         <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preview em Tempo Real</h4>
         <div className="flex gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
         </div>
      </div>
      
      <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xl bg-slate-50 aspect-video sm:aspect-auto flex flex-col sm:min-h-[400px]">
        {/* Mock Header */}
        <div className="h-8 bg-white border-b border-slate-100 flex items-center px-3 gap-2">
          <div className="h-2 w-10 rounded bg-slate-100" />
          <div className="h-2 w-10 rounded bg-slate-100" />
          <div className="ml-auto flex gap-2">
            <div 
              className={cn(
                "h-4 w-4 rounded-full",
                `bg-[hsl(${getV("tema.cor_primaria")?.replace(/\s+/g, '_') || "220_100%_50%"})]`
              )} 
            />
          </div>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Mock Sidebar */}
          <div 
            className={cn(
              "w-16 border-r border-slate-100 p-2 space-y-3",
              `bg-[hsl(${getV("tema.cor_sidebar")?.replace(/\s+/g, '_') || "222_47%_11%"})]`
            )} 
           >
            <div className="h-4 w-full rounded bg-white/10" />
            <div className="h-3 w-8 rounded bg-white/20 mx-auto" />
            <div className="h-3 w-6 rounded bg-white/10 mx-auto" />
            <div className="h-3 w-7 rounded bg-white/10 mx-auto" />
          </div>
          
          {/* Mock Content */}
          <div className="flex-1 p-4 space-y-4">
            <div className="space-y-1">
               <h2 
                 className={cn(
                   "text-sm font-black uppercase",
                   `font-['${fTitulo}']`,
                   `text-[hsl(${getV("tema.cor_foreground")?.replace(/\s+/g, '_') || "222_47%_11%"})]`
                 )}
               >
                 Meu Estúdio
               </h2>
               <p 
                 className={cn(
                   "text-[10px]",
                   `font-['${fCorpo}']`,
                   `text-[hsl(${getV("tema.cor_muted_foreground")?.replace(/\s+/g, '_') || "215_16%_47%"})]`
                 )}
               >
                 Configurações aplicadas agora
               </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
               <div 
                 className={cn(
                   "p-3 rounded-xl border border-slate-200 shadow-sm",
                   `bg-[hsl(${getV("tema.cor_card")?.replace(/\s+/g, '_') || "0_0%_100%"})]`
                 )}
               >
                  <div 
                    className={cn(
                      "h-2 w-12 rounded mb-2",
                      `bg-[hsl(${getV("tema.cor_primaria")?.replace(/\s+/g, '_') || "220_100%_50%"})]`
                    )} 
                  />
                  <div className="h-1.5 w-full rounded bg-slate-100 mb-1" />
                  <div className="h-1.5 w-3/4 rounded bg-slate-100" />
               </div>
               <div 
                 className={cn(
                   "p-3 rounded-xl border border-slate-200 shadow-sm",
                   `bg-[hsl(${getV("tema.cor_card")?.replace(/\s+/g, '_') || "0_0%_100%"})]`
                 )}
               >
                  <div 
                    className={cn(
                      "h-2 w-8 rounded mb-2",
                      `bg-[hsl(${getV("tema.cor_accent")?.replace(/\s+/g, '_') || "220_100%_50%"})]`
                    )} 
                  />
                  <div className="h-1.5 w-full rounded bg-slate-100 mb-1" />
                  <div className="h-1.5 w-1/2 rounded bg-slate-100" />
               </div>
            </div>
            
            <button 
               className={cn(
                 "w-full py-2 rounded-lg text-white font-bold text-[10px] uppercase tracking-wider",
                 `bg-[hsl(${getV("tema.cor_primaria")?.replace(/\s+/g, '_') || "220_100%_50%"})]`
               )}
             >
              Simular Botão Principal
            </button>
          </div>
        </div>
      </div>
    </div>
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
      <div className="space-y-8 animate-fade-in relative">
        {/* Background Accent */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tighter uppercase italic text-slate-900 flex items-center gap-3">
               <div className="h-8 w-2 bg-primary rounded-full shadow-sm shadow-primary/20" />
               Configurações
            </h1>
            <p className="text-sm font-medium text-slate-500">Personalize seu estúdio, tema e regras do ecossistema Kineos</p>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
             Estúdio Ativo: {studioId?.substring(0, 8)}...
          </div>
        </div>

        <Tabs defaultValue="aparencia" className="space-y-8">
          <TabsList className="flex w-full overflow-x-auto max-w-4xl bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-slate-100 shadow-xl">
            {[
              { value: "aparencia", icon: Palette, label: "Aparência", short: "Tema" },
              { value: "automacao", icon: Zap, label: "Automação", short: "Bots" },
              { value: "geral", icon: Building2, label: "Estúdio & Pix", short: "Info" },
              { value: "regras", icon: CalendarCog, label: "Regras", short: "Regras" },
              { value: "pessoais", icon: User, label: "Pessoais", short: "Eu" },
            ].map(({ value, icon: Icon, label, short }) => (
              <TabsTrigger 
                key={value}
                value={value} 
                className="gap-2 min-w-0 flex-1 h-10 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-lg shadow-slate-200"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" /> 
                <span className="hidden md:inline">{label}</span>
                <span className="md:hidden">{short}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ===== APARÊNCIA ===== */}
          <TabsContent value="aparencia" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Coluna de Configurações */}
              <div className="space-y-6">
                {/* Cores */}
                <Card className="border-none shadow-xl bg-white/40 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-sm font-black uppercase tracking-tighter flex items-center gap-2 text-slate-800">
                      <div className="bg-indigo-500 text-white p-1.5 rounded-lg shadow-sm"><Palette className="h-4 w-4" /></div>
                      Cores do Tema
                    </CardTitle>
                    <CardDescription className="text-[10px] font-medium text-slate-500">
                      Personalize a identidade visual do seu sistema. As mudanças são refletidas no preview ao lado.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { chave: "tema.cor_primaria", label: "Marca Principal" },
                        { chave: "tema.cor_accent", label: "Destaque / Accent" },
                        { chave: "tema.cor_sidebar", label: "Barra Lateral" },
                        { chave: "tema.cor_card", label: "Fundo de Cards" },
                        { chave: "tema.cor_foreground", label: "Texto Principal" },
                        { chave: "tema.cor_muted_foreground", label: "Texto Muted" },
                      ].map(({ chave, label }) => (
                        <ColorPickerField
                          key={chave}
                          label={label}
                          value={getValue(chave)}
                          onChange={(v) => setValue(chave, v)}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 mt-4 border border-slate-100">
                      <div>
                        <Label className="text-xs font-bold text-slate-700">Modo Escuro Padrão</Label>
                        <p className="text-[10px] text-slate-400">Iniciar com tema dark ativo</p>
                      </div>
                      <Switch
                        checked={getValue("tema.modo_escuro") === "true"}
                        onCheckedChange={(v) => setValue("tema.modo_escuro", v ? "true" : "false")}
                      />
                    </div>

                    <Button onClick={() => saveCategory("aparencia")} disabled={saving} className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] gap-2 rounded-xl shadow-lg shadow-slate-200">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar Identidade Visual
                    </Button>
                  </CardContent>
                </Card>

                {/* Tipografia */}
                <Card className="border-none shadow-xl bg-white/40 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-sm font-black uppercase tracking-tighter flex items-center gap-2 text-slate-800">
                      <div className="bg-amber-500 text-white p-1.5 rounded-lg shadow-sm"><Type className="h-4 w-4" /></div>
                      Tipografia
                    </CardTitle>
                    <CardDescription className="text-[10px] font-medium text-slate-500">Fontes e escalas para legibilidade e estilo</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-slate-500">Fonte Títulos</Label>
                        <Select value={getValue("tema.fonte_titulo")} onValueChange={(v) => setValue("tema.fonte_titulo", v)}>
                          <SelectTrigger className="h-10 rounded-xl bg-white focus:ring-1 border-slate-100"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FONT_OPTIONS.map((f) => (
                              <SelectItem key={f} value={f} className={cn(`font-['${f}']`)}>{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-slate-500">Fonte Corpo</Label>
                        <Select value={getValue("tema.fonte_corpo")} onValueChange={(v) => setValue("tema.fonte_corpo", v)}>
                          <SelectTrigger className="h-10 rounded-xl bg-white focus:ring-1 border-slate-100"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FONT_OPTIONS.map((f) => (
                              <SelectItem key={f} value={f} className={cn(`font-['${f}']`)}>{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-slate-500">Tamanho Base</Label>
                        <Select value={getValue("tema.tamanho_base") || "16"} onValueChange={(v) => setValue("tema.tamanho_base", v)}>
                          <SelectTrigger className="h-10 rounded-xl bg-white focus:ring-1 border-slate-100"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["13", "14", "15", "16", "17", "18", "20"].map((s) => (
                              <SelectItem key={s} value={s}>{s}px</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-slate-500">Atalho de Escala</Label>
                        <Select value={getValue("tema.escala_titulo") || "normal"} onValueChange={(v) => setValue("tema.escala_titulo", v)}>
                          <SelectTrigger className="h-10 rounded-xl bg-white focus:ring-1 border-slate-100"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="compact">Compacta</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="large">Grande</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Coluna de Preview */}
              <div className="lg:sticky lg:top-6">
                 <PreviewUI values={localValues} />
              </div>
            </div>

            {/* Logo e Ícones */}
            <Card className="border-none shadow-xl bg-white/40 backdrop-blur-md max-w-2xl">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-tighter flex items-center gap-2 text-slate-800">
                  <div className="bg-emerald-500 text-white p-1.5 rounded-lg shadow-sm"><ImageIcon className="h-4 w-4" /></div>
                  Logotipo e Ativos de Marca
                </CardTitle>
                <CardDescription className="text-[10px] font-medium text-slate-500">Gestão de imagens e identidade da empresa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                      {[
                        { chave: "tema.logo_url", label: "Logo Principal", hint: "PNG transparente, 200x60px", id: "logo-url" },
                        { chave: "tema.sidebar_icon_url", label: "Ícone Sidebar", hint: "Logo quadrada 128x128px", id: "sidebar-icon" },
                      ].map(({ chave, label, hint, id }) => (
                        <div key={chave} className="space-y-3 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm relative group overflow-hidden">
                           <Label htmlFor={id} className="text-[10px] font-black uppercase text-slate-500">{label}</Label>
                           <div className="h-24 flex items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-100 group-hover:border-primary/20 transition-all">
                              {getValue(chave) ? (
                                <img src={getValue(chave)} alt={label} className="max-h-16 w-auto object-contain drop-shadow-sm" />
                              ) : (
                                <div className="items-center flex flex-col gap-1 text-slate-300">
                                  <Upload className="h-6 w-6" />
                                  <span className="text-[8px] font-black uppercase">Nenhuma imagem</span>
                                </div>
                              )}
                           </div>
                           <div className="flex gap-2">
                              <Input
                                id={id}
                                value={getValue(chave)}
                                onChange={(e) => setValue(chave, e.target.value)}
                                placeholder="URL..."
                                title={`URL da imagem para ${label}`}
                                className="h-8 text-[10px] border-slate-100 rounded-lg"
                              />
                           <label className="cursor-pointer">
                             <input 
                               type="file" 
                               accept="image/*" 
                               className="hidden" 
                               onChange={(e) => handleLogoUpload(e, chave)} 
                               title={`Selecionar imagem para ${label}`}
                               aria-label={`Selecionar imagem para ${label}`}
                             />
                             <Button variant="outline" size="sm" className="h-8 px-2 rounded-lg border-slate-100 hover:bg-slate-50" asChild>
                               <span><Upload className="h-3.5 w-3.5" /></span>
                             </Button>
                           </label>
                        </div>
                        <p className="text-[8px] font-medium text-slate-400 italic text-center">{hint}</p>
                     </div>
                   ))}

                <Button onClick={() => saveCategory("aparencia")} disabled={saving} className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-900 font-black uppercase tracking-widest text-[10px] gap-2 rounded-xl transition-all">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Atualizar Imagens da Marca
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="geral" className="space-y-6 max-w-2xl">
            <Card className="border-none shadow-xl bg-white/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-tighter flex items-center gap-2 text-slate-800">
                  <div className="bg-primary text-white p-1.5 rounded-lg shadow-sm"><Building2 className="h-4 w-4" /></div>
                  Dados do Estúdio
                </CardTitle>
                <CardDescription className="text-[10px] font-medium text-slate-500">Informações básicas do seu estúdio</CardDescription>
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
            <Card className="border-none shadow-xl bg-white/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-tighter flex items-center gap-2 text-slate-800">
                  <div className="bg-primary text-white p-1.5 rounded-lg shadow-sm"><Smartphone className="h-4 w-4" /></div>
                  Configuração do Pix
                </CardTitle>
                <CardDescription className="text-[10px] font-medium text-slate-500">Chave Pix para exibição manual no sistema</CardDescription>
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

          <TabsContent value="regras" className="space-y-6 max-w-2xl">
            <Card className="border-none shadow-xl bg-white/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-tighter flex items-center gap-2 text-slate-800">
                  <div className="bg-primary text-white p-1.5 rounded-lg shadow-sm"><CalendarCog className="h-4 w-4" /></div>
                  Regras de Agendamento
                </CardTitle>
                <CardDescription className="text-[10px] font-medium text-slate-500">Configure limites e prazos do sistema</CardDescription>
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

          <TabsContent value="automacao" className="space-y-6 max-w-2xl">
            {/* Regras de Pós-Venda */}
            <Card className="border-none shadow-xl bg-white/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-tighter flex items-center gap-2 text-slate-800">
                  <div className="bg-indigo-500 text-white p-1.5 rounded-lg shadow-sm"><Zap className="h-4 w-4" /></div>
                  Automação Pós-Venda
                </CardTitle>
                <CardDescription className="text-[10px] font-medium text-slate-500">Configure gatilhos automáticos após a matrícula</CardDescription>
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

            <Card className="border-none shadow-xl bg-white/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-tighter flex items-center gap-2 text-slate-800">
                  <div className="bg-indigo-500 text-white p-1.5 rounded-lg shadow-sm"><Zap className="h-4 w-4" /></div>
                  Automação e Notificações
                </CardTitle>
                <CardDescription className="text-[10px] font-medium text-slate-500">Configure quando o sistema deve enviar mensagens automáticas</CardDescription>
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
            <Card className="border-none shadow-xl bg-white/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-tighter flex items-center gap-2 text-slate-800">
                  <div className="bg-indigo-500 text-white p-1.5 rounded-lg shadow-sm"><MessageCircle className="h-4 w-4" /></div>
                  Templates de WhatsApp
                </CardTitle>
                <CardDescription className="text-[10px] font-medium text-slate-500">Personalize o texto dos lembretes de pagamento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-welcome">Boas-vindas (Nova Matrícula)</Label>
                  <textarea
                    id="whatsapp-welcome"
                    title="Template de mensagem de boas-vindas"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={getValue("automacao.whatsapp_welcome") || "Olá [nome]! Bem-vindo(a) ao [studio_nome]. Sua matrícula foi realizada com sucesso! 🎉"}
                    onChange={(e) => setValue("automacao.whatsapp_welcome", e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">Variáveis: [nome], [studio_nome]</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-lembrete">Lembrete (Dia do Vencimento)</Label>
                  <textarea
                    id="whatsapp-lembrete"
                    title="Template de mensagem de lembrete"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={getValue("automacao.whatsapp_lembrete") || "Olá [nome], passando para lembrar que sua mensalidade de [valor] vence hoje. Segue link: [link]"}
                    onChange={(e) => setValue("automacao.whatsapp_lembrete", e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">Variáveis: [nome], [valor], [vencimento], [link]</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-atraso">Aviso de Atraso Crítico (7+ dias)</Label>
                  <textarea
                    id="whatsapp-atraso"
                    title="Template de mensagem de atraso crítico"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={getValue("automacao.whatsapp_delay_critical") || "Olá [nome], notamos que sua mensalidade de [valor] está com mais de 7 dias de atraso. Por favor, regularize assim que possível: [link]"}
                    onChange={(e) => setValue("automacao.whatsapp_delay_critical", e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">Variáveis: [nome], [valor], [vencimento], [link]</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-birthday">Parabéns (Aniversário)</Label>
                  <textarea
                    id="whatsapp-birthday"
                    title="Template de mensagem de aniversário"
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
            <Card className="border-none shadow-xl bg-white/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-tighter flex items-center gap-2 text-slate-800">
                  <div className="bg-indigo-500 text-white p-1.5 rounded-lg shadow-sm"><FileSignature className="h-4 w-4" /></div>
                  Modelo de Contrato Padrão
                </CardTitle>
                <CardDescription className="text-[10px] font-medium text-slate-500">Texto base usado para gerar novos contratos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contrato-template">Corpo do Contrato</Label>
                  <textarea
                    id="contrato-template"
                    title="Modelo de texto para contratos"
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
