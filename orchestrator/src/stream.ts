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
      while (lastIndex < job.logs.length) {
        const line = job.logs[lastIndex];
        if (line) ws.send(line);
        lastIndex++;
      }
      if (job.status === "done" || job.status === "failed") {
        ws.send(JSON.stringify({ done: true, status: job.status }));
        clearInterval(interval);
      }
    }, 200);

    ws.on("close", () => clearInterval(interval));
  });
}
