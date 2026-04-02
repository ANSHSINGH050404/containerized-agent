import { Planner } from "./planner.ts";
import { Executor } from "./executor.ts";
import { Reporter } from "./reporter.ts";

const apiKey = process.env.GEMINI_API_KEY!;
const prompt = process.env.AGENT_PROMPT!;

if (!apiKey) {
  console.error("GEMINI_API_KEY is not set");
  process.exit(1);
}

if (!prompt) {
  console.error("AGENT_PROMPT is not set");
  process.exit(1);
}

const planner = new Planner(apiKey);
const executor = new Executor();
const reporter = new Reporter();

async function run() {
  try {
    reporter.log(`Starting task: ${prompt}`);
    const steps = await planner.plan(prompt);
    reporter.log(`Generated ${steps.length} steps.`);
    await executor.execute(steps);
    reporter.success("Task completed successfully.");
  } catch (err: any) {
    reporter.error(err.message || "An unknown error occurred.");
    process.exit(1);
  }
}

run().catch(err => {
  console.error("Critical failure during agent execution:", err);
  process.exit(1);
});
