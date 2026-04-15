import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Clock, Users, Edit, Trash2, Filter, Zap, CalendarIcon,
  Search, ToggleLeft, UserCog, TrendingUp, AlertCircle, Loader2, Share2, Check, Copy, ExternalLink
} from "lucide-react";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useOrgLimits } from "@/hooks/useOrgLimits";
import { toast } from "sonner";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const getDiaSemanaKeyFromDate = (dateStr: string): DiaSemana => {
  const d = new Date(dateStr + "T12:00:00");
  return (["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const)[d.getDay()] as DiaSemana;
};

const DIAS = [
  { value: "seg", label: "Seg" },
  { value: "ter", label: "Ter" },
  { value: "qua", label: "Qua" },
  { value: "qui", label: "Qui" },
  { value: "sex", label: "Sex" },
  { value: "sab", label: "Sáb" },
  { value: "dom", label: "Dom" },
] as const;

type DiaSemana = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";

export default function Classes() {
  const queryClient = useQueryClient();
  const { studioId } = useAuth() as any;
  const { canAddTurma, limiteTurmas, currentTurmas } = useOrgLimits();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [filterModalidade, setFilterModalidade] = useState<string>("all");
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");

  useEffect(() => {
    const s = searchParams.get("search");
    if (s) setSearchTerm(s);
  }, [searchParams]);

  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState({ 
    nome: "", 
    modalidade_id: "", 
    horario: "08:00", 
    dias_semana: [] as DiaSemana[], 
    limite_vagas: 5, 
    duracao_minutos: 60,
    valor_aula_avulso: 0 
  });

  const [avulsaForm, setAvulsaForm] = useState({ nome: "", modalidade_id: "", horario: "08:00", data: "", limite_vagas: 5, duracao_minutos: 60, valor: 0 });

  const resetForm = () => {
    setForm({ nome: "", modalidade_id: "", horario: "08:00", dias_semana: [], limite_vagas: 5, duracao_minutos: 60, valor_aula_avulso: 0 });
    setEditing(null);
  };

  const resetAvulsaForm = () => {
    setAvulsaForm({ nome: "", modalidade_id: "", horario: "08:00", data: "", limite_vagas: 5, duracao_minutos: 60, valor: 0 });
    setEditingAvulsa(null);
  };

  // Share state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: turmas = [], isLoading } = useQuery({
    queryKey: ["turmas", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      if (!studioId) return [];
      const { data } = await supabase.from("classes").select("*, modalities(id, nome, emoji, cor)").eq("studio_id", studioId).order("horario");
      return (data || []).map(t => ({ 
        ...t, 
        modalidade_id: t.modality_id, 
        modalidades: t.modalities, 
        dias_semana: t.dias_semana || [], 
        limite_vagas: t.capacidade,
        valor_aula_avulso: t.valor_aula_avulso || 0
      }));
    },
  });

  const { data: turmasAvulsas = [], isLoading: loadingAvulsas } = useQuery({
    queryKey: ["turmas-avulsas", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      if (!studioId) return [];
      const { data } = await supabase.from("classes_avulsas").select("*").eq("studio_id", studioId).order("data");
      return data || [];
    },
  });

  const { data: modalidades = [] } = useQuery({
    queryKey: ["modalidades", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      if (!studioId) return [];
      const { data } = await supabase.from("modalities").select("id, nome, emoji, cor, valor_base, valor_avulso").eq("studio_id", studioId).eq("ativa", true).order("nome");
      return data || [];
    },
  });

  const { data: inscricoesCounts = {} } = useQuery({
    queryKey: ["inscricoes-count", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      if (!studioId) return {};
      const { data } = await supabase.from("enrollments").select("class_id").eq("studio_id", studioId).eq("ativa", true);
      const counts: Record<string, number> = {};
      (data || []).forEach(e => { counts[e.class_id] = (counts[e.class_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-instrutores", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      if (!studioId) return [];
      const { data } = await supabase.from("memberships").select("user_id, profiles(id, nome)").eq("studio_id", studioId);
      return (data || []).filter(m => m.profiles).map(m => ({ user_id: m.user_id, nome: (m.profiles as any)?.nome }));
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!studioId) return;
      const payload = { 
        studio_id: studioId, 
        nome: values.nome, 
        modality_id: values.modalidade_id, 
        horario: values.horario + ":00", 
        dias_semana: values.dias_semana, 
        capacidade: values.limite_vagas,
        valor_aula_avulso: values.valor_aula_avulso
      };
      if (values.id) {
        const { error } = await supabase.from("classes").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("classes").insert({ ...payload, ativa: true });
        if (error) throw error;
      }
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["turmas"] }); 
      
      // Double Check: Invalidate Dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard-aulas-proximas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-weekly-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-stats"] });

      setDialogOpen(false); 
      resetForm(); 
      toast.success(editing ? "Turma atualizada!" : "Turma criada!"); 
    },
    onError: (e: any) => toast.error(e.message),
  });

  const upsertAvulsaMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!studioId) return;
      const payload = { 
        studio_id: studioId, 
        data: values.data, 
        horario: values.horario, 
        nome: values.nome, 
        modality_id: values.modalidade_id, 
        valor: values.valor,
        limite_vagas: values.limite_vagas,
        ativa: true
      };
      if (values.id) {
        const { error } = await supabase.from("classes_avulsas").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("classes_avulsas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["turmas-avulsas"] }); 
      
      // Double Check: Invalidate Dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard-aulas-proximas"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-stats"] });

      setAvulsaDialogOpen(false); 
      resetAvulsaForm(); 
      toast.success(editingAvulsa ? "Turma avulsa atualizada!" : "Turma avulsa criada!"); 
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleAtivaMutation = useMutation({
    mutationFn: async ({ id, ativa }: { id: string; ativa: boolean }) => {
      if (!studioId) return;
      const { error } = await supabase.from("classes").update({ ativa }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["turmas"] }); 
      
      // Double Check: Invalidate Dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard-aulas-proximas"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-stats"] });

      toast.success("Status atualizado!"); 
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleAtivaAvulsaMutation = useMutation({
    mutationFn: async ({ id, ativa }: { id: string; ativa: boolean }) => {
      // bookings don't have ativa; skip or use status field
      toast.info("Status de avulsa não suportado ainda.");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["turmas-avulsas"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const { requestDelete, ConfirmDialog } = useConfirmDelete({
    childChecks: [
      { table: "inscricoes", column: "turma_id", label: "inscrição(ões)" },
      { table: "presencas", column: "turma_id", label: "presença(s)" },
    ],
  });

  const { requestDelete: requestDeleteAvulsa, ConfirmDialog: ConfirmDialogAvulsa } = useConfirmDelete({
    childChecks: [
      { table: "bookings", column: "class_id", label: "agendamento(s)" },
    ],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!studioId) return;
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["turmas"] }); 
      
      // Double Check: Invalidate Dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard-aulas-proximas"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-stats"] });

      toast.success("Turma removida!"); 
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteAvulsaMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!studioId) return;
      const { error } = await supabase.from("classes_avulsas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["turmas-avulsas"] }); toast.success("Aula avulsa removida!"); },
    onError: (e: any) => toast.error(e.message),
  });


  const openEdit = (t: any) => {
    setEditing(t);
    setForm({
      nome: t.nome,
      modalidade_id: t.modalidade_id,
      horario: t.horario?.slice(0, 5) || "08:00",
      dias_semana: t.dias_semana || [],
      limite_vagas: t.limite_vagas,
      duracao_minutos: t.duracao_minutos,
    });
    setDialogOpen(true);
  };

  const openEditAvulsa = (t: any) => {
    setEditingAvulsa(t);
    setAvulsaForm({
      nome: t.nome,
      modalidade_id: t.modalidade_id,
      horario: t.horario?.slice(0, 5) || "08:00",
      data: t.data || "",
      limite_vagas: t.limite_vagas,
      duracao_minutos: t.duracao_minutos,
      valor: t.valor || 0,
    });
    setAvulsaDialogOpen(true);
  };

  const toggleDia = (dia: DiaSemana) => {
    setForm((f) => ({
      ...f,
      dias_semana: f.dias_semana.includes(dia) ? f.dias_semana.filter((d) => d !== dia) : [...f.dias_semana, dia],
    }));
  };

  const handleModalidadeChange = (modId: string) => {
    const mod = modalidades.find((m) => m.id === modId);
    setForm((f) => ({ ...f, modalidade_id: modId, nome: f.nome || `${mod?.nome || ""} ` }));
  };

  const handleModalidadeChangeAvulsa = (modId: string) => {
    const mod = modalidades.find((m) => m.id === modId);
    setAvulsaForm((f) => ({ 
      ...f, 
      modalidade_id: modId, 
      nome: f.nome || `${mod?.nome || ""} Avulsa`,
      valor: Number((mod as any)?.valor_avulso || mod?.valor_base || 0)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertMutation.mutate(editing ? { ...form, id: editing.id } : form);
  };

  const handleSubmitAvulsa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!avulsaForm.data) {
      toast.error("Selecione uma data");
      return;
    }
    const diaSemana = getDiaSemanaKeyFromDate(avulsaForm.data);
    const conflicting = turmas.find((t: any) =>
      t.modalidade_id === avulsaForm.modalidade_id &&
      (t.dias_semana || []).includes(diaSemana) &&
      t.horario?.slice(0, 5) === avulsaForm.horario &&
      (!editingAvulsa || t.id !== editingAvulsa.id)
    );
    if (conflicting) {
      const confirmCreate = window.confirm(
        `Já existe a turma regular "${conflicting.nome}" neste mesmo horário (${avulsaForm.horario}) e dia da semana. Deseja criar mesmo assim?`
      );
      if (!confirmCreate) return;
    }
    upsertAvulsaMutation.mutate(editingAvulsa ? { ...avulsaForm, id: editingAvulsa.id } : avulsaForm);
  };

  const getInstructorName = (instrutorId: string | null) => {
    if (!instrutorId) return null;
    return profiles.find((p: any) => p.user_id === instrutorId)?.nome || null;
  };

  // Filter logic
  const filtered = turmas.filter((t: any) => {
    if (!showInactive && !t.ativa) return false;
    if (filterModalidade !== "all" && t.modalidade_id !== filterModalidade) return false;
    if (searchTerm && !t.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const filteredAvulsas = turmasAvulsas.filter((t: any) => {
    if (!showInactive && !t.ativa) return false;
    if (filterModalidade !== "all" && t.modalidade_id !== filterModalidade) return false;
    if (searchTerm && !t.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Resolve modalidades for regular classes
  const turmasWithMod = filtered.map(t => {
    const mod = modalidades.find((m: any) => m.id === t.modalidade_id);
    return { ...t, modalidades: mod };
  });

  const turmasAvulsasWithMod = filteredAvulsas.map(t => {
    const mod = modalidades.find((m: any) => m.id === t.modalidade_id);
    return { ...t, modalidades: mod };
  });

  // Stats
  const totalAtivas = turmasWithMod.filter((t: any) => t.ativa).length;
  const totalInativas = turmasWithMod.filter((t: any) => !t.ativa).length;
  const totalVagas = turmasWithMod.filter((t: any) => t.ativa).reduce((sum: number, t: any) => sum + t.limite_vagas, 0);
  const totalInscritos = turmasWithMod.filter((t: any) => t.ativa).reduce((sum: number, t: any) => sum + (inscricoesCounts[t.id] || 0), 0);
  const ocupacaoMedia = totalVagas > 0 ? Math.round((totalInscritos / totalVagas) * 100) : 0;

  const getOccupancyColor = (pct: number) => {
    if (pct >= 90) return "text-red-600 ";
    if (pct >= 70) return "text-amber-600 ";
    return "text-emerald-600 ";
  };

  const getOccupancyBg = (pct: number) => {
    if (pct >= 90) return "bg-red-500";
    if (pct >= 70) return "bg-amber-500";
    return "bg-primary";
  };

  const { data: studioData } = useQuery({
    queryKey: ["studio-details", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase.from("studios").select("slug").eq("id", studioId).single();
      if (error) return null;
      return data;
    }
  });

  const displaySlug = studioData?.slug || studioId;
  const shareLink = displaySlug ? `${window.location.origin}/marcar/${displaySlug}` : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copiado!");
  };

  const handleWhatsAppShare = () => {
    const text = `Confira nossas turmas disponíveis! 🏋️\n${shareLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };


  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 uppercase text-slate-900 leading-none">Turmas</h1>
            <p className="text-slate-400 mt-1 font-bold uppercase tracking-widest text-[8px] flex items-center gap-2">CLASSES MANAGEMENT <span className="h-1 w-1 rounded-full bg-slate-200" /> V7.5.2 COCKPIT</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="h-9 rounded-lg text-[10px] font-bold uppercase tracking-widest gap-1.5 bg-white border-slate-200" 
              onClick={() => setShareDialogOpen(true)}
            >
              <Share2 className="h-4 w-4" /> Link de Inscrição
            </Button>
          </div>
        </div>

        {/* Share Dialog */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Compartilhar Turmas</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Este link fixo exibe todas as suas turmas ativas. Compartilhe com seus alunos para que eles possam visualizar a grade e fazer a pré-matrícula.
              </p>
              <div className="flex items-center gap-2">
                <Input value={shareLink} readOnly className="text-xs" />
                <Button size="icon" variant="outline" onClick={handleCopyLink}>
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white" onClick={handleWhatsAppShare}>
                  <Share2 className="h-4 w-4" /> Enviar via WhatsApp
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => window.open(shareLink, "_blank")}>
                  <ExternalLink className="h-4 w-4" /> Visualizar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm rounded-xl bg-white overflow-hidden ring-1 ring-slate-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900">{totalAtivas}</h3>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Turmas Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm rounded-xl bg-white overflow-hidden ring-1 ring-slate-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-emerald-600" /></div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900">{totalInscritos}<span className="text-xs text-slate-400 font-medium">/{totalVagas}</span></h3>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Inscritos/Vagas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm rounded-xl bg-white overflow-hidden ring-1 ring-slate-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", ocupacaoMedia >= 70 ? "bg-amber-500/10" : "bg-emerald-500/10")}>
                  <TrendingUp className={cn("h-5 w-5", getOccupancyColor(ocupacaoMedia))} />
                </div>
                <div>
                  <h3 className={cn("text-2xl font-bold tracking-tight", getOccupancyColor(ocupacaoMedia))}>{ocupacaoMedia}%</h3>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Ocupação Média</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm rounded-xl bg-white overflow-hidden ring-1 ring-slate-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center"><Zap className="h-5 w-5 text-orange-600" /></div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900">{turmasAvulsas.filter((t: any) => t.ativa && (!t.data || new Date(t.data + "T23:59:59") >= new Date())).length}</h3>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Avulsas Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-2 flex-wrap bg-slate-50/50 p-3 rounded-xl border border-slate-100 backdrop-blur-sm">
          <div className="relative flex-1 min-w-[200px] max-w-sm group">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar turma..."
              className="pl-9 h-10 rounded-lg border-none shadow-sm bg-white font-bold uppercase tracking-tight text-[10px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-slate-400 ml-2" />
            <Button size="sm" variant={filterModalidade === "all" ? "default" : "outline"} className="h-8 rounded-md text-[9px] font-bold uppercase tracking-widest bg-white border-slate-200" onClick={() => setFilterModalidade("all")}>
              Todas
            </Button>
            {modalidades.map((m) => (
              <Button key={m.id} size="sm" variant={filterModalidade === m.id ? "default" : "outline"} className={cn("h-8 rounded-md text-[9px] font-bold uppercase tracking-widest", filterModalidade === m.id ? "bg-primary text-white" : "bg-white border-slate-200")} onClick={() => setFilterModalidade(m.id)}>
                {m.emoji} {m.nome}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto pr-2">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
            <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer" onClick={() => setShowInactive(!showInactive)}>
              Inativas ({totalInativas})
            </Label>
          </div>
        </div>

        <Tabs defaultValue="regulares" className="w-full">
          <TabsList className="bg-slate-100/50 p-1 rounded-lg h-10 w-full justify-start gap-1">
            <TabsTrigger value="regulares" className="rounded-md text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">Regulares ({turmasWithMod.length})</TabsTrigger>
            <TabsTrigger value="avulsas" className="rounded-md text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm px-6 gap-1.5"><Zap className="h-3.5 w-3.5" /> Avulsas ({turmasAvulsasWithMod.length})</TabsTrigger>
          </TabsList>

          {/* Regular turmas tab */}
          <TabsContent value="regulares" className="space-y-4 mt-4">
            <div className="flex items-center justify-end gap-3">
              {!canAddTurma && limiteTurmas > 0 && (
                <p className="text-sm text-destructive font-medium">Limite de {limiteTurmas} turmas atingido ({currentTurmas}/{limiteTurmas})</p>
              )}
              <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Turma</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editing ? "Editar Turma" : "Nova Turma"}</DialogTitle></DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Modalidade *</Label>
                      <Select value={form.modalidade_id} onValueChange={handleModalidadeChange}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {modalidades.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.emoji} {m.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required placeholder="Ex: Pilates Manhã" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Horário</Label>
                        <Input type="time" value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Duração (min)</Label>
                        <Input type="number" value={form.duracao_minutos} onChange={(e) => setForm({ ...form, duracao_minutos: parseInt(e.target.value) || 60 })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Dias da Semana</Label>
                      <div className="flex gap-2 flex-wrap">
                        {DIAS.map((d) => (
                          <label key={d.value} className={`flex items-center gap-1.5 cursor-pointer border rounded-lg px-3 py-2 text-sm transition-colors ${form.dias_semana.includes(d.value) ? "bg-primary/10 border-primary text-primary" : "border-border"}`}>
                            <Checkbox checked={form.dias_semana.includes(d.value)} onCheckedChange={() => toggleDia(d.value)} />
                            {d.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Limite de Vagas</Label>
                        <Input type="number" value={form.limite_vagas} onChange={(e) => setForm({ ...form, limite_vagas: parseInt(e.target.value) || 5 })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor Aula Avulsa (R$)</Label>
                        <Input 
                          type="number" 
                          step="0.01" 
                          value={form.valor_aula_avulso} 
                          onChange={(e) => setForm({ ...form, valor_aula_avulso: parseFloat(e.target.value) || 0 })} 
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={upsertMutation.isPending}>
                      {upsertMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                {turmas.length === 0 ? "Nenhuma turma cadastrada. Cadastre modalidades primeiro." : "Nenhuma turma encontrada com os filtros atuais."}
              </CardContent></Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {turmasWithMod.map((t: any) => {
                  const occupied = inscricoesCounts[t.id] || 0;
                  const pct = t.limite_vagas > 0 ? Math.round((occupied / t.limite_vagas) * 100) : 0;
                  const instructorName = getInstructorName(t.instrutor_id);
                    return (
                      <Card
                        key={t.id}
                        className={cn(
                          "transition-all group relative overflow-hidden border-none shadow-sm ring-1 ring-slate-100",
                          !t.ativa && "opacity-50 ring-slate-200 bg-slate-50"
                        )}
                      >
                        <div className="absolute top-0 left-0 w-full h-1 opacity-80" style={{ backgroundColor: t.modalidades?.cor || "#6B9B7A" }} />
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[7.5px] font-bold uppercase tracking-widest border-slate-100 bg-slate-50 gap-1 px-1.5 py-0">
                              <span>{t.modalidades?.emoji}</span> {t.modalidades?.nome}
                            </Badge>
                            {!t.ativa && (
                              <Badge variant="secondary" className="text-[7.5px] font-bold uppercase tracking-widest bg-slate-100/50 px-1.5 py-0">Inativa</Badge>
                            )}
                            {pct >= 90 && t.ativa && (
                              <Badge variant="destructive" className="text-[7.5px] font-bold uppercase tracking-widest gap-0.5 px-1.5 py-0">
                                <AlertCircle className="h-2.5 w-2.5" /> Lotada
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost" size="icon" className="h-6 w-6"
                              title={t.ativa ? "Desativar" : "Ativar"}
                              onClick={() => toggleAtivaMutation.mutate({ id: t.id, ativa: !t.ativa })}
                            >
                              <ToggleLeft className={cn("h-3.5 w-3.5", t.ativa ? "text-emerald-600" : "text-slate-400")} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(t)}><Edit className="h-3.5 w-3.5 text-slate-400" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500/70" onClick={() => requestDelete(t.id, t.nome, () => deleteMutation.mutate(t.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                        <CardTitle className="text-sm font-bold uppercase tracking-tight text-slate-900 mt-2">{t.nome}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-1 space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500 uppercase tracking-tight">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>{t.horario?.slice(0, 5)} · {t.duracao_minutos}min</span>
                        </div>
                        {instructorName && (
                          <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500 uppercase tracking-tight">
                            <UserCog className="h-3.5 w-3.5 text-slate-400" />
                            <span>{instructorName}</span>
                          </div>
                        )}
                        <div className="flex gap-1 flex-wrap">
                          {(t.dias_semana || []).map((d: string) => (
                            <span key={d} className="text-[8px] font-bold uppercase tracking-widest bg-slate-50 border border-slate-100 text-slate-500 px-1.5 py-0 rounded">
                               {DIAS.find(x => x.value === d)?.label || d}
                            </span>
                          ))}
                        </div>
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="flex items-center gap-1 font-bold text-slate-400 uppercase tracking-widest"><Users className="h-3 w-3" /> Vagas</span>
                            <span className={cn("font-bold", getOccupancyColor(pct))}>{occupied}/{t.limite_vagas}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all", getOccupancyBg(pct))} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Avulsa turmas tab */}
          <TabsContent value="avulsas" className="mt-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-end gap-3 mb-4">
              <Dialog open={avulsaDialogOpen} onOpenChange={(o) => { setAvulsaDialogOpen(o); if (!o) resetAvulsaForm(); }}>
                <DialogTrigger asChild>
                  <Button className="h-9 rounded-lg text-[10px] font-bold uppercase tracking-widest gap-2 bg-primary text-white"><Plus className="h-4 w-4" /> Nova Aula Avulsa</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="text-sm font-bold uppercase tracking-tight text-slate-900">{editingAvulsa ? "Editar Aula Avulsa" : "Nova Aula Avulsa"}</DialogTitle></DialogHeader>
                  <form onSubmit={handleSubmitAvulsa} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Modalidade *</Label>
                      <Select value={avulsaForm.modalidade_id} onValueChange={handleModalidadeChangeAvulsa}>
                        <SelectTrigger className="h-10 rounded-lg border-slate-200 text-xs font-medium"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                          {modalidades.map((m) => (
                            <SelectItem key={m.id} value={m.id} className="text-xs focus:bg-slate-50">{m.emoji} {m.nome} — Avulsa R$ {Number((m as any).valor_avulso || m.valor_base).toFixed(2)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nome *</Label>
                      <Input value={avulsaForm.nome} onChange={(e) => setAvulsaForm({ ...avulsaForm, nome: e.target.value })} required placeholder="Ex: Pilates Avulsa Sábado" className="h-10 rounded-lg border-slate-200 text-xs" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Data *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full h-10 rounded-lg border-slate-200 justify-start text-left text-xs font-medium", !avulsaForm.data && "text-slate-400")}>
                            <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                            {avulsaForm.data
                              ? new Date(avulsaForm.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
                              : "Selecione a data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-2xl overflow-hidden" align="start">
                          <Calendar
                            mode="single"
                            selected={avulsaForm.data ? new Date(avulsaForm.data + "T12:00:00") : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const yyyy = date.getFullYear();
                                const mm = String(date.getMonth() + 1).padStart(2, "0");
                                const dd = String(date.getDate()).padStart(2, "0");
                                setAvulsaForm((f) => ({ ...f, data: `${yyyy}-${mm}-${dd}` }));
                              }
                            }}
                            disabled={(date) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const endOfYear = new Date(today.getFullYear(), 11, 31);
                              return date < today || date > endOfYear;
                            }}
                            locale={ptBR}
                            className="pointer-events-auto"
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Horário</Label>
                        <Input type="time" value={avulsaForm.horario} onChange={(e) => setAvulsaForm({ ...avulsaForm, horario: e.target.value })} className="h-10 rounded-lg border-slate-200 text-xs" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Duração (min)</Label>
                        <Input type="number" value={avulsaForm.duracao_minutos} onChange={(e) => setAvulsaForm({ ...avulsaForm, duracao_minutos: parseInt(e.target.value) || 60 })} className="h-10 rounded-lg border-slate-200 text-xs" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Limite de Vagas</Label>
                        <Input type="number" value={avulsaForm.limite_vagas} onChange={(e) => setAvulsaForm({ ...avulsaForm, limite_vagas: parseInt(e.target.value) || 5 })} className="h-10 rounded-lg border-slate-200 text-xs" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Valor (R$)</Label>
                        <Input type="number" step="0.01" value={avulsaForm.valor} onChange={(e) => setAvulsaForm({ ...avulsaForm, valor: parseFloat(e.target.value) || 0 })} className="h-10 rounded-lg border-slate-200 text-xs" />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-10 rounded-lg text-xs font-bold uppercase tracking-widest bg-primary text-white" disabled={upsertAvulsaMutation.isPending}>
                      {upsertAvulsaMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loadingAvulsas ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filteredAvulsas.length === 0 ? (
              <Card className="border-none shadow-sm rounded-xl ring-1 ring-slate-100"><CardContent className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                Nenhuma aula avulsa encontrada.
              </CardContent></Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {turmasAvulsasWithMod.map((t: any) => {
                  const dataFormatted = t.data ? new Date(t.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" }) : "";
                  const isPast = t.data && new Date(t.data + "T23:59:59") < new Date();
                  return (
                    <Card key={t.id} className={cn(
                      "transition-all group relative overflow-hidden border-none shadow-sm ring-1 ring-slate-100",
                      isPast && "opacity-40",
                      !t.ativa && "opacity-50 ring-slate-200 bg-slate-50"
                    )}>
                      <div className="absolute top-0 left-0 w-full h-1 opacity-80" style={{ backgroundColor: t.modalidades?.cor || "#6B9B7A" }} />
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[7.5px] font-bold uppercase tracking-widest border-slate-100 bg-slate-50 gap-1 px-1.5 py-0">
                              <span>{t.modalidades?.emoji}</span> {t.modalidades?.nome}
                            </Badge>
                            <Badge variant="secondary" className="text-[7.5px] font-bold uppercase tracking-widest bg-orange-100/50 text-orange-600 px-1.5 py-0 gap-1"><Zap className="h-2.5 w-2.5" /> Avulsa</Badge>
                            {isPast && <Badge variant="destructive" className="text-[7.5px] font-bold uppercase tracking-widest px-1.5 py-0">Passada</Badge>}
                          </div>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost" size="icon" className="h-6 w-6"
                              title={t.ativa ? "Desativar" : "Ativar"}
                              onClick={() => toggleAtivaAvulsaMutation.mutate({ id: t.id, ativa: !t.ativa })}
                            >
                              <ToggleLeft className={cn("h-3.5 w-3.5", t.ativa ? "text-emerald-600" : "text-slate-400")} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditAvulsa(t)}><Edit className="h-3.5 w-3.5 text-slate-400" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500/70" onClick={() =>
                              requestDeleteAvulsa(t.id, t.nome, () => deleteAvulsaMutation.mutate(t.id))
                            }><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                        <CardTitle className="text-sm font-bold uppercase tracking-tight text-slate-900 mt-2">{t.nome}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-1 space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500 uppercase tracking-tight">
                          <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-bold">{dataFormatted}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500 uppercase tracking-tight">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>{t.horario?.slice(0, 5)} · {t.duracao_minutos}min</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <ConfirmDialog />
      <ConfirmDialogAvulsa />
    </AdminLayout>
  );
}
