import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, notice_id, title, body, data } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let finalTitle = title;
    let finalBody = body;
    let recipients: string[] = [];

    if (notice_id) {
      // 1. Fetch Notice Details
      const { data: notice, error: noticeError } = await supabase
        .from("notices")
        .select("*")
        .eq("id", notice_id)
        .single();
      
      if (noticeError || !notice) throw new Error(`Notice not found: ${notice_id}`);
      
      finalTitle = notice.titulo;
      finalBody = notice.corpo;

      // 2. Fetch specific audience tokens
      // Logic: Get tokens for users belonging to the studio and matching the recipient type
      // For now, let's fetch ALL tokens for that studio_id
      const { data: tokens, error: tokenError } = await supabase
        .from("user_push_tokens")
        .select("token")
        .is("deleted_at", null); // Example filter

      if (tokenError) throw tokenError;
      recipients = (tokens || []).map(t => t.token);

    } else if (user_id) {
      const { data: tokens, error: tokenError } = await supabase
        .from("user_push_tokens")
        .select("token")
        .eq("user_id", user_id);
      
      if (tokenError) throw tokenError;
      recipients = (tokens || []).map(t => t.token);
    }

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ message: "No recipients found" }), { status: 200 });
    }

    // 3. Get FCM Access Token
    const serviceAccount = JSON.parse(Deno.env.get("FCM_SERVICE_ACCOUNT") || "{}");
    if (!serviceAccount.project_id) throw new Error("FCM_SERVICE_ACCOUNT not set");

    const { project_id } = serviceAccount;
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${project_id}/messages:send`;
    const accessToken = await getAccessToken(serviceAccount);

    // 4. Send in parallel
    const results = await Promise.all(recipients.map(async (token) => {
      try {
        const response = await fetch(fcmUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: finalTitle, body: finalBody },
              data: data || {},
              android: { priority: "high", notification: { sound: "default" } }
            },
          }),
        });
        return await response.json();
      } catch (err) {
        return { error: err.message };
      }
    }));

    return new Response(JSON.stringify({ success: true, count: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

// --- GOOGLE AUTH HELPERS ---

async function getAccessToken(serviceAccount: any): Promise<string> {
  const { client_email, private_key } = serviceAccount;
  const header = b64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const claim = b64UrlEncode(JSON.stringify({
    iss: client_email,
    scope: "https://www.googleapis.com/auth/cloud-messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));

  const signature = await sign(`${header}.${claim}`, private_key);
  const jwt = `${header}.${claim}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await res.json();
  if (data.error) throw new Error(`OAuth Error: ${data.error_description || data.error}`);
  return data.access_token;
}

function b64UrlEncode(str: string): string {
  const bin = new TextEncoder().encode(str);
  return btoa(String.fromCharCode(...bin))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function sign(text: string, pem: string): Promise<string> {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length).replace(/\s/g, "");
  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(text),
  );

  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
