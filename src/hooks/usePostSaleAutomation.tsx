import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { whatsappService, WhatsAppConfig } from "@/services/whatsappService";

export function usePostSaleAutomation() {
  
  /**
   * Projeta parcelas financeiras com base no plano
   */
  const projectInstallments = async (params: {
    studioId: string;
    studentId: string;
    planId: string;
    valor: number;
    dataInicio: string;
    formaPagamento: string;
    contractId?: string;
  }) => {
    try {
      // 0. Verificar se já existem parcelas para este contrato
      if (params.contractId) {
        const { data: existing } = await supabase
          .from("financial_records")
          .select("id")
          .eq("contract_id", params.contractId)
          .limit(1);
        
        if (existing && existing.length > 0) {
          console.warn("Parcelas já projetadas para este contrato.");
          return [];
        }
      }

      // 1. Buscar detalhes do plano para saber a duração
      const { data: plan } = await supabase
        .from("plans")
        .select("*")
        .eq("id", params.planId)
        .single();

      if (!plan) throw new Error("Plano não encontrado");

      // Determinar número de parcelas
      let numParcelas = 1;
      if (plan.tipo === "recorrente") {
        const nomeLower = plan.nome.toLowerCase();
        if (nomeLower.includes("anual")) numParcelas = 12;
        else if (nomeLower.includes("semestral")) numParcelas = 6;
        else if (nomeLower.includes("trimestral")) numParcelas = 3;
        // Padrão é mensal (1)
      }

      const installments = [];
      const startDate = new Date(params.dataInicio + "T12:00:00");

      for (let i = 0; i < numParcelas; i++) {
        const vencimento = new Date(startDate);
        vencimento.setMonth(startDate.getMonth() + i);

        installments.push({
          studio_id: params.studioId,
          student_id: params.studentId,
          plan_id: params.planId,
          contract_id: params.contractId || null,
          valor: params.valor,
          valor_original: params.valor,
          vencimento: vencimento.toISOString().split('T')[0],
          status: 'pendente',
          forma_pagamento: params.formaPagamento,
        });
      }

      const { error } = await supabase.from("financial_records").insert(installments);
      if (error) throw error;

      return installments;
    } catch (e: any) {
      console.error("Erro ao projetar parcelas:", e);
      toast.error("Erro ao gerar financeiro: " + e.message);
      return [];
    }
  };

  /**
   * Monta o texto do contrato substituindo placeholders
   */
  const assembleContract = (
    contractTemplate: string,
    data: { 
      studentName: string; 
      studentCpf: string; 
      planName: string; 
      planValue: number; 
      studioName: string;
      dias_semana?: string[];
      proxima_aula?: string;
      taxaMatricula?: number;
    }
  ) => {
    let corpo = contractTemplate;
    const placeholders: Record<string, string> = {
      "[aluno_nome]": data.studentName,
      "[aluno_cpf]": data.studentCpf,
      "[plano_nome]": data.planName,
      "[plano_valor]": `R$ ${Number(data.planValue).toFixed(2)}`,
      "[studio_nome]": data.studioName,
      "[dias_semana]": data.dias_semana?.join(", ") || "A combinar",
      "[proxima_aula]": data.proxima_aula || "A confirmar",
      "[taxa_matricula]": data.taxaMatricula && data.taxaMatricula > 0 ? `R$ ${Number(data.taxaMatricula).toFixed(2)}` : "ISENTO",
      "{{nome_aluno}}": data.studentName,
      "{{cpf_aluno}}": data.studentCpf,
      "{{valor_total}}": `R$ ${Number(data.planValue).toFixed(2)}`,
      "{{dias_semana}}": data.dias_semana?.join(", ") || "A combinar",
      "{{plano_nome}}": data.planName,
      "{{taxa_matricula}}": data.taxaMatricula && data.taxaMatricula > 0 ? `R$ ${Number(data.taxaMatricula).toFixed(2)}` : "ISENTO"
    };
    Object.entries(placeholders).forEach(([placeholder, value]) => {
      corpo = corpo.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g"), value);
    });

    return corpo;
  };

  /**
   * Gera link de WhatsApp com base no template
   */
  const getWhatsAppLink = (params: {
    template: string;
    phone: string;
    data: Record<string, string>;
  }) => {
    let message = params.template;
    Object.entries(params.data).forEach(([key, value]) => {
      message = message.replace(`[${key}]`, value);
    });

    const cleanPhone = params.phone.replace(/\D/g, "");
    return `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  /**
   * Calcula a data de término com base no plano
   */
  const calculateEndDate = (startDate: string, planName: string) => {
    const start = new Date(startDate + "T12:00:00");
    const nameLower = planName.toLowerCase();
    
    if (nameLower.includes("anual")) start.setFullYear(start.getFullYear() + 1);
    else if (nameLower.includes("semestral")) start.setMonth(start.getMonth() + 6);
    else if (nameLower.includes("trimestral")) start.setMonth(start.getMonth() + 3);
    else start.setMonth(start.getMonth() + 1); // Padrão mensal

    return start.toISOString().split('T')[0];
  };

  /**
   * Envia mensagem de WhatsApp de forma automática via Evolution API
   */
  const sendAutomatedWhatsApp = async (params: {
    studioId: string,
    phone: string,
    template: string,
    data: Record<string, string>,
    config?: WhatsAppConfig
  }) => {
    try {
      let waConfig = params.config;
      
      // Se não passou config, busca do banco
      if (!waConfig) {
        const { data } = await supabase
          .from("studio_configs")
          .select("config")
          .eq("studio_id", params.studioId)
          .single();
        
        waConfig = data?.config?.whatsapp;
      }

      if (!waConfig || !waConfig.enabled) {
        console.warn("[WhatsApp] Integração desativada.");
        return null;
      }

      const formattedMessage = whatsappService.formatMessage(params.template, params.data);
      
      const result = await whatsappService.sendText(params.phone, formattedMessage, waConfig);
      console.warn("[WhatsApp] Mensagem enviada com sucesso!", result);
      return result;
    } catch (error: any) {
      console.error("[WhatsApp] Erro no envio automático:", error);
      // Não damos toast de erro aqui para não travar o fluxo principal (matricula)
      // apenas logamos para auditoria
      return null;
    }
  };

  return {
    projectInstallments,
    assembleContract,
    getWhatsAppLink,
    sendAutomatedWhatsApp,
    calculateEndDate
  };
}
