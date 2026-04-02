import express from "express";
import { createJob } from "./docker.ts";
import { getJob } from "./jobs.ts";
import { WebSocketServer } from "ws";
import { setupStreaming } from "./stream.ts";
import http from "http";

const app = express();
app.use(express.json());

// POST /jobs — submit a prompt
app.post("/jobs", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt required" });
  try {
    const job = await createJob(prompt);
    res.json({ jobId: job.id, novncUrl: `http://localhost:${job.novncPort}/vnc.html` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /jobs/:id — poll status + logs
app.get("/jobs/:id", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: "not found" });
  res.json(job);
});

const server = http.createServer(app);

// WebSocket — stream logs in real time
const wss = new WebSocketServer({ server, path: "/stream" });
setupStreaming(wss);

server.listen(3000, () => console.log("Orchestrator on :3000"));
