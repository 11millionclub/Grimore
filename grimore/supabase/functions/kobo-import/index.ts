// GriMore — kobo-import Edge Function
//
// POST the raw bytes of a Kobo e-reader's .kobo/KoboReader.sqlite with the
// reader's Supabase session in the Authorization header. Returns the books
// the reader has opened or highlighted (with status and progress) and their
// highlights. Nothing is stored: the file is read in memory and discarded,
// and the app writes the results to the reader's library itself (under RLS).

import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import initSqlJs from "npm:sql.js@1.13.0/dist/sql-asm.js";

import { readKobo } from "./kobo.ts";

const MAX_BYTES = 80 * 1024 * 1024;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: user, error: userError } = await userClient.auth.getUser();
  if (userError || !user.user) return json({ error: "not_authenticated" }, 401);

  // Kill switch (app_config.kobo_import_enabled / writes_paused) and 10 imports per hour per reader.
  const { error: guard } = await userClient.rpc("begin_edge_call", { p_fn: "kobo_import" });
  if (guard) {
    const msg = guard.message ?? "";
    for (const code of ["feature_paused", "writes_paused", "rate_limited"]) {
      if (msg.includes(code)) return json({ error: code }, code === "rate_limited" ? 429 : 503);
    }
    return json({ error: "could_not_start" }, 400);
  }

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) return json({ error: "too_large" }, 413);
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) return json({ error: "too_large" }, 413);
  // Every SQLite file starts with this 16-byte header.
  if (new TextDecoder().decode(bytes.slice(0, 15)) !== "SQLite format 3") return json({ error: "not_a_kobo_database" }, 400);

  const SQL = await initSqlJs();
  let db: InstanceType<typeof SQL.Database> | null = null;
  try {
    db = new SQL.Database(bytes);
    const result = readKobo(db);
    if (!result) return json({ error: "not_a_kobo_database" }, 400);
    return json(result);
  } catch {
    return json({ error: "not_a_kobo_database" }, 400);
  } finally {
    db?.close();
  }
});
