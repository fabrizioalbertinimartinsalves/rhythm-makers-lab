export interface WhatsAppConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  instance: string;
  templates?: {
    welcome?: string;
    payment_reminder?: string;
    checkin_confirmation?: string;
  };
}

export const whatsappService = {
  /**
   * Envia uma mensagem de texto via Evolution API v2 usando fetch
   */
  async sendText(number: string, text: string, config: WhatsAppConfig) {
    if (!config.enabled || !config.baseUrl || !config.apiKey || !config.instance) {
      console.warn("[WhatsAppService] Integração desativada ou incompleta.");
      return null;
    }

    try {
      // Formata o número (apenas dígitos)
      const cleanNumber = number.replace(/\D/g, "");
      
      const response = await fetch(
        `${config.baseUrl}/message/sendText/${config.instance}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": config.apiKey
          },
          body: JSON.stringify({
            number: cleanNumber,
            text: text,
            delay: 1200,
            linkPreview: true
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
      }

      return await response.json();
    } catch (error: any) {
      console.error("[WhatsAppService] Erro ao enviar mensagem:", error.message);
      throw error;
    }
  },

  /**
   * Testa a conexão com a instância da Evolution API
   */
  async testConnection(config: WhatsAppConfig) {
    if (!config.baseUrl || !config.apiKey || !config.instance) {
      throw new Error("Configurações incompletas para teste.");
    }

    try {
      const response = await fetch(
        `${config.baseUrl}/instance/instanceStatus/${config.instance}`,
        {
          method: "GET",
          headers: {
            "apikey": config.apiKey
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
      }
      
      return await response.json();
    } catch (error: any) {
      console.error("[WhatsAppService] Erro ao testar conexão:", error.message);
      throw error;
    }
  },

  /**
   * Auxiliar para substituir placeholders em templates
   */
  formatMessage(template: string, variables: Record<string, string>) {
    let message = template;
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`\\[${key}\\]`, "g"), value);
      message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    });
    return message;
  }
};
