export interface Job {
  id: string;
  status: "pending" | "running" | "done" | "failed";
  prompt: string;
  logs: string[];
  novncPort: number;
}

export const jobs = new Map<string, Job>();

export function getJob(id: string) {
  return jobs.get(id);
}

export function getAllJobs() {
  return Array.from(jobs.values());
}

export function updateJobStatus(id: string, status: Job["status"]) {
  const job = jobs.get(id);
  if (job) job.status = status;
}

export function addJobLog(id: string, log: string) {
  const job = jobs.get(id);
  if (job) job.logs.push(log);
}
