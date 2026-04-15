import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: any) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, html, config } = await req.json();
    console.log(`[Email] Tentando enviar para: ${to}`);

    if (!to || !subject || !html) {
      throw new Error("Missing required fields: to, subject, html");
    }

    const client = new SmtpClient();

    const smtpConfig = {
      hostname: config?.host || Deno.env.get("SMTP_HOST") || "smtp.gmail.com",
      port: Number(config?.port || Deno.env.get("SMTP_PORT") || "587"),
      username: config?.user || Deno.env.get("SMTP_USER"),
      password: config?.pass || Deno.env.get("SMTP_PASS"),
    };

    if (!smtpConfig.username || !smtpConfig.password) {
      throw new Error("Credenciais SMTP não configuradas.");
    }

    console.log(`[Email] Iniciando conexão: ${smtpConfig.hostname}:${smtpConfig.port}`);

    try {
      if (smtpConfig.port === 465) {
        console.log(`[Email] Usando connectTLS (SSL/TLS)...`);
        await client.connectTLS({
          hostname: smtpConfig.hostname,
          port: smtpConfig.port,
          username: smtpConfig.username,
          password: smtpConfig.password,
        });
      } else {
        console.log(`[Email] Usando connect (STARTTLS/Plain)...`);
        await client.connect({
          hostname: smtpConfig.hostname,
          port: smtpConfig.port,
          username: smtpConfig.username,
          password: smtpConfig.password,
        });
      }
    } catch (connErr: any) {
      console.error(`[Email Error] Falha na conexão/autenticação SMTP:`, connErr);
      throw new Error(`Erro de Conexão SMTP: ${connErr.message || 'Verifique Host/Porta/Senha'}`);
    }

    console.log(`[Email] Conectado! Formatando mensagem...`);

    const fromAddr = `${config?.from_name || "Kineos Cockpit"} <${smtpConfig.username}>`;
    
    await client.send({
      from: fromAddr,
      to,
      subject,
      content: html,
      html,
    });

    console.log(`[Email] E-mail enviado com sucesso para: ${to}`);
    await client.close();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error(`[Email Fatal Error]`, error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

