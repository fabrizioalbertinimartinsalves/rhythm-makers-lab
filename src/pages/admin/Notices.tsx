import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus, MessageSquare, Bell, AlertCircle, Trash2, Loader2,
  CalendarIcon, ImagePlus, RefreshCw, X, SmilePlus, Pencil, Archive, ArchiveRestore,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { uploadFile } from "@/utils/upload";

const iconMap: Record<string, typeof Bell> = {
  lembrete: Bell,
  alerta: AlertCircle,
  info: MessageSquare,
};

const tipoLabels: Record<string, string> = {
  info: "Informação",
  lembrete: "Lembrete",
  alerta: "Alerta",
};

const EMOJIS = ["📢", "🎉", "⚠️", "🔔", "💪", "🧘", "❤️", "✨", "🎂", "🏋️", "🩰", "💃", "🧠", "🌟", "🎯", "📅", "🚀", "🌿", "☀️", "🎶"];

const destinatarioLabels: Record<string, string> = {
  todos: "Todos",
  alunos: "Alunos",
  instrutores: "Instrutores",
  admin: "Administradores",
};

interface AvisoForm {
  titulo: string;
  corpo: string;
  tipo: string;
  destinatario: string;
  dataInicio: Date | undefined;
  dataFim: Date | undefined;
  imagemUrl: string;
}

const emptyForm: AvisoForm = {
  titulo: "",
  corpo: "",
  tipo: "info",
  destinatario: "todos",
  dataInicio: new Date(),
  dataFim: undefined,
  imagemUrl: "",
};

