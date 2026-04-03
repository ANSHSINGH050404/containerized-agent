import Docker from "dockerode";
import { v4 as uuid } from "uuid";
import type { Job } from "./jobs.ts";
import { jobs } from "./jobs.ts";

const isWin = process.platform === "win32";
// Try npipe for Windows, default for others
const docker = isWin
  ? new Docker({ socketPath: "//./pipe/docker_engine" })
  : new Docker({ socketPath: "/var/run/docker.sock" });

// --- Bug #3 Fix: Port collision guard ---
const usedPorts = new Set<number>();

function allocatePort(): number {
  let port: number;
  do {
    port = 6080 + Math.floor(Math.random() * 1000);
  } while (usedPorts.has(port));
  usedPorts.add(port);
  return port;
}

function releasePort(port: number): void {
  usedPorts.delete(port);
}

export async function createJob(prompt: string): Promise<Job> {
  const id = uuid();
  // Bug #3 Fix: use collision-safe port allocator
  const novncPort = allocatePort();

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
        NetworkMode: "bridge",        // allow outbound network for Gemini API
        Memory: 512 * 1024 * 1024,   // 512 MB RAM cap
        NanoCpus: 1_000_000_000,     // 1 CPU
        PidsLimit: 100,              // no fork bombs
        ReadonlyRootfs: false,
        Tmpfs: { "/tmp": "size=100m" },
        CapDrop: ["ALL"],            // drop all Linux capabilities
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

    // Bug #4 Fix: always handle container.remove() promise; clean up on both branches
    container.wait().then((res: any) => {
      job.status = (res && res.StatusCode !== 0) ? "failed" : "done";
      releasePort(novncPort);
      container.remove({ force: true }).catch((e: any) =>
        console.error(`[docker] Failed to remove container ${id}:`, e.message)
      );
    }).catch((err: any) => {
      job.status = "failed";
      releasePort(novncPort);
      container.remove({ force: true }).catch(() => {});
      console.error(`[docker] container.wait() failed for ${id}:`, err.message);
    });

    return job;
  } catch (err) {
    job.status = "failed";
    releasePort(novncPort);
    throw err;
  }
}
