import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, new_email, studio_id } = await req.json();

    if (!user_id || !new_email) {
      throw new Error("User ID e Novo E-mail são obrigatórios.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const appServiceKey = Deno.env.get("APP_SERVICE_ROLE_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    // Prioridade para APP_SERVICE_ROLE_KEY que acabamos de configurar
    const supabaseKey = appServiceKey || supabaseServiceKey || "";
    
    if (!supabaseKey) {
      console.error("[ERROR] Nenhuma chave de serviço encontrada (APP_SERVICE_ROLE_KEY ou SUPABASE_SERVICE_ROLE_KEY).");
      throw new Error("Chave de serviço (Admin) não configurada na Edge Function. Verifique os Secrets.");
    }

    console.log(`[LOG] Usando chave: ${appServiceKey ? "APP_SERVICE_ROLE_KEY" : "SUPABASE_SERVICE_ROLE_KEY"}`);

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });

    console.log(`[LOG] Iniciando atualização de e-mail para o usuário: ${user_id}`);
    console.log(`[LOG] Novo e-mail solicitado: ${new_email}`);

    // 1. Atualizar no Auth (Supabase Auth Admin API)
    console.log("[LOG] Tentando atualizar auth.users...");
    const { data: userData, error: authError } = await supabase.auth.admin.updateUserById(user_id, {
      email: new_email,
      email_confirm: true,
    });

    if (authError) {
      console.error("[ERROR] Falha ao atualizar auth.users:", authError.message);
      // Se o erro for "Email already exists", retornamos uma mensagem amigável
      if (authError.message.toLowerCase().includes("already exists")) {
        throw new Error("Este e-mail já está sendo usado por outro usuário.");
      }
      throw authError;
    }
    console.log("[LOG] auth.users atualizado com sucesso.");

    // 2. Atualizar no Profiles (public.profiles)
    console.log("[LOG] Tentando atualizar public.profiles...");
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ email: new_email, updated_at: new Date().toISOString() })
      .eq("id", user_id);

    if (profileError) {
      console.warn("[WARN] Erro ao atualizar profile:", profileError.message);
      // Não lançamos erro aqui para não travar o processo se o auth já foi alterado
    } else {
      console.log("[LOG] public.profiles atualizado.");
    }

    // 3. Atualizar no Students (public.students)
    console.log("[LOG] Tentando atualizar public.students...");
    const { error: studentError } = await supabase
      .from("students")
      .update({ email: new_email })
      .eq("user_id", user_id);
    
    if (studentError) {
      console.warn("[WARN] Erro ao atualizar student:", studentError.message);
    } else {
      console.log("[LOG] public.students atualizado.");
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "E-mail atualizado com sucesso.",
      details: { auth: "ok", profiles: profileError ? "fail" : "ok", students: studentError ? "fail" : "ok" }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("[CRITICAL ERROR] Update Email catch block:", error.message);
    return new Response(JSON.stringify({ 
      error: error.message,
      code: error.code || "UNKNOWN_ERROR"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
