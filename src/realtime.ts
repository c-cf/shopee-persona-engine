import type { Product, Project } from "../shared/types";

export type RealtimeJob = {
  id?: string;
  job_id?: string;
  status: "queued" | "pending" | "running" | "complete" | "completed" | "failed";
  progress?: { completed: number; total: number };
  error?: string;
};

type Dependencies = {
  realtime: <T>(path: string, method?: string, body?: unknown) => Promise<T>;
  importProject: (jobId: string, product: Product) => Promise<Project>;
  delay?: (milliseconds: number) => Promise<void>;
};

/** Called only from the explicit Search click handler. It never runs on load. */
export async function runRealtimeMapping(
  product: Product,
  onProgress: (completed: number, total: number) => void,
  dependencies: Dependencies,
): Promise<Project> {
  const productInput = {
    title: product.title,
    description: product.description,
    price: product.price,
    url: product.url,
  };
  const delay = dependencies.delay || ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  onProgress(0, 1500);
  let job = await dependencies.realtime<RealtimeJob>("/jobs", "POST", { product: productInput });
  const jobId = job.id || job.job_id;
  if (!jobId) throw new Error("Realtime service 沒有回傳 job ID。");
  for (let attempt = 0; !["complete", "completed"].includes(job.status); attempt += 1) {
    if (job.status === "failed") throw new Error(job.error || "Realtime Persona mapping 未完成。");
    if (attempt >= 600) throw new Error("Realtime Persona mapping 超過等待時間；job 仍保留在伺服器，可稍後查看。");
    await delay(2000);
    job = await dependencies.realtime<RealtimeJob>(`/jobs/${jobId}`);
    onProgress(
      Math.max(0, Math.min(1500, job.progress?.completed || 0)),
      job.progress?.total || 1500,
    );
  }
  onProgress(1500, 1500);
  return dependencies.importProject(jobId, product);
}
