import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DEMO_PRODUCT } from "../shared/types.js";

test("imports a completed four-factor result without starting a paid job", { timeout: 15_000 }, async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "persona-realtime-import-"));
  const jobId = "7ac0b4d9-2aea-444a-a364-3280e210b30a";
  const finalScore = 100 * 0.9 ** 0.3 * 0.8 ** 0.3 * 0.7 ** 0.2 * 0.6 ** 0.2;
  const topMatches = Array.from({ length: 15 }, (_, index) => ({
    persona_id: `persona-seed-test-${String(index).padStart(2, "0")}`,
    qualified: true,
    final_score: finalScore,
    product_job_bridge: { score: 90, description_zh: `商品能完成情境任務 ${index + 1}`, pass: true },
    beer_diaper: { score: 80, description_zh: `跨情境關聯具有啟發性 ${index + 1}` },
    market_opportunity: { score: 70, description_zh: `模型估計市場機會 ${index + 1}`, bucket: "medium", confidence: "medium", assumptions: [], llm_estimated: true },
    story_hook: { score: 60, description_zh: `故事切角清楚可理解 ${index + 1}` },
    persona: {
      display_name: `實驗 Persona ${index + 1}`,
      archetype_name: `實驗 Persona ${index + 1}`,
      short_description: `第 ${index + 1} 個實驗人物描述`,
      basic_story: `第 ${index + 1} 個實驗人物故事`,
      work_context: "工作情境未指定",
      interests: [],
      job_to_be_done: `完成任務 ${index + 1}`,
      usage_context: `使用情境 ${index + 1}`,
    },
    provenance: { source: "mock-contract-test" },
  }));
  let resultGets = 0;
  let paidPosts = 0;
  const mock = createServer((request, response) => {
    if (request.method === "POST") paidPosts += 1;
    if (request.method === "GET" && request.url === `/jobs/${jobId}/result`) {
      resultGets += 1;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ schema_version: "product-persona-evaluation-v2", evaluation_count: 1500, top_matches: topMatches }));
      return;
    }
    response.statusCode = 404; response.end();
  });
  mock.listen(0, "127.0.0.1"); await once(mock, "listening");
  const mockAddress = mock.address();
  assert.ok(mockAddress && typeof mockAddress === "object");
  const entry = pathToFileURL(resolve("server/index.ts")).href;
  const tsx = resolve("node_modules/tsx/dist/cli.mjs");
  const runner = join(directory, "server.mjs");
  await writeFile(runner, `await import(${JSON.stringify(entry)});\n`, "utf8");
  let child: ChildProcess | undefined;
  child = spawn(process.execPath, [tsx, runner], {
    cwd: directory,
    env: { ...process.env, PORT: "0", PERSONA_MATCHES_FILE: "", PERSONA_CARDS_FILE: "", REALTIME_API_BASE: `http://127.0.0.1:${mockAddress.port}` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => {
    if (child && child.exitCode === null) { child.kill(); await once(child, "exit"); }
    mock.close(); await once(mock, "close");
    await rm(directory, { recursive: true, force: true });
  });
  const origin = await new Promise<string>((resolveOrigin, reject) => {
    const timer = setTimeout(() => reject(new Error("API startup timeout")), 5000);
    child!.stdout!.on("data", (chunk) => {
      const match = String(chunk).match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) { clearTimeout(timer); resolveOrigin(`http://127.0.0.1:${match[1]}`); }
    });
  });
  const response = await fetch(`${origin}/api/projects/from-realtime`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Workspace-Key": "11111111-1111-4111-8111-111111111111" },
    body: JSON.stringify({ jobId, product: DEMO_PRODUCT }),
  });
  assert.equal(response.status, 201);
  const project = await response.json();
  assert.equal(project.buyers.length, 15);
  assert.equal(new Set(project.buyers.map((buyer: { id: string }) => buyer.id)).size, 15);
  assert.ok(project.buyers.every((buyer: { metrics: { version: string; storyHook: { descriptionZh: string } } }) => buyer.metrics.version === "four-factor-v2" && buyer.metrics.storyHook.descriptionZh));
  assert.equal(resultGets, 1);
  assert.equal(paidPosts, 0);
});
