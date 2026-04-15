import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const studioId = url.searchParams.get("studio_id");
    
    // Mercado Pago envia os dados (IPN ou Webhook)
    const body = await req.json();
    console.log("MERCADO PAGO WEBHOOK RECEIVED:", body);

    const paymentId = body.data?.id || body.resource?.split('/').pop();

    if (!paymentId || !studioId) {
       console.warn("MERCADO PAGO WEBHOOK: Missing data (paymentId or studioId)");
       return new Response("ok", { status: 200 });
    }

    // 1. Supabase Admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // 2. Buscar Access Token do Estúdio
    const { data: integration } = await supabase
      .from("integrations")
      .select("config")
      .eq("studio_id", studioId)
      .eq("provider", "mercadopago")
      .eq("ativa", true)
      .maybeSingle();

    let accessToken = integration?.config?.access_token;

    // Fallback para credenciais SaaS se necessário
    if (!accessToken && (studioId === 'saas' || studioId === 'platform')) {
      accessToken = Deno.env.get("SAAS_MP_ACCESS_TOKEN");
    }

    if (!accessToken) {
      throw new Error(`Configuração do Mercado Pago não encontrada para o estúdio: ${studioId}`);
    }

    // 3. Verificar Status do Pagamento na API do Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      }
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
        console.error("MERCADO PAGO API ERROR:", mpData);
        throw new Error("Erro ao verificar pagamento no Mercado Pago.");
    }

    const { status, external_reference: transactionId } = mpData;
    console.log(`PAYMENT VERIFIED: ID=${paymentId}, STATUS=${status}, REF=${transactionId}`);

    if (status === "approved" && transactionId) {
        console.log(`CONFIRMING BOOKING/TRANSACTION ${transactionId}...`);
        await supabase
            .from("financial_transactions")
            .update({ status: "pago", updated_at: new Date().toISOString() })
            .eq("id", transactionId)
            .eq("studio_id", studioId);

        const { data: booking } = await supabase
            .from("bookings")
            .update({ 
               status: "confirmado", 
               pago: true, 
               forma_pagamento: "mercadopago_online",
               updated_at: new Date().toISOString() 
            })
            .eq("id", transactionId)
            .select("*, classes(*, modalities(*)), students(nome, email)")
            .single();

        if (booking && (booking.tipo === 'experimental' || booking.tipo === 'avulso')) {
            const studentEmail = booking.email_avulso || booking.students?.email;
            if (studentEmail) {
                const studentName = booking.nome_avulso || booking.students?.nome;
                console.log(`Enviando Voucher para ${studentEmail}...`);
                
                const dataFormatada = new Date(booking.data + "T12:00:00").toLocaleDateString("pt-BR", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric"
                });

                const className = booking.classes?.nome || booking.classes_avulsas?.nome || "Aula";
                const modalityName = booking.classes?.modalities?.nome || booking.classes_avulsas?.modalities?.nome || "Modalidade";
                const classTime = (booking.classes?.horario || booking.classes_avulsas?.horario || "00:00").slice(0, 5);

                const htmlVoucher = `
                    <div style="font-family: sans-serif; padding: 20px; color: #1f2937; background: #f9fafb;">
                        <div style="max-width: 500px; margin: auto; background: white; border: 2px solid #10b981; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                            <div style="background: #10b981; padding: 30px; text-align: center; color: white;">
                                <h1 style="margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em;">Agendamento Confirmado</h1>
                                <p style="margin: 10px 0 0; opacity: 0.9;">Seu lugar está garantido!</p>
                            </div>
                            <div style="padding: 30px;">
                                <div style="margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px dashed #e5e7eb;">
                                    <p style="font-size: 14px; color: #6b7280; margin: 0 0 5px;">Aluno(a)</p>
                                    <p style="font-size: 18px; font-weight: 700; margin: 0;">${studentName}</p>
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                    <div>
                                        <p style="font-size: 12px; color: #6b7280; margin: 0 0 5px; text-transform: uppercase; font-weight: 700;">Aula</p>
                                        <p style="font-size: 14px; font-weight: 700; margin: 0;">${className}</p>
                                        <p style="font-size: 12px; margin: 2px 0 0; color: #10b981;">${modalityName}</p>
                                    </div>
                                    <div style="text-align: right;">
                                        <p style="font-size: 12px; color: #6b7280; margin: 0 0 5px; text-transform: uppercase; font-weight: 700;">Horário</p>
                                        <p style="font-size: 18px; font-weight: 800; margin: 0;">${classTime}</p>
                                    </div>
                                </div>
                                <div style="margin-top: 25px; background: #f0fdf4; padding: 15px; border-radius: 12px;">
                                    <p style="font-size: 13px; margin: 0; color: #166534;"><strong>Data:</strong> ${dataFormatada}</p>
                                </div>
                                <div style="margin-top: 30px; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.6;">
                                    Apresente este e-mail na recepção ao chegar.<br>
                                    Recomendamos chegar com 10 minutos de antecedência.
                                </div>
                            </div>
                            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #f3f4f6;">
                                <p style="font-size: 12px; margin: 0; color: #6b7280;">Kineos app Cockpit — Agendamento Inteligente</p>
                            </div>
                        </div>
                    </div>
                `;

                try {
                  await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${serviceKey}`
                    },
                    body: JSON.stringify({
                      to: studentEmail,
                      subject: `Confirmado: Sua aula no ${className}`,
                      html: htmlVoucher
                    })
                  });
                  console.log("Email de voucher disparado com sucesso.");
                } catch (sendErr) {
                  console.error("Erro ao disparar função de e-mail:", sendErr);
                }
            }
        }
    } else if (["cancelled", "rejected", "refunded"].includes(status) && transactionId) {
        console.log(`CANCELING BOOKING/TRANSACTION ${transactionId} due to status: ${status}`);
        await supabase
            .from("financial_transactions")
            .update({ status: "cancelado", updated_at: new Date().toISOString() })
            .eq("id", transactionId);
            
        await supabase
            .from("bookings")
            .update({ status: "cancelado", updated_at: new Date().toISOString() })
            .eq("id", transactionId);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("MERCADO PAGO WEBHOOK CRITICAL ERROR:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
