import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Moon, Sun, Monitor, Bell, Eye, EyeOff, Home, Loader2, Type, Palette } from "lucide-react";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { toast } from "sonner";
import { HslColorPicker } from "react-colorful";

const DASHBOARD_SECTIONS: { id: string; label: string }[] = [
  { id: "quick-actions", label: "Ações Rápidas" },
  { id: "metrics", label: "Métricas" },
  { id: "charts", label: "Gráficos" },
  { id: "bottom-row", label: "Aulas / Pagamentos / Instrutores" },
  { id: "risk-notifications", label: "Risco & Notificações" },
  { id: "sales", label: "Vendas do Mês" },
];

const LANDING_OPTIONS_ADMIN = [
  { value: "auto", label: "Automático (baseado no papel)" },
  { value: "/admin", label: "Dashboard Admin" },
  { value: "/admin/schedule", label: "Agenda" },
  { value: "/admin/students", label: "Alunos" },
  { value: "/admin/financial", label: "Financeiro" },
  { value: "/admin/bookings", label: "Agendamentos" },
];

const LANDING_OPTIONS_INSTRUCTOR = [
  { value: "auto", label: "Automático (baseado no papel)" },
  { value: "/instructor", label: "Início" },
  { value: "/instructor/attendance", label: "Chamada" },
  { value: "/instructor/records", label: "Prontuário" },
  { value: "/instructor/assessments", label: "Avaliações" },
];

const LANDING_OPTIONS_STUDENT = [
  { value: "auto", label: "Automático (baseado no papel)" },
  { value: "/student", label: "Início" },
  { value: "/student/booking", label: "Agendar" },
  { value: "/student/financial", label: "Financeiro" },
  { value: "/student/progress", label: "Evolução" },
];

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

function parseHsl(hslStr: string): { h: number; s: number; l: number } {
  if (!hslStr) return { h: 152, s: 45, l: 42 };
  const parts = hslStr.replace(/%/g, "").split(/\s+/).map(Number);
  return { h: parts[0] || 0, s: parts[1] || 0, l: parts[2] || 0 };
}

function formatHsl(hsl: { h: number; s: number; l: number }): string {
  return `${Math.round(hsl.h)} ${Math.round(hsl.s)}% ${Math.round(hsl.l)}%`;
}

function MiniColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hsl = parseHsl(value);
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="h-8 w-8 rounded-md border-2 border-border shrink-0 cursor-pointer hover:ring-2 hover:ring-ring transition-all"
              style={{ backgroundColor: value ? `hsl(${value})` : "hsl(var(--primary))" }}
            />
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <HslColorPicker color={hsl} onChange={(newHsl) => onChange(formatHsl(newHsl))} />
            <div className="flex items-center gap-2 mt-2">
              <p className="text-[10px] text-muted-foreground font-mono flex-1">{value || "padrão"}</p>
              {value && (
                <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => onChange("")}>
                  Resetar
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
        <span className="text-xs text-muted-foreground font-mono">{value || "padrão do sistema"}</span>
      </div>
    </div>
  );
}

interface PersonalPreferencesTabProps {
  role?: "admin" | "instructor" | "student";
  showDashboardSections?: boolean;
}

