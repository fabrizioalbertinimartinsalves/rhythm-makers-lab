/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface SaaSPlan {
  id: string;
  nome: string;
  descricao: string;
  valor_mensal: number;
  limite_alunos: number;
  limite_instrutores: number;
  limite_turmas: number;
  modulos: string[];
  ativo: boolean;
}

export const MODULE_LABELS: Record<string, string> = {
  agenda: "Agenda", alunos: "Gestão de Alunos (Inteligência)", presencas: "Presenças", financeiro: "Faturamento Automatizado",
  avisos: "Avisos", crm: "CRM / Funil", contratos: "Contratos Automáticos", pdv: "PDV / Loja",
  relatorios: "Relatórios", agendamento_online: "Agend. Online", loja: "Loja",
  ltv: "LTV / Churn", backups: "Backups", integracoes: "Integrações",
  parcerias: "Parcerias", experimentais: "Experimentais", pre_matriculas: "Pré-Matrículas",
  modalidades: "Modalidades", agenda_hibrida: "Grade Híbrida", agendamentos: "Agendamentos",
  checkin: "Check-in", vendas_avulsas: "Vendas Avulsas", planos_estudio: "Planos Estúdio",
  repasses: "Repasses", instrutores: "Instrutores", figurinos: "Figurinos", festivais: "Festivais",
};

export function useSaaSPlans() {
  return useQuery({
    queryKey: ["saas-plans-public-sb"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_plans")
        .select("*")
        .eq("ativo", true)
        .order("valor_mensal", { ascending: true });
      
      if (error) throw error;
      return data as SaaSPlan[];
    },
    staleTime: 1000 * 60 * 5,
  });
}
