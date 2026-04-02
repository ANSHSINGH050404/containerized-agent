import Docker from "dockerode";
import { v4 as uuid } from "uuid";
import type { Job } from "./jobs.ts";
import { jobs } from "./jobs.ts";

const isWin = process.platform === "win32";
// Try npipe for Windows, default for others
const docker = isWin 
  ? new Docker({ socketPath: "//./pipe/docker_engine" }) 
  : new Docker({ socketPath: "/var/run/docker.sock" });

export async function createJob(prompt: string): Promise<Job> {
  const id = uuid();
  const novncPort = 6080 + Math.floor(Math.random() * 1000);

  const job: Job = { id, status: "pending", prompt, logs: [], novncPort };
  jobs.set(id, job);

  try {
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

    container.wait().then((res: any) => {
      if (res && res.StatusCode !== 0) {
        job.status = "failed";
      } else {
        job.status = "done";
      }
      container.remove();
    }).catch(() => {
      job.status = "failed";
    });

    return job;
  } catch (err) {
    job.status = "failed";
    throw err;
  }
}
