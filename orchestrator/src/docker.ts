import Docker from "dockerode";
import { v4 as uuid } from "uuid";
import { Job, jobs } from "./jobs.ts";

const docker = new Docker();

export async function createJob(prompt: string): Promise<Job> {
  const id = uuid();
  const novncPort = 6080 + Math.floor(Math.random() * 1000);

  const job: Job = { id, status: "pending", prompt, logs: [], novncPort };
  jobs.set(id, job);

  const container = await docker.createContainer({
    Image: "agent:latest",
    Env: [
      `AGENT_PROMPT=${prompt}`,
      `GEMINI_API_KEY=${process.env.GEMINI_API_KEY || ""}`,
    ],
    HostConfig: {
      PortBindings: { "6080/tcp": [{ HostPort: String(novncPort) }] },
      NetworkMode: "bridge",           // allow outbound network for Gemini API
      Memory: 512 * 1024 * 1024,    // 512 MB RAM cap
      NanoCpus: 1_000_000_000,      // 1 CPU
      PidsLimit: 100,               // no fork bombs
      ReadonlyRootfs: false,
      Tmpfs: { "/tmp": "size=100m" },
      CapDrop: ["ALL"],             // drop all Linux capabilities
      SecurityOpt: ["no-new-privileges"],
    },
  });

  job.status = "running";
  await container.start();

  // Stream logs back
  const stream = await container.logs({ follow: true, stdout: true, stderr: true });
  container.modem.demuxStream(
    stream,
    { write: (chunk: Buffer) => job.logs.push(chunk.toString()) },
    { write: (chunk: Buffer) => job.logs.push(chunk.toString()) }
  );

  container.wait().then(() => {
    job.status = "done";
    container.remove();
  }).catch(() => {
    job.status = "failed";
  });

  return job;
}
