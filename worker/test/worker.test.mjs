import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.mjs";

const origin = "https://dendosha112.github.io";
const cloudflarePagesOrigin = "https://personal-work-os-3mr.pages.dev";
const env = { API_ALLOWED_ORIGINS: `${origin},${cloudflarePagesOrigin}`, APP_ACCESS_KEY: "test-long-random-key", NOTION_API_KEY: "notion-secret", NOTION_DATA_SOURCE_ID: "1fd4bebd-e186-80be-91d8-000b71cdb176" };

test("health reveals configuration state but not secrets and says read-only", async () => {
  const res = await worker.fetch(new Request("https://api.test/api/health", { headers: { Origin: origin } }), env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.configured, true);
  assert.equal(body.writesEnabled, false);
  assert.equal(body.aiEnabled, false);
  assert.equal(JSON.stringify(body).includes("notion-secret"), false);
});

test("rejects unknown browser origins", async () => {
  const res = await worker.fetch(new Request("https://api.test/api/tasks", { headers: { Origin: "https://evil.example" } }), env);
  assert.equal(res.status, 403);
});

test("allows the Cloudflare Pages frontend origin", async () => {
  const res = await worker.fetch(new Request("https://api.test/api/health", { headers: { Origin: cloudflarePagesOrigin } }), env);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), cloudflarePagesOrigin);
});

test("tasks route requires bearer secret", async () => {
  const res = await worker.fetch(new Request("https://api.test/api/tasks", { headers: { Origin: origin } }), env);
  assert.equal(res.status, 401);
});

test("classification route requires the app bearer key", async () => {
  const aiEnv = { ...env, AI: { run: async () => { throw new Error("AI should not be called without auth"); } } };
  const res = await worker.fetch(new Request("https://api.test/api/classify", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Plan my week" })
  }), aiEnv);
  assert.equal(res.status, 401);
});

test("classification uses Workers AI and returns a validated route", async () => {
  let selectedModel = "";
  let modelInput;
  const aiEnv = {
    ...env,
    AI: {
      run: async (model, input) => {
        selectedModel = model;
        modelInput = input;
        return { response: { kind: "planning", confidence: 0.91, reason: "Coordinates several tasks and areas.", needsClarification: false } };
      }
    }
  };
  const res = await worker.fetch(new Request("https://api.test/api/classify", {
    method: "POST",
    headers: { Origin: origin, Authorization: "Bearer test-long-random-key", "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Plan next week's school and coaching work" })
  }), aiEnv);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.provider, "Cloudflare Workers AI");
  assert.equal(body.kind, "planning");
  assert.equal(body.confidence, 0.91);
  assert.equal(body.needsClarification, false);
  assert.equal(selectedModel, "@cf/meta/llama-3.3-70b-instruct-fp8-fast");
  assert.equal(modelInput.temperature, 0);
  assert.equal(modelInput.response_format.type, "json_schema");
  assert.match(modelInput.messages[1].content, /school and coaching/);
});

test("classification returns unavailable when the AI binding is missing", async () => {
  const res = await worker.fetch(new Request("https://api.test/api/classify", {
    method: "POST",
    headers: { Origin: origin, Authorization: "Bearer test-long-random-key", "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Plan my week" })
  }), env);
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, "ai_not_configured");
});

test("classification rejects oversized and empty requests before model inference", async () => {
  const aiEnv = { ...env, AI: { run: async () => { throw new Error("AI should not be called for invalid input"); } } };
  const empty = await worker.fetch(new Request("https://api.test/api/classify", {
    method: "POST",
    headers: { Origin: origin, Authorization: "Bearer test-long-random-key", "Content-Type": "application/json" },
    body: JSON.stringify({ text: "   " })
  }), aiEnv);
  assert.equal(empty.status, 400);
  assert.equal((await empty.json()).error, "text_required");
  const oversized = await worker.fetch(new Request("https://api.test/api/classify", {
    method: "POST",
    headers: { Origin: origin, Authorization: "Bearer test-long-random-key", "Content-Type": "application/json" },
    body: JSON.stringify({ text: "x".repeat(4001) })
  }), aiEnv);
  assert.equal(oversized.status, 413);
});

test("tasks route calls Notion read-only query and maps fields", async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  let calledUrl = "";
  let init = {};
  globalThis.fetch = async (url, options) => {
    calledUrl = String(url); init = options;
    return new Response(JSON.stringify({
      has_more: false,
      next_cursor: null,
      results: [{
        id: "page-1", url: "https://www.notion.so/task-1", created_time: "2026-10-28T00:00:00.000Z",
        properties: {
          "Task name": { title: [{ plain_text: "Prepare coaching offer" }] },
          "Status": { status: { name: "pending" } },
          "Priority": { select: { name: "High" } },
          "Area": { select: { name: "Coaching" } },
          "Goal": { select: { name: "Business ownership" } },
          "Due date": { date: { start: "2026-10-30" } },
          "Estimated minutes": { number: 45 },
          "Energy": { select: { name: "Medium" } },
          "Description": { rich_text: [{ plain_text: "Draft the offer." }] }
        }
      }]
    }), { status: 200 });
  };
  const res = await worker.fetch(new Request("https://api.test/api/tasks?limit=25", {
    headers: { Origin: origin, Authorization: "Bearer test-long-random-key" }
  }), env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.count, 1);
  assert.equal(body.tasks[0].title, "Prepare coaching offer");
  assert.equal(body.tasks[0].status, "pending");
  assert.equal(body.tasks[0].estimatedMinutes, 45);
  assert.equal(body.tasks[0].description, "Draft the offer.");
  assert.equal(calledUrl, "https://api.notion.com/v1/data_sources/1fd4bebd-e186-80be-91d8-000b71cdb176/query");
  assert.equal(init.method, "POST");
  assert.equal(init.headers["Notion-Version"], "2026-03-11");
  assert.equal(JSON.parse(init.body).page_size, 25);
});

test("does not expose upstream error details", async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => new Response("secret server detail", { status: 403 });
  const res = await worker.fetch(new Request("https://api.test/api/tasks", {
    headers: { Origin: origin, Authorization: "Bearer test-long-random-key" }
  }), env);
  assert.equal(res.status, 502);
  const body = await res.text();
  assert.equal(body.includes("secret server detail"), false);
});
