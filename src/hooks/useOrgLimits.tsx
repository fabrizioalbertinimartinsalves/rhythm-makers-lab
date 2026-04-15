import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useOrganization } from "@/hooks/useOrganization";

export function useOrgLimits() {
  const { orgId } = useOrganization();

  const { data: orgSettings } = useQuery({
    queryKey: ["org-limits-sb", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("studios")
        .select("limite_alunos, limite_turmas")
        .eq("id", orgId)
        .single();
      return data || null;
    },
    staleTime: 60_000,
  });

  const { data: counts } = useQuery({
    queryKey: ["org-counts-sb", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [{ count: alunosCount }, { count: turmasCount }] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }).eq("studio_id", orgId).eq("status", "ativo"),
        supabase.from("classes").select("*", { count: "exact", head: true }).eq("studio_id", orgId).eq("ativa", true),
      ]);
      return { alunos: alunosCount ?? 0, turmas: turmasCount ?? 0 };
    },
    staleTime: 30_000,
  });

  const limiteAlunos = orgSettings?.limite_alunos ?? 0;
  const limiteTurmas = orgSettings?.limite_turmas ?? 0;

  const canAddAluno = limiteAlunos === 0 || (counts?.alunos ?? 0) < limiteAlunos;
  const canAddTurma = limiteTurmas === 0 || (counts?.turmas ?? 0) < limiteTurmas;
  const alunosRemaining = limiteAlunos === 0 ? Infinity : limiteAlunos - (counts?.alunos ?? 0);
  const turmasRemaining = limiteTurmas === 0 ? Infinity : limiteTurmas - (counts?.turmas ?? 0);

  return {
    limiteAlunos,
    limiteTurmas,
    currentAlunos: counts?.alunos ?? 0,
    currentTurmas: counts?.turmas ?? 0,
    canAddAluno,
    canAddTurma,
    alunosRemaining,
    turmasRemaining,
  };
}
