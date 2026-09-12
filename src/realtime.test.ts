import test from "node:test";
import assert from "node:assert/strict";
import { runRealtimeMapping } from "./realtime.js";
import { DEMO_PRODUCT, type Project } from "../shared/types.js";

test("paid create occurs only when the Search orchestrator is explicitly called", async () => {
  const calls: Array<{ path: string; method?: string }> = [];
  const progress: Array<[number, number]> = [];
  const project = { id: "project-result" } as Project;
  let statusRead = 0;
  const result = await runRealtimeMapping(
    DEMO_PRODUCT,
    (completed, total) => progress.push([completed, total]),
    {
      realtime: async <T>(path: string, method?: string) => {
        calls.push({ path, method });
        if (method === "POST") return { id: "7ac0b4d9-2aea-444a-a364-3280e210b30a", status: "running", progress: { completed: 0, total: 1500 } } as T;
        statusRead += 1;
        return { status: statusRead === 1 ? "running" : "complete", progress: { completed: statusRead === 1 ? 750 : 1500, total: 1500 } } as T;
      },
      importProject: async (jobId) => {
        assert.equal(jobId, "7ac0b4d9-2aea-444a-a364-3280e210b30a");
        return project;
      },
      delay: async () => {},
    },
  );
  assert.equal(result, project);
  assert.deepEqual(calls, [
    { path: "/jobs", method: "POST" },
    { path: "/jobs/7ac0b4d9-2aea-444a-a364-3280e210b30a", method: undefined },
    { path: "/jobs/7ac0b4d9-2aea-444a-a364-3280e210b30a", method: undefined },
  ]);
  assert.deepEqual(progress, [[0, 1500], [750, 1500], [1500, 1500], [1500, 1500]]);
});
