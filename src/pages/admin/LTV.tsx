import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Clock, TrendingDown, TrendingUp, BarChart3, UserMinus, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from "recharts";

export default function LTV() {
  const { studioId } = useAuth() as any;

  const { data: students = [], isLoading: loadingStudents } = useQuery<any[]>({
    queryKey: ["students-ltv", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("studio_id", studioId)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: records = [], isLoading: loadingRecords } = useQuery<any[]>({
    queryKey: ["financial-ltv", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_records")
        .select("*")
        .eq("studio_id", studioId)
        .eq("status", "pago");
      if (error) throw error;
      return data;
    },
  });

  const { data: sales = [], isLoading: loadingSales } = useQuery<any[]>({
    queryKey: ["sales-ltv", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("studio_id", studioId);
      if (error) throw error;
      return data;
    },
  });

  const { data: bookings = [], isLoading: loadingBookings } = useQuery<any[]>({
    queryKey: ["bookings-ltv", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("student_id, data, status")
        .eq("studio_id", studioId)
        .eq("status", "concluido");
      if (error) throw error;
      return data;
    },
  });

  const ltvByStudent = useMemo(() => students.map((s) => {
    const revenueRecords = records
      .filter((r: any) => r.student_id === s.id)
      .reduce((sum: number, r: any) => sum + Number(r.valor || 0), 0);
    const revenueSales = sales
      .filter((v: any) => v.student_id === s.id)
      .reduce((sum: number, v: any) => sum + Number(v.valor_total || 0), 0);
    const total = revenueRecords + revenueSales;
    
    // Attendance logic
    const studentBookings = bookings
      .filter(b => b.student_id === s.id)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    
    const lastAttendance = studentBookings.length > 0 ? new Date(studentBookings[0].data) : null;
    const daysSinceLast = lastAttendance ? Math.floor((Date.now() - lastAttendance.getTime()) / (1000 * 60 * 60 * 24)) : 999;
    const isAtRisk = s.status === "ativo" && daysSinceLast > 15;

    const createdDate = new Date(s.created_at);
    const monthsActive = Math.max(1, Math.ceil(
      (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    ));
    return { ...s, ltv: total, monthsActive, avgMonthly: total / monthsActive, daysSinceLast, isAtRisk };
  }).sort((a: any, b: any) => b.ltv - a.ltv), [students, records, sales, bookings]);

  const monthlyChurn = useMemo(() => {
    const months: { label: string; month: number; year: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        month: d.getMonth(),
        year: d.getFullYear(),
      });
    }

    return months.map((m) => {
      const monthStart = new Date(m.year, m.month, 1);
      const monthEnd = new Date(m.year, m.month + 1, 0);

      const activeAtStart = students.filter((s) => {
        const created = new Date(s.created_at);
        return created < monthStart;
      }).length;

      const cancelled = students.filter((s) => {
        if (s.status !== "inativo" && s.status !== "suspenso") return false;
        const updated = new Date((s as any).updated_at || s.created_at);
        return updated >= monthStart && updated <= monthEnd;
      }).length;

      const churnRate = activeAtStart > 0 ? (cancelled / activeAtStart) * 100 : 0;
      return {
        mes: m.label,
        churnRate: Math.round(churnRate * 10) / 10,
        cancelled,
        activeAtStart,
      };
    });
  }, [students]);

  const monthlyRevenue = useMemo(() => {
    const months: { label: string; month: number; year: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        month: d.getMonth(),
        year: d.getFullYear(),
      });
    }

    return months.map((m) => {
      const rev = records
        .filter((r: any) => {
          if (!r.data_pagamento) return false;
          const d = new Date(r.data_pagamento + "T12:00:00");
          return d.getMonth() === m.month && d.getFullYear() === m.year;
        })
        .reduce((s: number, r: any) => s + Number(r.valor || 0), 0);

      const newS = students.filter((s) => {
        const d = new Date(s.created_at);
        return d.getMonth() === m.month && d.getFullYear() === m.year;
      }).length;

      return { mes: m.label, revenue: Math.round(rev), newStudents: newS };
    });
  }, [students, records]);

  if (loadingStudents || loadingRecords || loadingSales || loadingBookings) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </AdminLayout>
    );
  }

  const totalLTV = ltvByStudent.reduce((s, a) => s + a.ltv, 0);
  const avgLTV = students.length ? totalLTV / students.length : 0;
  const avgPermanencia = students.length
    ? ltvByStudent.reduce((s, a) => s + a.monthsActive, 0) / students.length
    : 0;
  
  const inativos = students.filter((s) => s.status === "inativo").length;
  const suspensos = students.filter((s) => s.status === "suspenso").length;
  const churnGeral = students.length ? (((inativos + suspensos) / students.length) * 100) : 0;
  const ativos = students.length - inativos - suspensos;
  const avgMRR = ativos > 0 ? (ltvByStudent.filter(a => a.status === "ativo").reduce((s, a) => s + a.avgMonthly, 0)) : 0;

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Churn Rate & LTV</h1>
            <p className="text-muted-foreground">Análise de retenção e valor vitalício</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="overflow-hidden border-none shadow-sm ring-1 ring-slate-100 bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 pt-3 sm:pt-6 px-3 sm:px-6">
              <CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">LTV Médio</CardTitle>
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-black tracking-tighter text-slate-900 leading-none">R$ {avgLTV.toFixed(0)}</div>
              <p className="text-[9px] sm:text-xs text-slate-400 mt-1 font-medium">por aluno</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-none shadow-sm ring-1 ring-slate-100 bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 pt-3 sm:pt-6 px-3 sm:px-6">
              <CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">MRR Estimado</CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-black tracking-tighter text-slate-900 leading-none">R$ {avgMRR.toFixed(0)}</div>
              <p className="text-[9px] sm:text-xs text-slate-400 mt-1 font-medium">{ativos} ativos</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-none shadow-sm ring-1 ring-slate-100 bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 pt-3 sm:pt-6 px-3 sm:px-6">
              <CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">Churn Geral</CardTitle>
              <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-destructive/70" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-black tracking-tighter text-slate-900 leading-none">{churnGeral.toFixed(1)}%</div>
              <p className="text-[9px] sm:text-xs text-slate-400 mt-1 font-medium">{inativos + suspensos} saídas</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-none shadow-sm ring-1 ring-slate-100 bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 pt-3 sm:pt-6 px-3 sm:px-6">
              <CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">Permanência</CardTitle>
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500/70" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-black tracking-tighter text-slate-900 leading-none">{avgPermanencia.toFixed(1)}m</div>
              <p className="text-[9px] sm:text-xs text-slate-400 mt-1 font-medium">tempo médio</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="churn" className="space-y-6">
          <div className="overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex h-10 items-center justify-start rounded-xl bg-slate-100/50 p-1 text-slate-500 ring-1 ring-slate-200/50 w-full sm:w-auto whitespace-nowrap">
              <TabsTrigger value="churn" className="rounded-lg px-6 py-2 text-xs font-black uppercase tracking-widest ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm">Churn</TabsTrigger>
              <TabsTrigger value="risco" className="rounded-lg px-6 py-2 text-xs font-black uppercase tracking-widest ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm">Em Risco</TabsTrigger>
              <TabsTrigger value="ltv" className="rounded-lg px-6 py-2 text-xs font-black uppercase tracking-widest ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm">LTV</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="churn" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base text-center">Taxa de Churn (%)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={monthlyChurn}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Line type="monotone" dataKey="churnRate" stroke="hsl(var(--destructive))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base text-center">Cancelamentos p/ Mês</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={monthlyChurn}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="cancelled" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="risco" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> 
                  Alunos sem presença há mais de 15 dias
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-y">
                    <tr>
                      <th className="px-4 py-3 text-left">Aluno</th>
                      <th className="px-4 py-3 text-center">Inatividade</th>
                      <th className="px-4 py-3 text-right">LTV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ltvByStudent.filter(a => a.isAtRisk).map((a) => (
                      <tr key={a.id} className="border-b hover:bg-amber-50/50">
                        <td className="px-4 py-3 font-medium">{a.nome}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className="text-amber-600 bg-amber-50">
                            {a.daysSinceLast === 999 ? "Nunca" : `${a.daysSinceLast} dias`}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">R$ {a.ltv.toFixed(0)}</td>
                      </tr>
                    ))}
                    {ltvByStudent.filter(a => a.isAtRisk).length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-12 text-center text-muted-foreground italic">Nenhum aluno em risco crítico.</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ltv" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Ranking de LTV</CardTitle></CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-y">
                    <tr>
                      <th className="px-4 py-3 text-left">Aluno</th>
                      <th className="px-4 py-3 text-right">LTV Total</th>
                      <th className="px-4 py-3 text-center">Meses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ltvByStudent.slice(0, 20).map((a) => (
                      <tr key={a.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{a.nome}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">R$ {a.ltv.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">{a.monthsActive}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
