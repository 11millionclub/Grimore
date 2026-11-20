// GriMore — scan-shelf Edge Function
//
// POST { image: <base64 JPEG/PNG/WebP>, media_type, mode: "shelf" | "quote" }
// with the reader's Supabase session in the Authorization header.
//
//   shelf  -> the book spines Claude can read, matched against the catalogue
//   quote  -> the sentences on a photographed page, so the reader can pick one
//
// Secrets (Supabase dashboard -> Edge Functions -> Secrets): ANTHROPIC_API_KEY.
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided by
// the platform and never leave the server.

import Anthropic from "npm:@anthropic-ai/sdk@1.11.0";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const MODEL = "claude-opus-5-5";
const MAX_IMAGE_BASE64 = 7_000_000; // ~5 MB image
const MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SHELF_SCHEMA = {
  type: "object",
  properties: {
    books: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          author: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["title", "author", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["books"],
  additionalProperties: false,
};

const QUOTE_SCHEMA = {
  type: "object",
  properties: {
    sentences: { type: "array", items: { type: "string" } },
    page: { type: ["integer", "null"] },
  },
  required: ["sentences", "page"],
  additionalProperties: false,
};

const SHELF_PROMPT = `This photo shows books on a shelf, a pile or a table. Read every spine or cover you can.
For each book, give the title and author as printed (author may be "" if not visible) and a confidence from 0 to 1
that you read it correctly. Correct obvious OCR slips to the real published title when you are sure. Do not
invent books you cannot see; skip spines you cannot read. Order them left to right, top to bottom.`;

const QUOTE_PROMPT = `This photo shows a page of a book. Transcribe the readable text as a list of complete
sentences, in reading order, keeping the original wording and punctuation. Leave out running headers and
footnotes. If a page number is printed, return it as "page", otherwise null.`;

type ShelfBook = { title: string; author: string; confidence: number };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "scanner_not_configured" }, 503);

  const auth = req.headers.get("Authorization") ?? "";
  const url = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "not_authenticated" }, 401);

  let body: { image?: unknown; media_type?: unknown; mode?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const image = typeof body.image === "string" ? body.image.replace(/^data:[^,]+,/, "") : "";
  const mediaType = typeof body.media_type === "string" ? body.media_type : "image/jpeg";
  const mode = body.mode === "quote" ? "quote" : "shelf";
  if (!image || image.length > MAX_IMAGE_BASE64 || !/^[A-Za-z0-9+/=\s]+$/.test(image)) {
    return json({ error: "invalid_image" }, 400);
  }
  if (!MEDIA_TYPES.has(mediaType)) return json({ error: "unsupported_media_type" }, 400);

  // Inserted as the reader so RLS and the per-user rate limit (30/hour) apply.
  const { data: job, error: jobError } = await userClient
    .from("scan_jobs")
    .insert({ user_id: userData.user.id, source: mode === "quote" ? "quote_photo" : "shelf_photo", status: "processing" })
    .select("id")
    .single();
  if (jobError || !job) {
    const limited = jobError?.code === "P0429";
    return json({ error: limited ? "rate_limited" : "could_not_start" }, limited ? 429 : 400);
  }
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const fail = async (code: string, status: number) => {
    await admin.from("scan_jobs").update({ status: "failed", error: code, completed_at: new Date().toISOString() }).eq("id", job.id);
    return json({ error: code }, status);
  };

  const client = new Anthropic({ apiKey });
  let parsed: unknown;
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: mode === "quote" ? QUOTE_SCHEMA : SHELF_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg", data: image.replace(/\s/g, "") } },
            { type: "text", text: mode === "quote" ? QUOTE_PROMPT : SHELF_PROMPT },
          ],
        },
      ],
    });
    if (response.stop_reason === "refusal") return await fail("refused", 422);
    if (response.stop_reason === "max_tokens") return await fail("too_much_text", 422);
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    parsed = JSON.parse(text);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return await fail("busy", 503);
    if (error instanceof Anthropic.AuthenticationError) return await fail("scanner_not_configured", 503);
    if (error instanceof Anthropic.BadRequestError) return await fail("unreadable_image", 422);
    if (error instanceof Anthropic.APIError) return await fail("scanner_unavailable", 502);
    if (error instanceof SyntaxError) return await fail("unreadable_result", 502);
    throw error;
  }

  if (mode === "quote") {
    const q = parsed as { sentences?: unknown; page?: unknown };
    const sentences = Array.isArray(q.sentences)
      ? q.sentences.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim().slice(0, 1000)).slice(0, 80)
      : [];
    await admin.from("scan_jobs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", job.id);
    return json({ job_id: job.id, sentences, page: typeof q.page === "number" ? q.page : null });
  }

  const raw = (parsed as { books?: unknown }).books;
  const books: ShelfBook[] = Array.isArray(raw)
    ? raw
        .filter((b): b is ShelfBook => !!b && typeof b.title === "string" && b.title.trim().length > 0)
        .map((b) => ({
          title: b.title.trim().slice(0, 300),
          author: typeof b.author === "string" ? b.author.trim().slice(0, 200) : "",
          confidence: typeof b.confidence === "number" ? Math.min(1, Math.max(0, b.confidence)) : 0.5,
        }))
        .slice(0, 60)
    : [];

  // Match against the catalogue (the app falls back to Open Library for misses).
  const results = await Promise.all(
    books.map(async (b) => {
      const { data } = await userClient.rpc("search_catalogue", { p_query: b.title, p_limit: 5 });
      const rows = (Array.isArray(data) ? data : []) as { id: string; title: string; authors: string | null; score: number | null }[];
      const surname = b.author.split(/\s+/).pop()?.toLowerCase() ?? "";
      const hit =
        rows.find((r) => (r.score ?? 0) >= 0.35 && (!surname || (r.authors ?? "").toLowerCase().includes(surname))) ??
        (b.author ? null : rows.find((r) => (r.score ?? 0) >= 0.6)) ??
        null;
      return { ...b, match: hit };
    }),
  );

  if (results.length > 0) {
    await admin.from("scan_candidates").insert(
      results.map((r) => ({
        job_id: job.id,
        raw_text: r.author ? `${r.title} — ${r.author}` : r.title,
        matched_book_id: r.match?.id ?? null,
        confidence: r.confidence,
      })),
    );
  }
  await admin.from("scan_jobs").update({ status: "review", completed_at: new Date().toISOString() }).eq("id", job.id);
  return json({ job_id: job.id, books: results });
});
