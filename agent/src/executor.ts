import { execSync } from "child_process";
import * as fs from "fs";
import { Step } from "./planner.ts";

export class Executor {
  async execute(steps: Step[]) {
    for (const step of steps) {
      console.log(`\x1b[34m[agent]\x1b[0m running ${step.type}: ${step.code}`);
      
      try {
        if (step.type === "shell") {
          execSync(step.code, { stdio: "inherit" });
        } else {
          const tempFile = `/tmp/agent_step_${Date.now()}.ts`;
          fs.writeFileSync(tempFile, step.code);
          execSync(`bun run ${tempFile}`, { stdio: "inherit" });
          fs.unlinkSync(tempFile);
        }
      } catch (err) {
        console.error(`\x1b[31m[error]\x1b[0m Step failed: ${step.code}`);
        throw err;
      }
    }
  }
}
