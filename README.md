# Containerized Agent Orchestrator

This system provides a framework for running containerized AI agents with their own graphical environment (via Xvfb and noVNC) and a control layer (Orchestrator).

## Components

1.  **Orchestrator**: A Bun/Express server that manages the lifecycle of agent containers.
2.  **Agent**: A containerized environment that can plan and execute tasks using Google Gemini.

## Getting Started

### Prerequisites

-   [Bun](https://bun.sh/) installed locally (for local development/testing).
-   [Docker](https://www.docker.com/) installed and running.
-   A `GEMINI_API_KEY` from Google.

### Step 1: Build the Agent Image

Before running the orchestrator, you must build the agent image:

```bash
cd agent
docker build -t agent:latest .
cd ..
```

### Step 2: Set up Environment Variables

Create a `.env` file in the root directory (or use your shell's environment):

```bash
GEMINI_API_KEY=your_api_key_here
```

### Step 3: Start the System

You can use Docker Compose to start the orchestrator:

```bash
docker-compose up --build
```

Alternatively, run the orchestrator locally (ensure you have Docker access):

```bash
cd orchestrator
bun install
bun run src/index.ts
```

### Step 4: Submit a Job

Use `curl` or any API client to submit a task:

```bash
curl -X POST http://localhost:3000/jobs \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Open a terminal and print hello world"}'
```

The response will contain a `jobId` and a `novncUrl`. Open the `novncUrl` in your browser to see the agent's screen.

### Step 5: View Logs

You can poll the status and logs:

```bash
curl http://localhost:3000/jobs/<jobId>
```

Or connect via WebSocket to `ws://localhost:3000/stream?jobId=<jobId>` for real-time log streaming.

## Project Structure

-   `agent/`: Agent logic and Docker environment.
-   `orchestrator/`: Job management and Docker control.
-   `frontend/`: React-based dashboard for job management.
-   `docker-compose.yml`: Local setup.

## Running the Dashboard

To start the user interface:

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies (if not already done):
    ```bash
    bun install
    ```
3.  Start the development server:
    ```bash
    bun dev
    ```
4.  Open [http://localhost:5173](http://localhost:5173) in your browser.

The dashboard allows you to submit new prompts, view the real-time VNC viewport of the agent, and stream logs.
