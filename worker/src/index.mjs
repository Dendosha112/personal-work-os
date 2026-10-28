const DEFAULT_ORIGINS = [
  "https://dendosha112.github.io",
  "https://personal-work-os-3mr.pages.dev"
];
const NOTION_VERSION = "2026-03-11";
const MAX_PAGES = 2;

function allowedOrigins(env) {
  const configured = env.API_ALLOWED_ORIGINS || env.API_ALLOWED_ORIGIN;
  return (configured ? configured.split(",") : DEFAULT_ORIGINS)
    .map(value => value.trim())
    .filter(Boolean);
}

function corsHeaders(origin, env) {
  const allowed = allowedOrigins(env);
  if (!origin || !allowed.includes(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(body, status = 200, cors = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff", ...cors }
  });
}

function readTitle(props) {
  const titleProp = props?.["Task name"]?.title || [];
  return titleProp.map(part => part.plain_text || "").join("").trim();
}
function readText(prop) {
  const p = prop || {};
  const rich = p.rich_text || p.title || [];
  return rich.map(part => part.plain_text || "").join("").trim();
}
function readSelect(prop) { return prop?.select?.name || prop?.status?.name || ""; }
function readDate(prop) { return prop?.date?.start || ""; }

function mapTask(page) {
  const p = page.properties || {};
  return {
    id: page.id,
    title: readTitle(p) || "(Untitled task)",
    url: page.url || "",
    status: readSelect(p.Status),
    priority: readSelect(p.Priority),
    area: readSelect(p.Area),
    goal: readSelect(p.Goal),
    dueDate: readDate(p["Due date"]),
    estimatedMinutes: Number.isFinite(p["Estimated minutes"]?.number) ? p["Estimated minutes"].number : null,
    energy: readSelect(p.Energy),
    description: readText(p.Description),
    createdTime: page.created_time || ""
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin, env);
    if (request.method === "OPTIONS") {
      if (!cors) return new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } });
      return new Response(null, { status: 204, headers: cors });
    }
    const url = new URL(request.url);
    if (url.pathname === "/api/health" && request.method === "GET") {
      if (origin && !cors) return json({ error: "origin_not_allowed" }, 403);
      return json({
        ok: true,
        service: "personal-work-os-readonly-connector",
        mode: "read-only",
        configured: Boolean(env.APP_ACCESS_KEY && env.NOTION_API_KEY && env.NOTION_DATA_SOURCE_ID),
        writesEnabled: false,
        aiEnabled: false
      }, 200, cors || {});
    }
    if (!cors) return json({ error: "origin_not_allowed" }, 403);
    if (request.method !== "GET" || url.pathname !== "/api/tasks") return json({ error: "not_found" }, 404, cors);

    const expected = env.APP_ACCESS_KEY;
    const supplied = request.headers.get("Authorization") || "";
    if (!expected || supplied !== `Bearer ${expected}`) return json({ error: "unauthorized" }, 401, cors);
    if (!env.NOTION_API_KEY || !env.NOTION_DATA_SOURCE_ID) return json({ error: "notion_not_configured" }, 503, cors);

    const requestedLimit = Number(url.searchParams.get("limit") || "50");
    const limit = Number.isInteger(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 50;
    const all = [];
    let cursor = undefined;
    let hasMore = true;
    let pageCount = 0;

    try {
      while (hasMore && pageCount < MAX_PAGES && all.length < limit) {
        const body = { page_size: Math.min(100, limit - all.length) };
        if (cursor) body.start_cursor = cursor;
        const response = await fetch(`https://api.notion.com/v1/data_sources/${encodeURIComponent(env.NOTION_DATA_SOURCE_ID)}/query`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.NOTION_API_KEY}`,
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          // Do not return upstream response bodies: they may contain configuration details.
          return json({ error: response.status === 401 || response.status === 403 ? "notion_auth_or_permission_error" : "notion_query_failed", upstreamStatus: response.status }, 502, cors);
        }
        const data = await response.json();
        if (!Array.isArray(data.results)) return json({ error: "invalid_notion_response" }, 502, cors);
        all.push(...data.results.map(mapTask));
        hasMore = Boolean(data.has_more);
        cursor = data.next_cursor || undefined;
        pageCount += 1;
        if (!cursor) hasMore = false;
      }
      return json({
        ok: true,
        mode: "read-only",
        tasks: all.slice(0, limit),
        count: Math.min(all.length, limit),
        truncated: hasMore,
        nextCursorAvailable: Boolean(hasMore && cursor)
      }, 200, cors);
    } catch {
      return json({ error: "connector_unavailable" }, 502, cors);
    }
  }
};
