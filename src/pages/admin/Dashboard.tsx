import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Users,
  Cake,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Activity,
  Clock,
  Target,
  AlertTriangle,
  MessageCircle,
  Phone,
  ExternalLink,
  UserPlus,
  CalendarPlus,
  Receipt,
  ClipboardList,
  ShoppingBag,
  GripVertical,
  RotateCcw,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminLayout from "@/components/layouts/AdminLayout";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Types ─────────────────────────────────────────────────
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
interface AlunoEmRisco {
  id: string;
  nome: string;
  telefone: string | null;
  ultima_presenca: string | null;
  dias_ausente: number;
}

interface MensalidadeVencida {
  id: string;
  student_id: string;
  aluno_nome: string;
  aluno_telefone: string | null;
  valor: number;
  vencimento: string;
  dias_atraso: number;
}

interface AulaProxima {
  turma_nome: string;
  horario: string;
  alunos: { nome: string; telefone: string | null }[];
}

interface DREStats {
  month: string;
  faturamento_bruto: number;
}

function gerarLinkWhatsApp(telefone: string, mensagem: string): string {
  const num = telefone.replace(/\D/g, "");
  const tel = num.startsWith("55") ? num : `55${num}`;
  return `https://wa.me/${tel}?text=${encodeURIComponent(mensagem)}`;
}

const birthdays: any[] = [];
const topInstructors: any[] = [];
const recentPayments: any[] = [];
const todayClasses: any[] = [];

// ─── Sortable Section Wrapper ──────────────────────────────
const STORAGE_KEY = "dashboard-section-order";
const DEFAULT_ORDER = [
  "risk-notifications",
  "metrics",
  "sales",
  "charts",
  "quick-actions",
  "bottom-row",
];

const SECTION_LABELS: Record<string, string> = {
  "quick-actions": "Ações Rápidas",
  metrics: "Movimentação Financeira",
  charts: "Gráficos",
  "bottom-row": "Aulas / Pagamentos / Instrutores",
  "risk-notifications": "Risco & Inadimplência",
  sales: "Vendas do Mês",
};

