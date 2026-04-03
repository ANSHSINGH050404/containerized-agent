import { WebSocketServer } from "ws";
import { getJob } from "./jobs.ts";

export function setupStreaming(wss: WebSocketServer) {
  wss.on("connection", (ws, req) => {
    const id = new URL(req.url!, "http://x").searchParams.get("jobId");
    if (!id) return ws.close();
    const job = getJob(id);
    if (!job) return ws.close();

    let lastIndex = 0;
    const interval = setInterval(() => {
      // Primary drain: send any new log lines
      while (lastIndex < job.logs.length) {
        const line = job.logs[lastIndex];
        if (line) {
          ws.send(JSON.stringify({ jobId: id, log: line }));
        }
        lastIndex++;
      }

      if (job.status === "done" || job.status === "failed") {
        // Bug #6 Fix: re-drain any logs appended between the last tick and container exit
        while (lastIndex < job.logs.length) {
          const line = job.logs[lastIndex];
          if (line) {
            ws.send(JSON.stringify({ jobId: id, log: line }));
          }
          lastIndex++;
        }
        ws.send(JSON.stringify({ jobId: id, done: true, status: job.status }));
        clearInterval(interval);
      }
    }, 200);

    ws.on("close", () => clearInterval(interval));
  });
}
