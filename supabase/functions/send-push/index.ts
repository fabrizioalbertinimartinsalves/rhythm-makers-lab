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
    const { user_id, title, body, data } = await req.json();

    if (!user_id || !title || !body) {
      throw new Error("Missing required fields: user_id, title, body");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch tokens for the user
    const { data: tokens, error: tokenError } = await supabase
      .from("user_push_tokens")
      .select("token")
      .eq("user_id", user_id);

    if (tokenError) throw tokenError;
    if (!tokens || tokens.length === 0) {
      console.log(`No push tokens found for user ${user_id}`);
      return new Response(JSON.stringify({ message: "No tokens found" }), { status: 200 });
    }

    // 2. Get FCM Access Token (requires Service Account JSON)
    // In a self-hosted env, we usually inject this via env var or file
    const serviceAccount = JSON.parse(Deno.env.get("FCM_SERVICE_ACCOUNT") || "{}");
    if (!serviceAccount.project_id) {
       throw new Error("FCM_SERVICE_ACCOUNT environment variable not set or invalid");
    }

    const { project_id } = serviceAccount;
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${project_id}/messages:send`;

    // Function to get OAuth2 token for FCM
    // Note: In Deno Edge Functions, we typically use a library or a manual JWT sign
    // For simplicity in this script, we assume the user will use a tool to send this, 
    // but here is the logic for a custom implementation if needed.
    const accessToken = await getAccessToken(serviceAccount);

    const results = await Promise.all(tokens.map(async (t) => {
      try {
        const response = await fetch(fcmUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token: t.token,
              notification: { title, body },
              data: data || {},
              android: {
                priority: "high",
                notification: {
                  sound: "default",
                  click_action: "TOP_LEVEL_SCENE",
                }
              }
            },
          }),
        });
        return await response.json();
      } catch (err) {
        return { error: err.message };
      }
    }));

    return new Response(JSON.stringify({ success: true, results }), {
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
