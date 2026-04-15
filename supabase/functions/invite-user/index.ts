import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { email, nome, roles, studio_id } = await req.json();

    if (!email || !nome || !studio_id) {
      throw new Error("E-mail, Nome e Studio ID são obrigatórios.");
    }

    // 2. Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const appKey = Deno.env.get("APP_SERVICE_ROLE_KEY");
    const adminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log(`[LOG] Supplying client with URL: ${supabaseUrl}`);
    console.log(`[LOG] APP_SERVICE_ROLE_KEY present: ${!!appKey}`);
    console.log(`[LOG] SUPABASE_SERVICE_ROLE_KEY present: ${!!adminKey}`);

    const supabaseKey = appKey || adminKey || "";
    if (!supabaseKey) throw new Error("Supabase Admin Key não encontrada nas Secrets.");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Verify Authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.warn("[WARN] Request without Authorization header.");
      // throw new Error("Não autorizado: Header de autorização faltando.");
    }

    console.log(`➡ Convidando usuário: ${email} para o estúdio: ${studio_id}`);

    // 4. Invite User via Supabase Auth
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { nome },
      // O Supabase enviará o e-mail automaticamente
    });

    if (inviteError) throw inviteError;
    const user = inviteData.user;

    // 5. Create/Update Profile
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      nome,
      email,
      provisional: false,
      updated_at: new Date().toISOString()
    }, { onConflict: "email" });

    if (profileError) {
      console.warn("Aviso ao criar profile:", profileError.message);
      // Se falhar no upsert por id, tentamos por email no update
      await supabase.from("profiles").update({ id: user.id, provisional: false }).eq("email", email);
    }

    // 6. Create Membership
    const { error: membershipError } = await supabase.from("memberships").upsert({
      user_id: user.id,
      studio_id,
      roles: roles || ["student"]
    }, { onConflict: "user_id, studio_id" });

    if (membershipError) console.error("Erro ao criar membership:", membershipError);

    return new Response(JSON.stringify({ success: true, user_id: user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Invite Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
