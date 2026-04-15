import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { subHours, startOfDay, endOfDay } from "date-fns";

export function useSidebarStats() {
  const { studioId } = useAuth();
  const yesterday = subHours(new Date(), 24).toISOString();
  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "sidebar", "stats", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      // 1. Alunos Ativos vs Capacidade
      const { count: activeStudents } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("studio_id", studioId)
        .eq("status", "ativo");

      const { data: studio } = await supabase
        .from("studios")
        .select("limite_alunos")
        .eq("id", studioId)
        .single();

      // 2. Financeiro Atrasado
      const { count: overdueCount } = await supabase
        .from("financial_transactions")
        .select("*", { count: "exact", head: true })
        .eq("studio_id", studioId)
        .eq("status", "atrasado");

      // 3. Novos Leads (24h)
      const { count: newLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("studio_id", studioId)
        .gte("created_at", yesterday);

      // 4. Aulas Ativas
      const { count: activeClasses } = await supabase
        .from("classes")
        .select("*", { count: "exact", head: true })
        .eq("studio_id", studioId)
        .eq("ativa", true);

      return {
        activeStudents: activeStudents || 0,
        capacity: studio?.limite_alunos || 0,
        overdueCount: overdueCount || 0,
        newLeads: newLeads || 0,
        activeClasses: activeClasses || 0,
        occupancyRate: studio?.limite_alunos ? Math.round(((activeStudents || 0) / studio.limite_alunos) * 100) : 0
      };
    },
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });

  return { stats, isLoading };
}