export default function PersonalPreferencesTab({ role = "admin", showDashboardSections = true }: PersonalPreferencesTabProps) {
  const { prefs, updatePref, loading } = useUserPreferences();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const landingOptions = role === "instructor" ? LANDING_OPTIONS_INSTRUCTOR
    : role === "student" ? LANDING_OPTIONS_STUDENT
    : LANDING_OPTIONS_ADMIN;

  const toggleSection = (sectionId: string) => {
    const hidden = prefs.hidden_sections || [];
    const newHidden = hidden.includes(sectionId)
      ? hidden.filter((s) => s !== sectionId)
      : [...hidden, sectionId];
    updatePref("hidden_sections", newHidden);
    toast.success("Preferência salva!");
  };

  const notificationItems = role === "admin" ? [
    { key: "notifications_push" as const, label: "Notificações Push", desc: "Receber alertas no navegador/dispositivo" },
    { key: "notifications_email" as const, label: "Notificações por E-mail", desc: "Receber resumos por e-mail" },
    { key: "notifications_pagamentos" as const, label: "Pagamentos", desc: "Alertas de novos pagamentos e atrasos" },
    { key: "notifications_leads" as const, label: "Leads e Pré-matrículas", desc: "Alertas de novos interessados" },
    { key: "notifications_avisos" as const, label: "Avisos e Comunicados", desc: "Novos comunicados do estúdio" },
  ] : [
    { key: "notifications_push" as const, label: "Notificações Push", desc: "Receber alertas no navegador/dispositivo" },
    { key: "notifications_email" as const, label: "Notificações por E-mail", desc: "Receber resumos por e-mail" },
    { key: "notifications_avisos" as const, label: "Avisos e Comunicados", desc: "Novos comunicados do estúdio" },
  ];

  return (
    <>

      {/* Tipografia & Cores Pessoais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Type className="h-4 w-4 text-primary" /> Tipografia Pessoal
          </CardTitle>
          <CardDescription>Sobrescreva fontes e tamanhos para a sua conta (deixe vazio para usar o padrão do estúdio)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fonte dos Títulos</Label>
              <Select value={prefs.custom_font_title || "default"} onValueChange={(v) => { updatePref("custom_font_title", v === "default" ? "" : v); toast.success("Fonte alterada!"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Padrão do sistema</SelectItem>
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fonte do Corpo</Label>
              <Select value={prefs.custom_font_body || "default"} onValueChange={(v) => { updatePref("custom_font_body", v === "default" ? "" : v); toast.success("Fonte alterada!"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Padrão do sistema</SelectItem>
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tamanho Base</Label>
              <Select value={prefs.custom_font_size || "default"} onValueChange={(v) => { updatePref("custom_font_size", v === "default" ? "" : v); toast.success("Tamanho alterado!"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Padrão (16px)</SelectItem>
                  {["13", "14", "15", "16", "17", "18", "20"].map((s) => (
                    <SelectItem key={s} value={s}>{s}px</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Escala dos Títulos</Label>
              <Select value={prefs.custom_title_scale || "default"} onValueChange={(v) => { updatePref("custom_title_scale", v === "default" ? "" : v); toast.success("Escala alterada!"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Padrão</SelectItem>
                  <SelectItem value="compact">Compacta</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="large">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg border border-border p-4 bg-muted/30">
            <p className="text-[10px] text-muted-foreground mb-2">Pré-visualização</p>
            <h3
              className="font-bold"
              style={{
                fontFamily: prefs.custom_font_title || undefined,
                fontSize: prefs.custom_font_size ? `${Math.round(parseInt(prefs.custom_font_size) * 1.35)}px` : undefined,
              }}
            >
              Título de Exemplo
            </h3>
            <p
              className="text-muted-foreground mt-1"
              style={{
                fontFamily: prefs.custom_font_body || undefined,
                fontSize: prefs.custom_font_size ? `${prefs.custom_font_size}px` : undefined,
              }}
            >
              Este é um texto de corpo com suas configurações pessoais.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cores Pessoais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" /> Cores Pessoais
          </CardTitle>
          <CardDescription>Personalize as cores da interface para a sua conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MiniColorPicker
            label="Cor Primária"
            value={prefs.custom_primary_color}
            onChange={(v) => { updatePref("custom_primary_color", v); toast.success("Cor alterada!"); }}
          />
          <MiniColorPicker
            label="Cor do Texto"
            value={prefs.custom_foreground_color}
            onChange={(v) => { updatePref("custom_foreground_color", v); toast.success("Cor alterada!"); }}
          />
        </CardContent>
      </Card>

      {/* Seções visíveis — only for admin */}
      {showDashboardSections && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" /> Seções do Dashboard
            </CardTitle>
            <CardDescription>Escolha quais seções exibir no dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {DASHBOARD_SECTIONS.map(({ id, label }) => {
              const hidden = (prefs.hidden_sections || []).includes(id);
              return (
                <div key={id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {hidden ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-primary" />}
                    <span className={hidden ? "text-muted-foreground line-through" : ""}>{label}</span>
                  </div>
                  <Switch checked={!hidden} onCheckedChange={() => toggleSection(id)} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Página inicial */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="h-4 w-4 text-primary" /> Página Inicial
          </CardTitle>
          <CardDescription>Defina para qual página ir ao fazer login</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={prefs.landing_page} onValueChange={(v) => { updatePref("landing_page", v); toast.success("Página inicial alterada!"); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {landingOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Notificações
          </CardTitle>
          <CardDescription>Configure quais notificações deseja receber</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationItems.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <Label>{label}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                checked={prefs[key] as boolean}
                onCheckedChange={(v) => { updatePref(key, v); toast.success("Preferência salva!"); }}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
