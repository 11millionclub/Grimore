// Reads books, progress and highlights out of a Kobo e-reader's KoboReader.sqlite.
// Kept free of Deno APIs so it can be unit-tested under Node with sql.js.

export type SqlDb = { exec: (sql: string) => { columns: string[]; values: unknown[][] }[] };

export type KoboBook = {
  title: string;
  authors: string[];
  isbn?: string;
  status: "read" | "reading" | "want_to_read";
  percent?: number;
};
export type KoboHighlight = { title: string; author: string; text: string };

const rows = (db: SqlDb, sql: string) => {
  const [r] = db.exec(sql);
  if (!r) return [] as Record<string, unknown>[];
  return r.values.map((v) => Object.fromEntries(r.columns.map((c, i) => [c, v[i]])));
};
const columns = (db: SqlDb, table: string) => new Set(rows(db, `PRAGMA table_info(${table})`).map((r) => String(r.name)));
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function readKobo(db: SqlDb): { books: KoboBook[]; highlights: KoboHighlight[] } | null {
  const content = columns(db, "content");
  if (!content.has("ContentID") || !content.has("ContentType") || !content.has("Title")) return null;
  const pct = content.has("___PercentRead") ? "___PercentRead" : "0";
  const isbn = content.has("ISBN") ? "ISBN" : "''";
  const bookmark = columns(db, "Bookmark");
  const hasBookmarks = bookmark.has("VolumeID") && bookmark.has("Text");

  // ContentType 6 is a whole book (chapters are 9). Store previews and
  // untouched purchases are left out: only books opened or highlighted.
  const highlightCount = hasBookmarks
    ? `(SELECT COUNT(*) FROM Bookmark b WHERE b.VolumeID = c.ContentID AND b.Text IS NOT NULL AND TRIM(b.Text) <> '')`
    : "0";
  const bookRows = rows(
    db,
    `SELECT c.ContentID AS id, c.Title AS title, c.Attribution AS author, ${isbn} AS isbn,
            COALESCE(c.ReadStatus, 0) AS status, COALESCE(${pct}, 0) AS pct, ${highlightCount} AS hl
       FROM content c
      WHERE c.ContentType = 6 AND c.Title IS NOT NULL
        AND (COALESCE(c.ReadStatus, 0) > 0 OR COALESCE(${pct}, 0) > 0 OR ${highlightCount} > 0)
      LIMIT 3000`,
  );

  const byId = new Map<string, KoboBook>();
  for (const r of bookRows) {
    const title = str(r.title).slice(0, 300);
    if (!title) continue;
    const status = Number(r.status) === 2 ? "read" : "reading"; // opened, part-read or highlighted
    const digits = str(r.isbn).replace(/[^0-9Xx]/g, "").toUpperCase();
    byId.set(String(r.id), {
      title,
      authors: str(r.author).split(/\s*[,&;]\s*|\s+and\s+/).filter(Boolean).slice(0, 4),
      isbn: digits.length === 10 || digits.length === 13 ? digits : undefined,
      status,
      percent: status === "reading" ? Math.max(0, Math.min(100, Math.round(Number(r.pct) || 0))) : undefined,
    });
  }

  const highlights: KoboHighlight[] = [];
  if (hasBookmarks) {
    const hidden = bookmark.has("Hidden") ? "AND COALESCE(Hidden, 'false') <> 'true'" : "";
    const order = bookmark.has("DateCreated") ? "ORDER BY DateCreated" : "";
    for (const r of rows(db, `SELECT VolumeID AS id, Text AS text FROM Bookmark WHERE Text IS NOT NULL AND TRIM(Text) <> '' ${hidden} ${order} LIMIT 5000`)) {
      const b = byId.get(String(r.id));
      const text = str(r.text).replace(/\s+/g, " ");
      if (b && text) highlights.push({ title: b.title, author: b.authors[0] ?? "", text: text.slice(0, 600) });
    }
  }
  return { books: [...byId.values()], highlights };
}
