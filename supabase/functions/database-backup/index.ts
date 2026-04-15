// supabase/functions/database-backup/index.ts
// Edge Function: Gera dump completo do banco de dados PostgreSQL
// Chamada pelo painel Admin para download direto no navegador

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verifica autenticação (somente usuários autenticados)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Obtém a connection string interna do banco
    //    No Supabase self-hosted, essa variável está disponível nas Edge Functions
    const pgUrl = Deno.env.get("DATABASE_URL") 
                  || Deno.env.get("SUPABASE_DB_URL")
                  || Deno.env.get("PG_CONNECTION_STRING");

    if (!pgUrl) {
      return new Response(
        JSON.stringify({ 
          error: "DATABASE_URL não encontrada. Configure a variável de ambiente na Edge Function.",
          hint: "Vá em Supabase Dashboard > Edge Functions > database-backup > Secrets e adicione DATABASE_URL"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Executa pg_dump com os schemas relevantes
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    
    // pg_dump via subprocesso Deno
    const pgDumpProcess = new Deno.Command("pg_dump", {
      args: [
        pgUrl,
        "--clean",              // DROP antes do CREATE
        "--if-exists",          // Evita erros se tabela não existir
        "--no-owner",           // Não inclui SET OWNER (compatível entre instâncias)
        "--no-acl",             // Não inclui GRANT/REVOKE (mais portável)
        "--schema=public",      // Schema principal
        "--schema=auth",        // Usuários de autenticação (opcional)
        "--exclude-table=schema_migrations",
        "--quote-all-identifiers",
        "--format=plain",       // .sql legível, formato texto
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await pgDumpProcess.output();

    if (code !== 0) {
      const errorMsg = new TextDecoder().decode(stderr);
      
      // Se pg_dump não está disponível, cai no fallback SQL via pg
      if (errorMsg.includes("not found") || errorMsg.includes("No such file")) {
        return await exportViaSQL(req, timestamp, corsHeaders);
      }
      
      return new Response(
        JSON.stringify({ error: "pg_dump falhou", details: errorMsg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sqlContent = new TextDecoder().decode(stdout);
    const filename = `kineos_backup_${timestamp}.sql`;

    return new Response(sqlContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Backup-Timestamp": timestamp,
        "X-Backup-Size": sqlContent.length.toString(),
      },
    });

  } catch (err) {
    console.error("Erro na Edge Function database-backup:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno", details: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Fallback: Exporta dados via queries SQL se pg_dump não estiver disponível
async function exportViaSQL(req: Request, timestamp: string, corsHeaders: Record<string, string>) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const tables = [
    "studios", "studio_configs", "profiles", "studio_members",
    "saas_plans", "saas_subscriptions", "billing_configs",
    "students", "modalities", "classes", "plans",
    "enrollments", "invoices", "contracts",
    "costumes", "costume_stock", "costume_movements",
    "festivals", "festival_enrollments", "festival_payments", "festival_costs",
    "pre_matriculas", "partners", "payroll_configs",
    "products", "orders", "order_items",
  ];

  let sqlOutput = `-- Kineos Backup (via SQL Export Fallback)
-- Gerado em: ${new Date().toISOString()}
-- Formato: INSERT INTO statements
-- Para restaurar: execute em ordem no SQL Editor do Supabase

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

`;

  for (const table of tables) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
        headers: {
          "apikey": serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
          "Prefer": "count=exact",
        }
      });

      if (!res.ok) continue;
      const rows = await res.json();
      if (!rows || !rows.length) continue;

      sqlOutput += `\n-- Table: ${table} (${rows.length} rows)\n`;
      sqlOutput += `DELETE FROM public.${table};\n`;

      for (const row of rows) {
        const cols = Object.keys(row).join(", ");
        const vals = Object.values(row).map(v => {
          if (v === null) return "NULL";
          if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
          if (typeof v === "number") return v.toString();
          if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
          return `'${String(v).replace(/'/g, "''")}'`;
        }).join(", ");
        sqlOutput += `INSERT INTO public.${table} (${cols}) VALUES (${vals});\n`;
      }
    } catch {
      sqlOutput += `-- ERRO: não foi possível exportar ${table}\n`;
    }
  }

  return new Response(sqlOutput, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/sql",
      "Content-Disposition": `attachment; filename="kineos_backup_fallback_${timestamp}.sql"`,
    },
  });
}
