import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Trash2, Copy, CalendarOff, Loader2, UserCog, ChevronLeft, ChevronRight,
  Users, CheckCircle2, MoreHorizontal, UserCheck, AlertTriangle, MapPin, 
  X, Search, GraduationCap, Check, UserMinus, Clock, Calendar, Edit,
  Settings2, Ban, ShieldCheck, Heart, Info, ArrowUpRight, UserPlus,
  LayoutGrid, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Toaster, toast } from "sonner";
import { useConfirmDelete } from "@/hooks/useConfirmDelete";
import { usePostSaleAutomation } from "@/hooks/usePostSaleAutomation";
import { UnenrollmentModal } from "@/components/admin/UnenrollmentModal";
import { CancelButton } from "@/components/CancelButton";
import QuickStudentSearch from "@/components/admin/QuickStudentSearch";
import { format } from "date-fns";

const DIAS_SEMANA = [
  { value: "seg", label: "Segunda" },
  { value: "ter", label: "Terça" },
  { value: "qua", label: "Quarta" },
  { value: "qui", label: "Quinta" },
  { value: "sex", label: "Sexta" },
  { value: "sab", label: "Sábado" },
  { value: "dom", label: "Domingo" },
];

const weekDays = DIAS_SEMANA.map(d => d.value);
const weekDayLabels = Object.fromEntries(DIAS_SEMANA.map(d => [d.value, d.label]));

const MOTIVOS_BLOQUEIO = [
  { value: "feriado", label: "🎉 Feriado" },
  { value: "almoco", label: "🍽️ Almoço" },
  { value: "manutencao", label: "🔧 Manutenção" },
  { value: "outro", label: "📝 Outro" },
];

function generateTimeSlots(abertura: string, fechamento: string, duracao: number, intervalo: number) {
  const slots: string[] = [];
  const [ah, am] = abertura.split(":").map(Number);
  const [fh, fm] = (fechamento || "21:00").split(":").map(Number);
  let current = ah * 60 + am;
  const end = fh * 60 + fm;
  while (current + duracao <= end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    current += duracao + intervalo;
  }
  return slots;
}

