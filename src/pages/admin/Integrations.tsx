import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CreditCard, MessageSquare, Mail, BarChart3, Plus, Settings2, Eye, EyeOff, Trash2, CheckCircle2, XCircle, Plug, Lock, ShieldCheck, Loader2 } from "lucide-react";

type Integration = {
  id: string;
  studio_id: string;
  provider: string;
  display_name: string;
  category: string;
  config: Record<string, string>;
  ativa: boolean;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
};

const PROVIDER_TEMPLATES: Record<string, { display_name: string; category: string; icon: React.ReactNode; fields: { key: string; label: string; secret?: boolean; placeholder?: string }[]; description: string }> = {
  mercadopago: {
    display_name: "Mercado Pago",
    category: "pagamento",
    icon: <CreditCard className="h-6 w-6" />,
    description: "Pagamentos via Mercado Pago (Pix, boleto, cartão)",
    fields: [
      { key: "access_token", label: "Access Token", secret: true, placeholder: "APP_USR-..." },
      { key: "public_key", label: "Public Key", placeholder: "APP_USR-..." },
    ],
  },
  pagarme: {
    display_name: "Pagar.me",
    category: "pagamento",
    icon: <CreditCard className="h-6 w-6" />,
    description: "Gateway de pagamento Pagar.me",
    fields: [
      { key: "api_key", label: "API Key", secret: true, placeholder: "ak_live_..." },
      { key: "encryption_key", label: "Encryption Key", secret: true },
    ],
  },
  whatsapp: {
    display_name: "WhatsApp Business",
    category: "comunicacao",
    icon: <MessageSquare className="h-6 w-6" />,
    description: "Envio de mensagens via WhatsApp Business API",
    fields: [
      { key: "phone_number_id", label: "Phone Number ID" },
      { key: "access_token", label: "Access Token", secret: true },
      { key: "verify_token", label: "Verify Token", secret: true },
    ],
  },
  smtp: {
    display_name: "E-mail (SMTP)",
    category: "comunicacao",
    icon: <Mail className="h-6 w-6" />,
    description: "Envio de e-mails via servidor SMTP",
    fields: [
      { key: "host", label: "Host", placeholder: "smtp.gmail.com" },
      { key: "port", label: "Porta", placeholder: "587" },
      { key: "user", label: "Usuário" },
      { key: "password", label: "Senha", secret: true },
      { key: "from_email", label: "E-mail remetente" },
    ],
  },
  google_analytics: {
    display_name: "Google Analytics",
    category: "analytics",
    icon: <BarChart3 className="h-6 w-6" />,
    description: "Rastreamento de métricas com Google Analytics",
    fields: [
      { key: "measurement_id", label: "Measurement ID", placeholder: "G-XXXXXXXXXX" },
    ],
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  pagamento: "Pagamento",
  comunicacao: "Comunicação",
  analytics: "Analytics",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  pagamento: <CreditCard className="h-4 w-4" />,
  comunicacao: <MessageSquare className="h-4 w-4" />,
  analytics: <BarChart3 className="h-4 w-4" />,
};

export default function Integrations() {
  const { studioId, user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [formConfig, setFormConfig] = useState<Record<string, string>>({});
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  // Password confirmation state for revealing secrets
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [pendingRevealField, setPendingRevealField] = useState<string | null>(null);

  const { data: integrations = [], isLoading } = useQuery<Integration[]>({
    queryKey: ["integrations-sb", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integrations")
        .select("*")
        .eq("studio_id", studioId)
        .order("category", { ascending: true });
      if (error) throw error;
      return data as Integration[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: any) => {
      // Priorizar o studio_id vindo do payload (mais seguro) ou do hook
      const finalStudioId = payload.studio_id || studioId;
      
      if (!finalStudioId) {
        console.error("UPSERT CANCELLED: No studioId available", { payload, hookStudioId: studioId });
        throw new Error("Estúdio não identificado. Tente atualizar a página.");
      }

      const { _merge_config, ...data } = payload;
      
      console.warn("MUTATING INTEGRATION:", { finalStudioId, provider: data.provider });

      // Usar UPSERT baseado na chave única (studio_id, provider) do banco
      const { data: result, error } = await supabase
        .from("integrations")
        .upsert({
          ...data,
          studio_id: finalStudioId,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'studio_id, provider',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) {
        console.error("SUPABASE UPSERT ERROR:", error);
        throw error;
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations-sb", studioId] });
      toast.success(editingId ? "Integração atualizada!" : "Integração adicionada!");
      setDialogOpen(false);
      setEditingId(null);
      setSelectedProvider("");
      setFormConfig({});
      setVisibleFields({});
      setPasswordVerified(false);
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativa }: { id: string; ativa: boolean }) => {
      const { error } = await supabase
        .from("integrations")
        .update({ ativa, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations-sb", studioId] });
      toast.success("Status atualizado!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("integrations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations-sb", studioId] });
      toast.success("Integração removida!");
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setSelectedProvider("");
    setFormConfig({});
    setVisibleFields({});
    setPasswordVerified(false);
  };

  const openEdit = (integration: Integration) => {
    setEditingId(integration.id);
    setSelectedProvider(integration.provider);
    const template = PROVIDER_TEMPLATES[integration.provider];
    const safeConfig: Record<string, string> = {};
    if (template) {
      for (const field of template.fields) {
        if (!field.secret && integration.config?.[field.key]) {
          safeConfig[field.key] = integration.config[field.key];
        }
      }
    }
    setFormConfig(safeConfig);
    setPasswordVerified(false);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedProvider || !studioId) {
      console.warn("SAVE ABORTED: Missing provider or studioId", { selectedProvider, studioId });
      toast.error("Erro interno: Estúdio não identificado.");
      return;
    }
    
    const template = PROVIDER_TEMPLATES[selectedProvider];
    const existing = integrations.find(i => i.id === editingId);
    
    // Iniciar con el config actual (para no perder secrets) o vazio si es nuevo
    const configToSave = existing ? { ...existing.config } : {};
    
    console.warn("PREPARING SAVE. Existing config keys:", Object.keys(configToSave));
    
    // Sobrescrever apenas com os campos do formulário que foram preenchidos
    let fieldsUpdated = 0;
    for (const field of template.fields) {
      if (formConfig[field.key]) {
        configToSave[field.key] = formConfig[field.key];
        fieldsUpdated++;
      }
    }
    
    console.warn(`SAVING INTEGRATION. Provider: ${selectedProvider}, Fields updated: ${fieldsUpdated}`);
    
    upsertMutation.mutate({
      studio_id: studioId, // Enviar explicitamente
      provider: selectedProvider,
      display_name: template.display_name,
      category: template.category,
      config: configToSave,
    });
  };

  const handleRevealRequest = (fieldKey: string) => {
    if (passwordVerified) {
      setVisibleFields((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
      return;
    }
    setPendingRevealField(fieldKey);
    setPasswordInput("");
    setPasswordDialogOpen(true);
  };

  const handlePasswordVerify = async () => {
    try {
      if (!user?.email) {
        toast.error("Erro ao verificar usuário");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordInput,
      });
      if (error) throw error;
      
      setPasswordVerified(true);
      setPasswordDialogOpen(false);
      if (pendingRevealField) {
        setVisibleFields((prev) => ({ ...prev, [pendingRevealField]: true }));
        setPendingRevealField(null);
      }
      toast.success("Acesso liberado");
    } catch (e: any) {
      console.error(e);
      toast.error("Senha incorreta");
    }
  };

  const existingProviders = new Set(integrations.map((i) => i.provider));
  const availableProviders = Object.keys(PROVIDER_TEMPLATES).filter(
    (p) => !existingProviders.has(p) || editingId
  );

  const grouped = integrations.reduce<Record<string, Integration[]>>((acc, i) => {
    (acc[i.category] ||= []).push(i);
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Plug className="h-6 w-6 text-primary" />
              Integrações
            </h1>
            <p className="text-muted-foreground">Gerencie as APIs e serviços conectados ao sistema</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} disabled={availableProviders.length === 0}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            Carregando...
          </div>
        ) : integrations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Plug className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Nenhuma integração configurada.</p>
              <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Configurar primeira integração
              </Button>
            </CardContent>
          </Card>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {CATEGORY_ICONS[category]} {CATEGORY_LABELS[category] || category}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((integration) => {
                  const template = PROVIDER_TEMPLATES[integration.provider];
                  return (
                    <Card key={integration.id} className="relative">
                      <CardHeader className="pb-3 border-b border-border/50 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-muted p-2">
                              {template?.icon || <Settings2 className="h-6 w-6" />}
                            </div>
                            <div>
                              <CardTitle className="text-base">{integration.display_name}</CardTitle>
                              <CardDescription className="text-xs">{template?.description}</CardDescription>
                            </div>
                          </div>
                          <Badge variant={integration.ativa ? "default" : "secondary"} className="text-xs">
                            {integration.ativa ? (
                              <><CheckCircle2 className="h-3 w-3 mr-1" /> Ativa</>
                            ) : (
                              <><XCircle className="h-3 w-3 mr-1" /> Inativa</>
                            )}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex items-center gap-2 pt-0">
                        <div className="flex items-center gap-2 flex-1">
                          <Switch
                            checked={integration.ativa}
                            onCheckedChange={(v) => toggleMutation.mutate({ id: integration.id, ativa: v })}
                          />
                          <span className="text-sm text-muted-foreground">
                            {integration.ativa ? "Ativa" : "Inativa"}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(integration)}>
                            <Settings2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive/5"
                            onClick={() => {
                              if (confirm("Remover esta integração?")) deleteMutation.mutate(integration.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Integração" : "Nova Integração"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingId && (
              <div className="space-y-2">
                <Label>Provedor</Label>
                <Select value={selectedProvider} onValueChange={(v) => { setSelectedProvider(v); setFormConfig({}); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {availableProviders.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PROVIDER_TEMPLATES[p].display_name} — {CATEGORY_LABELS[PROVIDER_TEMPLATES[p].category]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedProvider && PROVIDER_TEMPLATES[selectedProvider]?.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  {field.label}
                  {field.secret && <Lock className="h-3 w-3 text-muted-foreground" />}
                </Label>
                <div className="relative">
                  <Input
                    type={field.secret && !visibleFields[field.key] ? "password" : "text"}
                    placeholder={editingId && field.secret ? "••••••••  (vazio para manter)" : field.placeholder}
                    value={formConfig[field.key] || ""}
                    onChange={(e) => setFormConfig((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                  {field.secret && !editingId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setVisibleFields(v => ({...v, [field.key]: !v[field.key]}))}
                    >
                      {visibleFields[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!selectedProvider || upsertMutation.isPending}>
              {upsertMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Confirmar identidade
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Confirme sua senha de administrador para liberar o acesso.
            </p>
            <div className="space-y-1.5">
              <Label>Senha</Label>
              <Input
                type="password"
                placeholder="Senha"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordVerify()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handlePasswordVerify} disabled={!passwordInput}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
