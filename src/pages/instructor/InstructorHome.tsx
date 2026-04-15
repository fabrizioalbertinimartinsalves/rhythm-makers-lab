import InstructorLayout from "@/components/layouts/InstructorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Loader2, AlertTriangle, Info, Wallet, TrendingUp, Eye, EyeOff, DollarSign, Calendar as CalendarIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import InstructorCheckInButton from "@/components/admin/InstructorCheckInButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format, subDays, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function InstructorHome() {
  const { user, studioId } = useAuth();
  const [showBalance, setShowBalance] = useState(() => {
    return localStorage.getItem("instructor_show_balance") !== "false";
  });

  useEffect(() => {
    localStorage.setItem("instructor_show_balance", String(showBalance));
  }, [showBalance]);

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Query for current month payout / earnings
  const { data: payoutData, isLoading: isLoadingPayout } = useQuery({
    queryKey: ["instructor-payout-preview", user?.id, currentMonth, currentYear],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("calculate_instructor_payout_v2", {
        p_instructor_id: user?.id,
        p_month: currentMonth,
        p_year: currentYear
      });
      if (error) throw error;
      return data;
    }
  });

  const { data: todayOccurrences = [], isLoading } = useQuery<any[]>({
    queryKey: ["instructor-today-occurrences", studioId, dateStr],
    enabled: !!studioId,
    queryFn: async () => {
      // 1. Ensure occurrences are generated for today/week
      await supabase.rpc("ensure_today_occurrences", { p_studio_id: studioId });

      // 2. Fetch occurrences where this instructor is scheduled OR already checked in
      const { data, error } = await supabase
        .from("class_occurrences")
        .select(`
          *,
          classes ( 
            nome, 
            sala,
            modalities ( nome, emoji )
          )
        `)
        .eq("studio_id", studioId)
        .eq("occurrence_date", dateStr)
        .or(`scheduled_instructor_id.eq.${user?.id},actual_instructor_id.eq.${user?.id}`)
        .order("start_time");
      
      if (error) throw error;
      return data || [];
    }
  });

  // Query for missed check-ins (last 7 days)
  const { data: missedOccurrences = [] } = useQuery<any[]>({
    queryKey: ["instructor-missed-checkins", studioId, user?.id],
    enabled: !!studioId && !!user?.id,
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString().split('T')[0];
      const { data, error } = await supabase
        .from("class_occurrences")
        .select(`*, classes(nome)`)
        .eq("studio_id", studioId)
        .eq("scheduled_instructor_id", user?.id)
        .eq("status", "scheduled")
        .lt("occurrence_date", dateStr) // Any date before today
        .gte("occurrence_date", sevenDaysAgo)
        .order("occurrence_date", { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const formattedDate = today.toLocaleDateString("pt-BR", { 
    weekday: "long", 
    day: "numeric", 
    month: "long", 
    year: "numeric" 
  });

  return (
    <InstructorLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold font-heading">Olá, {user?.user_metadata?.nome || user?.email?.split("@")[0] || "Instrutor"}! 👋</h1>
            <p className="text-sm text-muted-foreground capitalize">{formattedDate}</p>
          </div>
          {missedOccurrences.length > 0 && (
            <Badge variant="destructive" className="w-fit animate-pulse">
              {missedOccurrences.length} Pendência{missedOccurrences.length > 1 ? 's' : ''} de Check-in
            </Badge>
          )}
        </div>

        {/* Resumo de Ganhos Premium */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-none shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-500">
               <Wallet className="h-24 w-24" />
            </div>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-widest opacity-80 italic">Meu Repasse Acumulado</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10" onClick={() => setShowBalance(!showBalance)}>
                  {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold opacity-60">R$</span>
                <span className="text-3xl font-black tracking-tighter">
                  {showBalance ? payoutData?.total_payout?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00" : "••••••"}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide bg-white/10 w-fit px-2 py-1 rounded-full">
                 <TrendingUp className="h-3 w-3" />
                 Mês de {format(today, "MMMM", { locale: ptBR })}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-100">
            <CardHeader className="pb-1 p-4">
               <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Aulas no Mês</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
               <div className="text-2xl font-black">{payoutData?.details?.count_classes || 0}</div>
               <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase italic">Sessões Concluídas</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-100 hidden lg:block">
            <CardHeader className="pb-1 p-4">
               <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Modelo de Repasse</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
               <Badge variant="secondary" className="font-bold text-[9px] uppercase tracking-tighter">
                  {payoutData?.contract_type?.replace('_', ' ') || 'FIXED CLT'}
               </Badge>
               <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase italic">Configuração Atual</p>
            </CardContent>
          </Card>
        </div>

        {missedOccurrences.length > 0 && (
          <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-900 shadow-sm">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="font-bold">Atenção Necessária</AlertTitle>
            <AlertDescription className="text-xs">
              Você possui <strong>{missedOccurrences.length}</strong> aula(s) nos últimos 7 dias sem check-in realizado. 
              Favor regularizar para garantir o fechamento correto do seu repasse.
            </AlertDescription>
          </Alert>
        )}

        <Card className="shadow-lg border-slate-100 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="text-base flex items-center gap-2 text-slate-800">
              <Clock className="h-4 w-4 text-primary" /> Minha Agenda de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : todayOccurrences.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3 opacity-60">
                 <CalendarIcon className="h-12 w-12 text-slate-200" />
                 <p className="text-sm font-medium text-center italic">Nenhuma aula agendada para hoje.</p>
              </div>
            ) : (
              <div className="divide-y">
                {todayOccurrences.map((occ) => (
                  <div key={occ.id} className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center min-w-[50px] py-1 px-2 bg-slate-100 rounded-lg group-hover:bg-primary/10 transition-colors">
                        <span className="text-xs font-black text-slate-400 group-hover:text-primary transition-colors">{(occ.start_time || "").slice(0, 5) || "—"}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{occ.classes?.nome || occ.classes?.modalities?.nome}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                           <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" /> {occ.classes?.sala || "Geral"}
                           </span>
                           {occ.classes?.modalities?.emoji && <span>{occ.classes.modalities.emoji}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <InstructorCheckInButton 
                        occurrenceId={occ.id}
                        initialStatus={occ.status}
                        initialCheckInTime={occ.checkin_time}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </InstructorLayout>
  );
}
