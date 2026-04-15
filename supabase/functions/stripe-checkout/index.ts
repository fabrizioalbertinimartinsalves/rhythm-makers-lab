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
  // 1. Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const studioId = body.studioId || body.studio_id;
    const { amount_cents, description, metadata, return_path } = body;

    if (!studioId) {
      throw new Error("ID do Estúdio (studioId) não identificado no corpo da requisição.");
    }

    // 2. Fetch Stripe Keys from Supabase (Multi-tenant)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const userAuth = req.headers.get('Authorization');

    // Usar Service Role se disponível, senão usar o JWT do usuário (respeitando RLS)
    const supabase = createClient(
      supabaseUrl, 
      serviceKey || Deno.env.get("SUPABASE_ANON_KEY") || "",
      userAuth ? { global: { headers: { Authorization: userAuth } } } : {}
    );

    const { data: integration, error: intErr } = await supabase
      .from("integrations")
      .select("config")
      .eq("studio_id", studioId)
      .eq("provider", "stripe")
      .eq("ativa", true)
      .maybeSingle();

    let secretKey = integration?.config?.secret_key;

    // Fallback para studio_configs (sistema antigo)
    if (!secretKey) {
      const { data: fallback } = await supabase
        .from("studio_configs")
        .select("config")
        .eq("studio_id", studioId)
        .maybeSingle();
      
      secretKey = fallback?.config?.["integrations.stripe.secret_key"] || fallback?.config?.["stripe.secret_key"];
    }

    if (!secretKey) {
      throw new Error("Configuração Stripe não encontrada para este Estúdio. Verifique as chaves em Integrações.");
    }

    const trimmedKey = secretKey.trim();
    if (!trimmedKey.startsWith('sk_')) {
      throw new Error("Chave secreta (Secret Key) do Stripe parece inválida. Deve começar com 'sk_'.");
    }

    const stripe = new Stripe(trimmedKey, {
      httpClient: Stripe.createFetchHttpClient(),
      apiVersion: '2023-10-16',
    });

    const cents = Math.round(amount_cents);
    if (cents < 50) {
      throw new Error("O valor mínimo para pagamentos com cartão é de R$ 0,50.");
    }

    // 3. Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: (description || "Pagamento StudioFlow").slice(0, 100),
            },
            unit_amount: cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      return_url: `https://atelie-9df54.web.app/${return_path || "financeiro"}?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        ...metadata,
        studioId,
      },
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("CRITICAL CHECKOUT ERROR:", error);
    
    // Diagnóstico extra para o desenvolvedor ver no modal
    const debugInfo = {
      message: error.message,
      studio_id_received: (req.method === 'POST' ? 'check_body' : 'no_post'),
      has_stripe_key: false, // Será preenchido se o erro for posterior à busca
      db_error: 'unknown',
      stack_trace: error.stack?.slice(0, 100)
    };
    
    return new Response(JSON.stringify({ 
      error: error.message || "Erro interno no servidor de pagamentos",
      debug: debugInfo
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Forçamos 200 para o navegador permitir ler o corpo do erro
    });
  }
});
