// supabase/functions/cloud-checkpoint/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- CONFIGURAÇÃO (VIA ENVIRONMENT VARIABLES) ---
const GOOGLE_DRIVE_FOLDER_ID = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID")!;
const GOOGLE_SERVICE_ACCOUNT = JSON.parse(Deno.env.get("GOOGLE_SERVICE_ACCOUNT")!);
// ----------------------------
// ----------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let checkpointId: string | null = null;
  const authHeader = req.headers.get("Authorization")!;
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  try {
    // 1. Verificar Autenticação
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    // 2. Criar Registro no DB
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const { data: cp, error: dbError } = await supabaseClient
      .from("system_checkpoints")
      .insert({ version_label: `cloud-${timestamp}`, status: "processing", triggered_by: user.id })
      .select().single();
    if (dbError) throw dbError;
    checkpointId = cp.id;

    console.log(`🚀 Iniciando checkpoint ${checkpointId}`);

    // 3. Obter Token do Google (Injetado)
    const accessToken = await getGoogleToken(GOOGLE_SERVICE_ACCOUNT);
    console.log("🔑 Handshake com Google Drive concluído.");

    // 4. Obter Connection String
    const pgUrl = Deno.env.get("DATABASE_URL") 
                  || `postgresql://postgres:postgres@supabase-db:5432/postgres`;

    // 5. Gerar e Enviar DB SQL
    console.log("🐘 Gerando Dump SQL (Internal Export)...");
    const dbData = new TextEncoder().encode(await exportViaSQL(supabaseClient));

    console.log("📤 Enviando para o Google Drive...");
    const dbRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}` },
      body: createMultipartBody(`kineos_db_${timestamp}.sql`, "application/sql", dbData, GOOGLE_DRIVE_FOLDER_ID)
    });
    const dbDriveFile = await dbRes.json();
    if (!dbDriveFile.id) throw new Error(`Falha no upload: ${JSON.stringify(dbDriveFile)}`);

    // 6. Finalizar Sucesso
    await supabaseClient
      .from("system_checkpoints")
      .update({ status: "completed", sql_file_id: dbDriveFile.id })
      .eq("id", checkpointId);

    return new Response(JSON.stringify({ ok: true, id: dbDriveFile.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("❌ Erro fatal:", err.message);
    if (checkpointId) {
        await supabaseClient.from("system_checkpoints").update({ status: "failed", error_message: err.message }).eq("id", checkpointId);
    }
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

// --- HELPERS ---

function createMultipartBody(name: string, type: string, content: Uint8Array, folderId?: string) {
    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;
    const metadata = { name, mimeType: type, parents: folderId ? [folderId] : [] };
    const header = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n${delimiter}Content-Type: ${type}\r\n\r\n`;
    const body = new Uint8Array(header.length + content.length + closeDelimiter.length);
    body.set(new TextEncoder().encode(header));
    body.set(content, header.length);
    body.set(new TextEncoder().encode(closeDelimiter), header.length + content.length);
    return body;
}

async function getGoogleToken(creds: any): Promise<string> {
    const header = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const now = Math.floor(Date.now() / 1000);
    const claim = b64(JSON.stringify({
        iss: creds.client_email,
        scope: "https://www.googleapis.com/auth/drive.file",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now
    }));
    const key = await crypto.subtle.importKey(
        "pkcs8",
        pemToBinary(creds.private_key),
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
    );
    
    const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claim}`));
    const jwt = `${header}.${claim}.${b64(new Uint8Array(sig))}`;
    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt })
    });
    const data = await res.json();
    if (!data.access_token) throw new Error("Falha na autenticação Google: " + JSON.stringify(data));
    return data.access_token;
}

function b64(str: string | Uint8Array) {
    const bin = typeof str === "string" ? new TextEncoder().encode(str) : str;
    return btoa(String.fromCharCode(...bin)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function pemToBinary(pem: string) {
    const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, "");
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

async function exportViaSQL(supabase: any) {
  const tables = ["studios", "profiles", "students", "modalities", "classes", "plans", "enrollments", "invoices", "products", "orders", "order_items"];
  let sql = `-- Kineos Backup\n-- Gerado em: ${new Date().toISOString()}\n\n`;
  
  // Processar tabelas em paralelo para máxima velocidade
  const results = await Promise.all(tables.map(async (table) => {
    const { data: rows, error } = await supabase.from(table).select("*");
    if (error || !rows?.length) return "";
    
    let tableSql = `\n-- Table: ${table}\nDELETE FROM public.${table};\n`;
    for (const row of rows) {
      const cols = Object.keys(row).join(", ");
      const vals = Object.values(row).map(v => 
        v === null ? "NULL" : 
        typeof v === 'object' ? `'${JSON.stringify(v).replace(/'/g, "''")}'` :
        `'${String(v).replace(/'/g, "''")}'`
      ).join(", ");
      tableSql += `INSERT INTO public.${table} (${cols}) VALUES (${vals});\n`;
    }
    return tableSql;
  }));

  return sql + results.join("");
}
