import { Router, type IRouter } from "express";
import { db, payloadsTable } from "@workspace/db";
import { eq, ilike, or, and, sql } from "drizzle-orm";

const FALLBACK_PAYLOADS = [
  {
    id: 1,
    category: "XSS",
    subcategory: "Reflected",
    title: "Basic script alert",
    payload: `<script>alert(1)</script>`,
    description: "Reflected XSS using a classic script tag.",
    isBypass: false,
    bypassType: null,
    tags: ["xss"],
    platform: null,
  },
  {
    id: 2,
    category: "SQLi",
    subcategory: "Auth bypass",
    title: "Auth bypass classic",
    payload: `' OR '1'='1`,
    description: "Classic SQL injection login bypass payload.",
    isBypass: false,
    bypassType: null,
    tags: ["sqli"],
    platform: null,
  },
  {
    id: 3,
    category: "CSRF",
    subcategory: "Form attack",
    title: "Auto-submit CSRF form",
    payload: `<form action="/api/lab/csrf/transfer" method="POST"><input name="to" value="attacker"><input name="amount" value="9999"></form><script>document.forms[0].submit()</script>`,
    description: "Hidden form CSRF payload that auto-submits to the transfer endpoint.",
    isBypass: false,
    bypassType: null,
    tags: ["csrf"],
    platform: null,
  },
  {
    id: 4,
    category: "LFI",
    subcategory: "Path traversal",
    title: "File read traversal",
    payload: `../../../../etc/passwd`,
    description: "Path traversal and local file inclusion simulation.",
    isBypass: true,
    bypassType: null,
    tags: ["lfi"],
    platform: null,
  },
];

function filterFallbackPayloads(
  category: string | undefined,
  bypass: string | undefined,
  search: string | undefined,
) {
  const normalizedSearch = search?.trim().toLowerCase();

  return FALLBACK_PAYLOADS.filter((payload) => {
    if (category && category !== "ALL" && payload.category !== category) {
      return false;
    }
    if (bypass === "true" && !payload.isBypass) {
      return false;
    }
    if (normalizedSearch) {
      const haystack = [payload.title, payload.payload, payload.description, payload.subcategory]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(normalizedSearch)) {
        return false;
      }
    }
    return true;
  });
}

function getFallbackStats() {
  const total = FALLBACK_PAYLOADS.length;
  const bypassCount = FALLBACK_PAYLOADS.filter((payload) => payload.isBypass).length;
  const byCategory = Object.entries(
    FALLBACK_PAYLOADS.reduce<Record<string, number>>((acc, payload) => {
      acc[payload.category] = (acc[payload.category] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([category, count]) => ({ category, count }));

  return { total, bypassCount, byCategory };
}

const router: IRouter = Router();

const VALID_CATEGORIES = [
  "XSS", "SQLi", "CSRF", "LFI", "SSRF", "XXE", "RCE", "IDOR",
  "Open Redirect", "SSTI", "Path Traversal", "Command Injection"
] as const;

router.get("/payloads", async (req, res): Promise<void> => {
  try {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const bypass = req.query.bypass as string | undefined;
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10)));
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [];

    if (category && VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
      conditions.push(eq(payloadsTable.category, category as (typeof VALID_CATEGORIES)[number]));
    }
    if (bypass === "true") {
      conditions.push(eq(payloadsTable.isBypass, true));
    }

    const searchConditions = search
      ? or(
          ilike(payloadsTable.title, `%${search}%`),
          ilike(payloadsTable.payload, `%${search}%`),
          ilike(payloadsTable.description, `%${search}%`),
          ilike(payloadsTable.subcategory, `%${search}%`)
        )
      : undefined;

    const whereClause = conditions.length > 0
      ? (searchConditions ? and(...conditions, searchConditions) : and(...conditions))
      : searchConditions;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(payloadsTable)
      .where(whereClause);

    const payloads = await db
      .select()
      .from(payloadsTable)
      .where(whereClause)
      .orderBy(payloadsTable.id)
      .limit(limit)
      .offset(offset);

    res.json({
      payloads,
      meta: { total: count, page, limit, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    console.warn("Payloads DB query failed, using fallback payloads:", err instanceof Error ? err.message : err);
    const category = req.query.category as string | undefined;
    const bypass = req.query.bypass as string | undefined;
    const search = req.query.search as string | undefined;
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10)));
    const offset = (page - 1) * limit;
    const filtered = filterFallbackPayloads(category, bypass, search);
    const payloads = filtered.slice(offset, offset + limit);
    res.json({
      payloads,
      meta: { total: filtered.length, page, limit, pages: Math.max(1, Math.ceil(filtered.length / limit)) },
    });
  }
});

router.get("/payloads/categories", async (req, res): Promise<void> => {
  try {
  const rows = await db
    .select({
      category: payloadsTable.category,
      count: sql<number>`count(*)::int`,
    })
    .from(payloadsTable)
    .groupBy(payloadsTable.category);

  res.json({ categories: rows });
  } catch (err) {
    console.warn("Payload categories DB query failed, using fallback categories:", err instanceof Error ? err.message : err ?? err);
    const categories = Object.entries(
      FALLBACK_PAYLOADS.reduce<Record<string, number>>((acc, payload) => {
        acc[payload.category] = (acc[payload.category] ?? 0) + 1;
        return acc;
      }, {}),
    ).map(([category, count]) => ({ category, count }));
    res.json({ categories });
  }
});

router.get("/payloads/stats/overview", async (req, res): Promise<void> => {
  try {
  const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(payloadsTable);
  const byCategory = await db
    .select({ category: payloadsTable.category, count: sql<number>`count(*)::int` })
    .from(payloadsTable)
    .groupBy(payloadsTable.category);
  const bypassCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(payloadsTable)
    .where(eq(payloadsTable.isBypass, true));

  res.json({
    total: total.count,
    bypassCount: bypassCount[0].count,
    byCategory,
  });
  } catch (err) {
    console.warn("Payload stats DB query failed, using fallback stats:", err instanceof Error ? err.message : err ?? err);
    res.json(getFallbackStats());
  }
});

router.get("/payloads/:id", async (req, res): Promise<void> => {
  try {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const [payload] = await db.select().from(payloadsTable).where(eq(payloadsTable.id, id));
  if (!payload) {
    res.status(404).json({ error: "Payload not found" });
    return;
  }
  await db.update(payloadsTable).set({ views: payload.views + 1 }).where(eq(payloadsTable.id, id));
  res.json(payload);
  } catch (err) {
    console.warn("Payload detail DB query failed, using fallback lookup:", err instanceof Error ? err.message : err);
    const fallbackId = parseInt(String(req.params.id), 10);
    const fallback = FALLBACK_PAYLOADS.find((p) => p.id === fallbackId);
    if (!fallback) {
      res.status(404).json({ error: "Payload not found" });
      return;
    }
    res.json(fallback);
  }
});

export default router;
