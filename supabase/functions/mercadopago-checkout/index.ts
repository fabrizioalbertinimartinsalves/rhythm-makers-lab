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
    const { 
      transactionId, 
      amount, 
      description, 
      studioId, 
      payerEmail, 
      payerName,
      returnPath = "financeiro",
      metadata = {} 
    } = await req.json();

    if (!studioId || !amount || !transactionId) {
      throw new Error("Parâmetros insuficientes (studioId, amount, transactionId são obrigatórios).");
    }

    // 1. Initialize Supabase Admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // 2. Fetch Mercado Pago Access Token
    let accessToken: string | undefined;
    let publicKey: string | undefined;

    if (studioId === 'saas' || studioId === 'kineos' || studioId === 'platform') {
      accessToken = Deno.env.get("SAAS_MP_ACCESS_TOKEN");
      publicKey = Deno.env.get("SAAS_MP_PUBLIC_KEY");
      
      if (!accessToken) {
        throw new Error("Credenciais SaaS (SAAS_MP_ACCESS_TOKEN) não configuradas no servidor.");
      }
    } else {
      const { data: integration, error: intErr } = await supabase
        .from("integrations")
        .select("config")
        .eq("studio_id", studioId)
        .eq("provider", "mercadopago")
        .eq("ativa", true)
        .maybeSingle();

      accessToken = integration?.config?.access_token;
      publicKey = integration?.config?.public_key;

      if (!accessToken) {
        throw new Error("O estúdio não possui Mercado Pago ativo. Configure em 'Integrações'.");
      }
    }

    // 3. Create Preference on Mercado Pago (Checkout Pro)
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            id: transactionId,
            title: (description || "Pagamento Kineos").slice(0, 250),
            quantity: 1,
            unit_price: Number(amount),
            currency_id: "BRL"
          }
        ],
        payer: {
          name: payerName || "Cliente",
          email: payerEmail || "contato@kineos.com.br"
        },
        external_reference: transactionId,
        metadata: {
          ...metadata,
          studioId,
          transactionId
        },
        back_urls: {
          success: `https://kineosapp.com.br/success?payment_status=success&transaction_id=${transactionId}&studio_id=${studioId}&amount=${amount}`,
          pending: `https://kineosapp.com.br/success?payment_status=pending&transaction_id=${transactionId}&studio_id=${studioId}&amount=${amount}`,
          failure: `https://kineosapp.com.br/success?payment_status=failure&transaction_id=${transactionId}&studio_id=${studioId}&amount=${amount}`
        },
        auto_return: "approved",
        notification_url: `https://api.kineosapp.com.br/functions/v1/mercadopago-webhook?studio_id=${studioId}`,
        // Limitar métodos se necessário (Ex: remover Boleto se quiser Pix/Card imediato)
        payment_methods: {
          installments: 12,
          excluded_payment_types: [
            // { id: "ticket" } // Descomentar se quiser remover Boleto
          ]
        }
      })
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("MERCADO PAGO PREFERENCE ERROR:", mpData);
      throw new Error(mpData.message || "Erro ao criar preferência no Mercado Pago.");
    }

    return new Response(JSON.stringify({ 
      id: mpData.id, 
      publicKey: publicKey, // Retornar para o frontend poder abrir o modal sem query extra
      init_point: mpData.init_point, 
      sandbox_init_point: mpData.sandbox_init_point 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("CRITICAL MP-CHECKOUT ERROR:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
