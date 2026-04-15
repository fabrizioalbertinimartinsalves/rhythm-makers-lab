// @ts-ignore: Deno standard library
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno Stripe
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
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

  const sig = req.headers.get("stripe-signature");
  const url = new URL(req.url);
  const studioId = url.searchParams.get("studioId");

  if (!sig || !studioId) {
    return new Response(JSON.stringify({ error: "Faltando assinatura ou studioId" }), { status: 400 });
  }

  try {
    // 1. Buscar Chaves do Stripe no Supabase
    // @ts-ignore: Deno env
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    // @ts-ignore: Deno env
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: integration, error: intErr } = await supabase
      .from("integrations")
      .select("config")
      .eq("studio_id", studioId)
      .eq("provider", "stripe")
      .eq("ativa", true)
      .maybeSingle();

    let webhookSecret = integration?.config?.webhook_secret;
    let secretKey = integration?.config?.secret_key;

    // Fallback para studio_configs (sistema antigo)
    if (!webhookSecret || !secretKey) {
      const { data: fallback } = await supabase
        .from("studio_configs")
        .select("config")
        .eq("studio_id", studioId)
        .maybeSingle();

      if (!webhookSecret) {
        webhookSecret = fallback?.config?.["integrations.stripe.webhook_secret"] || fallback?.config?.["stripe.webhook_secret"];
      }
      if (!secretKey) {
        secretKey = fallback?.config?.["integrations.stripe.secret_key"] || fallback?.config?.["stripe.secret_key"];
      }
    }

    if (!webhookSecret || !secretKey) {
      throw new Error("Chaves do Stripe ausentes na configuração (nem no Supabase, nem no legado).");
    }

    const stripe = new Stripe(secretKey, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const { mensalidade_id, booking_ids, source } = session.metadata || {};

      // CASO 1: Mensalidade (Firestore)
      if (mensalidade_id) {
        console.log(`✅ Processando mensalidade: ${mensalidade_id}`);
        const updateUrl = `https://firestore.googleapis.com/v1/projects/atelie-9df54/databases/(default)/documents/studios/${studioId}/mensalidades/${mensalidade_id}?updateMask.fieldPaths=status&updateMask.fieldPaths=data_pagamento&updateMask.fieldPaths=updated_at&updateMask.fieldPaths=forma_pagamento`;
        await fetch(updateUrl, {
           method: 'PATCH',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             fields: {
               status: { stringValue: 'pago' },
               data_pagamento: { stringValue: new Date().toISOString().split("T")[0] },
               forma_pagamento: { stringValue: 'cartao' },
               updated_at: { stringValue: new Date().toISOString() }
             }
           })
        });
      }

      // CASO 2: Agendamento Público (Supabase)
      if (source === 'public_booking' && booking_ids) {
        console.log(`✅ Processando agendamentos públicos: ${booking_ids}`);

        const ids = booking_ids.split(',');
        
        const { error } = await supabase
          .from('bookings')
          .update({ 
            status: 'confirmado', 
            pago: true, 
            forma_pagamento: 'stripe_card' 
          })
          .in('id', ids);

        if (error) {
          console.error("Erro ao atualizar bookings no Supabase:", error);
        } else {
          console.log(`✅ ${ids.length} agendamentos confirmados com sucesso.`);
        }
      }

      // CASO 3: Registro Financeiro (Supabase - Legado)
      const { financial_record_id } = session.metadata || {};
      if (financial_record_id) {
        console.log(`✅ Processando registro financeiro Supabase: ${financial_record_id}`);

        // 1. Atualizar registro financeiro
        const { data: record, error: recErr } = await supabase
          .from('financial_records')
          .update({ 
            status: 'pago', 
            data_pagamento: new Date().toISOString().split("T")[0],
            forma_pagamento: 'stripe_card',
            updated_at: new Date().toISOString()
          })
          .eq('id', financial_record_id)
          .select('*, students(nome)')
          .single();

        if (recErr) {
          console.error("Erro ao atualizar financial_record:", recErr);
        } else {
          // 2. Criar transação correspondente
          const { error: txErr } = await supabase
            .from('financial_transactions')
            .insert({
              studio_id: studioId,
              student_id: record.student_id,
              type: 'income',
              amount: record.valor,
              description: `Pagamento Online: ${record.descricao || 'Mensalidade'}`,
              date: new Date().toISOString().split("T")[0],
              status: 'pago',
              category_id: record.category_id,
              forma_pagamento: 'stripe_card',
              financial_record_id: financial_record_id,
              metadata: { stripe_session_id: session.id }
            });

          if (txErr) console.error("Erro ao criar financial_transaction:", txErr);
          else console.log(`✅ Registro financeiro ${financial_record_id} liquidado.`);
        }
      }

      // CASO 4: Fatura (Supabase - Novo Motor de Cobrança)
      const { invoice_id } = session.metadata || {};
      if (invoice_id) {
        console.log(`✅ Processando fatura Supabase: ${invoice_id}`);

        // 1. Atualizar a fatura
        const { data: invoice, error: invErr } = await supabase
          .from('invoices')
          .update({ 
            status: 'pago', 
            data_pagamento: new Date().toISOString().split("T")[0],
            forma_pagamento: 'stripe_card',
            updated_at: new Date().toISOString()
          })
          .eq('id', invoice_id)
          .select('*')
          .single();

        if (invErr) {
          console.error("Erro ao atualizar invoice:", invErr);
        } else {
          // 2. Criar transação correspondente
          const { error: txErr } = await supabase
            .from('financial_transactions')
            .insert({
              studio_id: studioId,
              student_id: invoice.student_id,
              type: 'income',
              amount: invoice.final_value,
              description: `Pagamento Fatura (Online)`,
              date: new Date().toISOString().split("T")[0],
              status: 'pago',
              forma_pagamento: 'stripe_card',
              invoice_id: invoice_id,
              metadata: { stripe_session_id: session.id }
            });

          if (txErr) console.error("Erro ao criar financial_transaction para fatura:", txErr);
          else console.log(`✅ Fatura ${invoice_id} liquidada.`);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("Webhook Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
