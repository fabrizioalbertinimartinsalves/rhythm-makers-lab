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
    const { transactionId, amount, description, studioId, payerEmail, payerName } = await req.json();

    if (!studioId || !amount || !transactionId) {
      throw new Error("Parâmetros insuficientes (studioId, amount, transactionId são obrigatórios).");
    }

    // 1. Initialize Supabase Admin for sensitive data
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // 2. Fetch Mercado Pago Access Token
    const { data: integration, error: intErr } = await supabase
      .from("integrations")
      .select("config")
      .eq("studio_id", studioId)
      .eq("provider", "mercadopago")
      .eq("ativa", true)
      .maybeSingle();

    const accessToken = integration?.config?.access_token;
    if (!accessToken) {
      throw new Error("Configuração do Mercado Pago não encontrada ou inativa para este estúdio.");
    }

    // 3. Create Payment on Mercado Pago
    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `pix_${transactionId}_${Date.now()}`
      },
      body: JSON.stringify({
        transaction_amount: Number(amount),
        description: description || `Pagamento Kineos - Transação ${transactionId}`,
        payment_method_id: "pix",
        payer: {
          email: payerEmail || "contato@kineos.com.br", // Fallback email
          first_name: payerName?.split(' ')[0] || "Aluno",
          last_name: payerName?.split(' ').slice(1).join(' ') || "Kineos",
        },
        external_reference: transactionId,
        notification_url: `https://api.kineosapp.com.br/functions/v1/mercadopago-webhook?studio_id=${studioId}`
      })
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("MERCADO PAGO API ERROR:", mpData);
      throw new Error(mpData.message || "Erro ao criar pagamento no Mercado Pago.");
    }

    // 4. Return PIX data for the frontend
    const pixData = {
      id: mpData.id,
      status: mpData.status,
      qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64,
    };

    return new Response(JSON.stringify(pixData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("CRITICAL MP-PIX ERROR:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
