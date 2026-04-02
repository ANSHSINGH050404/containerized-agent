import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Terminal, Play, ExternalLink, Activity, CheckCircle, XCircle } from "lucide-react";

interface Job {
  id: string;
  status: "pending" | "running" | "done" | "failed";
  prompt: string;
  logs: string[];
  novncPort: number;
}

const API_BASE = "http://localhost:3000";

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const activeJob = jobs.find((j) => j.id === activeJobId);

  // Poll for job list
  const refreshJobs = async () => {
    try {
      const res = await axios.get(`${API_BASE}/jobs`);
      setJobs(res.data);
    } catch (err) {
      console.error("Failed to fetch jobs", err);
    }
  };

  useEffect(() => {
    refreshJobs();
    const interval = setInterval(refreshJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  // Submit new job
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/jobs`, { prompt });
      const newJobId = res.data.jobId;
      setActiveJobId(newJobId);
      setPrompt("");
      // Immediately add a placeholder job so activeJob isn't undefined
      setJobs(prev => [...prev, {
        id: newJobId,
        status: "pending",
        prompt: prompt,
        logs: ["Starting job..."],
        novncPort: 0
      }]);
      refreshJobs();
    } catch {
      alert("Failed to start job");
    } finally {
      setLoading(false);
    }
  };

  // Log streaming via WebSocket (Native implementation to bypass library issues)
  const [lastMessage, setLastMessage] = useState<any>(null);
  useEffect(() => {
    const url = activeJobId ? `ws://localhost:3000/stream?jobId=${activeJobId}` : null;
    if (!url) {
      setLastMessage(null);
      return;
    }
    const ws = new WebSocket(url);
    ws.onmessage = (e) => setLastMessage(e);
    ws.onclose = () => console.log("WebSocket closed");
    ws.onerror = (err) => console.error("WebSocket error", err);
    return () => ws.close();
  }, [activeJobId]);

  useEffect(() => {
    if (lastMessage !== null) {
      try {
        const data = JSON.parse(lastMessage.data);
        if (data.jobId === activeJobId && data.log) {
          setJobs((prev) =>
            prev.map((j) =>
              j.id === activeJobId ? { ...j, logs: [...j.logs, data.log] } : j
            )
          );
        }
      } catch {
        // Skip non-JSON messages
      }
    }
  }, [lastMessage, activeJobId]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeJob?.logs]);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar: Job History */}
      <aside className="w-80 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2 font-bold text-lg">
          <Activity className="text-blue-400" />
          <span>Agent Jobs</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {jobs.length === 0 && <p className="text-slate-500 text-sm italic">No jobs found.</p>}
          {jobs.map((job) => (
            <button
              key={job.id}
              onClick={() => setActiveJobId(job.id)}
              className={`w-full text-left p-3 rounded-lg transition-all border ${
                activeJobId === job.id
                  ? "bg-blue-600/20 border-blue-500"
                  : "bg-slate-800/50 border-transparent hover:border-slate-700"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-mono text-slate-400 truncate w-2/3">
                  {job.id.split("-")[0]}
                </span>
                <StatusBadge status={job.status} />
              </div>
              <p className="text-sm font-medium line-clamp-2">{job.prompt}</p>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar: New Job */}
        <header className="p-4 bg-slate-800/50 border-b border-slate-800">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What should the agent do?"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-colors shrink-0"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play size={16} />}
              Start
            </button>
          </form>
        </header>

        {/* Content */}
        <div className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
          {!activeJobId || !activeJob ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
              <Terminal size={48} className="opacity-20" />
              <p>{!activeJobId ? "Select a job or start a new one to see the agent in action." : "Loading job details..."}</p>
            </div>
          ) : (
            <>
              {/* Job Header */}
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-semibold">{activeJob.prompt}</h2>
                  <p className="text-xs text-slate-500 font-mono mt-1">Job ID: {activeJob.id}</p>
                </div>
                {activeJob.novncPort > 0 && (
                  <a
                    href={`http://localhost:${activeJob.novncPort}/vnc.html`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                  >
                    Open in tab <ExternalLink size={14} />
                  </a>
                )}
              </div>

              {/* Grid: Viewport & Terminal */}
              <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6 overflow-hidden min-h-0">
                {/* Visual Viewport */}
                <div className="xl:col-span-2 bg-black rounded-xl border border-slate-800 overflow-hidden relative group">
                  <div className="absolute top-2 left-2 bg-slate-900/80 px-2 py-1 rounded text-[10px] uppercase font-bold text-slate-400 border border-slate-700 z-10">
                    Live Viewport
                  </div>
                  {activeJob.novncPort > 0 ? (
                    <iframe
                      src={`http://localhost:${activeJob.novncPort}/vnc.html?autoconnect=1&resize=scale`}
                      className="w-full h-full border-none"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700 italic">
                      Viewport initializing...
                    </div>
                  )}
                </div>

                {/* Console Logs */}
                <div className="bg-slate-950 rounded-xl border border-slate-800 flex flex-col overflow-hidden">
                  <div className="px-4 py-2 border-b border-slate-800 flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <Terminal size={12} />
                    Logs
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed">
                    {activeJob.logs.map((log: string, i: number) => (
                      <div key={i} className="mb-1">
                        <span className="text-slate-600 mr-2">[{i + 1}]</span>
                        <span dangerouslySetInnerHTML={{ __html: formatLog(log) }} />
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: Job["status"] }) {
  const configs = {
    pending: { color: "bg-amber-500/20 text-amber-400", icon: <Activity size={10} className="animate-pulse" /> },
    running: { color: "bg-blue-500/20 text-blue-400", icon: <Activity size={10} className="animate-spin" /> },
    done: { color: "bg-emerald-500/20 text-emerald-400", icon: <CheckCircle size={10} /> },
    failed: { color: "bg-rose-500/20 text-rose-400", icon: <XCircle size={10} /> },
  };
  const config = configs[status] || configs.pending;
  return (
    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${config.color}`}>
      {config.icon}
      {status}
    </span>
  );
}

function formatLog(log: string) {
  if (typeof log !== 'string') return '';
  return log
    .replace(/\u001b\[31m/g, '<span style="color: #fb7185">')
    .replace(/\u001b\[32m/g, '<span style="color: #34d399">')
    .replace(/\u001b\[36m/g, '<span style="color: #22d3ee">')
    .replace(/\u001b\[34m/g, '<span style="color: #60a5fa">')
    .replace(/\u001b\[0m/g, "</span>");
}
