import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, Calendar, Clock, Users, Zap, Search, Filter, 
  Edit, Trash2, CheckCircle2, AlertCircle, Loader2, ArrowRight, TrendingUp,
  Link, Copy, Check, MessageCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DIAS = [
  { value: 0, label: "Dom", key: "dom" },
  { value: 1, label: "Seg", key: "seg" },
  { value: 2, label: "Ter", key: "ter" },
  { value: 3, label: "Qua", key: "qua" },
  { value: 4, label: "Qui", key: "qui" },
  { value: 5, label: "Sex", key: "sex" },
  { value: 6, label: "Sáb", key: "sab" },
];

export default function HybridSchedule() {
  const queryClient = useQueryClient();
  const { studioId } = useAuth() as any;
  const [activeTab, setActiveTab] = useState("regulares");
  const [copiedLink, setCopiedLink] = useState(false);

  // State for Regular Classes
  const [regDialogOpen, setRegDialogOpen] = useState(false);
  const [editingReg, setEditingReg] = useState<any>(null);
  const [regForm, setRegForm] = useState({
    nome: "",
    modalidade_id: "",
    dias_semana: [] as number[],
    horario_inicio: "08:00",
    horario_fim: "09:00",
    capacidade_maxima: 10,
    valor_aula_avulso: 0, // NOVO CAMPO
  });

  // State for Special Classes
  const [specialDialogOpen, setSpecialDialogOpen] = useState(false);
  const [editingSpecial, setEditingSpecial] = useState<any>(null);
  const [specialForm, setSpecialForm] = useState({
    nome: "",
    modalidade_id: "",
    data: "",
    horario_inicio: "08:00",
    horario_fim: "09:00",
    vagas_totais: 10,
    valor: 0,
    instrutor_id: "",
  });

  // Fetch Studio Slug for Sharing
  const { data: studioData } = useQuery({
    queryKey: ["admin-studio-slug", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studios")
        .select("slug")
        .eq("id", studioId)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  // 1. Fetch Modalities
  const { data: modalidades = [] } = useQuery({
    queryKey: ["admin-modalities-hybrid", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modalities")
        .select("*")
        .eq("studio_id", studioId);
      if (error) throw error;
      return data;
    },
  });

  // 2. Fetch Regular Classes
  const { data: regularClasses = [], isLoading: loadingReg } = useQuery({
    queryKey: ["admin-classes-regulares", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*, modalities(nome, emoji, valor_avulso), enrollments(count), bookings(count)")
        .eq("studio_id", studioId)
        .eq("enrollments.status", "ativo")
        .eq("bookings.data", new Date().toISOString().split("T")[0])
        .eq("bookings.status", "confirmado");
      if (error) throw error;
      
      return (data || []).map(t => ({
        ...t,
        dias_semana_nums: (t.dias_semana || []).map((d: string) => 
          DIAS.find(x => x.key === d?.toLowerCase())?.value
        ).filter((v: any) => v !== undefined)
      }));
    },
  });

  // 3. Fetch Special Classes
  const { data: specialClasses = [], isLoading: loadingSpecial } = useQuery({
    queryKey: ["admin-classes-avulsas-hybrid", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes_avulsas")
        .select(`
           *,
           modalities(nome, emoji),
           bookings(count)
        `)
        .eq("studio_id", studioId)
        .eq("bookings.status", "confirmado");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-instrutores-hybrid", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select(`
          user_id,
          profiles ( id, nome )
        `)
        .eq("studio_id", studioId);
      if (error) throw error;
      return data.map((m: any) => ({ user_id: m.user_id, nome: m.profiles?.nome }));
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string, type: 'regular' | 'avulsa' }) => {
      const table = type === 'regular' ? 'classes' : 'classes_avulsas';
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      const key = variables.type === 'regular' ? "admin-classes-regulares" : "admin-classes-avulsas-hybrid";
      queryClient.invalidateQueries({ queryKey: [key] });
      toast.success("Aula removida com sucesso!");
    },
    onError: (err: any) => toast.error("Erro ao excluir", { description: err.message })
  });

  const upsertRegMutation = useMutation({
    mutationFn: async (values: any) => {
      const dbDays = values.dias_semana.map((v: number) => DIAS.find(d => d.value === v)?.key);
      
      const payload = { 
        studio_id: studioId,
        nome: values.nome,
        modality_id: values.modalidade_id,
        dias_semana: dbDays,
        horario: values.horario_inicio,
        horario_fim: values.horario_fim,
        capacidade: values.capacidade_maxima,
        valor_aula_avulso: values.valor_aula_avulso || 0, // NOVO CAMPO
        ativa: true
      };

      if (values.id) {
        const { error } = await supabase.from("classes").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("classes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-classes-regulares"] });
      setRegDialogOpen(false);
      toast.success("Turma regular salva!");
    },
    onError: (err: any) => {
      console.error("Error saving regular class:", err);
      toast.error("Erro ao salvar turma regular", { description: err.message });
    }
  });

  const upsertSpecialMutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = { 
        studio_id: studioId,
        nome: values.nome,
        modality_id: values.modalidade_id,
        data: values.data,
        horario: values.horario_inicio,
        horario_fim: values.horario_fim,
        limite_vagas: values.vagas_totais,
        valor: values.valor,
        instrutor_id: (values.instrutor_id === "none" || !values.instrutor_id) ? null : values.instrutor_id,
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
      queryClient.invalidateQueries({ queryKey: ["admin-classes-avulsas-hybrid"] });
      setSpecialDialogOpen(false);
      toast.success("Evento único salvo!");
    },
    onError: (err: any) => {
      console.error("Error saving special event:", err);
      toast.error("Erro ao salvar evento único", { description: err.message });
    }
  });

  const handleCopyLink = () => {
    const slug = studioData?.slug || studioId;
    const link = `${window.location.origin}/marcar/${slug}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const slug = studioData?.slug || studioId;
    const link = `${window.location.origin}/marcar/${slug}`;
    const text = `Confira nossa grade de aulas e faça sua reserva online: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const toggleDay = (day: number) => {
    setRegForm(f => ({
      ...f,
      dias_semana: f.dias_semana.includes(day) 
        ? f.dias_semana.filter(d => d !== day) 
        : [...f.dias_semana, day]
    }));
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
              Gestão de <span className="text-primary italic">Grade Híbrida</span>
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[8px] mt-2 flex items-center gap-2">
              RECURRENT CLASSES & UNIQUE EVENTS <span className="h-1 w-1 rounded-full bg-slate-200" /> V8.5 (Public Connected)
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button 
              variant="outline" 
              className={cn(
                "rounded-xl h-10 font-bold uppercase tracking-widest text-[10px] gap-2 border-slate-200",
                copiedLink && "bg-emerald-50 text-emerald-600 border-emerald-200"
              )}
              onClick={handleCopyLink}
            >
              {copiedLink ? <Check className="h-4 w-4" /> : <Link className="h-4 w-4" />}
              {copiedLink ? "Copiado!" : "Link Público"}
            </Button>
            <Button 
              variant="outline" 
              className="rounded-xl h-10 font-bold uppercase tracking-widest text-[10px] gap-2 border-emerald-100 bg-emerald-50/30 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm"
              onClick={handleWhatsAppShare}
            >
              <MessageCircle className="h-4 w-4 fill-emerald-500/20" />
              WhatsApp
            </Button>
            <Button 
              variant="outline" 
              className="rounded-xl h-10 font-bold uppercase tracking-widest text-[10px] gap-2 border-slate-200"
              onClick={() => {
                setEditingReg(null);
                setRegForm({ nome: "", modalidade_id: "", dias_semana: [], horario_inicio: "08:00", horario_fim: "09:00", capacidade_maxima: 10, valor_aula_avulso: 0 });
                setRegDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Turma Regular
            </Button>
            <Button 
              className="rounded-xl h-10 font-bold uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-primary/10"
              onClick={() => {
                setEditingSpecial(null);
                setSpecialForm({ nome: "", modalidade_id: "", data: "", horario_inicio: "08:00", horario_fim: "09:00", vagas_totais: 10, valor: 0, instrutor_id: "" });
                setSpecialDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Evento Único
            </Button>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-100/50 p-1 rounded-2xl h-12 w-full max-w-md mb-6">
            <TabsTrigger value="regulares" className="rounded-xl flex-1 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Calendar className="mr-2 h-4 w-4" /> Recorrentes
            </TabsTrigger>
            <TabsTrigger value="avulsas" className="rounded-xl flex-1 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Zap className="mr-2 h-4 w-4" /> Avulsas / Especiais
            </TabsTrigger>
          </TabsList>

          <TabsContent value="regulares" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {regularClasses.map((t: any) => (
                <Card key={t.id} className="border-none shadow-sm ring-1 ring-slate-100 hover:shadow-md transition-all group overflow-hidden rounded-3xl">
                   <CardHeader className="p-5 pb-2">
                     <div className="flex justify-between items-start">
                       <Badge variant="outline" className="bg-slate-50 text-[8px] font-black uppercase tracking-widest border-none ring-1 ring-slate-100">
                         {t.modalities?.emoji} {t.modalities?.nome}
                       </Badge>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-lg"
                            onClick={() => {
                              setEditingReg(t);
                              setRegForm({
                                id: t.id,
                                nome: t.nome || "",
                                modalidade_id: t.modality_id || "",
                                dias_semana: t.dias_semana_nums || [],
                                horario_inicio: t.horario || "08:00",
                                horario_fim: t.horario_fim || "09:00",
                                capacidade_maxima: t.capacidade || 10,
                                valor_aula_avulso: t.valor_aula_avulso || 0
                              } as any);
                              setRegDialogOpen(true);
                            }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-lg text-rose-500"
                            onClick={() => {
                              if(confirm("Deseja realmente excluir esta turma?")) {
                                deleteClassMutation.mutate({ id: t.id, type: 'regular' });
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-sm font-black uppercase italic tracking-tighter mt-2">{t.nome || "Turma sem nome"}</CardTitle>
                   </CardHeader>
                   <CardContent className="p-5 pt-0 space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{String(t.horario || "00:00:00").substring(0, 5)}</span>
                        </div>
                        <div className="text-right">
                           <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                             R$ {Number(t.valor_aula_avulso || t.modalities?.valor_avulso || 0).toFixed(0)} <span className="text-[8px] text-slate-400">/avulsa</span>
                           </span>
                        </div>
                      </div>
                       <div className="flex gap-1">
                        {t.dias_semana?.map((d: string) => (
                          <div key={d} className="h-7 w-7 rounded-lg bg-slate-50 flex items-center justify-center text-[9px] font-black uppercase text-slate-400">
                             {d?.substring(0, 3)}
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                         <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                            <Users className="h-3.5 w-3.5" />
                            <span>{(t.enrollments?.[0]?.count || 0) || 0} Alunos</span>
                         </div>
                         <Badge className={cn(
                            "border-none text-[8px] uppercase font-black",
                            (t.capacidade - (t.enrollments?.[0]?.count || 0) - (t.bookings?.[0]?.count || 0)) <= 0 
                              ? "bg-rose-50 text-rose-600" 
                              : "bg-emerald-50 text-emerald-600"
                         )}>
                            {Math.max(0, t.capacidade - (t.enrollments?.[0]?.count || 0) - (t.bookings?.[0]?.count || 0))} Vagas Hoje
                         </Badge>
                      </div>
                   </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="avulsas" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {specialClasses.map((t: any) => (
                <Card key={t.id} className="border-none shadow-sm ring-1 ring-slate-100 hover:shadow-md transition-all group overflow-hidden rounded-3xl">
                   <div className="h-1 w-full bg-amber-400/20" />
                   <CardHeader className="p-5 pb-2">
                     <div className="flex justify-between items-start">
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 text-[8px] font-black uppercase tracking-widest border-none ring-1 ring-amber-100/50">
                          {t.modalities?.emoji} {t.modalities?.nome}
                        </Badge>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-lg"
                            onClick={() => {
                              setEditingSpecial(t);
                              setSpecialForm({
                                id: t.id,
                                nome: t.nome,
                                modalidade_id: t.modality_id,
                                data: t.data,
                                horario_inicio: t.horario,
                                horario_fim: t.horario_fim,
                                vagas_totais: t.limite_vagas,
                                valor: t.valor || 0,
                                instrutor_id: t.instrutor_id || ""
                              } as any);
                              setSpecialDialogOpen(true);
                            }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-lg text-rose-500"
                            onClick={() => {
                              if(confirm("Excluir este evento fixo?")) {
                                deleteClassMutation.mutate({ id: t.id, type: 'avulsa' });
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-sm font-black uppercase italic tracking-tighter mt-2">
                        {t.nome || t.modalities?.nome}
                      </CardTitle>
                      <div className="flex items-center gap-1.5 mt-1 text-primary">
                        <Calendar className="h-3 w-3" />
                        <span className="text-[10px] font-black uppercase italic">{t.data ? new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'Data não definida'}</span>
                      </div>
                   </CardHeader>
                   <CardContent className="p-5 pt-0 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{String(t.horario || "").substring(0, 5)}</span>
                        </div>
                        <span className="text-sm font-black text-amber-600 tracking-tighter">R$ {Number(t.valor || 0).toFixed(0)}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                         <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                            <Users className="h-3.5 w-3.5 text-amber-500" />
                            <span>{String(t.bookings?.[0]?.count || 0) || 0} Reservas</span>
                         </div>
                         <Badge className="bg-amber-50 text-amber-600 border-none text-[8px] uppercase font-black">
                           {(t.limite_vagas || 0) - (t.bookings?.[0]?.count || 0)} Disponíveis
                         </Badge>
                      </div>
                   </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Regular Class Dialog */}
        <Dialog open={regDialogOpen} onOpenChange={setRegDialogOpen}>
          <DialogContent className="sm:max-w-md border-none shadow-2xl rounded-[2.5rem]">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase italic tracking-tighter">Configurar Turma Regular</DialogTitle>
              <CardDescription>Crie uma turma que se repete semanalmente.</CardDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome da Turma</Label>
                  <Input value={regForm.nome} onChange={e => setRegForm({...regForm, nome: e.target.value})} className="rounded-xl" placeholder="Ex: Ballet Baby Seg/Qua" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Modalidade</Label>
                    <Select value={regForm.modalidade_id} onValueChange={v => setRegForm({...regForm, modalidade_id: v})}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{modalidades.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.emoji} {m.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preço Aula Avulsa (R$)</Label>
                    <Input type="number" value={regForm.valor_aula_avulso} onChange={e => setRegForm({...regForm, valor_aula_avulso: Number(e.target.value)})} className="rounded-xl" placeholder="0.00" />
                  </div>
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dias da Semana</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {DIAS.map(d => (
                       <button 
                         key={d.value} 
                         type="button"
                         className={cn(
                           "flex-1 h-10 rounded-xl text-[9px] font-black uppercase transition-all border-none ring-1",
                           regForm.dias_semana.includes(d.value) ? "bg-primary text-white ring-primary shadow-lg shadow-primary/20" : "bg-slate-50 text-slate-400 ring-slate-100 hover:bg-slate-100"
                         )}
                         onClick={() => toggleDay(d.value)}
                       >
                         {d.label}
                       </button>
                    ))}
                  </div>
               </div>
               <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Início</Label>
                     <Input type="time" value={regForm.horario_inicio} onChange={e => setRegForm({...regForm, horario_inicio: e.target.value})} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Término</Label>
                     <Input type="time" value={regForm.horario_fim} onChange={e => setRegForm({...regForm, horario_fim: e.target.value})} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vagas</Label>
                     <Input type="number" value={regForm.capacidade_maxima} onChange={e => setRegForm({...regForm, capacidade_maxima: Number(e.target.value)})} className="rounded-xl" />
                  </div>
               </div>
               <Button className="w-full h-12 rounded-2xl font-black uppercase italic tracking-tighter" onClick={() => upsertRegMutation.mutate(regForm)}>
                 {upsertRegMutation.isPending ? <Loader2 className="animate-spin" /> : "Salvar Turma"}
               </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Special/AVULSA Dialog */}
        <Dialog open={specialDialogOpen} onOpenChange={setSpecialDialogOpen}>
          <DialogContent className="sm:max-w-md border-none shadow-2xl rounded-[2.5rem]">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase italic tracking-tighter">
                {editingSpecial ? "Editar Evento Único" : "Novo Evento Único"}
              </DialogTitle>
              <CardDescription>Eventos como Workshops, Aulas Avulsas ou Masterclasses.</CardDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome do Evento</Label>
                  <Input value={specialForm.nome} onChange={e => setSpecialForm({...specialForm, nome: e.target.value})} className="rounded-xl" placeholder="Ex: Workshop Ballet Contemporâneo" />
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Modalidade</Label>
                  <Select value={specialForm.modalidade_id} onValueChange={v => setSpecialForm({...specialForm, modalidade_id: v})}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{modalidades.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.emoji} {m.nome}</SelectItem>)}</SelectContent>
                  </Select>
               </div>
               
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Instrutor Responsável</Label>
                  <Select value={specialForm.instrutor_id} onValueChange={v => setSpecialForm({...specialForm, instrutor_id: v})}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione um instrutor" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem instrutor</SelectItem>
                      {profiles.map((p: any) => (
                        <SelectItem key={p.user_id} value={p.user_id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data do Evento</Label>
                    <Input type="date" value={specialForm.data} onChange={e => setSpecialForm({...specialForm, data: e.target.value})} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vagas Totais</Label>
                    <Input type="number" value={specialForm.vagas_totais} onChange={e => setSpecialForm({...specialForm, vagas_totais: Number(e.target.value)})} className="rounded-xl" />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Início</Label>
                     <Input type="time" value={specialForm.horario_inicio} onChange={e => setSpecialForm({...specialForm, horario_inicio: e.target.value})} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Término</Label>
                     <Input type="time" value={specialForm.horario_fim} onChange={e => setSpecialForm({...specialForm, horario_fim: e.target.value})} className="rounded-xl" />
                  </div>
               </div>

               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">R$</span>
                    <Input type="number" value={specialForm.valor} onChange={e => setSpecialForm({...specialForm, valor: Number(e.target.value)})} className="rounded-xl pl-10" placeholder="0.00" />
                  </div>
               </div>

               <Button className="w-full h-12 rounded-2xl font-black uppercase italic tracking-tighter bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20" onClick={() => upsertSpecialMutation.mutate(specialForm)}>
                 {upsertSpecialMutation.isPending ? <Loader2 className="animate-spin" /> : "Salvar Evento Único"}
               </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
