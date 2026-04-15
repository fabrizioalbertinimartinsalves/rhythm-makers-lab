// @ts-ignore: Deno standard library
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno Supabase
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // @ts-ignore: Deno env
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  // @ts-ignore: Deno env
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  const stats = {
    studios_checked: 0,
    billing_messages_sent: 0,
    birthday_messages_sent: 0,
    errors: [] as string[],
  };

  try {
    console.log("[Cron] Iniciando varredura diária de automações...");

    const { data: studios, error: studioErr } = await supabase
      .from("studios")
      .select("id, nome");

    if (studioErr) throw studioErr;

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const currentYear = now.getFullYear();
    const monthDayMatch = `-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    for (const studio of studios) {
      stats.studios_checked++;
      
      const { data: configRow } = await supabase
        .from("studio_configs")
        .select("config")
        .eq("studio_id", studio.id)
        .single();

      const config = configRow?.config || {};
      const waConfig = config.whatsapp || {};
      const templates = config.automacao || {};

      if (!waConfig.enabled || !waConfig.baseUrl || !waConfig.apiKey) continue;

      // --- 1. AUTOMAÇÃO DE COBRANÇA ---
      if (waConfig.auto_send_payment === "true") {
        const { data: invoices, error: invErr } = await supabase
          .from("invoices")
          .select("*, students (nome, telefone)")
          .eq("studio_id", studio.id)
          .eq("status", "pendente")
          .lte("due_date", todayStr)
          .or(`last_automated_reminder_at.is.null,last_automated_reminder_at.lt.${todayStr}`);

        if (invErr) {
          stats.errors.push(`Erro faturas ${studio.id}: ${invErr.message}`);
        } else if (invoices?.length > 0) {
          for (const inv of invoices) {
            const dueDate = new Date(inv.due_date);
            const diffTime = Math.abs(now.getTime() - dueDate.getTime());
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            // Escolher template baseado no atraso
            let template = templates.whatsapp_lembrete || "Olá {{nome}}, sua mensalidade vence em {{vencimento}}.";
            if (diffDays >= 7 && templates.whatsapp_delay_critical) {
              template = templates.whatsapp_delay_critical;
            }

            const phone = (inv.students?.telefone || "").replace(/\D/g, "");
            if (!phone || phone.length < 10) continue;

            const variables = {
              nome: inv.students?.nome || "Aluno",
              valor: Number(inv.final_value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
              vencimento: inv.due_date.split("-").reverse().join("/"),
              studio_nome: studio.nome,
              link: `${waConfig.baseUrl.replace('/message', '')}/pay/${inv.id}` // Exemplo de link
            };

            let message = template;
            Object.entries(variables).forEach(([key, value]) => {
              message = message.replace(new RegExp(`\\[${key}\\]|\\{\\{${key}\\}\\}`, "gi"), value);
            });

            try {
              const res = await fetch(`${waConfig.baseUrl}/message/sendText/${waConfig.instance}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "apikey": waConfig.apiKey },
                body: JSON.stringify({ number: phone, text: message, delay: 1200 })
              });

              if (res.ok) {
                await supabase.from("invoices").update({ last_automated_reminder_at: now.toISOString() }).eq("id", inv.id);
                stats.billing_messages_sent++;
                await new Promise(r => setTimeout(r, 1000));
              }
            } catch (err: any) {
              stats.errors.push(`Erro envio fatura ${inv.id}: ${err.message}`);
            }
          }
        }
      }

      // --- 2. AUTOMAÇÃO DE ANIVERSARIANTES ---
      if (waConfig.auto_send_birthday === "true") {
        const { data: bdays, error: bdayErr } = await supabase
          .from("students")
          .select("id, nome, telefone, data_nascimento, whatsapp_last_birthday_year")
          .eq("studio_id", studio.id)
          .like("data_nascimento", `%${monthDayMatch}`)
          .or(`whatsapp_last_birthday_year.is.null,whatsapp_last_birthday_year.lt.${currentYear}`);

        if (bdayErr) {
          stats.errors.push(`Erro aniversários ${studio.id}: ${bdayErr.message}`);
        } else if (bdays?.length > 0) {
          const bdayTemplate = templates.whatsapp_birthday || "Parabéns, [nome]! Toda a equipe do [studio_nome] te deseja um dia incrível! 🎉";
          
          for (const student of bdays) {
            const phone = (student.telefone || "").replace(/\D/g, "");
            if (!phone || phone.length < 10) continue;

            const message = bdayTemplate
              .replace(/\[nome\]|\{\{nome\}\}/gi, student.nome)
              .replace(/\[studio_nome\]|\{\{studio_nome\}\}/gi, studio.nome);

            try {
              const res = await fetch(`${waConfig.baseUrl}/message/sendText/${waConfig.instance}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "apikey": waConfig.apiKey },
                body: JSON.stringify({ number: phone, text: message, delay: 1200 })
              });

              if (res.ok) {
                await supabase.from("students").update({ whatsapp_last_birthday_year: currentYear }).eq("id", student.id);
                stats.birthday_messages_sent++;
                await new Promise(r => setTimeout(r, 1000));
              }
            } catch (err: any) {
              stats.errors.push(`Erro envio aniversário ${student.id}: ${err.message}`);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error("[Cron] Erro fatal:", err.message);
    return new Response(JSON.stringify({ error: err.message, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