export default function Notices() {
  const { studioId } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AvisoForm>({ ...emptyForm });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [tab, setTab] = useState("ativos");

  const { data: avisos = [], isLoading } = useQuery<any[]>({
    queryKey: ["avisos-admin", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .eq("studio_id", studioId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const hoje = new Date().toISOString().split("T")[0];

  const avisosAtivos = avisos.filter((a: any) => a.ativo && !(a.data_fim && a.data_fim < hoje));
  const avisosArquivados = avisos.filter((a: any) => !a.ativo || (a.data_fim && a.data_fim < hoje));

  const resetForm = () => {
    setForm({ ...emptyForm, dataInicio: new Date() });
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (aviso: any) => {
    setEditingId(aviso.id);
    setForm({
      titulo: aviso.titulo,
      corpo: aviso.corpo,
      tipo: aviso.tipo,
      destinatario: aviso.destinatario || "todos",
      dataInicio: aviso.data_inicio ? new Date(aviso.data_inicio + "T00:00:00") : new Date(),
      dataFim: aviso.data_fim ? new Date(aviso.data_fim + "T00:00:00") : undefined,
      imagemUrl: aviso.imagem_url || "",
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!studioId) return;
      const payload = {
        studio_id: studioId,
        titulo: form.titulo,
        corpo: form.corpo,
        tipo: form.tipo,
        destinatario: form.destinatario,
        data_inicio: form.dataInicio ? format(form.dataInicio, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        data_fim: form.dataFim ? format(form.dataFim, "yyyy-MM-dd") : null,
        imagem_url: form.imagemUrl || null,
        ativo: true,
        updated_at: new Date().toISOString(),
      };
      if (editingId) {
        const { error } = await supabase.from("notices").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("notices").insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avisos-admin", studioId] });
      toast.success(editingId ? "Aviso atualizado!" : "Aviso publicado!");
      resetForm();
      setOpen(false);
    },
    onError: (e: any) => toast.error("Erro ao salvar aviso: " + e.message),
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notices").update({ ativo: false, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avisos-admin", studioId] });
      toast.success("Aviso arquivado");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const newEnd = new Date();
      newEnd.setDate(newEnd.getDate() + 30);
      const { error } = await supabase.from("notices").update({
        ativo: true,
        data_inicio: format(new Date(), "yyyy-MM-dd"),
        data_fim: format(newEnd, "yyyy-MM-dd"),
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avisos-admin", studioId] });
      toast.success("Aviso restaurado por +30 dias!");
    },
  });

  const renewMutation = useMutation({
    mutationFn: async ({ id, days }: { id: string; days: number }) => {
      const newEnd = new Date();
      newEnd.setDate(newEnd.getDate() + days);
      const { error } = await supabase.from("notices").update({
        ativo: true,
        data_inicio: format(new Date(), "yyyy-MM-dd"),
        data_fim: format(newEnd, "yyyy-MM-dd"),
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avisos-admin", studioId] });
      toast.success("Aviso renovado!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avisos-admin", studioId] });
      toast.success("Aviso removido permanentemente");
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !studioId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}.${ext}`;
      const filePath = `notices/${studioId}/${fileName}`;
      const publicUrl = await uploadFile(file, filePath);
      setForm((prev) => ({ ...prev, imagemUrl: publicUrl }));
      toast.success("Imagem enviada!");
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao enviar imagem: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    setForm((prev) => ({ ...prev, corpo: prev.corpo + emoji }));
    setShowEmojis(false);
  };

  const getStatusInfo = (aviso: any) => {
    if (!aviso.ativo) return { label: "Arquivado", variant: "secondary" as const };
    if (aviso.data_fim && aviso.data_fim < hoje) return { label: "Expirado", variant: "destructive" as const };
    if (aviso.data_inicio && aviso.data_inicio > hoje) return { label: "Agendado", variant: "outline" as const };
    return { label: "Ativo", variant: "default" as const };
  };

  const renderAvisoCard = (aviso: any, isArchived: boolean) => {
    const Icon = iconMap[aviso.tipo] || MessageSquare;
    const status = getStatusInfo(aviso);
    return (
      <Card key={aviso.id} className={cn(isArchived && "opacity-60")}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full p-2 bg-primary/10 shrink-0">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{aviso.titulo}</p>
                        <Badge variant={status.variant} className="text-[10px]">{status.label}</Badge>
                        <Badge variant="outline" className="text-[10px]">{tipoLabels[aviso.tipo] || aviso.tipo}</Badge>
                        <Badge variant="outline" className="text-[10px]">📣 {destinatarioLabels[aviso.destinatario] || "Todos"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{aviso.corpo}</p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground flex-wrap">
                <span>Criado: {aviso.created_at ? new Date(aviso.created_at).toLocaleDateString("pt-BR") : "—"}</span>
                {aviso.data_inicio && <span>De: {new Date(aviso.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")}</span>}
                {aviso.data_fim && <span>Até: {new Date(aviso.data_fim + "T00:00:00").toLocaleDateString("pt-BR")}</span>}
                {!aviso.data_fim && <span>Sem prazo</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 flex-wrap">
              {!isArchived && (
                <>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(aviso)} title="Editar">
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Select onValueChange={(v) => renewMutation.mutate({ id: aviso.id, days: Number(v) })}>
                    <SelectTrigger className="h-8 w-8 p-0 border-0 [&>svg]:hidden" title="Renovar">
                      <RefreshCw className="h-3.5 w-3.5 text-muted-foreground mx-auto" />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="7">+7 dias</SelectItem>
                      <SelectItem value="15">+15 dias</SelectItem>
                      <SelectItem value="30">+30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => archiveMutation.mutate(aviso.id)} title="Arquivar">
                    <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </>
              )}
              {isArchived && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => restoreMutation.mutate(aviso.id)} title="Restaurar">
                  <ArchiveRestore className="h-3.5 w-3.5 text-primary" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => {
                  if (confirm("Excluir este aviso permanentemente?")) deleteMutation.mutate(aviso.id);
                }}
                title="Excluir"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {aviso.imagem_url && (
            <img
              src={aviso.imagem_url}
              alt={aviso.titulo}
              className="w-full max-h-48 object-cover rounded-lg border border-border"
            />
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Mural de Avisos
            </h1>
            <p className="text-sm text-muted-foreground">Gerencie comunicados visíveis para os alunos</p>
          </div>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Novo Aviso</Button>
        </div>

        {/* Create / Edit Dialog */}
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Aviso" : "Publicar Aviso"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Título</Label>
                <Input value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))} placeholder="Ex: 🎉 Horário especial de feriado" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Mensagem</Label>
                  <Popover open={showEmojis} onOpenChange={setShowEmojis}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs">
                        <SmilePlus className="h-3.5 w-3.5" /> Emoji
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="end">
                      <div className="grid grid-cols-5 gap-1">
                        {EMOJIS.map((e) => (
                          <button
                            key={e}
                            className="text-xl hover:bg-muted rounded p-1.5 transition-colors"
                            onClick={() => insertEmoji(e)}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <Textarea value={form.corpo} onChange={(e) => setForm((p) => ({ ...p, corpo: e.target.value }))} placeholder="Descreva o aviso... Use emojis para deixar mais visual! 🌟" rows={4} />
              </div>

              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm((p) => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">ℹ️ Informação</SelectItem>
                    <SelectItem value="lembrete">🔔 Lembrete</SelectItem>
                    <SelectItem value="alerta">⚠️ Alerta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Destinatário</Label>
                <Select value={form.destinatario} onValueChange={(v) => setForm((p) => ({ ...p, destinatario: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">📣 Todos</SelectItem>
                    <SelectItem value="alunos">🎓 Alunos</SelectItem>
                    <SelectItem value="instrutores">🧑‍🏫 Instrutores</SelectItem>
                    <SelectItem value="admin">🔧 Administradores</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !form.dataInicio && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.dataInicio ? format(form.dataInicio, "dd/MM/yyyy") : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={form.dataInicio} onSelect={(d) => setForm((p) => ({ ...p, dataInicio: d }))} initialFocus className="p-3" locale={ptBR} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Fim (opcional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !form.dataFim && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.dataFim ? format(form.dataFim, "dd/MM/yyyy") : "Sem prazo"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={form.dataFim} onSelect={(d) => setForm((p) => ({ ...p, dataFim: d }))} initialFocus className="p-3" locale={ptBR} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label>Imagem (opcional)</Label>
                {form.imagemUrl ? (
                  <div className="relative mt-1">
                    <img src={form.imagemUrl} alt="Preview" className="w-full h-40 object-cover rounded-lg border border-border" />
                    <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => setForm((p) => ({ ...p, imagemUrl: "" }))}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <label className="mt-1 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 cursor-pointer hover:border-primary/40 hover:bg-muted/50 transition-colors">
                    {uploadingImage ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <ImagePlus className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Clique para enviar imagem</span>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                  </label>
                )}
              </div>

              <Button
                className="w-full"
                disabled={!form.titulo.trim() || !form.corpo.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {editingId ? "Salvar Alterações" : "Publicar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="ativos" className="gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Ativos
                {avisosAtivos.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">{avisosAtivos.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="arquivados" className="gap-1.5">
                <Archive className="h-3.5 w-3.5" /> Arquivados
                {avisosArquivados.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">{avisosArquivados.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ativos" className="mt-4 space-y-3">
              {avisosAtivos.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum aviso ativo</p>
                </div>
              ) : (
                avisosAtivos.map((a: any) => renderAvisoCard(a, false))
              )}
            </TabsContent>

            <TabsContent value="arquivados" className="mt-4 space-y-3">
              {avisosArquivados.length === 0 ? (
                <div className="text-center py-12">
                  <Archive className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum aviso arquivado</p>
                </div>
              ) : (
                avisosArquivados.map((a: any) => renderAvisoCard(a, true))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
}