export default function Schedule() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { studioId } = useAuth();
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [bloqueioDialogOpen, setBloqueioDialogOpen] = useState(false);
  const [regrasDialogOpen, setRegrasDialogOpen] = useState(false);
  const [instrutorDialogOpen, setInstrutorDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ dia: string; time: string; items: any[] } | null>(null);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string | null>(null);
  const [attendanceTurmaId, setAttendanceTurmaId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [bloqueioForm, setBloqueioForm] = useState({
    titulo: "", motivo: "feriado", data_inicio: "", data_fim: "",
    horario_inicio: "", horario_fim: "", recorrente: false, dias_semana: [] as string[],
  });

  const [unenrollModalOpen, setUnenrollModalOpen] = useState(false);
  const [enrollmentToRemove, setEnrollmentToRemove] = useState<{ studentId: string; studentName: string; classId: string } | null>(null);

  const weekDates = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);

    const dates: Record<string, Date> = {};
    const dayKeys = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
    dayKeys.forEach((key, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates[key] = d;
    });
    return dates;
  }, [weekOffset]);

  const weekLabel = useMemo(() => {
    const seg = weekDates["seg"];
    const sab = weekDates["sab"];
    if (!seg || !sab) return "";
    const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
    return `${fmt(seg)} — ${fmt(sab)}`;
  }, [weekDates]);

  // Queries
  const { data: turmas = [] } = useQuery({
    queryKey: ["admin", "schedule", "turmas-regulares", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select(`
          *,
          modalities ( id, nome, emoji, cor )
        `)
        .eq("studio_id", studioId)
        .eq("ativa", true)
        .order("horario");
      if (error) throw error;
      return data.map(d => ({ ...d, _source: "regular" }));
    },
  });

  const { data: turmasAvulsas = [] } = useQuery({
    queryKey: ["admin", "schedule", "turmas-avulsas", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes_avulsas")
        .select(`
          *,
          modalities ( id, nome, emoji, cor )
        `)
        .eq("studio_id", studioId)
        .eq("ativa", true)
        .order("horario");
      if (error) throw error;
      return data.map(d => ({ ...d, _source: "avulsa" }));
    },
  });

  const allTurmas = [...turmas, ...turmasAvulsas];

  const selectedTurma = useMemo(() => {
    if (!selectedTurmaId) return null;
    return allTurmas.find((t: any) => t.id === selectedTurmaId) || null;
  }, [allTurmas, selectedTurmaId]);

  const { data: configAgenda = [] } = useQuery({
    queryKey: ["admin", "schedule", "configuracao-visual", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studio_schedule_configs")
        .select("*")
        .eq("studio_id", studioId)
        .order("dia_semana");
      if (error) throw error;
      return data;
    },
  });

  const { data: studioConfig } = useQuery({
    queryKey: ["admin", "schedule", "studio-configs-wa", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data } = await supabase.from("studio_configs").select("config").eq("studio_id", studioId).maybeSingle();
      return data?.config || {};
    }
  });

  const { sendAutomatedWhatsApp } = usePostSaleAutomation();

  const { data: bloqueios = [] } = useQuery({
    queryKey: ["admin", "schedule", "bloqueios", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_blocks")
        .select("*")
        .eq("studio_id", studioId)
        .order("data_inicio");
      if (error) throw error;
      return data;
    },
  });

  const { data: regras } = useQuery({
    queryKey: ["admin", "schedule", "regras", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studio_configs")
        .select("config")
        .eq("studio_id", studioId)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data?.config?.agendamento || {
        antecedencia_agendamento_horas: 1,
        antecedencia_cancelamento_horas: 2,
        max_agendamentos_simultaneos: 3,
        permitir_lista_espera: true
      };
    },
  });

  const { data: inscricoesCounts = {} } = useQuery({
    queryKey: ["admin", "schedule", "inscricoes-count", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("class_id, student_id")
        .eq("studio_id", studioId)
        .eq("ativa", true);
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      const uniqueEnrollments = new Set<string>();
      
      data.forEach((d) => {
        if (d.class_id && d.student_id) {
          const key = `${d.class_id}_${d.student_id}`;
          if (!uniqueEnrollments.has(key)) {
            uniqueEnrollments.add(key);
            counts[d.class_id] = (counts[d.class_id] || 0) + 1;
          }
        } else if (d.class_id) {
          counts[d.class_id] = (counts[d.class_id] || 0) + 1;
        }
      });
      
      return counts;
    },
  });

  const { data: participants = [], isLoading: loadingParticipants } = useQuery({
    queryKey: ["admin", "schedule", "participants", selectedSlot?.items.map((i: any) => i.id), selectedSlot?.dia],
    enabled: !!selectedSlot,
    queryFn: async () => {
      if (!selectedSlot) return [];
      const classIds = selectedSlot.items.map((i: any) => i.id);
      const dayStr = weekDates[selectedSlot.dia].toISOString().split("T")[0];

      // 1. Agendamentos
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select(`
          id,
          status,
          tipo,
          pago,
          student_id,
          students ( nome, telefone ),
          nome_avulso
        `)
        .in("class_id", classIds)
        .eq("data", dayStr)
        .eq("status", "confirmado");

      if (error) throw error;

      // 2. Fila de Espera
      const { data: waitlist, error: waitlistError } = await supabase
        .from("waiting_list")
        .select(`
          id,
          students ( nome, telefone ),
          nome_avulso,
          created_at
        `)
        .in("class_id", classIds)
        .eq("data", dayStr)
        .order("created_at", { ascending: true });

      if (waitlistError) {
        console.warn("[Schedule] waiting_list query failed:", waitlistError.message);
      }

      // 3. Matrículas Fixas
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select(`
          id,
          class_id,
          student_id,
          students ( nome, telefone )
        `)
        .in("class_id", classIds)
        .eq("ativa", true)
        .eq("studio_id", studioId);

      if (enrollmentsError) {
        console.warn("[Schedule] enrollments query failed:", enrollmentsError.message);
      }

      const confirmed = bookings?.map((b: any) => ({
        id: b.id,
        student_id: b.student_id,
        name: b.students?.nome || b.nome_avulso || "Aluno",
        phone: b.students?.telefone || "",
        type: b.tipo,
        pago: b.pago,
        status: b.status,
      })) || [];

      const waiting = waitlist?.map((w: any) => ({
        id: w.id,
        student_id: w.student_id,
        name: w.students?.nome || w.nome_avulso || "Fila",
        phone: w.students?.telefone || "",
        type: "espera",
        status: "em_espera",
      })) || [];

      const enrolled = enrollments?.map((e: any) => ({
        id: e.id,
        student_id: e.student_id,
        name: e.students?.nome || "Aluno",
        phone: e.students?.telefone || "",
        type: "matriculado",
        pago: true,
        status: "confirmado",
        class_id: e.class_id
      })) || [];

      const allParticipants = [...confirmed, ...enrolled, ...waiting];
      
      // Deduplicar alunos para não mostrar quem está matriculado e agendado ao mesmo tempo na mesma aula
      const uniqueParticipants = Array.from(new Map(allParticipants.map(p => [p.student_id || p.name, p])).values());

      return uniqueParticipants;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-instrutores", studioId],
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

  // Mutations
  const updateConfigMutation = useMutation({
    mutationFn: async (config: any) => {
      const { error } = await supabase
        .from("studio_schedule_configs")
        .upsert({
          ...config,
          studio_id: studioId,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "schedule", "configuracao-visual"] });
      toast.success("Configuração atualizada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const applyToAllMutation = useMutation({
    mutationFn: async (source: any) => {
      const updates = DIAS_SEMANA.map((dia) => ({
        studio_id: studioId,
        dia_semana: dia.value,
        horario_abertura: source.horario_abertura,
        horario_fechamento: source.horario_fechamento,
        duracao_sessao_minutos: source.duracao_sessao_minutos,
        intervalo_transicao_minutos: source.intervalo_transicao_minutos,
        capacidade_maxima_global: source.capacidade_maxima_global,
        aberto: source.aberto,
        updated_at: new Date().toISOString()
      }));
      const { error } = await supabase.from("studio_schedule_configs").upsert(updates);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "schedule", "configuracao-visual"] });
      toast.success("Configuração aplicada a todos os dias!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createBloqueioMutation = useMutation({
    mutationFn: async (values: typeof bloqueioForm) => {
      const { error } = await supabase
        .from("schedule_blocks")
        .insert([{
          ...values,
          studio_id: studioId,
          horario_inicio: values.horario_inicio || null,
          horario_fim: values.horario_fim || null,
          created_at: new Date().toISOString()
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "schedule", "bloqueios"] });
      setBloqueioDialogOpen(false);
      setBloqueioForm({ titulo: "", motivo: "feriado", data_inicio: "", data_fim: "", horario_inicio: "", horario_fim: "", recorrente: false, dias_semana: [] });
      toast.success("Bloqueio criado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteBloqueioMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedule_blocks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "schedule", "bloqueios"] });
      
      // Double Check: Invalidate Global Admin Context
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      
      toast.success("Bloqueio removido!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateRegrasMutation = useMutation({
    mutationFn: async (values: any) => {
      const { data: current } = await supabase.from("studio_configs").select("config").eq("studio_id", studioId).single();
      const newConfig = { ...current?.config, agendamento: values };
      const { error } = await supabase.from("studio_configs").upsert({
        studio_id: studioId,
        config: newConfig,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regras-agendamento"] });
      setRegrasDialogOpen(false);
      toast.success("Regras atualizadas!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateInstrutorMutation = useMutation({
    mutationFn: async ({ turmaId, instrutorId, type }: { turmaId: string; instrutorId: string | null; type: 'regular' | 'avulsa' }) => {
      const table = type === 'avulsa' ? 'classes_avulsas' : 'classes';
      const { error } = await supabase
        .from(table)
        .update({ instrutor_id: instrutorId, updated_at: new Date().toISOString() })
        .eq("id", turmaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "schedule"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "classes"] });
      setInstrutorDialogOpen(false);
      toast.success("Instrutor atualizado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const enrollStudentMutation = useMutation({
    mutationFn: async ({ studentId, classId }: { studentId: string; classId: string }) => {
      const { error } = await supabase
        .from("enrollments")
        .insert({
          studio_id: studioId,
          student_id: studentId,
          class_id: classId,
          ativa: true
        });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      // Double Check: Nuclear Invalidation for Global Sync
      queryClient.invalidateQueries({ queryKey: ["admin"] });


      toast.success("Aluno matriculado com sucesso!");

      // Trigger WhatsApp
      const waConfig = (studioConfig as any)?.whatsapp;
      if (waConfig?.enabled === "true" && waConfig?.auto_send_enrollment === "true") {
        const student = participants.find((p: any) => p.student_id === variables.studentId);
        const turma = allTurmas.find((t: any) => t.id === variables.classId);
        
        if (student?.phone) {
          sendAutomatedWhatsApp({
            studioId: studioId || "",
            phone: student.phone,
            template: (studioConfig as any)?.automacao?.whatsapp_welcome || "Olá [nome]! Bem-vindo(a) à turma [turma].",
            data: {
              nome: student.name,
              turma: turma?.nome || "sua turma",
              studio_nome: (studioConfig as any)?.estudio?.nome || "nosso estúdio"
            },
            config: waConfig
          });
        }
      }
    },
    onError: (e: any) => toast.error("Erro ao matricular: " + e.message)
  });

  const unenrollMutation = useMutation({
    mutationFn: async ({ 
      studentId, 
      classId, 
      type, 
      cancelInvoices 
    }: { 
      studentId: string; 
      classId: string; 
      type: 'inactivate' | 'delete'; 
      cancelInvoices: boolean 
    }) => {
      // 1. Encontrar o ID da matrícula ativa
      const { data: enrollment, error: fetchError } = await supabase
        .from("enrollments")
        .select("id")
        .eq("student_id", studentId)
        .eq("class_id", classId)
        .eq("ativa", true)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!enrollment) throw new Error("Matrícula ativa não encontrada.");

      // 2. Usar o RPC atômico para desmatricular (suporta apenas inativação com lógica financeira)
      // Se for 'delete', ainda usamos a inativação no cockpit por segurança, 
      // ou poderíamos manter o delete manual, mas a recomendação é inativar.
      const { data, error: rpcError } = await supabase.rpc('process_student_unenrollment', {
        p_enrollment_id: enrollment.id,
        p_cancellation_reason: "Solicitado via Cockpit"
      });
      
      if (rpcError) throw rpcError;
      return data;
    },
    onSuccess: (data, variables) => {
      // Nuclear Sync after unenrollment
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      
      if (data && data.fine_amount > 0) {
        toast.success(`Matrícula encerrada. Multa de R$ ${data.fine_amount.toFixed(2)} gerada.`);
      } else {
        toast.success("Matrícula inativada com sucesso!");
      }
      
      setUnenrollModalOpen(false);
      setEnrollmentToRemove(null);
    },
    onError: (e: any) => toast.error(e.message)
  });

  const promoteFromWaitlistMutation = useMutation({
    mutationFn: async ({ studentId, classId, waitlistId }: { studentId: string; classId: string; waitlistId: string }) => {
      // 1. Inserir matrícula
      const { error: enrollError } = await supabase
        .from("enrollments")
        .insert({
            studio_id: studioId,
            student_id: studentId,
            class_id: classId,
            ativa: true
        });
      if (enrollError) throw enrollError;

      // 2. Remover da fila
      const { error: waitError } = await supabase
        .from("waiting_list")
        .delete()
        .eq("id", waitlistId);
      if (waitError) console.error("Error removing from waitlist:", waitError);
    },
    onSuccess: (_, variables) => {
      // Sincronização global após promoção da fila de espera
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Aluno promovido da fila para matrícula ativa!");

      // Trigger WhatsApp
      const waConfig = (studioConfig as any)?.whatsapp;
      if (waConfig?.enabled === "true" && waConfig?.auto_send_enrollment === "true") {
        const student = participants.find((p: any) => p.student_id === variables.studentId && p.status === "em_espera");
        const turma = allTurmas.find((t: any) => t.id === variables.classId);
        
        if (student?.phone) {
          sendAutomatedWhatsApp({
            studioId: studioId || "",
            phone: student.phone,
            template: "Olá [nome]! ✨ Ótimas notícias: surgiu uma vaga e você acaba de ser promovido(a) da lista de espera para a turma [turma]! Nos vemos na aula.",
            data: {
              nome: student.name,
              turma: turma?.nome || "sua turma"
            },
            config: waConfig
          });
        }
      }
    },
    onError: (e: any) => toast.error("Erro ao promover: " + e.message)
  });

  const removeFromWaitlistMutation = useMutation({
    mutationFn: async (id: string) => {
        const { error } = await supabase.from("waiting_list").delete().eq("id", id);
        if (error) throw error;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["participants"] });
        toast.success("Removido da lista de espera.");
    },
    onError: (e: any) => toast.error(e.message)
  });

  const { ConfirmDialog: ConfirmBloqueioDialog, requestDelete: requestBloqueio } = useConfirmDelete();

  const refConfig = configAgenda.find((c: any) => c.dia_semana === "seg") || {
    horario_abertura: "07:00", horario_fechamento: "21:00",
    duracao_sessao_minutos: 60, intervalo_transicao_minutos: 10,
  };

  const timeSlots = useMemo(() => {
    let earliest = "23:59";
    let latest = "00:00";
    if (configAgenda.length === 0) return generateTimeSlots("07:00", "21:00", 60, 0);
    
    configAgenda.forEach((c: any) => {
      if (c.aberto) {
        const open = c.horario_abertura?.slice(0, 5) || "07:00";
        const close = c.horario_fechamento?.slice(0, 5) || "21:00";
        if (open < earliest) earliest = open;
        if (close > latest) latest = close;
      }
    });
    if (earliest === "23:59") earliest = "07:00";
    if (latest === "00:00") latest = "21:00";
    return generateTimeSlots(earliest, latest, refConfig.duracao_sessao_minutos || 60, 0);
  }, [configAgenda, refConfig]);

  const grid: Record<string, any[]> = {};
  turmas.forEach((t: any) => {
    const hour = t.horario?.slice(0, 5);
    (t.dias_semana || []).forEach((dia: string) => {
      const key = `${dia}-${hour}`;
      if (!grid[key]) grid[key] = [];
      grid[key].push(t);
    });
  });

  turmasAvulsas.forEach((t: any) => {
    if (!t.data) return;
    const tDate = new Date(t.data + "T12:00:00");
    const weekStart = weekDates["seg"];
    const weekEnd = weekDates["sab"];
    if (!weekStart || !weekEnd) return;
    const endOfWeek = new Date(weekEnd);
    endOfWeek.setHours(23, 59, 59);
    
    if (tDate >= weekStart && tDate <= endOfWeek) {
      const dayIdx = tDate.getDay();
      const dia = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"][dayIdx];
      const hour = t.horario?.slice(0, 5);
      const key = `${dia}-${hour}`;
      if (!grid[key]) grid[key] = [];
      grid[key].push(t);
    }
  });

  const isBlocked = (dia: string, time: string) => {
    return bloqueios.some((b: any) => {
      if (b.recorrente && (b.dias_semana || []).includes(dia)) {
        if (!b.horario_inicio || !b.horario_fim) return true;
        return time >= b.horario_inicio.slice(0, 5) && time < b.horario_fim.slice(0, 5);
      }
      const d = weekDates[dia]?.toISOString().split("T")[0];
      if (d && b.data_inicio <= d && b.data_fim >= d) {
        if (!b.horario_inicio || !b.horario_fim) return true;
        return time >= b.horario_inicio.slice(0, 5) && time < b.horario_fim.slice(0, 5);
      }
      return false;
    });
  };

  const isDayOpen = (dia: string) => {
    const config = configAgenda.find((c: any) => c.dia_semana === dia);
    return config ? config.aberto : true;
  };

  const getSlotStatus = (dia: string, time: string) => {
    if (!isDayOpen(dia)) return "closed";
    if (isBlocked(dia, time)) return "blocked";
    const config = configAgenda.find((c: any) => c.dia_semana === dia);
    if (config) {
      const open = config.horario_abertura?.slice(0, 5) || "07:00";
      const close = config.horario_fechamento?.slice(0, 5) || "21:00";
      if (time < open || time >= close) return "closed";
    }
    const items = grid[`${dia}-${time}`] || [];
    if (items.length === 0) return "free";
    const totalOccupied = items.reduce((sum: number, t: any) => sum + (inscricoesCounts[t.id] || 0), 0);
    const totalCapacity = items.reduce((sum: number, t: any) => sum + (t.limite_vagas || 0), 0);
    if (totalCapacity === 0) return "occupied";
    if (totalOccupied >= totalCapacity) return "full";
    if (totalOccupied >= totalCapacity * 0.7) return "partial";
    return "occupied";
  };

  const statusColors: Record<string, string> = {
    free: "bg-emerald-50/50 border-emerald-100 hover:bg-emerald-100/50 hover:border-emerald-300 shadow-sm",
    occupied: "bg-sky-50 border-sky-100 hover:bg-sky-100 group-hover:border-sky-300 shadow-sm",
    partial: "bg-amber-50 border-amber-100 hover:bg-amber-100 shadow-sm",
    full: "bg-rose-50 border-rose-100 hover:bg-rose-100 shadow-sm",
    blocked: "bg-slate-50 border-dashed border-slate-200 cursor-not-allowed opacity-50",
    closed: "bg-slate-50 border-transparent opacity-10 cursor-not-allowed",
  };

  const [localRegras, setLocalRegras] = useState<any>(null);

  const modalities = [...new Map(allTurmas.map((t: any) => [t.modality_id, { nome: t.modalities?.nome, cor: t.modalidades?.cor, emoji: t.modalidades?.emoji }])).values()];

  return (
    <AdminLayout>
      <Toaster />
      <div className="space-y-4 animate-in fade-in duration-500">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <Badge className="bg-primary/5 text-primary border-none text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 mb-1">Scheduling Engine v7.5.2</Badge>
            <h1 className="text-lg md:text-xl font-bold uppercase tracking-tight text-slate-950 flex items-center gap-3 leading-none">
              Grade <span className="text-primary tracking-normal">Horários</span>
            </h1>
            <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest">Grade mestra com disponibilidade em tempo real</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-8 px-4 font-bold uppercase tracking-widest text-[9px] bg-slate-50 border-slate-200 rounded-lg gap-2 transition-all">
                  <Settings2 className="h-3.5 w-3.5" /> Configurar Grade
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl">
                <DialogHeader><DialogTitle>Configuração da Grade Mestra</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">Defina o horário de funcionamento, duração das sessões e intervalos para cada dia.</p>
                <div className="space-y-3 mt-4">
                  {DIAS_SEMANA.map((dia) => {
                    let config = configAgenda.find((c: any) => c.dia_semana === dia.value);
                    if (!config) {
                      config = { dia_semana: dia.value, aberto: true, horario_abertura: "07:00", horario_fechamento: "21:00", duracao_sessao_minutos: 60, intervalo_transicao_minutos: 0 };
                    }
                    return (
                      <Card key={dia.value} className={`transition-opacity ${!config.aberto ? "opacity-50" : ""}`}>
                        <CardContent className="pt-4 pb-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <Switch
                                checked={config.aberto}
                                onCheckedChange={(v) => updateConfigMutation.mutate({ ...config, aberto: v })}
                              />
                              <span className="font-medium text-sm">{dia.label}</span>
                            </div>
                            {config.aberto && (
                              <>
                                <div className="flex items-center gap-1">
                                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Abre</Label>
                                  <Input
                                    type="time" className="w-[100px] h-8 text-xs"
                                    value={config.horario_abertura?.slice(0, 5)}
                                    onChange={(e) => updateConfigMutation.mutate({ ...config, horario_abertura: e.target.value })}
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Fecha</Label>
                                  <Input
                                    type="time" className="w-[100px] h-8 text-xs"
                                    value={config.horario_fechamento?.slice(0, 5)}
                                    onChange={(e) => updateConfigMutation.mutate({ ...config, horario_fechamento: e.target.value })}
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Sessão</Label>
                                  <Input
                                    type="number" className="w-[60px] h-8 text-xs"
                                    value={config.duracao_sessao_minutos}
                                    onChange={(e) => updateConfigMutation.mutate({ ...config, duracao_sessao_minutos: parseInt(e.target.value) || 60 })}
                                  />
                                  <span className="text-xs text-muted-foreground">min</span>
                                </div>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-2 gap-2"
                  onClick={() => {
                    const seg = configAgenda.find((c: any) => c.dia_semana === "seg");
                    if (seg) applyToAllMutation.mutate(seg);
                  }}
                  disabled={applyToAllMutation.isPending}
                >
                  <Copy className="h-4 w-4" /> Aplicar config de Segunda a todos os dias
                </Button>
              </DialogContent>
            </Dialog>

            <Dialog open={bloqueioDialogOpen} onOpenChange={setBloqueioDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-8 px-4 font-bold uppercase tracking-widest text-[9px] bg-slate-50 border-slate-200 rounded-lg gap-2 transition-all">
                  <Ban className="h-3.5 w-3.5" /> Bloqueios
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl">
                <DialogHeader><DialogTitle>Bloqueios de Agenda</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground mb-4">Bloqueie horários para feriados, almoço ou manutenção.</p>

                {bloqueios.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {bloqueios.map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between border rounded-lg p-3 text-sm">
                        <div>
                          <p className="font-medium">{b.titulo}</p>
                          <p className="text-xs text-muted-foreground">
                            {MOTIVOS_BLOQUEIO.find((m) => m.value === b.motivo)?.label || b.motivo}
                            {" · "}
                            {b.recorrente ? `Recorrente (${(b.dias_semana || []).join(", ")})` : `${b.data_inicio} → ${b.data_fim}`}
                            {b.horario_inicio && ` · ${b.horario_inicio?.slice(0, 5)}–${b.horario_fim?.slice(0, 5)}`}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => requestBloqueio(b.id, b.titulo, () => deleteBloqueioMutation.mutate(b.id))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />
                <form onSubmit={(e) => { e.preventDefault(); createBloqueioMutation.mutate(bloqueioForm); }} className="space-y-3 mt-4">
                  <h4 className="font-semibold text-sm">Novo Bloqueio</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Título *</Label>
                      <Input value={bloqueioForm.titulo} onChange={(e) => setBloqueioForm({ ...bloqueioForm, titulo: e.target.value })} required placeholder="Ex: Feriado Nacional" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Motivo</Label>
                      <Select value={bloqueioForm.motivo} onValueChange={(v) => setBloqueioForm({ ...bloqueioForm, motivo: v })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MOTIVOS_BLOQUEIO.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <Switch checked={bloqueioForm.recorrente} onCheckedChange={(v) => setBloqueioForm({ ...bloqueioForm, recorrente: v })} />
                      <Label className="text-xs">Recorrente</Label>
                    </div>
                    {!bloqueioForm.recorrente ? (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs">Data Início *</Label>
                          <Input type="date" value={bloqueioForm.data_inicio} onChange={(e) => setBloqueioForm({ ...bloqueioForm, data_inicio: e.target.value, data_fim: bloqueioForm.data_fim || e.target.value })} required />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Data Fim *</Label>
                          <Input type="date" value={bloqueioForm.data_fim} onChange={(e) => setBloqueioForm({ ...bloqueioForm, data_fim: e.target.value })} required />
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Dias da Semana</Label>
                        <div className="flex gap-1 flex-wrap">
                          {DIAS_SEMANA.map((d) => (
                            <Button
                              key={d.value} type="button" size="sm" variant={bloqueioForm.dias_semana.includes(d.value) ? "default" : "outline"}
                              className="h-7 text-xs px-2"
                              onClick={() => setBloqueioForm((f) => ({
                                ...f,
                                dias_semana: f.dias_semana.includes(d.value) ? f.dias_semana.filter((x) => x !== d.value) : [...f.dias_semana, d.value],
                              }))}
                            >
                              {d.label.slice(0, 3)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs">Hora Início</Label>
                      <Input type="time" value={bloqueioForm.horario_inicio} onChange={(e) => setBloqueioForm({ ...bloqueioForm, horario_inicio: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Hora Fim</Label>
                      <Input type="time" value={bloqueioForm.horario_fim} onChange={(e) => setBloqueioForm({ ...bloqueioForm, horario_fim: e.target.value })} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createBloqueioMutation.isPending}>
                    {createBloqueioMutation.isPending ? "Salvando..." : "Criar Bloqueio"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={regrasDialogOpen} onOpenChange={(o) => {
              setRegrasDialogOpen(o);
              if (o && regras) setLocalRegras({ ...regras });
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-8 px-4 font-bold uppercase tracking-widest text-[9px] bg-slate-50 border-slate-200 rounded-lg gap-2 transition-all">
                  <ShieldCheck className="h-3.5 w-3.5" /> Regras
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl">
                <DialogHeader><DialogTitle>Regras de Agendamento</DialogTitle></DialogHeader>
                {localRegras && (
                  <form onSubmit={(e) => { e.preventDefault(); updateRegrasMutation.mutate(localRegras); }} className="space-y-4 mt-2">
                    <div className="space-y-2">
                      <Label>Antecedência para agendar (horas)</Label>
                      <Input type="number" value={localRegras.antecedencia_agendamento_horas} onChange={(e) => setLocalRegras({ ...localRegras, antecedencia_agendamento_horas: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Antecedência para cancelar (horas)</Label>
                      <Input type="number" value={localRegras.antecedencia_cancelamento_horas} onChange={(e) => setLocalRegras({ ...localRegras, antecedencia_cancelamento_horas: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={localRegras.permitir_lista_espera} onCheckedChange={(v) => setLocalRegras({ ...localRegras, permitir_lista_espera: v })} />
                      <Label>Permitir fila de espera</Label>
                    </div>
                    <Button type="submit" className="w-full" disabled={updateRegrasMutation.isPending}>Salvar Regras</Button>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Calendar Nav & Grid */}
        <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden bg-white ring-1 ring-slate-100 backdrop-blur-xl bg-white/80">
          <CardContent className="p-0">
            {/* Header / Nav */}
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-white/5">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" size="icon" 
                  className="h-9 w-9 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10" 
                  onClick={() => setWeekOffset(w => w - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary block leading-none mb-1">Periodo Atual</span>
                  <span className="text-sm font-black italic uppercase tracking-tighter">{weekLabel}</span>
                </div>
                <Button 
                  variant="ghost" size="icon" 
                  className="h-9 w-9 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10" 
                  onClick={() => setWeekOffset(w => w + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-3">
                {weekOffset !== 0 && (
                  <Button 
                    variant="ghost" 
                    className="h-8 px-4 text-[9px] font-black uppercase tracking-widest bg-white/10 text-white rounded-xl hover:bg-white/20" 
                    onClick={() => setWeekOffset(0)}
                  >
                    Voltar para Hoje
                  </Button>
                )}
                <div className="h-9 w-px bg-white/10 hidden md:block" />
                <div className="hidden lg:flex items-center gap-6 px-4">
                   <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Live Status Sync</span>
                   </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto p-4 lg:p-6 custom-scrollbar">
              <div className="min-w-[800px]">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-4 mb-6">
                  <div className="flex flex-col justify-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-4 mb-2">Horário</span>
                    <div className="h-1 w-8 bg-primary rounded-full ml-4" />
                  </div>
                  {weekDays.map((day) => {
                    const dateObj = weekDates[day];
                    const isToday = dateObj && new Date().toDateString() === dateObj.toDateString();
                    return (
                      <div key={day} className={cn(
                        "flex flex-col items-center py-3 rounded-2xl relative transition-all",
                        isToday ? "bg-primary text-black shadow-xl shadow-primary/20" : "bg-slate-50/50 text-slate-900 border border-slate-100"
                      )}>
                        <span className="text-[10px] font-black uppercase tracking-widest mb-1">{weekDayLabels[day]}</span>
                        <div className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-black",
                          isToday ? "bg-black/10" : "bg-slate-200 text-slate-500"
                        )}>
                          {dateObj?.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Time Slots */}
                <div className="space-y-4">
                  {timeSlots.map((time) => (
                    <div key={time} className="grid grid-cols-7 gap-4">
                      <div className="flex items-center justify-center">
                         <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 shadow-inner">
                            <span className="text-xs font-black italic tracking-tighter text-slate-400">{time}</span>
                         </div>
                      </div>
                      
                      {weekDays.map((day) => {
                        const key = `${day}-${time}`;
                        const items = grid[key] || [];
                        const status = getSlotStatus(day, time);
                        const isClosed = status === "closed";
                        const isToday = weekDates[day] && new Date().toDateString() === weekDates[day].toDateString();
                        
                        return (
                          <div
                            key={key}
                            onClick={() => {
                              if (!isClosed && status !== "blocked") {
                                setSelectedSlot({ dia: day, time, items });
                                if (items.length === 1) setSelectedTurmaId(items[0].id);
                                setDetailsOpen(true);
                              }
                            }}
                            className={cn(
                              "min-h-[70px] rounded-2xl border p-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group hover:scale-[1.02] active:scale-95 duration-300",
                              statusColors[status] || "bg-white",
                              isToday && status === "free" && "ring-2 ring-primary/30",
                              status === "blocked" && "opacity-40",
                              isClosed && "opacity-5"
                            )}
                          >
                            {status === "blocked" && <Ban className="h-5 w-5 text-slate-400 opacity-50" />}
                            
                            {!isClosed && status !== "blocked" && (
                              <div className="w-full h-full flex flex-col justify-between">
                                 {items.length > 0 ? (
                                    <div className="space-y-2">
                                       {items.map((item, i) => {
                                          const occupied = (inscricoesCounts[item.id] || 0);
                                          const limit = item.limite_vagas || 0;
                                          const pct = limit > 0 ? (occupied / limit) * 100 : 0;
                                          return (
                                            <div key={i} className="bg-white/80 backdrop-blur-sm rounded-xl p-2 shadow-sm border border-black/5">
                                              <div className="flex justify-between items-center mb-1.5">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                  <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: item.modalities?.cor || "#6B9B7A" }} />
                                                  <span className="text-[9px] font-black uppercase tracking-tighter text-slate-900 truncate italic">{item.nome}</span>
                                                </div>
                                                <span className="text-[8px] font-black text-slate-400 italic shrink-0 ml-1">{occupied}/{limit}</span>
                                              </div>
                                              <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className={cn(
                                                  "h-full transition-all duration-1000",
                                                  pct < 70 ? "bg-emerald-400" : pct < 100 ? "bg-amber-400" : "bg-rose-400"
                                                )} style={{ width: `${pct}%` }} />
                                              </div>
                                            </div>
                                          );
                                       })}
                                    </div>
                                 ) : (
                                    <div className="h-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                                       <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center mb-1">
                                          <Plus className="h-4 w-4 text-emerald-500" />
                                       </div>
                                       <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600/50">Abrir Slot</span>
                                    </div>
                                 )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Legend Footer */}
            <div className="bg-slate-50/50 p-6 flex items-center justify-between border-t border-slate-100">
               <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                     <div className="h-3 w-3 rounded-md bg-emerald-100 border border-emerald-200" />
                     <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Livre</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="h-3 w-3 rounded-md bg-rose-100 border border-rose-200" />
                     <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Lotado</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                     <Ban className="h-3 w-3" />
                     <span className="text-[9px] font-bold uppercase tracking-widest">Bloqueado</span>
                  </div>
               </div>
               
               <div className="flex items-center gap-4">
                  {modalities.slice(0, 4).map((m: any, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm ring-1 ring-black/5">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: m.cor || "#6B9B7A" }} />
                      <span className="text-[9px] font-black uppercase tracking-tighter italic text-slate-700">{m.emoji} {m.nome}</span>
                    </div>
                  ))}
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Slot Details Dialog - REDESIGNED 2.5.0 */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="w-[95vw] sm:max-w-2xl p-0 overflow-hidden border-none rounded-3xl shadow-2xl bg-slate-50 max-h-[95vh] flex flex-col">
             <div className="bg-slate-950 p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="relative z-10 flex justify-between items-start">
                   <div className="space-y-0.5">
                      <Badge className="bg-primary text-black border-none text-[8px] font-black uppercase mb-2 px-2 py-0.5 rounded-full">Kineos Global Dashboard</Badge>
                      <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none flex items-baseline gap-2">
                        {selectedSlot?.time} <span className="text-primary text-sm not-italic font-bold tracking-normal opacity-50">/{selectedSlot?.dia && weekDayLabels[selectedSlot.dia]}</span>
                      </h2>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                         <Calendar className="h-3 w-3" /> {selectedSlot?.dia && weekDates[selectedSlot.dia].toLocaleDateString("pt-BR", { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                   </div>
                   <button 
                     onClick={() => setDetailsOpen(false)}
                     className="h-10 w-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors"
                   >
                      <X className="h-5 w-5 text-white" />
                   </button>
                </div>
             </div>

             <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {selectedSlot?.items.map((slotItem, i) => {
                  const item = allTurmas.find((t: any) => t.id === slotItem.id) || slotItem;
                  return (
                    <Card key={i} className="border-none shadow-sm rounded-3xl overflow-hidden bg-white ring-1 ring-slate-100">
                      <div className="p-5 space-y-5">
                        {/* Class Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-xl shadow-inner" style={{ backgroundColor: `${item.modalities?.cor}20` || "#6B9B7A20" }}>
                              {item.modalities?.emoji || "🧘"}
                            </div>
                            <div>
                               <h4 className="font-black text-slate-900 uppercase tracking-tighter italic text-base leading-none">{item.nome}</h4>
                               <div className="flex items-center gap-2 mt-1">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.modalities?.nome}</p>
                                  <Button 
                                    variant="ghost" size="icon" className="h-4 w-4 rounded-md text-primary hover:bg-primary/10"
                                    onClick={() => navigate(`/admin/classes?search=${item.nome}`)}
                                    title="Gestão direta desta turma"
                                  >
                                     <ArrowUpRight className="h-3 w-3" />
                                  </Button>
                               </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-black uppercase text-slate-900 border-2 border-slate-100 bg-slate-50 px-3 py-1 rounded-xl">
                            {inscricoesCounts[item.id] || 0} / {item.limite_vagas} VAGAS
                          </Badge>
                        </div>

                        {/* Instructor Row */}
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 group">
                           <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-slate-200 flex items-center justify-center">
                                 <UserCog className="h-5 w-5 text-slate-500" />
                              </div>
                              <div>
                                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Responsável</p>
                                 <p className="text-[11px] font-black text-slate-800 uppercase italic tracking-tight">
                                   {profiles.find((p: any) => p.user_id === item.instrutor_id)?.nome || "Sem instrutor"}
                                 </p>
                              </div>
                           </div>
                           <Button 
                             variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-slate-400 hover:text-primary hover:bg-white"
                             onClick={() => { setSelectedTurmaId(item.id); setInstrutorDialogOpen(true); }}
                           >
                             <Edit className="h-3.5 w-3.5" />
                           </Button>
                        </div>

                        {/* Participants List */}
                        <div className="space-y-3">
                           <div className="flex justify-between items-center">
                              <h5 className="text-[9px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <Users className="h-3 w-3 text-primary" /> Participantes Confimados
                              </h5>
                           </div>

                           {loadingParticipants ? (
                              <div className="flex items-center gap-2 py-4 text-slate-400 italic text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Sincronizando...</div>
                           ) : participants.length === 0 ? (
                              <div className="py-10 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                                 <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm"><Users className="h-5 w-5 text-slate-200" /></div>
                                 <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Nenhum aluno nesta aula ainda</p>
                              </div>
                           ) : (
                              <div className="grid gap-2">
                                 {participants.map((p: any, idx) => {
                                    return (
                                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-100 group hover:border-primary/30 hover:shadow-md transition-all">
                                         <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-xl flex items-center justify-center bg-slate-100 text-slate-400">
                                               <UserCheck className="h-4 w-4" />
                                            </div>
                                            <div>
                                               <p className="font-black text-slate-900 uppercase tracking-tighter italic text-[11px] leading-none">{p.name || "Sem Nome"}</p>
                                               <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-1 flex items-center gap-1.5 line-clamp-1">
                                                  {p.type === "matriculado" ? "Fixo" : p.type === "espera" ? "Em Espera" : "Avulso"}
                                                  {p.pago === false && <span className="h-1 w-1 rounded-full bg-red-400" />}
                                               </p>
                                            </div>
                                         </div>
                                         <div className="flex items-center gap-2">
                                            {(p.type === "agendamento" || p.type === "avulso") && (
                                               <CancelButton 
                                                 bookingId={p.id}
                                                 dateStr={selectedSlot?.dia ? weekDates[selectedSlot.dia].toISOString().split("T")[0] : ""}
                                                 timeStr={selectedSlot?.time}
                                                 onSuccess={() => queryClient.invalidateQueries({ queryKey: ["participants"] })}
                                                 variant="ghost"
                                                 size="icon"
                                                 className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl"
                                                 label=""
                                               />
                                            )}
                                            {p.type === "matriculado" && (
                                               <Button
                                                 variant="ghost"
                                                 size="icon"
                                                 className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl"
                                                 onClick={() => {
                                                   setEnrollmentToRemove({ 
                                                     studentId: p.student_id, 
                                                     studentName: p.name, 
                                                     classId: item.id 
                                                   });
                                                   setUnenrollModalOpen(true);
                                                 }}
                                                 title="Remover Matrícula (Desativar)"
                                               >
                                                 <UserMinus className="h-4 w-4" />
                                               </Button>
                                             )}
                                             {p.type === "espera" && (
                                                 <div className="flex items-center gap-1">
                                                     <Button
                                                         variant="ghost"
                                                         size="icon"
                                                         className="h-8 w-8 text-emerald-500 hover:bg-emerald-50 rounded-xl"
                                                         onClick={() => promoteFromWaitlistMutation.mutate({ studentId: p.student_id, classId: item.id, waitlistId: p.id })}
                                                         disabled={promoteFromWaitlistMutation.isPending}
                                                         title="Promover para Matrícula"
                                                     >
                                                         <UserPlus className="h-4 w-4" />
                                                     </Button>
                                                     <Button
                                                         variant="ghost"
                                                         size="icon"
                                                         className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl"
                                                         onClick={() => removeFromWaitlistMutation.mutate(p.id)}
                                                         disabled={removeFromWaitlistMutation.isPending}
                                                         title="Remover da Fila"
                                                     >
                                                         <Trash2 className="h-3.5 w-3.5" />
                                                     </Button>
                                                 </div>
                                             )}
                                         </div>
                                      </div>
                                    );
                                 })}
                              </div>
                           )}
                        </div>

                        {/* Quick Enroll Area */}
                        <div className="pt-2 border-t border-slate-50">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <UserPlus className="h-3.5 w-3.5 text-primary" /> Matrícula Rápida na Turma
                            </p>
                            <QuickStudentSearch 
                              studioId={studioId} 
                              onSelect={(s) => enrollStudentMutation.mutate({ studentId: s.id, classId: item.id })}
                              placeholder="Pesquise para matricular instantaneamente..."
                              excludeIds={participants.map((p: any) => p.id)}
                            />
                        </div>
                      </div>
                    </Card>
                  );
                })}
             </div>

             <div className="p-6 bg-white border-t border-slate-100 flex gap-3">
                <Button variant="outline" className="flex-1 rounded-2xl h-12 font-black uppercase tracking-widest text-[10px] italic border-slate-200 text-slate-500 hover:bg-slate-50" onClick={() => setDetailsOpen(false)}>
                   Fechar Cockpit
                </Button>
                <Button 
                  className="flex-[2] rounded-2xl h-12 font-black uppercase tracking-widest text-xs gap-2 bg-slate-950 hover:bg-emerald-600 text-white transition-all shadow-xl shadow-slate-200"
                  onClick={() => navigate('/admin/classes')}
                >
                  <GraduationCap className="h-5 w-5 text-primary" /> Gestão Completa de Turma
                </Button>
             </div>
          </DialogContent>
        </Dialog>

        <Dialog open={instrutorDialogOpen} onOpenChange={setInstrutorDialogOpen}>
          <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl">
            <DialogHeader><DialogTitle>{selectedTurma?.nome} — Instrutor</DialogTitle></DialogHeader>
            {selectedTurma && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Instrutor Vinculado</Label>
                  <Select
                    value={selectedTurma.instrutor_id || "none"}
                    onValueChange={(v) => updateInstrutorMutation.mutate({ 
                      turmaId: selectedTurma.id, 
                      instrutorId: v === "none" ? null : v,
                      type: selectedTurma._source || 'regular'
                    })}
                  >
                    <SelectTrigger><SelectValue placeholder="Sem instrutor" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem instrutor</SelectItem>
                      {profiles.map((p: any) => (
                        <SelectItem key={p.user_id} value={p.user_id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        <ConfirmBloqueioDialog />
        
        {enrollmentToRemove && (
          <UnenrollmentModal
            open={unenrollModalOpen}
            onOpenChange={setUnenrollModalOpen}
            studentName={enrollmentToRemove.studentName}
            isPending={unenrollMutation.isPending}
            onConfirm={(data) => {
              unenrollMutation.mutate({
                studentId: enrollmentToRemove.studentId,
                classId: enrollmentToRemove.classId,
                type: data.type,
                cancelInvoices: data.cancelInvoices
              });
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}