function SortableSection({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity bg-muted border border-border rounded-md p-1 cursor-grab active:cursor-grabbing shadow-sm"
        title="Arraste para reorganizar"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className={cn("transition-shadow rounded-xl", isDragging && "ring-2 ring-primary/40 shadow-xl")}>
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { studioId, user } = useAuth() as any;
  const { prefs: userPrefs, updatePref } = useUserPreferences();
  const [studioSlug, setStudioSlug] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStudioSlug = useCallback(async () => {
    if (!studioId) return;
    const { data } = await supabase.from("studios").select("slug").eq("id", studioId).single();
    if (data) setStudioSlug(data.slug);
  }, [studioId]);

  useEffect(() => {
    fetchStudioSlug();
  }, [fetchStudioSlug]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // NUCLEAR REFRESH: Invalida absolutamente tudo sob o prefixo 'admin'
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      // Também forçamos o refetch imediato das queries ativas para feedback visual instantâneo
      await queryClient.refetchQueries({ queryKey: ["admin"], type: 'active' });
      
      toast.success("Dados sincronizados!", { 
        description: "O cache foi limpo e as informações foram atualizadas do servidor (Double-Check ativo)." 
      });
    } catch (error) {
      toast.error("Erro ao sincronizar dados.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // 0. Vendas do Mês (Enhanced useQuery)
  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ["admin", "dashboard", "vendas-mes", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const now = new Date();
      const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      // 1. Invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select("final_value")
        .eq("studio_id", studioId)
        .gte("due_date", inicioMes)
        .lte("due_date", fimMes);

      // 2. Financial Records (Legado)
      const { data: records } = await supabase
        .from("financial_records")
        .select("valor")
        .eq("studio_id", studioId)
        .gte("vencimento", inicioMes)
        .lte("vencimento", fimMes);

      // 3. Transactions (Realizado)
      const { data: transactions } = await supabase
        .from("financial_transactions")
        .select("amount")
        .eq("studio_id", studioId)
        .eq("type", "income")
        .eq("status", "pago")
        .gte("date", inicioMes)
        .lte("date", fimMes);

      const totalFaturado = 
        (invoices || []).reduce((s, r) => s + Number(r.final_value), 0) +
        (records || []).reduce((s, r) => s + Number(r.valor), 0);
      
      const totalRecebido = (transactions || []).reduce((s, r) => s + Number(r.amount), 0);
      const qtdVendas = (invoices || []).length + (records || []).length;

      return {
        totalFaturado,
        totalRecebido,
        qtdVendas,
        totalAReceber: totalFaturado - totalRecebido
      };
    }
  });

  const vendasMes = salesData || { totalFaturado: 0, totalRecebido: 0, qtdVendas: 0, totalAReceber: 0 };

  // 1. Alunos em Risco (Convertido p/ useQuery)
  const { data: alunosRisco = [], isLoading: loadingRisco } = useQuery({
    queryKey: ["admin", "dashboard", "alunos-risco", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data: alunos } = await supabase
        .from("students")
        .select("id, nome, telefone")
        .eq("studio_id", studioId)
        .eq("status", "ativo");

      if (!alunos?.length) return [];

      const { data: presencas } = await supabase
        .from("presences")
        .select("student_id, data")
        .eq("studio_id", studioId)
        .eq("presente", true)
        .order("data", { ascending: false });

      const ultimaPresenca: Record<string, string> = {};
      presencas?.forEach((p: any) => {
        if (!ultimaPresenca[p.student_id]) {
          ultimaPresenca[p.student_id] = p.data;
        }
      });

      const hoje = new Date();
      return alunos
        .map((a) => {
          const ultima = ultimaPresenca[a.id];
          const dias = ultima
            ? Math.floor((hoje.getTime() - new Date(ultima).getTime()) / 86400000)
            : 999;
          return { id: a.id, nome: a.nome, telefone: a.telefone, ultima_presenca: ultima || null, dias_ausente: dias };
        })
        .filter((a) => a.dias_ausente >= 15)
        .sort((a, b) => b.dias_ausente - a.dias_ausente);
    }
  });

  // 2. Mensalidades Vencidas (Convertido p/ useQuery)
  const { data: mensalidadesVencidas = [], isLoading: loadingVencidos } = useQuery({
    queryKey: ["admin", "dashboard", "vencidos", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const hojeDate = new Date();
      const hoje = hojeDate.toISOString().split("T")[0];
      
      const { data: records } = await supabase
        .from("financial_records")
        .select("id, student_id, valor, vencimento, students(nome, telefone)")
        .eq("studio_id", studioId)
        .in("status", ["pendente", "atrasado"])
        .lte("vencimento", hoje)
        .order("vencimento", { ascending: true })
        .limit(20);

      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, student_id, final_value, due_date, students(nome, telefone)")
        .eq("studio_id", studioId)
        .eq("status", "pendente")
        .lte("due_date", hoje)
        .order("due_date", { ascending: true })
        .limit(20);

      const vRecords = (records || []).map((m: any) => ({
          id: m.id,
          student_id: m.student_id,
          aluno_nome: m.students?.nome || "—",
          aluno_telefone: m.students?.telefone || null,
          valor: m.valor,
          vencimento: m.vencimento,
          dias_atraso: Math.floor((hojeDate.getTime() - new Date(m.vencimento + "T12:00:00").getTime()) / 86400000),
      }));

      const vInvoices = (invoices || []).map((m: any) => ({
          id: m.id,
          student_id: m.student_id,
          aluno_nome: m.students?.nome || "—",
          aluno_telefone: m.students?.telefone || null,
          valor: m.final_value,
          vencimento: m.due_date,
          dias_atraso: Math.floor((hojeDate.getTime() - new Date(m.due_date + "T12:00:00").getTime()) / 86400000),
      }));

      return [...vRecords, ...vInvoices]
        .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime())
        .slice(0, 20);
    }
  });

  // 3. Aulas Próximas (Convertido p/ useQuery)
  const { data: aulasProximas = [], isLoading: loadingAulas } = useQuery({
    queryKey: ["admin", "dashboard", "aulas-proximas", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const agora = new Date();
      const doisHoras = new Date(agora.getTime() + 2 * 60 * 60 * 1000);
      const horaAtual = agora.toTimeString().slice(0, 5);
      const horaLimite = doisHoras.toTimeString().slice(0, 5);
      const diasMap: Record<number, string> = { 0: "dom", 1: "seg", 2: "ter", 3: "qua", 4: "qui", 5: "sex", 6: "sab" };
      const diaHoje = diasMap[agora.getDay()];

      const { data: turmas } = await supabase
        .from("classes")
        .select("id, nome, horario, dias_semana")
        .eq("studio_id", studioId)
        .eq("ativa", true)
        .gte("horario", horaAtual)
        .lte("horario", horaLimite);

      const turmasHoje = (turmas || []).filter((t: any) => (t.dias_semana as string[]).includes(diaHoje));
      const aulas = [];

      for (const turma of turmasHoje) {
        const { data: inscricoes } = await supabase
          .from("enrollments")
          .select("student_id, students(nome, telefone)")
          .eq("studio_id", studioId)
          .eq("class_id", turma.id)
          .eq("ativa", true);

        aulas.push({
          turma_nome: turma.nome,
          horario: (turma.horario as string).slice(0, 5),
          alunos: (inscricoes || []).map((i: any) => ({
            nome: i.students?.nome || "—",
            telefone: i.students?.telefone || null,
          })),
        });
      }
      return aulas;
    }
  });

  // 0. Weekly Attendance (Heatmap)
  const { data: weeklyAttendance = [], isLoading: loadingAttendance } = useQuery({
    queryKey: ["admin", "dashboard", "weekly-attendance", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dataInicio = sevenDaysAgo.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("presences")
        .select(`
          data,
          classes (
            nome,
            modalities (
              nome
            )
          )
        `)
        .eq("studio_id", studioId)
        .eq("presente", true)
        .gte("data", dataInicio);

      if (error) throw error;

      // Group by day and modality
      const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const chartData: Record<string, any>[] = [];

      // Last 7 days map
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = format(d, 'yyyy-MM-dd');
        const dayName = days[d.getDay()];
        chartData.push({ day: dayName, date: dateStr, total: 0 });
      }

      data?.forEach((p: any) => {
        const modality = p.classes?.modalities?.nome || "Outros";
        const entry = chartData.find(d => d.date === p.data);
        if (entry) {
          entry[modality] = (entry[modality] || 0) + 1;
        }
      });

      return chartData;
    }
  });

  // 1. DRE Data Fetching (Chart & MRR)
  const { data: dreStats = [] } = useQuery<DREStats[]>({
    queryKey: ["admin", "dashboard", "dre", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_financial_dre")
        .select("*")
        .eq("studio_id", studioId)
        .order("month", { ascending: true })
        .limit(12);
      if (error) throw error;
      return (data || []) as DREStats[];
    }
  });

  // 2. Active Students Count
  const { data: studentCount = 0 } = useQuery<number>({
    queryKey: ["dashboard-students-count", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("studio_id", studioId)
        .eq("status", "ativo");
      if (error) throw error;
      return count || 0;
    }
  });

  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_ORDER);

  // 3. Classes and Occupancy (Simplified for Dashboard)
  const { data: dashboardClasses = [] } = useQuery({
    queryKey: ["dashboard-today-classes", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const today = format(new Date(), "eee", { locale: ptBR }).toLowerCase().substring(0, 3);
      const { data, error } = await supabase
        .from("classes")
        .select("*, modalities(nome)")
        .eq("studio_id", studioId)
        .eq("ativa", true)
        .contains("dias_semana", [today]);
      if (error) throw error;
      return data || [];
    }
  });

  const revenueData = useMemo(() => {
    return dreStats.map(d => ({
      month: format(new Date(d.month + "T00:00:00"), "MMM", { locale: ptBR }),
      value: d.faturamento_bruto
    }));
  }, [dreStats]);

  const currentMRR = dreStats[dreStats.length - 1]?.faturamento_bruto || 0;
  const previousMRR = dreStats[dreStats.length - 2]?.faturamento_bruto || 0;
  const mrrChange = previousMRR > 0 ? ((currentMRR - previousMRR) / previousMRR) * 100 : 0;

  // 4. Recent Transactions
  const { data: recentTx = [] } = useQuery({
    queryKey: ["dashboard-recent-tx", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*, students(nome)")
        .eq("studio_id", studioId)
        .order("date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    }
  });

  const recentPayments = useMemo(() => {
    return recentTx.map(t => ({
      name: (t.students as any)?.nome || "—",
      plan: t.type === 'income' ? 'Receita' : 'Despesa',
      amount: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount),
      status: t.status === 'pago' ? "Pago" : "Pendente",
      avatar: (t.students as any)?.nome?.substring(0, 2).toUpperCase() || "TX"
    }));
  }, [recentTx]);

  const dashboardMetrics = [
    {
      title: "Total Faturado",
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vendasMes.totalFaturado),
      change: `Est. Líquido: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vendasMes.totalFaturado * 0.965)}`,
      trend: "up" as const,
      icon: DollarSign,
      description: "Tudo que foi faturado este mês",
      color: "bg-emerald-500",
      iconColor: "text-emerald-500",
    },
    {
      title: "Realizado (Caixa)",
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vendasMes.totalRecebido),
      change: `${vendasMes.totalFaturado > 0 ? ((vendasMes.totalRecebido / vendasMes.totalFaturado) * 100).toFixed(0) : 0}% Pago`,
      trend: "up" as const,
      icon: TrendingUp,
      description: "Total efetivamente recebido",
      color: "bg-primary",
      iconColor: "text-primary",
    },
    {
      title: "Alunos Ativos",
      value: String(studentCount),
      change: "Atualizado",
      trend: "up" as const,
      icon: Users,
      description: "base total de alunos",
      color: "bg-sky-500",
      iconColor: "text-sky-500",
    },
    {
      title: "Saldo Previsto",
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vendasMes.totalFaturado - 0), // Simplificado
      change: "Projeção",
      trend: "up" as const,
      icon: Target,
      description: "Total esperado no mês",
      color: "bg-rose-500",
      iconColor: "text-rose-500",
    },
  ];

  // Load saved order from user_preferences on mount
  useEffect(() => {
    if (userPrefs?.dashboard_section_order) {
      const parsed = userPrefs.dashboard_section_order as string[];
      const valid = parsed.filter((id) => DEFAULT_ORDER.includes(id));
      const missing = DEFAULT_ORDER.filter((id) => !valid.includes(id));
      setSectionOrder([...valid, ...missing]);
    }
  }, [userPrefs]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSectionOrder((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        const newOrder = arrayMove(prev, oldIndex, newIndex);
        updatePref("dashboard_section_order", newOrder);
        return newOrder;
      });
    }
  }, [updatePref]);

  const resetOrder = useCallback(() => {
    setSectionOrder(DEFAULT_ORDER);
    updatePref("dashboard_section_order", DEFAULT_ORDER);
    toast.success("Layout resetado", { description: "O dashboard voltou à ordem padrão." });
  }, [updatePref]);

  useEffect(() => {
    if (studioId) {
      fetchStudioSlug();
    }
  }, [studioId, fetchStudioSlug]);

  // ─── Section renderers ────────────────────────────────────
  const sections: Record<string, React.ReactNode> = {
    "quick-actions": (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Matricular Aluno", icon: UserPlus, path: "/admin/students", color: "bg-primary", textColor: "text-white" },
              { label: "Grade Horária", icon: CalendarPlus, path: "/admin/schedule", color: "bg-slate-900", textColor: "text-white" },
              { label: "Fluxo de Caixa", icon: Receipt, path: "/admin/financial", color: "bg-white", textColor: "text-slate-900" },
              { label: "Vendas Loja", icon: ShoppingBag, path: "/admin/inventory", color: "bg-white", textColor: "text-slate-900" },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 border-none shadow-xl shadow-slate-200/20 rounded-[2rem] p-6 transition-all active:scale-[0.95] group h-full ring-1 ring-slate-100/50",
                  action.color === "bg-white" ? "bg-white hover:bg-slate-50" : action.color + " hover:brightness-125 hover:shadow-2xl hover:shadow-primary/20",
                  action.textColor
                )}
              >
                <div className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-sm",
                  action.color === "bg-white" ? "bg-slate-100" : "bg-white/10"
                )}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.1em]">{action.label}</span>
              </button>
            ))}
        </div>

        <Card className="border-none shadow-sm rounded-xl bg-slate-900 text-white p-4 ring-1 ring-slate-800 flex flex-col justify-between">
            <div>
               <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1">Vendas Online</p>
               <h3 className="text-xs font-black uppercase tracking-tight text-white mb-3">Link de Agendamento</h3>
            </div>
            <div className="space-y-3">
               <div className="bg-white/5 rounded-lg p-2 flex items-center justify-between border border-white/10">
                  <span className="text-[8px] font-mono text-slate-400 truncate max-w-[120px]">.../agendar?org={studioSlug}</span>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 text-white hover:bg-white/10"
                    onClick={() => {
                      const link = `${window.location.origin}/agendar?org=${studioSlug}`;
                      navigator.clipboard.writeText(link);
                      toast.success("Link copiado!", { description: "Compartilhe com seus clientes." });
                    }}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
               </div>
            </div>
        </Card>
      </div>
    ),

    metrics: (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardMetrics.map((metric) => (
          <Card key={metric.title} className="group border-none shadow-xl shadow-slate-200/40 rounded-[2rem] bg-white overflow-hidden ring-1 ring-slate-100/50 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
             <CardContent className="p-7">
                <div className="flex justify-between items-start mb-8">
                   <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-3", metric.color)}>
                      <metric.icon className="h-6 w-6 text-white" />
                   </div>
                   <Badge variant="outline" className={cn("border-none text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full", metric.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
                      {metric.change}
                   </Badge>
                </div>
                <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">{metric.title}</p>
                   <h3 className="text-3xl font-black tracking-tight text-slate-900 leading-none">{metric.value}</h3>
                   <div className="flex items-center gap-2 pt-5">
                      <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", metric.color)} />
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{metric.description}</p>
                   </div>
                </div>
             </CardContent>
          </Card>
        ))}
      </div>
    ),

    charts: (
      <div className="grid gap-8 lg:grid-cols-12">
        <Card className="lg:col-span-8 border-none shadow-sm rounded-xl bg-white overflow-hidden ring-1 ring-slate-100">
          <CardHeader className="p-6 pb-0 flex flex-row items-center justify-between">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-primary mb-1">Revenue Analytics</p>
              <CardTitle className="text-lg font-bold uppercase tracking-tight text-slate-900 leading-none">Desempenho Financeiro</CardTitle>
            </div>
            <div className="h-9 w-9 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm">
               <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100" />
                <XAxis 
                   dataKey="month" 
                   tick={{ fontSize: 9, fontWeight: 700, fill: "#94a3b8" }} 
                   axisLine={false}
                   tickLine={false}
                   dy={10}
                />
                 <YAxis 
                    tick={{ fontSize: 9, fontWeight: 700, fill: "#94a3b8" }} 
                    axisLine={false}
                    tickLine={false}
                    width={50}
                    tickFormatter={(v) => {
                      if (v >= 1000) return `R$ ${Math.round(v / 1000)}k`;
                      return `R$ ${v}`;
                    }}
                 />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "12px",
                    padding: "12px",
                    fontSize: "9px",
                    fontWeight: "700",
                    color: "#fff",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    textTransform: "uppercase",
                  }}
                  itemStyle={{ color: "#fff" }}
                  cursor={{ stroke: '#f8fafc', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  fill="url(#revenueGradient)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-none shadow-xl shadow-slate-200/30 rounded-[2.5rem] bg-white overflow-hidden ring-1 ring-slate-100 group">
          <CardHeader className="p-8 pb-0 flex flex-row items-center justify-between relative z-10">
            <div>
               <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/80 mb-2">Student Engagement</p>
               <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900 leading-tight">Heatmap de Presença</CardTitle>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-inner">
               <Activity className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="p-8 relative z-10">
            {loadingAttendance ? (
               <div className="h-[260px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
               </div>
            ) : (
               <ResponsiveContainer width="100%" height={260}>
                 <BarChart data={weeklyAttendance} barGap={6}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                    <XAxis 
                       dataKey="day" 
                       tick={{ fontSize: 10, fontWeight: 900, fill: "#94a3b8" }} 
                       axisLine={false}
                       tickLine={false}
                       dy={10}
                    />
                    <YAxis hide />
                   <Tooltip
                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      contentStyle={{
                         backgroundColor: "#fff",
                         border: "none",
                         borderRadius: "16px",
                         padding: "16px",
                         fontSize: "10px",
                         fontWeight: "900",
                         color: "#0f172a",
                         boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                         textTransform: "uppercase",
                         letterSpacing: "0.05em"
                      }}
                      itemStyle={{ color: "hsl(var(--primary))", padding: "2px 0" }}
                   />
                   {/* Dynamically extract modalities for multiple bars if they exist */}
                   {Object.keys((weeklyAttendance[0] || {})).filter(k => k !== 'day' && k !== 'date').map((mod, idx) => (
                     <Bar 
                        key={mod} 
                        dataKey={mod} 
                        name={mod} 
                        fill={idx === 0 ? "hsl(var(--primary))" : idx === 1 ? "#38bdf8" : "#818cf8"} 
                        radius={[6, 6, 0, 0]} 
                        animationDuration={1000 + (idx * 500)}
                     />
                   ))}
                   {/* Default bar if no data categorized yet */}
                   {Object.keys((weeklyAttendance[0] || {})).filter(k => k !== 'day' && k !== 'date').length === 0 && (
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                   )}
                 </BarChart>
               </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    ),

    "bottom-row": (
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-4 border-none shadow-sm rounded-xl bg-white overflow-hidden ring-1 ring-slate-100 group">
          <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
            <div>
               <p className="text-[8px] font-bold uppercase tracking-widest text-primary mb-1">Schedule Control</p>
               <CardTitle className="text-base font-bold uppercase tracking-tight text-slate-900 leading-none">Aulas de Hoje</CardTitle>
            </div>
            <Badge variant="secondary" className="bg-slate-50 text-slate-400 border-none font-bold text-[9px] uppercase px-2 py-0.5 rounded-full">{todayClasses.length}</Badge>
          </CardHeader>
          <CardContent className="p-6 pt-2 space-y-3">
            <div className="space-y-2">
              {dashboardClasses.map((cls, i) => {
                const occupancy = (1 / 6) * 100; // Mock occupancy for now
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-50 bg-slate-50/30 hover:bg-white hover:shadow-md hover:border-primary/10 transition-all duration-300 group/item cursor-pointer"
                  >
                    <div className={cn(
                      "w-1 h-10 rounded-full",
                      cls.modality === "pilates" ? "bg-primary" : "bg-sky-500"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-bold uppercase tracking-tight text-slate-800 truncate">{cls.nome}</p>
                        <span className="text-[10px] font-bold text-primary ml-2">{(cls.horario as string).slice(0, 5)}</span>
                      </div>
                      <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest leading-none mb-2">{cls.modalities?.nome || '—'}</p>
                      <div className="flex items-center gap-2">
                        <Progress value={occupancy} className="h-1.5 flex-1 bg-slate-200" />
                        <span className="text-[9px] font-bold text-slate-500">1/6</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button variant="ghost" className="w-full h-10 rounded-lg text-[9px] font-bold uppercase tracking-widest text-primary hover:bg-primary/5 gap-2 transition-all">
               Ver Grade Completa <ArrowUpRight className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-none shadow-sm rounded-xl bg-white overflow-hidden ring-1 ring-slate-100">
          <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
            <div>
               <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-500 mb-1">Revenue Stream</p>
               <CardTitle className="text-base font-bold uppercase tracking-tight text-slate-900 leading-none">Faturas Recentes</CardTitle>
            </div>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100">
               <Receipt className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="space-y-4">
              {recentPayments.map((payment, i) => (
                <div key={i} className="flex items-center gap-3 group/pay">
                  <div className="h-9 w-9 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 group-hover/pay:bg-primary/10 group-hover/pay:border-primary/20 transition-all">
                    <span className="text-[10px] font-bold text-slate-400 group-hover/pay:text-primary">{payment.avatar}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-tight text-slate-800 truncate leading-none mb-0.5">{payment.name}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">{payment.plan}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-900 leading-none mb-1">{payment.amount}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                         "text-[7px] font-bold uppercase px-1.5 py-0 border-none",
                         payment.status === "Pago" ? "bg-emerald-50 text-emerald-600" : payment.status === "Atrasado" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-slate-950 rounded-xl text-white shadow-md group hover:bg-black transition-all">
               <div className="flex justify-between items-center mb-3">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Volume Projetado</p>
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
               </div>
               <div className="flex items-baseline gap-2">
                  <h4 className="text-2xl font-bold tracking-tight leading-none">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vendasMes.totalFaturado)}
                  </h4>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Este Período</p>
               </div>
               <p className="text-[8px] font-medium text-slate-500 mt-1.5 px-0.5 uppercase tracking-widest">
                 {vendasMes.totalFaturado > 0 ? (vendasMes.totalRecebido / vendasMes.totalFaturado * 100).toFixed(0) : 0}% Recebido · {(vendasMes.totalFaturado * 0.965).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} Líq. Est.
               </p>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-sm rounded-xl bg-white overflow-hidden ring-1 ring-slate-100">
            <CardHeader className="p-6 pb-2">
               <p className="text-[8px] font-bold uppercase tracking-widest text-primary mb-1">Human Capital</p>
               <CardTitle className="text-base font-bold uppercase tracking-tight text-slate-900 leading-none">Top Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-2 space-y-4">
              {topInstructors.map((inst, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                    <span className="text-[9px] font-bold text-primary">{i + 1}º</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-tight text-slate-800 leading-none mb-0.5">{inst.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{inst.classes} aulas · ⭐ {inst.rating}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-primary">{inst.occupancy}%</span>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Ocupação</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-xl bg-orange-500 text-white overflow-hidden relative group font-bold">
             <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <Cake className="h-24 w-24" />
             </div>
             <CardHeader className="p-6 pb-2">
                <p className="text-[8px] font-bold uppercase tracking-widest text-white/60 mb-1">Social Events</p>
                <CardTitle className="text-base font-bold uppercase tracking-tight text-white leading-none">Aniversariantes</CardTitle>
             </CardHeader>
             <CardContent className="p-6 pt-2 space-y-3">
              {birthdays.map((b, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/10 hover:bg-white/20 transition-all">
                  <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                    <span className="text-base">🎂</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-tight leading-none mb-0.5">{b.name}</p>
                    <p className="text-[8px] font-bold text-white/60 uppercase tracking-widest leading-none">{b.date} · {b.plan}</p>
                  </div>
                </div>
              ))}
              {birthdays.length === 0 && (
                <p className="text-[10px] text-white/40 text-center py-4 uppercase font-bold tracking-widest">Nenhum aniversariante hoje</p>
              )}
             </CardContent>
          </Card>
        </div>
      </div>
    ),

    "risk-notifications": (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-sm rounded-xl bg-white overflow-hidden ring-1 ring-slate-100">
          <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
            <div>
               <p className="text-[8px] font-bold uppercase tracking-widest text-amber-500 mb-1">Credit Operations</p>
               <CardTitle className="text-base font-bold uppercase tracking-tight text-slate-900 leading-none">Vencidos agora</CardTitle>
            </div>
            <Badge className="bg-amber-50 text-amber-600 border-none font-bold text-[9px] uppercase px-2 py-0.5 rounded-full">
               {mensalidadesVencidas.length} Pessoas
            </Badge>
          </CardHeader>
          <CardContent className="p-6 pt-2">
             <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                {mensalidadesVencidas.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tight text-center">Inadimplência Zero</p>
                  </div>
                ) : (
                  mensalidadesVencidas.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-50 bg-slate-50/30 hover:bg-white hover:shadow-md transition-all">
                       <div className="h-9 w-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <DollarSign className="h-4 w-4" />
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold uppercase tracking-tight text-slate-800 truncate leading-none mb-1">{m.aluno_nome}</p>
                          <div className="flex items-center gap-2">
                             <span className="text-[9px] font-bold text-rose-500">Vencido há {m.dias_atraso}d</span>
                             <span className="h-1 w-1 rounded-full bg-slate-200" />
                             <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.valor)}</span>
                          </div>
                       </div>
                       <div className="flex gap-1.5">
                         {m.aluno_telefone && (
                           <a
                             href={gerarLinkWhatsApp(
                               m.aluno_telefone,
                               `Olá ${m.aluno_nome}! 😊 Vimos aqui que sua mensalidade de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.valor)} (vencimento ${new Date(m.vencimento + "T12:00:00").toLocaleDateString('pt-BR')}) ainda está pendente. Podemos te ajudar com o link de pagamento?`
                             )}
                             target="_blank"
                             rel="noopener noreferrer"
                           >
                             <Button variant="ghost" size="icon" className="h-8 w-8 border border-slate-100 rounded-lg text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all" title="Enviar cobrança via WhatsApp">
                                <Phone className="h-3.5 w-3.5" />
                             </Button>
                           </a>
                         )}
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="h-8 w-8 border border-slate-100 rounded-lg hover:bg-slate-900 hover:text-white transition-all"
                           onClick={() => navigate(`/admin/students?student_id=${m.student_id}`)}
                           title="Ver financeiro do aluno"
                         >
                            <Receipt className="h-3.5 w-3.5" />
                         </Button>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/30 rounded-[2.5rem] bg-white overflow-hidden ring-1 ring-slate-100/50 group">
          <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-inner">
                  <AlertTriangle className="h-5 w-5" />
               </div>
               <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-500 mb-1">Retention Risk</p>
                  <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900 leading-none">Alunos em Risco</CardTitle>
               </div>
            </div>
            <Badge className="bg-rose-100 text-rose-600 border-none rounded-full px-3 py-1 font-black text-[9px] uppercase tracking-widest">{alunosRisco.length}</Badge>
          </CardHeader>
          <CardContent className="p-8 pt-2">
            {loadingRisco ? (
              <div className="flex items-center justify-center py-20 text-slate-200">
                 <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
              </div>
            ) : alunosRisco.length === 0 ? (
              <div className="text-center py-16 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
                <div className="h-14 w-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                   <p className="text-2xl">🎉</p>
                </div>
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Retenção em 100%</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-60">Frequência média estável no studio.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {alunosRisco.map((aluno) => (
                  <div key={aluno.id} className="flex items-center gap-4 p-4 rounded-[1.5rem] bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-300 group">
                    <div className="h-12 w-12 rounded-2xl bg-white text-slate-300 flex items-center justify-center shrink-0 shadow-sm group-hover:text-rose-500 transition-colors duration-500 ring-1 ring-slate-100">
                       <Users className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black uppercase tracking-tight text-slate-900 truncate mb-1">{aluno.nome}</p>
                      <div className="flex items-center gap-2">
                         <Badge className="bg-rose-500 text-white border-none text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg shadow-rose-200">CHURN</Badge>
                         <span className="text-[9px] font-black text-rose-600 uppercase tracking-tighter">
                            {aluno.dias_ausente >= 999 ? "Nenhum Registro" : `${aluno.dias_ausente} Dias Ausente`}
                         </span>
                      </div>
                    </div>
                    {aluno.telefone && (
                      <a
                        href={gerarLinkWhatsApp(
                          aluno.telefone,
                          `Olá ${aluno.nome}! 😊 Sentimos sua falta aqui no estúdio! Como você está? Que tal voltarmos com tudo essa semana? 💪`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <Button size="icon" variant="ghost" className="h-10 w-10 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-all duration-500 shadow-sm">
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    ),

    sales: (
      <Card className="border-none shadow-xl shadow-slate-200/30 rounded-[2.5rem] bg-white overflow-hidden ring-1 ring-slate-100/50 group">
        <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                <ShoppingBag className="h-5 w-5" />
             </div>
             <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/80 mb-1">Commercial Performance</p>
                <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900 leading-none">Vendas do Mês</CardTitle>
             </div>
          </div>
          <Button variant="ghost" size="sm" className="h-10 rounded-xl text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-white gap-2 transition-all px-4 border border-primary/20 shadow-sm" onClick={() => navigate("/admin/store")}>
            Acessar Loja <ArrowUpRight className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="p-8 pt-2">
          {loadingSales ? (
            <div className="flex items-center justify-center py-12 text-slate-200">
               <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-6 rounded-[1.5rem] bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-500 group/stat">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">Faturamento</p>
                <p className="text-2xl font-black tracking-tight text-primary leading-none truncate">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vendasMes.totalFaturado)}
                </p>
              </div>
              
              <div className="p-6 rounded-[1.5rem] bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-500 group/stat">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">Recebido</p>
                <p className="text-2xl font-black tracking-tight text-emerald-600 leading-none truncate">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vendasMes.totalRecebido)}
                </p>
              </div>

              <div className="p-6 rounded-[1.5rem] bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-500 group/stat">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">A Receber</p>
                <p className="text-2xl font-black tracking-tight text-rose-500 leading-none truncate">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vendasMes.totalAReceber)}
                </p>
              </div>

              <div className="p-6 rounded-[1.5rem] bg-slate-950 text-white shadow-2xl shadow-indigo-500/20 hover:bg-black transition-all duration-500 group/stat">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 leading-none">Ticket Médio</p>
                <p className="text-2xl font-black tracking-tight text-primary leading-none">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vendasMes.qtdVendas > 0 ? (vendasMes.totalFaturado / vendasMes.qtdVendas) : 0)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    ),
  };

  const isCustomOrder = JSON.stringify(sectionOrder) !== JSON.stringify(DEFAULT_ORDER);

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 uppercase text-slate-900 leading-none">
               Command Center
            </h1>
            <p className="text-slate-400 mt-1 font-bold uppercase tracking-widest text-[8px] flex items-center gap-2">
               ESTÚDIO PREMIUM <span className="h-1 w-1 rounded-full bg-slate-200" /> V7.5.2 COCKPIT
            </p>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex flex-col items-end">
                <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Data do Sistema</p>
                <p className="text-xs font-bold uppercase tracking-tight text-slate-900">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
             </div>
             <div className="h-10 w-10 rounded-xl bg-slate-950 flex items-center justify-center shadow-lg shadow-slate-200">
                <Activity className="h-5 w-5 text-primary animate-pulse" />
             </div>
             <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={cn(
                  "h-10 w-10 rounded-xl border-slate-200 bg-white hover:bg-slate-50 transition-all duration-500",
                  isRefreshing && "opacity-50"
                )}
                title="Sincronizar Dados (Zerar Cache)"
             >
                <RefreshCw className={cn("h-4 w-4 text-slate-600", isRefreshing && "animate-spin")} />
             </Button>
          </div>
        </div>

        {/* Sortable sections */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
            <div className="space-y-6">
              {sectionOrder
                .filter((id) => !(userPrefs.hidden_sections || []).includes(id))
                .map((id) => (
                <SortableSection key={id} id={id}>
                  {sections[id]}
                </SortableSection>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </AdminLayout>
  );
}
