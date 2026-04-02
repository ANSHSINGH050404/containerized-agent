# AGENTS.md

Welcome, Agent. This repository contains a containerized AI agent system consisting of an Orchestrator, a Dynamic Agent, and a React Frontend.

## 🛠 Build & Execution Commands

This project uses **Bun** as the primary runtime and package manager.

### General
- **Install Dependencies**: `bun install` (Run in root, `/agent`, `/orchestrator`, or `/frontend`)
- **Build All**: `bun run build` (in respective directories)

### Orchestrator (Backend)
- **Start Development**: `bun run src/index.ts`
- **Build**: `bun build ./src/index.ts --outdir ./dist --target bun`
- **Port**: `3000`

### Agent (Core logic)
- **Execution**: Spawned via Docker from the Orchestrator.
- **Build Image**: `docker build -t agent:latest ./agent`

### Frontend (Dashboard)
- **Start Development**: `bun dev`
- **Build**: `bun run build`
- **Port**: `5173`

### Testing
- **Run all tests**: `bun test`
- **Run a single test file**: `bun test path/to/file.test.ts`
- **Run tests with a specific name**: `bun test -t "search string"`

---

## 📏 Code Style & Guidelines

### 1. Runtime & Package Management
- **Always use Bun**: Use `bun`, `bunx`, and `bun test`. Avoid `npm`, `yarn`, or `pnpm`.
- **Environment Variables**: Bun automatically loads `.env` files. Do not use `dotenv`.

### 2. Imports & Exports
- **Extensions**: Always include `.ts` or `.tsx` in local imports (e.g., `import { Job } from "./jobs.ts"`).
- **Type Imports**: Use type-only imports when `verbatimModuleSyntax` is enabled (e.g., `import type { Step } from "./planner.ts"`).
- **Native APIs**: Prefer Bun's built-in APIs over Node.js equivalents where possible:
  - `Bun.file()` instead of `node:fs`
  - `Bun.serve()` instead of `express` (though express is currently used in the orchestrator)
  - `Bun.$` instead of `child_process.exec` (for new code)

### 3. Formatting & Types
- **Strict Typing**: TypeScript is enforced. Avoid `any` unless absolutely necessary (e.g., catching unknown errors).
- **Interfaces over Types**: Prefer `interface` for object shapes, `type` for unions/aliases.
- **Naming Conventions**:
  - Classes/Interfaces: `PascalCase`
  - Functions/Variables: `camelCase`
  - Constants: `SCREAMING_SNAKE_CASE`
  - Files: `kebab-case` or `camelCase` depending on existing directory context (e.g., `src/index.ts`, `src/App.tsx`).

### 4. Error Handling
- **Async/Await**: Use `try...catch` blocks for all asynchronous operations.
- **Reporting**: In the agent, use the `Reporter` class for colored console output.
- **Orchestrator**: Return consistent JSON error objects: `{ error: "message" }`.

### 5. Frontend (React)
- **Styling**: Use **Tailwind CSS**. Prefer utility classes over custom CSS.
- **Icons**: Use **lucide-react**.
- **State**: Prefer functional components with hooks (`useState`, `useEffect`).
- **WebSockets**: Use `react-use-websocket` for real-time log streaming.

---

## 🚦 Safety & Infrastructure
- **Docker**: The Orchestrator interacts with `/var/run/docker.sock`. Ensure Docker is running.
- **Dynamic Port Mapping**: The Orchestrator maps VNC ports dynamically. Refer to `orchestrator/src/docker.ts` for logic.
- **Cleanup**: Ensure temporary files (like `agent_step_*.ts`) are unlinked after execution.

---

## 📎 Existing Rules (Reference)
*Derived from `.cursor/rules/use-bun-instead-of-node-vite-npm-pnpm.mdc`*
- Prefer `Bun.serve()` for new HTTP servers.
- Use `bun:sqlite` if local persistence is added.
- Use built-in `WebSocket` instead of `ws` where feasible.
