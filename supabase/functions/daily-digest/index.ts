// supabase/functions/daily-digest/source.ts
import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import webpush from "npm:web-push@3.6.7";

// public/daily-summary.js
function digestDate(now = /* @__PURE__ */ new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

// supabase/functions/daily-digest/source.ts
var origin = "https://fontanella22.github.io";
var headers = { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type,x-job-secret", "Access-Control-Allow-Methods": "POST,OPTIONS", "Content-Type": "application/json" };
var reply = (status, body) => new Response(JSON.stringify(body), { status, headers });
async function equalSecret(a, b) {
  const hash = async (s) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  const [x, y] = await Promise.all([hash(a), hash(b)]);
  let difference = 0;
  for (let i = 0; i < x.length; i++) difference |= x[i] ^ y[i];
  return difference === 0;
}
function validEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && !url.username && !url.password && ((/* @__PURE__ */ new Set(["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"])).has(url.hostname) || /^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname));
  } catch {
    return false;
  }
}
Deno.serve(async (req) => {
  if (req.headers.get("origin") && req.headers.get("origin") !== origin) return reply(403, { error: "Forbidden" });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });
  let input;
  try {
    input = await req.json();
  } catch {
    return reply(400, { error: "Invalid request" });
  }
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return reply(503, { error: "Server configuration missing" });
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY"), privateKey = Deno.env.get("VAPID_PRIVATE_KEY"), jobSecret = Deno.env.get("PUSH_JOB_SECRET");
  if (input.action === "config") {
    const authorization = req.headers.get("authorization") || "";
    const client = createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const token = authorization.replace(/^Bearer /i, "");
    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) return reply(401, { error: "Unauthorized" });
    const { data: member, error: memberError } = await client.from("site_members").select("role").eq("user_id", user.id).maybeSingle();
    if (memberError || !member) return reply(403, { error: "Forbidden" });
    if (!publicKey || !privateKey || !jobSecret) return reply(503, { error: "Push setup incomplete" });
    return reply(200, { publicKey });
  }
  if (input.action !== "dispatch" || !jobSecret || jobSecret.length < 32 || !await equalSecret(req.headers.get("x-job-secret") || "", jobSecret)) return reply(401, { error: "Unauthorized" });
  if (!publicKey || !privateKey) return reply(503, { error: "Push setup incomplete" });
  try {
    webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "https://fontanella22.github.io/teste/", publicKey, privateKey);
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const day = digestDate();
    const { data: devices, error } = await admin.rpc("claim_daily_push", { p_day: day });
    if (error) throw error;
    const payload = JSON.stringify({ type: "daily-summary", day });
    let accepted = 0, failed = 0;
    for (let i = 0; i < devices.length; i += 10) await Promise.all(devices.slice(i, i + 10).map(async (device) => {
      let success = false, expired = false;
      try {
        if (!validEndpoint(device.endpoint)) {
          expired = true;
          throw new Error("Invalid endpoint");
        }
        await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, payload, { TTL: 43200, urgency: "normal", timeout: 1e4 });
        success = true;
        accepted++;
      } catch (error2) {
        expired ||= [404, 410].includes(error2.statusCode);
        failed++;
      }
      if (expired) await admin.from("push_subscriptions").update({ active: false }).eq("id", device.delivery_id);
      const { error: writeError } = await admin.from("push_deliveries").update({ status: success ? "sent" : "failed", delivered_at: success ? (/* @__PURE__ */ new Date()).toISOString() : null }).eq("day", day).eq("subscription_id", device.delivery_id);
      if (writeError) throw writeError;
    }));
    return reply(200, { day, accepted, failed });
  } catch {
    return reply(500, { error: "Dispatch failed; inspect server configuration. No subscription details are logged." });
  }
});
