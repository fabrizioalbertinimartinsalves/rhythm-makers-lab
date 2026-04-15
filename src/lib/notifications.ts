import { supabase } from "./supabase";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export const sendSystemEmail = async (studioId: string, payload: EmailPayload) => {
  // 1. Fetch SMTP configs from the database
  const { data: configs, error: configError } = await supabase
    .from('studio_configs')
    .select('*')
    .eq('studio_id', studioId)
    .eq('category', 'email');

  if (configError) throw new Error("Falha ao carregar configurações de e-mail.");

  const getValue = (key: string) => configs?.find(c => c.key === key)?.value || "";

  // 2. Prepare SMTP config object
  const smtpConfig = {
    host: getValue("email.smtp_host") || "smtp.gmail.com",
    port: Number(getValue("email.smtp_port")) || 587,
    user: getValue("email.smtp_user"),
    pass: getValue("email.smtp_pass"),
    from_name: getValue("email.sender_name") || "Kineos Cockpit"
  };

  if (!smtpConfig.user || !smtpConfig.pass) {
    throw new Error("Servidor de e-mail não configurado em Configurações > E-mail.");
  }

  // 3. Invoke the Edge Function
  const { data, error: functionError } = await supabase.functions.invoke('send-email', {
    body: {
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      config: smtpConfig
    }
  });

  if (functionError) throw functionError;
  
  // Also check if function returned an internal error
  if (data?.error) throw new Error(data.error);

  return data;
};
