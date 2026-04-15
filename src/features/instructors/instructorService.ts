import { supabase } from "@/lib/supabase";

export type InstructorContractType = "OWNER" | "FIXED_CLT" | "HOURLY" | "PERCENTAGE";

export interface InstructorPayoutDetail {
  instructor_id: string;
  nome?: string;
  email?: string;
  month: number;
  year: number;
  contract_type: InstructorContractType | "N/A";
  total_payout: number;
  details?: {
    count_classes: number;
    count_students: number;
    base_salary: number;
    hourly_rate: number;
    commission_rate: number;
  };
  error?: boolean;
}

export interface ClassOccurrence {
  id: string;
  class_id: string;
  instructor_id: string;
  actual_instructor_id?: string;
  occurrence_date: string;
  start_time: string;
  status: "scheduled" | "completed" | "cancelled";
  checkin_time?: string;
}

export const instructorService = {
  /**
   * Obtém o dashboard consolidado para o administrador usando o Motor de Repasse v2
   */
  async getInstructorDashboard(studioId: string, month: number, year: number): Promise<InstructorPayoutDetail[]> {
    // 1. Buscar todos os instrutores ativos via memberships
    const { data: members, error: mError } = await supabase
      .from("memberships")
      .select("user_id, profiles(id, nome, email)")
      .eq("studio_id", studioId)
      .contains("roles", ["instructor"]);

    if (mError) throw mError;

    const instructors = (members || []).map(m => ({
      id: m.user_id,
      nome: (m.profiles as any)?.nome,
      email: (m.profiles as any)?.email,
    }));

    // 2. Chamar RPC de cálculo v2 para cada um
    const dashboardData = await Promise.all(
      instructors.map(async (inst) => {
        const { data, error } = await supabase.rpc("calculate_instructor_payout_v2", {
          p_instructor_id: inst.id,
          p_month: month,
          p_year: year
        });

        if (error) {
          console.error(`Erro ao calcular repasse v2 para ${inst.nome}:`, error);
          return { 
            instructor_id: inst.id, 
            nome_instrutor: inst.nome,
            total_payout: 0, 
            contract_type: "N/A" as any, 
            error: true 
          } as any;
        }

        return {
          ...inst,
          ...data
        };
      })
    );

    return dashboardData;
  },

  /**
   * Realiza o check-in do instrutor logado em uma ocorrência específica
   */
  async checkIn(occurrenceId: string) {
    const { data, error } = await supabase.rpc("instructor_checkin", {
      p_occurrence_id: occurrenceId
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.message);
    
    return data;
  },

  /**
   * Busca ocorrências da agenda para o instrutor logado
   */
  async getMyOccurrences(studioId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from("class_occurrences")
      .select(`
        *,
        classes (
          nome,
          sala
        )
      `)
      .eq("studio_id", studioId)
      .gte("occurrence_date", startDate)
      .lte("occurrence_date", endDate)
      .order("occurrence_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;
    return data;
  },

  /**
   * Busca contrato do instrutor
   */
  async getContract(studioId: string, instructorId: string) {
    const { data, error } = await supabase
      .from("instructor_configs")
      .select("*")
      .eq("studio_id", studioId)
      .eq("user_id", instructorId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  /**
   * Salva/Atualiza contrato (v2)
   */
  async saveContract(contract: any) {
    const { data, error } = await supabase
      .from("instructor_configs")
      .upsert(contract, { onConflict: "studio_id, user_id" });

    if (error) throw error;
    return data;
  },

  /**
   * Registra a presença de um instrutor (log_attendance)
   */
  async logAttendance(attendance: any) {
    const { data, error } = await supabase
      .from("instructor_attendance")
      .insert([attendance]);

    if (error) throw error;
    return data;
  }
};
